type ChatSessionCreate = {
  agent_id?: number | null
  title?: string | null
}

type ChatSessionOut = {
  id: string
  user_id: string
  agent_id: number
  title: string
  created_at: string
  updated_at: string
}

type ChatMessageCreate = {
  role: "user" | "assistant" | "system"
  content: string
}

type ChatMessageOut = {
  id: string
  session_id: string
  role: string
  content: string
  created_at: string
  updated_at: string
}

import { apiFetch } from "@/lib/api"

export async function createChatSession(payload: ChatSessionCreate) {
  return await apiFetch<ChatSessionOut>("/chat/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
}

export async function getChatSession(sessionId: string) {
  return await apiFetch<ChatSessionOut>(`/chat/sessions/${encodeURIComponent(sessionId)}`)
}

export async function listChatSessions() {
  return await apiFetch<ChatSessionOut[]>("/chat/sessions")
}

export async function updateChatSession(sessionId: string, payload: ChatSessionCreate) {
  return await apiFetch<ChatSessionOut>(`/chat/sessions/${encodeURIComponent(sessionId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
}

export async function deleteChatSession(sessionId: string) {
  return await apiFetch<{ ok: boolean }>(`/chat/sessions/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
  })
}

export async function listChatMessages(sessionId: string) {
  return await apiFetch<ChatMessageOut[]>(`/chat/sessions/${encodeURIComponent(sessionId)}/messages`)
}

export async function createChatMessage(sessionId: string, payload: ChatMessageCreate) {
  return await apiFetch<ChatMessageOut>(`/chat/sessions/${encodeURIComponent(sessionId)}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
}
