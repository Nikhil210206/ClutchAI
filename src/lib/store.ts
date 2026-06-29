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
  // If Firestore is unreachable/unconfigured, degrade to in-memory so the app
  // never breaks (e.g. the database wasn't created yet). The data still works
  // for the session; it just isn't durable until Firestore is reachable.
  private fallback = new MemoryStore();
  private degraded = false;

  constructor() {
    this.dbPromise = import("@google-cloud/firestore").then(
      ({ Firestore }) => new Firestore(),
    );
  }

  private degrade(op: string, err: unknown) {
    if (!this.degraded) {
      this.degraded = true;
      console.warn(
        `[store] Firestore unavailable (${op}); falling back to in-memory. ${String(err)}`,
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async db() {
    return this.dbPromise;
  }

  async addTask(task: Task) {
    if (this.degraded) return this.fallback.addTask(task);
    try {
      await (await this.db()).collection("tasks").doc(task.id).set(task);
    } catch (e) {
      this.degrade("addTask", e);
      await this.fallback.addTask(task);
    }
  }
  async updateTask(id: string, patch: Partial<Task>) {
    if (this.degraded) return this.fallback.updateTask(id, patch);
    try {
      await (await this.db()).collection("tasks").doc(id).set(patch, { merge: true });
    } catch (e) {
      this.degrade("updateTask", e);
      await this.fallback.updateTask(id, patch);
    }
  }
  async listTasks(): Promise<Task[]> {
    if (this.degraded) return this.fallback.listTasks();
    try {
      const snap = await (await this.db()).collection("tasks").orderBy("createdAt", "desc").get();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return snap.docs.map((d: any) => d.data() as Task);
    } catch (e) {
      this.degrade("listTasks", e);
      return this.fallback.listTasks();
    }
  }
  async addAction(action: ActionLogEntry) {
    if (this.degraded) return this.fallback.addAction(action);
    try {
      await (await this.db()).collection("actions").doc(action.id).set(action);
    } catch (e) {
      this.degrade("addAction", e);
      await this.fallback.addAction(action);
    }
  }
  async listActions(): Promise<ActionLogEntry[]> {
    if (this.degraded) return this.fallback.listActions();
    try {
      const snap = await (await this.db()).collection("actions").orderBy("createdAt", "desc").get();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return snap.docs.map((d: any) => d.data() as ActionLogEntry);
    } catch (e) {
      this.degrade("listActions", e);
      return this.fallback.listActions();
    }
  }
  async addProposal(proposal: Proposal) {
    if (this.degraded) return this.fallback.addProposal(proposal);
    try {
      await (await this.db()).collection("proposals").doc(proposal.id).set(proposal);
    } catch (e) {
      this.degrade("addProposal", e);
      await this.fallback.addProposal(proposal);
    }
  }
  async getProposal(id: string): Promise<Proposal | null> {
    if (this.degraded) return this.fallback.getProposal(id);
    try {
      const doc = await (await this.db()).collection("proposals").doc(id).get();
      return doc.exists ? (doc.data() as Proposal) : null;
    } catch (e) {
      this.degrade("getProposal", e);
      return this.fallback.getProposal(id);
    }
  }
  async updateProposal(id: string, patch: Partial<Proposal>) {
    if (this.degraded) return this.fallback.updateProposal(id, patch);
    try {
      await (await this.db()).collection("proposals").doc(id).set(patch, { merge: true });
    } catch (e) {
      this.degrade("updateProposal", e);
      await this.fallback.updateProposal(id, patch);
    }
  }
  async listProposals(): Promise<Proposal[]> {
    if (this.degraded) return this.fallback.listProposals();
    try {
      const snap = await (await this.db()).collection("proposals").orderBy("createdAt", "desc").get();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return snap.docs.map((d: any) => d.data() as Proposal);
    } catch (e) {
      this.degrade("listProposals", e);
      return this.fallback.listProposals();
    }
  }
}

// ---- Selection -----------------------------------------------------------

let store: Store | null = null;

/**
 * Returns the active store. Uses Firestore on Cloud Run (detected via K_SERVICE,
 * which Cloud Run always sets) or when a GCP project / USE_FIRESTORE is set;
 * otherwise the in-memory store so local dev is free and credential-less.
 * FirestoreStore self-degrades to in-memory if Firestore is unreachable, so this
 * choice can never break the app.
 */
export function getStore(): Store {
  if (store) return store;
  const onCloudRun = !!process.env.K_SERVICE;
  const useFirestore =
    onCloudRun ||
    !!process.env.GOOGLE_CLOUD_PROJECT ||
    !!process.env.GCLOUD_PROJECT ||
    process.env.USE_FIRESTORE === "true";
  store = useFirestore ? new FirestoreStore() : new MemoryStore();
  return store;
}
