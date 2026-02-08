"use client"

import * as React from "react"
import Link from "next/link"
import { SearchIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { executeAgentServiceAgent, listAgentServiceAgents } from "@/lib/agent-service"
import type { Agent } from "@/lib/agents"
import { listAgents } from "@/lib/agents"

export function AgentsClient() {
  const [q, setQ] = React.useState("")
  const [tag, setTag] = React.useState<string | null>(null)
  const [agents, setAgents] = React.useState<Agent[]>([])
  const [hint, setHint] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [serviceAgents, setServiceAgents] = React.useState<{ name: string; description: string }[]>([])
  const [serviceAgent, setServiceAgent] = React.useState<string>("")
  const [serviceInput, setServiceInput] = React.useState("")
  const [serviceOutput, setServiceOutput] = React.useState("")
  const [serviceError, setServiceError] = React.useState<string | null>(null)
  const [serviceLoading, setServiceLoading] = React.useState(false)

  async function loadAgents() {
    setLoading(true)
    try {
      const data = await listAgents()
      setAgents(data)
      setHint(null)
    } catch (e) {
      setAgents([])
      setHint(`后端不可用：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setLoading(false)
    }
  }

  async function loadServiceAgents() {
    try {
      const data = await listAgentServiceAgents()
      setServiceAgents(data)
      setServiceAgent((prev) => prev || data[0]?.name || "")
      setServiceError(null)
    } catch (e) {
      setServiceAgents([])
      setServiceError(e instanceof Error ? e.message : String(e))
    }
  }

  React.useEffect(() => {
    loadAgents()
    const onToken = () => loadAgents()
    window.addEventListener("auth:token", onToken)
    return () => window.removeEventListener("auth:token", onToken)
  }, [])

  React.useEffect(() => {
    loadServiceAgents()
  }, [])

  const allTags = React.useMemo(() => {
    const s = new Set<string>()
    for (const a of agents) for (const t of a.tags) s.add(t)
    return Array.from(s).sort((a, b) => a.localeCompare(b, "zh-CN"))
  }, [agents])

  const filtered = React.useMemo(() => {
    const query = q.trim()
    return agents.filter((a) => {
      const okTag = !tag || a.tags.includes(tag)
      if (!okTag) return false
      if (!query) return true
      const hay = `${a.name} ${a.handle} ${a.description} ${a.tags.join(" ")} ${a.capabilities.join(" ")}`
      return hay.toLowerCase().includes(query.toLowerCase())
    })
  }, [q, tag, agents])

  async function runServiceAgent() {
    if (!serviceAgent) {
      setServiceError("请选择一个 Agent Service 智能体")
      return
    }
    setServiceLoading(true)
    setServiceError(null)
    try {
      const res = await executeAgentServiceAgent(serviceAgent, serviceInput, {})
      setServiceOutput(res.output ?? "")
    } catch (e) {
      setServiceError(e instanceof Error ? e.message : String(e))
    } finally {
      setServiceLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">FunAiStation</div>
        <h1 className="text-2xl font-semibold tracking-tight">Agents</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          平台内置的智能体清单
        </p>
        {hint ? (
          <div className="rounded-xl border bg-muted/20 p-3 text-sm text-muted-foreground">
            {hint}
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索：名称 / 标签 / 能力（如：SQL、PRD、排错）"
              className="pl-9"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {loading ? "加载中…" : `共 ${filtered.length} 个（总计 ${agents.length}）`}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={tag === null ? "default" : "secondary"}
            className="cursor-pointer"
            onClick={() => setTag(null)}
          >
            全部
          </Badge>
          {allTags.map((t) => (
            <Badge
              key={t}
              variant={tag === t ? "default" : "secondary"}
              className="cursor-pointer"
              onClick={() => setTag(t)}
            >
              {t}
            </Badge>
          ))}
        </div>

        <Separator />

        {filtered.length === 0 ? (
          <div className="rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">
            暂无 Agents 数据（将从数据库读取）。
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((a) => (
              <Card key={a.id} className="overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <span className="truncate">{a.name}</span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {a.handle}
                    </span>
                  </CardTitle>
                  <CardDescription>{a.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {a.tags.slice(0, 3).map((t) => (
                      <Badge key={t} variant="secondary">
                        {t}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/agents/${a.id}`}
                      className="text-sm font-medium underline underline-offset-4"
                    >
                      查看详情
                    </Link>
                    <Link
                      href={`/chat?agent=${encodeURIComponent(String(a.id))}`}
                      className="text-sm font-medium underline underline-offset-4"
                    >
                      用它聊天
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Card className="py-0">
        <CardHeader className="border-b py-4">
          <CardTitle className="text-base">Agent Service 调用</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm sm:w-64"
              value={serviceAgent}
              onChange={(e) => setServiceAgent(e.target.value)}
              disabled={!serviceAgents.length}
            >
              {serviceAgents.length === 0 ? (
                <option value="">暂无可用 Agent</option>
              ) : (
                serviceAgents.map((a) => (
                  <option key={a.name} value={a.name}>
                    {a.name} - {a.description}
                  </option>
                ))
              )}
            </select>
            <Button onClick={runServiceAgent} disabled={serviceLoading || !serviceAgent}>
              {serviceLoading ? "执行中…" : "执行"}
            </Button>
          </div>

          <Input
            value={serviceInput}
            onChange={(e) => setServiceInput(e.target.value)}
            placeholder="输入给 Agent Service 的内容"
          />

          {serviceError ? (
            <div className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
              {serviceError}
            </div>
          ) : null}

          {serviceOutput ? (
            <div className="rounded-md border bg-muted/20 p-3 text-sm whitespace-pre-wrap">
              {serviceOutput}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

