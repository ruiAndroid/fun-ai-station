"use client"

import * as React from "react"
import Link from "next/link"
import { SearchIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { AGENTS } from "@/lib/agents"

export function AgentsClient() {
  const [q, setQ] = React.useState("")
  const [tag, setTag] = React.useState<string | null>(null)

  const allTags = React.useMemo(() => {
    const s = new Set<string>()
    for (const a of AGENTS) for (const t of a.tags) s.add(t)
    return Array.from(s).sort((a, b) => a.localeCompare(b, "zh-CN"))
  }, [])

  const filtered = React.useMemo(() => {
    const query = q.trim()
    return AGENTS.filter((a) => {
      const okTag = !tag || a.tags.includes(tag)
      if (!okTag) return false
      if (!query) return true
      const hay = `${a.name} ${a.handle} ${a.description} ${a.tags.join(" ")} ${a.capabilities.join(" ")}`
      return hay.toLowerCase().includes(query.toLowerCase())
    })
  }, [q, tag])

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">FunAiStation</div>
        <h1 className="text-2xl font-semibold tracking-tight">Agents</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          平台内置的智能体清单（MVP）。下一步可以接入后端：配置、版本、权限、发布与市场。
        </p>
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
            共 {filtered.length} 个（总计 {AGENTS.length}）
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
                    href={`/chat?agent=${encodeURIComponent(a.id)}`}
                    className="text-sm font-medium underline underline-offset-4"
                  >
                    用它聊天
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

