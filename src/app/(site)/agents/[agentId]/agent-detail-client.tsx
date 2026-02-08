"use client"

import * as React from "react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { executeAgentServiceAgent } from "@/lib/agent-service"
import { getAgent, type Agent } from "@/lib/agents"

export function AgentDetailClient({ agentId }: { agentId: number }) {
  const [loading, setLoading] = React.useState(true)
  const [agent, setAgent] = React.useState<Agent | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [serviceInput, setServiceInput] = React.useState("")
  const [serviceOutput, setServiceOutput] = React.useState("")
  const [serviceError, setServiceError] = React.useState<string | null>(null)
  const [serviceLoading, setServiceLoading] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false

    async function run() {
      if (!Number.isFinite(agentId)) {
        setLoading(false)
        setAgent(null)
        setError("Agent ID 无效")
        return
      }

      setLoading(true)
      setError(null)
      try {
        const data = await getAgent(agentId)
        if (cancelled) return
        setAgent(data)
      } catch (e) {
        if (cancelled) return
        setAgent(null)
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [agentId])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">加载中…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">{error}</div>
        <div>
          <Link href="/agents" className="text-sm font-medium underline underline-offset-4">
            ← 返回 Agents
          </Link>
        </div>
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">Agent 不存在</div>
        <div>
          <Link href="/agents" className="text-sm font-medium underline underline-offset-4">
            ← 返回 Agents
          </Link>
        </div>
      </div>
    )
  }

  async function runServiceAgent() {
    if (!agent?.code) {
      setServiceError("当前 Agent 未配置 code，无法调用 Agent Service")
      return
    }
    setServiceLoading(true)
    setServiceError(null)
    try {
      const res = await executeAgentServiceAgent(agent.code, serviceInput, {})
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">{agent.name}</h1>
          <div className="flex items-center gap-2">
            <div className="font-mono text-xs text-muted-foreground">{agent.handle}</div>
            <Button asChild size="sm">
              <Link href={`/chat?agent=${encodeURIComponent(String(agent.id))}`}>用它聊天</Link>
            </Button>
          </div>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{agent.description}</p>
      </div>

      <Separator />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">标签</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {agent.tags.map((t) => (
              <Badge key={t} variant="secondary">
                {t}
              </Badge>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">能力</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {agent.capabilities.map((c) => (
              <Badge key={c} variant="outline">
                {c}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">示例指令</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div>
            - 试试在聊天里输入：<span className="font-mono">{agent.handle}</span> 帮我生成一个 Next.js + FastAPI 的项目结构
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agent Service 调用</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="text-xs text-muted-foreground">
            绑定的 Agent Service 名称：<span className="font-mono">{agent.code || "—"}</span>
          </div>
          <Input
            value={serviceInput}
            onChange={(e) => setServiceInput(e.target.value)}
            placeholder="输入给 Agent Service 的内容"
          />
          <Button onClick={runServiceAgent} disabled={serviceLoading || !agent.code}>
            {serviceLoading ? "执行中…" : "执行"}
          </Button>
          {serviceError ? (
            <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
              {serviceError}
            </div>
          ) : null}
          {serviceOutput ? (
            <div className="rounded-md border bg-muted/20 p-3 whitespace-pre-wrap text-xs">
              {serviceOutput}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div>
        <Link href="/agents" className="text-sm font-medium underline underline-offset-4">
          ← 返回 Agents
        </Link>
      </div>
    </div>
  )
}

