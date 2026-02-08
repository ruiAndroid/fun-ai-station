export type Agent = {
  id: number
  code: string
  name: string
  handle: string
  description: string
  tags: string[]
  capabilities: string[]
}

import { apiFetch } from "@/lib/api"

export async function listAgents() {
  return await apiFetch<Agent[]>("/agents")
}

export async function getAgent(agentId: number) {
  return await apiFetch<Agent>(`/agents/${encodeURIComponent(String(agentId))}`)
}

export function findAgentById(
  agents: Agent[],
  id: number | string | null | undefined
) {
  if (id == null) return null
  const normalized = typeof id === "string" ? Number(id) : id
  if (!Number.isFinite(normalized)) return null
  return agents.find((a) => a.id === normalized) ?? null
}

export function findAgentByHandle(agents: Agent[], handle: string) {
  const normalized = handle.startsWith("@") ? handle : `@${handle}`
  return agents.find((a) => a.handle === normalized) ?? null
}

