import { apiFetch } from "@/lib/api"

export type LlmConfig = {
  base_url: string
  api_key: string
  model: string
  timeout: number
}

export async function getLlmConfig() {
  return await apiFetch<LlmConfig>("/agent-service/config/llm")
}

export async function updateLlmConfig(payload: Partial<LlmConfig>) {
  return await apiFetch<LlmConfig>("/agent-service/config/llm", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
}
