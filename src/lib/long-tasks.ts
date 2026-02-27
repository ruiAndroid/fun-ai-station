import { apiFetch } from "@/lib/api"

export type LongTask = {
  id: number
  user_id: string
  kind: string
  title: string
  status: string
  trace_id?: string | null
  payload: Record<string, unknown>
  output?: string | null
  result: Record<string, unknown>
  error?: string | null
  cancel_requested: boolean
  attempt: number
  started_at?: string | null
  finished_at?: string | null
  created_at: string
  updated_at: string
}

export async function listLongTasks() {
  return await apiFetch<LongTask[]>("/long-tasks")
}

export async function getLongTask(id: number) {
  return await apiFetch<LongTask>(`/long-tasks/${id}`)
}

export async function createLongTaskOrchestratorExecute(payload: {
  title?: string
  text: string
  context?: Record<string, unknown>
  default_agent?: string
  mode?: string
}) {
  return await apiFetch<LongTask>("/long-tasks/orchestrator-execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
}

export async function cancelLongTask(id: number) {
  return await apiFetch<LongTask>(`/long-tasks/${id}/cancel`, {
    method: "POST",
  })
}

export async function deleteLongTask(id: number) {
  return await apiFetch<{ ok: boolean }>(`/long-tasks/${id}`, {
    method: "DELETE",
  })
}
