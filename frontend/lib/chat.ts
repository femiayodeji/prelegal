// Client for the AI chat backend (PL-6).
//
// The frontend is a static export with no server of its own, so the LLM call
// lives in FastAPI (which holds the API key). Each turn is a stateless
// round-trip: we POST the full transcript plus the current document state and
// receive the assistant's reply and the updated document state.

import { DocumentState } from "@/lib/documents";

/** A single turn in the conversation transcript. */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Shape of the `/api/chat` response. */
export interface ChatResponse {
  reply: string;
  doc: DocumentState;
}

/**
 * Send the conversation so far (plus current document state) to the backend and
 * return the assistant's next turn. Throws on a non-2xx response so callers can
 * surface an error in the UI.
 */
export async function sendChat(
  messages: ChatMessage[],
  doc: DocumentState,
): Promise<ChatResponse> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, doc }),
  });

  if (!res.ok) {
    throw new Error(`Chat request failed (${res.status})`);
  }

  return (await res.json()) as ChatResponse;
}
