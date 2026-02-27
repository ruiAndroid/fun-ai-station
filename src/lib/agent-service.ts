import { apiFetch } from "@/lib/api"

type AgentServiceAgent = {
  name: string
  description: string
}

export type PendingAction = {
  id: string
  agent_code: string
  action: string
  title?: string
  confirm_text?: string
  cancel_text?: string
  context_keywords?: string[]
  created_at?: number
  meta?: Record<string, unknown>
}

export async function listAgentServiceAgents() {
  return await apiFetch<AgentServiceAgent[]>("/agent-service/agents")
}

export async function executeAgentServiceAgent(agent: string, input: string, context: Record<string, unknown> = {}) {
  return await apiFetch<{ output: string; pending_action?: PendingAction | null }>(
    `/agent-service/agents/${encodeURIComponent(agent)}/execute`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input, context }),
    }
  )
}
