// Persistence abstraction for ClutchAI.
//
// In production (on Cloud Run) we use Firestore — Google-native, zero-ops, and
// survives the ephemeral filesystem. For free local dev with no GCP credentials,
// we transparently fall back to an in-memory store kept on globalThis so it
// survives Next.js hot-reloads. Same interface either way.

import type { Task, ActionLogEntry, Proposal } from "./types";

export interface Store {
  addTask(task: Task): Promise<void>;
  updateTask(id: string, patch: Partial<Task>): Promise<void>;
  listTasks(): Promise<Task[]>;
  addAction(action: ActionLogEntry): Promise<void>;
  listActions(): Promise<ActionLogEntry[]>;
  addProposal(proposal: Proposal): Promise<void>;
  getProposal(id: string): Promise<Proposal | null>;
  updateProposal(id: string, patch: Partial<Proposal>): Promise<void>;
  listProposals(): Promise<Proposal[]>;
}

// ---- In-memory store (free local dev / fallback) -------------------------

interface MemoryDb {
  tasks: Task[];
  actions: ActionLogEntry[];
  proposals: Proposal[];
}

function memoryDb(): MemoryDb {
  const g = globalThis as unknown as { __clutchMemoryDb?: MemoryDb };
  if (!g.__clutchMemoryDb)
    g.__clutchMemoryDb = { tasks: [], actions: [], proposals: [] };
  return g.__clutchMemoryDb;
}

class MemoryStore implements Store {
  async addTask(task: Task) {
    memoryDb().tasks.unshift(task);
  }
  async updateTask(id: string, patch: Partial<Task>) {
    const db = memoryDb();
    const i = db.tasks.findIndex((t) => t.id === id);
    if (i >= 0) db.tasks[i] = { ...db.tasks[i], ...patch };
  }
  async listTasks() {
    return [...memoryDb().tasks];
  }
  async addAction(action: ActionLogEntry) {
    memoryDb().actions.unshift(action);
  }
  async listActions() {
    return [...memoryDb().actions];
  }
  async addProposal(proposal: Proposal) {
    memoryDb().proposals.unshift(proposal);
  }
  async getProposal(id: string) {
    return memoryDb().proposals.find((p) => p.id === id) ?? null;
  }
  async updateProposal(id: string, patch: Partial<Proposal>) {
    const db = memoryDb();
    const i = db.proposals.findIndex((p) => p.id === id);
    if (i >= 0) db.proposals[i] = { ...db.proposals[i], ...patch };
  }
  async listProposals() {
    return [...memoryDb().proposals];
  }
}

// ---- Firestore store (production) ----------------------------------------

class FirestoreStore implements Store {
  // Lazily import so the package isn't required for local in-memory dev.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private dbPromise: Promise<any>;

  constructor() {
    this.dbPromise = import("@google-cloud/firestore").then(
      ({ Firestore }) => new Firestore(),
    );
  }

  async addTask(task: Task) {
    const db = await this.dbPromise;
    await db.collection("tasks").doc(task.id).set(task);
  }
  async updateTask(id: string, patch: Partial<Task>) {
    const db = await this.dbPromise;
    await db.collection("tasks").doc(id).set(patch, { merge: true });
  }
  async listTasks(): Promise<Task[]> {
    const db = await this.dbPromise;
    const snap = await db.collection("tasks").orderBy("createdAt", "desc").get();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return snap.docs.map((d: any) => d.data() as Task);
  }
  async addAction(action: ActionLogEntry) {
    const db = await this.dbPromise;
    await db.collection("actions").doc(action.id).set(action);
  }
  async listActions(): Promise<ActionLogEntry[]> {
    const db = await this.dbPromise;
    const snap = await db
      .collection("actions")
      .orderBy("createdAt", "desc")
      .get();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return snap.docs.map((d: any) => d.data() as ActionLogEntry);
  }
  async addProposal(proposal: Proposal) {
    const db = await this.dbPromise;
    await db.collection("proposals").doc(proposal.id).set(proposal);
  }
  async getProposal(id: string): Promise<Proposal | null> {
    const db = await this.dbPromise;
    const doc = await db.collection("proposals").doc(id).get();
    return doc.exists ? (doc.data() as Proposal) : null;
  }
  async updateProposal(id: string, patch: Partial<Proposal>) {
    const db = await this.dbPromise;
    await db.collection("proposals").doc(id).set(patch, { merge: true });
  }
  async listProposals(): Promise<Proposal[]> {
    const db = await this.dbPromise;
    const snap = await db
      .collection("proposals")
      .orderBy("createdAt", "desc")
      .get();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return snap.docs.map((d: any) => d.data() as Proposal);
  }
}

// ---- Selection -----------------------------------------------------------

let store: Store | null = null;

/**
 * Returns the active store. Uses Firestore when a GCP project is configured
 * (GOOGLE_CLOUD_PROJECT / GCLOUD_PROJECT, set automatically on Cloud Run),
 * otherwise the in-memory store so local dev is free and credential-less.
 */
export function getStore(): Store {
  if (store) return store;
  const hasGcp =
    !!process.env.GOOGLE_CLOUD_PROJECT ||
    !!process.env.GCLOUD_PROJECT ||
    process.env.USE_FIRESTORE === "true";
  store = hasGcp ? new FirestoreStore() : new MemoryStore();
  return store;
}
