"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Mic, Square } from "lucide-react";
import { cn } from "@/lib/utils";

// Minimal typings for the Web Speech API (not in lib.dom by default).
/* eslint-disable @typescript-eslint/no-explicit-any */
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function Composer({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
}) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    setVoiceSupported(true);
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      setText((finalText + interim).trim());
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    return () => rec.stop();
  }, []);

  // Auto-grow the textarea.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "0px";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }, [text]);

  const toggleVoice = () => {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (listening) {
      rec.stop();
      setListening(false);
    } else {
      setText("");
      try {
        rec.start();
        setListening(true);
      } catch {
        setListening(false);
      }
    }
  };

  const submit = () => {
    if (!text.trim() || disabled) return;
    onSend(text);
    setText("");
  };

  return (
    <div className="p-3">
      <div
        className={cn(
          "glass-soft flex items-end gap-2 rounded-2xl p-2 transition-all",
          "focus-within:border-primary/40 focus-within:shadow-[0_0_0_3px_color-mix(in_oklch,var(--primary)_18%,transparent)]",
        )}
      >
        {voiceSupported && (
          <button
            type="button"
            onClick={toggleVoice}
            title={listening ? "Stop listening" : "Speak your deadline"}
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl",
              listening
                ? "glass-primary text-primary-foreground animate-pulse"
                : "glass-btn text-foreground/80",
            )}
          >
            {listening ? <Square className="size-4" /> : <Mic className="size-4" />}
          </button>
        )}
        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder={listening ? "Listening…" : "Describe a messy deadline — I'll plan and act…"}
          className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
        />
        <button
          type="button"
          onClick={submit}
          disabled={disabled || !text.trim()}
          className="glass-primary flex size-9 shrink-0 items-center justify-center rounded-xl text-primary-foreground disabled:opacity-40"
          title="Handle it"
        >
          <ArrowUp className="size-4" />
        </button>
      </div>
      <p className="mt-2 px-1 text-[11px] text-muted-foreground/70">
        <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">Enter</kbd> to send ·
        <kbd className="ml-1 rounded bg-muted px-1 py-0.5 font-mono text-[10px]">Shift+Enter</kbd> newline
        {voiceSupported && <span> · mic for voice</span>}
      </p>
    </div>
  );
}
