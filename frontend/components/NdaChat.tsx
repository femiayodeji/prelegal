"use client";

import { useEffect, useRef, useState } from "react";
import { ChatMessage, sendChat } from "@/lib/chat";
import { NdaData } from "@/lib/nda";

interface Props {
  data: NdaData;
  onChange: (data: NdaData) => void;
}

// The assistant opens the conversation with a fixed greeting so the user has
// something to respond to without waiting on an LLM round-trip at page load.
const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hi! I'll help you put together your Mutual NDA. To start, who are the " +
    "two companies entering into this agreement?",
};

/**
 * The conversational way to fill in the Mutual NDA. Holds the chat transcript,
 * sends each user turn to the backend, and lifts the returned document state up
 * to the workspace so the live preview stays in sync. Replaces the old form.
 */
export default function NdaChat({ data, onChange }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view as the conversation grows.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const history = [...messages, { role: "user" as const, content: text }];
    setMessages(history);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const result = await sendChat(history, data);
      setMessages([...history, { role: "assistant", content: result.reply }]);
      onChange(result.data);
    } catch {
      setError("Something went wrong reaching the assistant. Please try again.");
      // Drop the optimistic user turn so they can resend it.
      setMessages(messages);
      setInput(text);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends; Shift+Enter inserts a newline.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="flex h-[32rem] flex-col rounded-xl bg-white shadow-sm">
      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto p-6"
        aria-label="Conversation"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] whitespace-pre-wrap rounded-2xl bg-brand-blue px-4 py-2 text-sm text-white"
                  : "max-w-[85%] whitespace-pre-wrap rounded-2xl bg-slate-100 px-4 py-2 text-sm text-slate-800"
              }
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm text-brand-gray">
              Thinking…
            </div>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="px-6 pb-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="border-t border-slate-200 p-4">
        <div className="flex items-end gap-2">
          <textarea
            className="flex-1 resize-none rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            rows={2}
            value={input}
            placeholder="Type your answer…"
            aria-label="Message the assistant"
            disabled={loading}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={loading || !input.trim()}
            className="inline-flex items-center justify-center rounded-md bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
