"use client"

import * as React from "react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { listAgents, type Agent } from "@/lib/agents"

export function DashboardHome() {
  const [agents, setAgents] = React.useState<Agent[]>([])
  const [agentsHint, setAgentsHint] = React.useState<string | null>(null)
  const [loadingAgents, setLoadingAgents] = React.useState(false)

  const loadAgents = React.useCallback(async () => {
    setLoadingAgents(true)
    try {
      const data = await listAgents()
      setAgents(data)
      setAgentsHint(null)
    } catch (e) {
      setAgents([])
      setAgentsHint(e instanceof Error ? e.message : String(e))
    } finally {
      setLoadingAgents(false)
    }
  }, [])

  React.useEffect(() => {
    loadAgents()
    window.addEventListener("auth:token", loadAgents)
    return () => window.removeEventListener("auth:token", loadAgents)
  }, [loadAgents])

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-primary/15 via-fuchsia-500/10 to-sky-500/10 p-6">
        <div className="pointer-events-none absolute -left-24 top-0 h-52 w-52 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-28 -top-10 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,theme(colors.primary/0.12),transparent_55%)]" />

        <div className="relative flex items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">发现</div>
            <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              FunAiStation 您的专属 AI 解决方案
            </h1>
            <div className="flex items-center gap-2">
              <Button className="rounded-xl">立即获取 →</Button>
              <Button variant="outline" className="rounded-xl" asChild>
                <Link href="/agents">了解更多</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-base font-semibold">Agents</div>
          <Button variant="outline" className="rounded-xl" asChild>
            <Link href="/agents">查看全部</Link>
          </Button>
        </div>

        {agentsHint ? (
          <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
            {agentsHint}
          </div>
        ) : null}

        {loadingAgents ? (
          <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">加载中…</div>
        ) : agents.length === 0 ? (
          <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
            暂无 Agents 数据（将从数据库读取）。
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {agents.slice(0, 8).map((a) => (
              <Card key={a.id} className="border-muted/60">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base">{a.name}</CardTitle>
                    <div className="size-11 rounded-full bg-primary/10 ring-2 ring-primary/15" />
                  </div>
                  <CardDescription className="line-clamp-2">{a.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {a.tags.slice(0, 3).map((t) => (
                    <Badge key={t} variant="secondary" className="rounded-full">
                      {t}
                    </Badge>
                  ))}
                  <Link
                    href={`/agents/${a.id}`}
                    className="ml-auto text-xs font-medium underline underline-offset-4"
                  >
                    查看
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

