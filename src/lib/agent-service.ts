import { apiFetch } from "@/lib/api"

type AgentServiceAgent = {
  name: string
  description: string
}

export async function listAgentServiceAgents() {
  return await apiFetch<AgentServiceAgent[]>("/agent-service/agents")
}

export async function executeAgentServiceAgent(agent: string, input: string, context: Record<string, unknown> = {}) {
  return await apiFetch<{ output: string }>(`/agent-service/agents/${encodeURIComponent(agent)}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input, context }),
  })
}
