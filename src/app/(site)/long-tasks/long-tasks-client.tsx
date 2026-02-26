"use client"

import * as React from "react"
import { RefreshCwIcon, RocketIcon, XIcon } from "lucide-react"

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
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  cancelLongTask,
  createLongTaskOrchestratorExecute,
  listLongTasks,
  type LongTask,
} from "@/lib/long-tasks"
import { getAccessToken } from "@/lib/auth-storage"

function fmt(iso: string | null | undefined) {
  if (!iso) return "—"
  const s = String(iso)
  const hasTz = /([zZ]|[+-]\\d{2}:\\d{2})$/.test(s)
  const looksIsoNoTz = /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?$/.test(s)
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

function statusTone(status: string) {
  const s = (status || "").toLowerCase()
  if (s === "success") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
  if (s === "failed") return "bg-rose-500/10 text-rose-700 dark:text-rose-300"
  if (s === "running") return "bg-sky-500/10 text-sky-700 dark:text-sky-300"
  if (s === "canceled") return "bg-muted/50 text-muted-foreground"
  return "bg-muted/40 text-muted-foreground"
}

type CreateForm = { title: string; text: string }

const EMPTY_FORM: CreateForm = { title: "", text: "" }

export function LongTasksClient() {
  const [tasks, setTasks] = React.useState<LongTask[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [openCreate, setOpenCreate] = React.useState(false)
  const [form, setForm] = React.useState<CreateForm>(EMPTY_FORM)
  const [creating, setCreating] = React.useState(false)

  const load = React.useCallback(async () => {
    if (!getAccessToken()) {
      setTasks([])
      setError("请先登录后查看长任务。")
      return
    }
    setLoading(true)
    try {
      const data = await listLongTasks()
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
      setError("请先登录后查看长任务。")
      return
    }
    load()
    const onToken = () => load()
    window.addEventListener("auth:token", onToken)
    return () => window.removeEventListener("auth:token", onToken)
  }, [load])

  React.useEffect(() => {
    const hasActive = tasks.some((t) => ["pending", "running"].includes((t.status || "").toLowerCase()))
    if (!hasActive) return
    const id = window.setTimeout(() => load(), 2000)
    return () => window.clearTimeout(id)
  }, [tasks, load])

  async function create() {
    const text = form.text.trim()
    if (!text) {
      setError("请输入要执行的内容。")
      return
    }
    setCreating(true)
    try {
      const created = await createLongTaskOrchestratorExecute({
        title: form.title.trim() || undefined,
        text,
        context: { source: "web-long-task" },
      })
      setTasks((prev) => [created, ...prev])
      setOpenCreate(false)
      setForm(EMPTY_FORM)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setCreating(false)
    }
  }

  async function cancel(t: LongTask) {
    try {
      const updated = await cancelLongTask(t.id)
      setTasks((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">后台异步执行任务</div>
        <h1 className="text-2xl font-semibold tracking-tight">长任务</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          适用于可能超过请求超时的执行（例如：执行一次编排并返回最终 output）。时间按上海时区展示。
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border bg-muted/20 p-3 text-sm text-muted-foreground">{error}</div>
      ) : null}

      <Card>
        <CardHeader className="gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">我的长任务</CardTitle>
            <CardDescription>{loading ? "加载中…" : `共 ${tasks.length} 条`}</CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="rounded-xl" onClick={load} disabled={loading}>
              <RefreshCwIcon className="size-4" />
              刷新
            </Button>

            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
              <DialogTrigger asChild>
                <Button className="rounded-xl" onClick={() => setForm(EMPTY_FORM)}>
                  <RocketIcon className="size-4" />
                  新建长任务
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>新建长任务</DialogTitle>
                  <DialogDescription>当前版本：执行一次编排并返回最终 output。</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">标题（可选）</div>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                      placeholder="例如：生成日报"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">输入</div>
                    <Textarea
                      value={form.text}
                      onChange={(e) => setForm((p) => ({ ...p, text: e.target.value }))}
                      placeholder="请输入要执行的内容…"
                      className="min-h-36"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" className="rounded-xl" onClick={() => setOpenCreate(false)}>
                    取消
                  </Button>
                  <Button onClick={create} disabled={creating} className="rounded-xl">
                    {creating ? "创建中…" : "开始执行"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {tasks.length === 0 ? (
            <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
              {loading ? "加载中…" : "暂无长任务。"}
            </div>
          ) : (
            <div className="grid gap-3">
              {tasks.map((t) => {
                const canCancel = ["pending", "running"].includes((t.status || "").toLowerCase()) && !t.cancel_requested
                return (
                  <div key={t.id} className="rounded-xl border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-sm font-medium">{t.title || `Task #${t.id}`}</div>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[11px] font-medium",
                              statusTone(t.status)
                            )}
                          >
                            {t.status}
                          </span>
                          {t.cancel_requested ? (
                            <span className="rounded-full bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                              cancel_requested
                            </span>
                          ) : null}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          created <span className="font-mono">{fmt(t.created_at)}</span>
                          {" · "}
                          started <span className="font-mono">{fmt(t.started_at)}</span>
                          {" · "}
                          finished <span className="font-mono">{fmt(t.finished_at)}</span>
                        </div>

                        {t.trace_id ? (
                          <div className="text-[11px] text-muted-foreground">
                            trace <span className="break-all font-mono">{t.trace_id}</span>
                          </div>
                        ) : null}

                        {t.error ? (
                          <div className="mt-2 whitespace-pre-wrap rounded-md border bg-rose-500/5 p-2 text-xs text-rose-700 dark:text-rose-300">
                            {t.error}
                          </div>
                        ) : null}

                        {t.output ? (
                          <pre className="mt-2 max-w-full overflow-auto whitespace-pre-wrap break-words rounded-md border bg-muted/20 p-2 text-xs">
                            {t.output}
                          </pre>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                        {canCancel ? (
                          <Button size="sm" variant="outline" className="rounded-xl" onClick={() => cancel(t)}>
                            <XIcon className="size-4" />
                            取消
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    {t.result && Object.keys(t.result).length ? (
                      <ScrollArea className="mt-3 h-[160px] rounded-md border">
                        <pre className="p-2 text-xs">{JSON.stringify(t.result, null, 2)}</pre>
                      </ScrollArea>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

