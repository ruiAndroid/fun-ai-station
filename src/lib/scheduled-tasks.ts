import { apiFetch } from "@/lib/api"

export type ScheduledTask = {
  id: number
  user_id: string
  name: string
  enabled: boolean
  schedule_type: "cron" | "interval" | "once" | string
  schedule_expr: string
  timezone: string
  payload: Record<string, unknown>
  next_run_at: string | null
  last_run_at: string | null
  created_at: string
  updated_at: string
}

export type ScheduledTaskRun = {
  id: number
  task_id: number
  user_id: string
  status: "running" | "success" | "failed" | string
  trace_id: string | null
  started_at: string
  finished_at: string | null
  error: string | null
  result: Record<string, unknown>
}

export type ScheduledTaskCreate = {
  name: string
  enabled?: boolean
  schedule_type?: "cron" | "interval" | "once" | string
  schedule_expr?: string
  timezone?: string
  payload?: Record<string, unknown>
  next_run_at?: string | null
}

export type ScheduledTaskUpdate = Partial<ScheduledTaskCreate>

export async function listScheduledTasks() {
  return await apiFetch<ScheduledTask[]>("/scheduled-tasks")
}

export async function createScheduledTask(payload: ScheduledTaskCreate) {
  return await apiFetch<ScheduledTask>("/scheduled-tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
}

export async function updateScheduledTask(taskId: number, payload: ScheduledTaskUpdate) {
  return await apiFetch<ScheduledTask>(`/scheduled-tasks/${encodeURIComponent(String(taskId))}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
}

export async function deleteScheduledTask(taskId: number) {
  return await apiFetch<{ ok: boolean }>(`/scheduled-tasks/${encodeURIComponent(String(taskId))}`, {
    method: "DELETE",
  })
}

export async function listScheduledTaskRuns(taskId: number) {
  return await apiFetch<ScheduledTaskRun[]>(
    `/scheduled-tasks/${encodeURIComponent(String(taskId))}/runs`
  )
}

