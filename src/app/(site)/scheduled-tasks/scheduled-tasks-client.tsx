"use client"

import * as React from "react"
import { CalendarClockIcon, PencilIcon, RefreshCwIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  createScheduledTask,
  deleteScheduledTask,
  listScheduledTaskRuns,
  listScheduledTasks,
  updateScheduledTask,
  type ScheduledTask,
  type ScheduledTaskRun,
} from "@/lib/scheduled-tasks"
import { getAccessToken } from "@/lib/auth-storage"

function fmt(iso: string | null | undefined) {
  if (!iso) return "—"
  const s = String(iso)
  const hasTz = /([zZ]|[+-]\d{2}:\d{2})$/.test(s)
  const looksIsoNoTz = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s)
  const normalized = !hasTz && looksIsoNoTz ? `${s}Z` : s
  const d = new Date(normalized)
  if (Number.isNaN(d.getTime())) return String(iso)
  return new Intl.DateTimeFormat(undefined, {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(d)
}

type TaskForm = {
  name: string
  enabled: boolean
  schedule_type: "cron" | "interval" | "once"
  schedule_expr: string
  timezone: string
  text: string
  once_at: string // datetime-local
}

const EMPTY_FORM: TaskForm = {
  name: "",
  enabled: true,
  schedule_type: "interval",
  schedule_expr: "60",
  timezone: "Asia/Shanghai",
  text: "",
  once_at: "",
}

function taskToForm(t: ScheduledTask): TaskForm {
  const payload = (t.payload ?? {}) as Record<string, unknown>
  return {
    name: t.name ?? "",
    enabled: !!t.enabled,
    schedule_type: (t.schedule_type as TaskForm["schedule_type"]) || "cron",
    schedule_expr: t.schedule_expr ?? "",
    timezone: t.timezone ?? "Asia/Shanghai",
    text: typeof payload.text === "string" ? payload.text : "",
    once_at: "",
  }
}

function buildPayload(form: TaskForm) {
  const payload: Record<string, unknown> = {
    text: form.text,
  }
  payload.context = {}
  return payload
}

function statusTone(status: string) {
  const s = (status || "").toLowerCase()
  if (s === "success") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
  if (s === "failed") return "bg-rose-500/10 text-rose-700 dark:text-rose-300"
  return "bg-muted/40 text-muted-foreground"
}

export function ScheduledTasksClient() {
  const [tasks, setTasks] = React.useState<ScheduledTask[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [openEditor, setOpenEditor] = React.useState(false)
  const [editing, setEditing] = React.useState<ScheduledTask | null>(null)
  const [form, setForm] = React.useState<TaskForm>(EMPTY_FORM)
  const [editorError, setEditorError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  const [openRuns, setOpenRuns] = React.useState(false)
  const [runsTask, setRunsTask] = React.useState<ScheduledTask | null>(null)
  const [runs, setRuns] = React.useState<ScheduledTaskRun[]>([])
  const [runsLoading, setRunsLoading] = React.useState(false)
  const [runsError, setRunsError] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    if (!getAccessToken()) {
      setTasks([])
      setError("请先登录后查看定时任务")
      return
    }
    setLoading(true)
    try {
      const data = await listScheduledTasks()
      setTasks(data)
      setError(null)
    } catch (e) {
      setTasks([])
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (!getAccessToken()) {
      window.dispatchEvent(new Event("auth:required"))
      setTasks([])
      setError("请先登录后查看定时任务")
      return
    }
    load()
    const onToken = () => load()
    window.addEventListener("auth:token", onToken)
    return () => window.removeEventListener("auth:token", onToken)
  }, [load])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setEditorError(null)
    setOpenEditor(true)
  }

  function openEdit(t: ScheduledTask) {
    setEditing(t)
    setForm(taskToForm(t))
    setEditorError(null)
    setOpenEditor(true)
  }

  async function save() {
    if (!form.name.trim()) {
      setEditorError("请填写任务名称")
      return
    }

    if (form.schedule_type === "interval") {
      const s = form.schedule_expr.trim()
      let seconds = Number.parseInt(s, 10)
      const minSeconds = 10
      if (!Number.isFinite(seconds)) {
        setEditorError("interval 需要填写整数秒数")
        return
      }
      if (seconds <= 0) seconds = 60
      if (seconds < minSeconds) {
        setEditorError(`interval 不能小于 ${minSeconds}s`)
        return
      }
    }

    setSaving(true)
    setEditorError(null)
    try {
      const nextRunAt =
        form.schedule_type === "once" && form.once_at
          ? `${form.once_at}:00`
          : undefined

      const payload = {
        name: form.name.trim(),
        enabled: form.enabled,
        schedule_type: form.schedule_type,
        schedule_expr: form.schedule_expr.trim(),
        timezone: editing ? form.timezone.trim() || "Asia/Shanghai" : "Asia/Shanghai",
        payload: buildPayload(form),
        next_run_at: nextRunAt,
      }

      if (editing) {
        const updated = await updateScheduledTask(editing.id, payload)
        setTasks((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
      } else {
        const created = await createScheduledTask(payload)
        setTasks((prev) => [created, ...prev])
      }

      setOpenEditor(false)
      setError(null)
      setEditorError(null)
    } catch (e) {
      setEditorError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  async function toggleEnabled(t: ScheduledTask) {
    try {
      const updated = await updateScheduledTask(t.id, { enabled: !t.enabled })
      setTasks((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function remove(t: ScheduledTask) {
    if (!window.confirm(`确认删除定时任务「${t.name}」？`)) return
    try {
      await deleteScheduledTask(t.id)
      setTasks((prev) => prev.filter((x) => x.id !== t.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function openRunsDialog(t: ScheduledTask) {
    setRunsTask(t)
    setOpenRuns(true)
    setRuns([])
    setRunsError(null)
    setRunsLoading(true)
    try {
      const data = await listScheduledTaskRuns(t.id)
      setRuns(data)
    } catch (e) {
      setRunsError(e instanceof Error ? e.message : String(e))
    } finally {
      setRunsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">自动化</div>
        <h1 className="text-2xl font-semibold tracking-tight">定时任务</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          到点后将触发后端编排执行（/dispatch/execute）。为避免错乱，暂不支持强制指定智能体。
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border bg-muted/20 p-3 text-sm text-muted-foreground">{error}</div>
      ) : null}

      <Card>
        <CardHeader className="gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">我的任务</CardTitle>
            <CardDescription>
              {loading ? "加载中…" : `共 ${tasks.length} 个`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="rounded-xl" onClick={load} disabled={loading}>
              <RefreshCwIcon className="size-4" />
              刷新
            </Button>

            <Dialog
              open={openEditor}
              onOpenChange={(open) => {
                setOpenEditor(open)
                if (!open) setEditorError(null)
              }}
            >
              <DialogTrigger asChild>
                <Button className="rounded-xl" onClick={openCreate}>
                  <CalendarClockIcon className="size-4" />
                  新建任务
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editing ? "编辑定时任务" : "新建定时任务"}</DialogTitle>
                  <DialogDescription>最小必填：名称 + 触发规则 + payload.text</DialogDescription>
                </DialogHeader>

                {editorError ? (
                  <div className="rounded-xl border bg-muted/20 p-3 text-sm text-muted-foreground">
                    {editorError}
                  </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <div className="text-sm font-medium">名称</div>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="例如：每天早报 / 每分钟冒烟测试"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">触发类型</div>
                    <select
                      value={form.schedule_type}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, schedule_type: e.target.value as TaskForm["schedule_type"] }))
                      }
                      className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                      <option value="interval">interval（秒）</option>
                      <option value="cron">cron</option>
                      <option value="once">once</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">
                      {form.schedule_type === "interval"
                        ? "间隔（秒）"
                        : form.schedule_type === "cron"
                          ? "Cron 表达式"
                          : "执行时间（本地）"}
                    </div>
                    {form.schedule_type === "once" ? (
                      <Input
                        type="datetime-local"
                        value={form.once_at}
                        onChange={(e) => setForm((p) => ({ ...p, once_at: e.target.value }))}
                      />
                    ) : (
                      <Input
                        value={form.schedule_expr}
                        onChange={(e) => setForm((p) => ({ ...p, schedule_expr: e.target.value }))}
                        placeholder={form.schedule_type === "interval" ? "60" : "*/5 * * * *"}
                      />
                    )}
                  </div>

                  {editing ? (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Timezone</div>
                      <Input
                        value={form.timezone}
                        onChange={(e) => setForm((p) => ({ ...p, timezone: e.target.value }))}
                        placeholder="Asia/Shanghai"
                      />
                    </div>
                  ) : null}

                  <div className="space-y-2 sm:col-span-2">
                    <div className="text-sm font-medium">payload.text</div>
                    <textarea
                      value={form.text}
                      onChange={(e) => setForm((p) => ({ ...p, text: e.target.value }))}
                      placeholder="给编排层的输入文本"
                      className="border-input min-h-28 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    />
                  </div>

                  <div className="flex items-center gap-2 sm:col-span-2">
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={form.enabled}
                        onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))}
                      />
                      启用
                    </label>
                  </div>
                </div>

                <DialogFooter>
                  <Button onClick={save} disabled={saving} className="rounded-xl">
                    {saving ? "保存中…" : "保存"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {tasks.length === 0 ? (
            <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
              {loading ? "加载中…" : "暂无任务。点击右上角“新建任务”开始配置。"}
            </div>
          ) : (
            <div className="grid gap-3">
              {tasks.map((t) => (
                <div key={t.id} className="rounded-xl border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-sm font-medium">{t.name}</div>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-medium",
                            t.enabled ? "bg-primary/10 text-primary" : "bg-muted/40 text-muted-foreground"
                          )}
                        >
                          {t.enabled ? "enabled" : "disabled"}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span className="font-mono">{t.schedule_type}</span>
                        {t.schedule_expr ? (
                          <>
                            {" "}
                            · <span className="font-mono">{t.schedule_expr}</span>
                          </>
                        ) : null}
                        {" "}
                        · tz <span className="font-mono">{t.timezone || "Asia/Shanghai"}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        next: <span className="font-mono">{fmt(t.next_run_at)}</span> · last:{" "}
                        <span className="font-mono">{fmt(t.last_run_at)}</span>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => toggleEnabled(t)}
                      >
                        {t.enabled ? "停用" : "启用"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => openRunsDialog(t)}
                      >
                        运行记录
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => openEdit(t)}
                        title="编辑"
                      >
                        <PencilIcon className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => remove(t)}
                        title="删除"
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={openRuns} onOpenChange={setOpenRuns}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>运行记录</DialogTitle>
            <DialogDescription>{runsTask ? `任务：${runsTask.name}` : ""}</DialogDescription>
          </DialogHeader>

          {runsError ? (
            <div className="rounded-xl border bg-muted/20 p-3 text-sm text-muted-foreground">{runsError}</div>
          ) : null}

          <ScrollArea className="h-[420px] rounded-md border">
            <div className="space-y-2 p-3">
              {runsLoading ? (
                <div className="text-sm text-muted-foreground">加载中…</div>
              ) : runs.length === 0 ? (
                <div className="text-sm text-muted-foreground">暂无记录。</div>
              ) : (
                runs.map((r) => (
                  <div key={r.id} className="rounded-lg border bg-background p-3">
                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", statusTone(r.status))}>
                          {r.status}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          started <span className="font-mono">{fmt(r.started_at)}</span>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          finished <span className="font-mono">{fmt(r.finished_at)}</span>
                        </span>
                      </div>
                      {r.trace_id ? (
                        <span className="min-w-0 max-w-full break-all font-mono text-[11px] text-muted-foreground">
                          trace {r.trace_id}
                        </span>
                      ) : null}
                    </div>

                    {r.error ? (
                      <div className="mt-2 rounded-md border bg-rose-500/5 p-2 text-xs text-rose-700 dark:text-rose-300 whitespace-pre-wrap">
                        {r.error}
                      </div>
                    ) : null}

                    {r.result && Object.keys(r.result).length ? (
                      <pre className="mt-2 max-w-full overflow-auto whitespace-pre-wrap break-words rounded-md border bg-muted/20 p-2 text-xs">
                        {JSON.stringify(r.result, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => runsTask && openRunsDialog(runsTask)}
              disabled={!runsTask || runsLoading}
            >
              <RefreshCwIcon className="size-4" />
              刷新
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
