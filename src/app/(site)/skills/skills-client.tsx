"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type SkillItem = {
  name: string
  description: string
  version?: string
}

const MOCK_SKILLS: SkillItem[] = [
  { name: "skill: web-search", description: "联网检索与来源引用（占位）", version: "0.1.0" },
  { name: "skill: sql-helper", description: "SQL 生成 / 优化 / 解释（占位）", version: "0.1.0" },
]

export function SkillsClient() {
  const [q, setQ] = React.useState("")

  const filtered = React.useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return MOCK_SKILLS
    return MOCK_SKILLS.filter((s) => `${s.name} ${s.description}`.toLowerCase().includes(query))
  }, [q])

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">扩展</div>
        <h1 className="text-2xl font-semibold tracking-tight">Skills</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          用于为 Agent 增强能力的可复用模块（当前仅前端占位展示，后续再接入后端/配置存储）。
        </p>
      </div>

      <Card>
        <CardHeader className="gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">技能列表</CardTitle>
            <CardDescription>支持搜索、安装、启用等能力（待实现）</CardDescription>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="w-full sm:w-72">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索 Skills…" />
            </div>
            <Button disabled className="rounded-xl">
              新建 Skill（待实现）
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filtered.length === 0 ? (
            <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
              未找到匹配的 Skill。
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((s) => (
                <div key={s.name} className="rounded-xl border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{s.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{s.description}</div>
                    </div>
                    {s.version ? (
                      <div className="shrink-0 rounded-full border px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                        {s.version}
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <Button variant="outline" size="sm" className="rounded-xl" disabled>
                      详情
                    </Button>
                    <Button size="sm" className="rounded-xl" disabled>
                      安装
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

