"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type PluginItem = {
  name: string
  description: string
  provider?: string
}

const PLUGINS: PluginItem[] = []

export function PluginsClient() {
  const [q, setQ] = React.useState("")

  const filtered = React.useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return PLUGINS
    return PLUGINS.filter((p) => `${p.name} ${p.description} ${p.provider ?? ""}`.toLowerCase().includes(query))
  }, [q])

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">扩展</div>
        <h1 className="text-2xl font-semibold tracking-tight">Plugins</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          将外部能力以“插件”形式接入（当前仅前端占位展示，后续再接入后端/权限控制）。
        </p>
      </div>

      <Card>
        <CardHeader className="gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">插件列表</CardTitle>
            <CardDescription>支持搜索、安装、启用等能力（待实现）</CardDescription>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="w-full sm:w-72">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索 Plugins…" />
            </div>
            <Button disabled className="rounded-xl">
              新建 Plugin（待实现）
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filtered.length === 0 ? (
            <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
              暂无 Plugins（后续接入后端后展示）。
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((p) => (
                <div key={p.name} className="rounded-xl border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{p.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{p.description}</div>
                    </div>
                    {p.provider ? (
                      <div className="shrink-0 rounded-full border px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                        {p.provider}
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
