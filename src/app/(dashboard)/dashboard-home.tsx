"use client"

import * as React from "react"
import Link from "next/link"
import {
  BarChart3Icon,
  BotIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DatabaseIcon,
  HomeIcon,
  MessagesSquareIcon,
  PlusIcon,
  PuzzleIcon,
  SearchIcon,
  SettingsIcon,
  SparklesIcon,
  WorkflowIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "fun-ai-station.dashboard.sidebarCollapsed"

const navItems = [
  { label: "发现", icon: HomeIcon, active: true },
  { label: "对话", icon: MessagesSquareIcon },
  { label: "Agent", icon: BotIcon },
  { label: "工作流", icon: WorkflowIcon },
  { label: "插件", icon: PuzzleIcon },
  { label: "知识库", icon: DatabaseIcon },
  { label: "数据库", icon: DatabaseIcon },
  { label: "MCP服务", icon: SparklesIcon },
  { label: "数据统计", icon: BarChart3Icon },
  { label: "设置", icon: SettingsIcon },
] as const

const featuredApps = [
  {
    title: "千问模型多语言文档翻译AI助手",
    desc: "基于AI深度解析技术，一键生成多语言精准文档翻译。",
    stats: ["1 技能", "0 文档"],
  },
  {
    title: "智能通话洞察分析助手",
    desc: "精准识别客户需求，自动摘要与可视化洞察。",
    stats: ["1 技能", "1 文档"],
  },
]

const templates = ["全部", "快速上手", "智能客服", "电商", "营销", "销售", "培训", "HR"]

const agentCards = [
  {
    title: "千问模型多语言文档翻译AI助手",
    desc: "基于AI深度解析技术，精准翻译并保持专业术语。",
    stats: ["1 技能", "0 文档"],
  },
  {
    title: "智能通话洞察分析助手",
    desc: "自动识别客户需求，提供结构化分析报告。",
    stats: ["1 技能", "1 文档"],
  },
  {
    title: "Yeah助手",
    desc: "擅长知识检索与语言翻译，也能辅助写作。",
    stats: ["13 技能", "0 文档"],
  },
  {
    title: "文章分析助手",
    desc: "擅长长文意图分析，给出结构化总结。",
    stats: ["1 技能", "1 文档"],
  },
  {
    title: "数据分析助手",
    desc: "上传 Excel/CSV 自动生成图表与洞察。",
    stats: ["1 技能", "1 文档"],
  },
  {
    title: "人人乐家电商城售后",
    desc: "面向客户的售后答疑与工单处理。",
    stats: ["3 技能", "7 文档"],
  },
  {
    title: "抖音分析&脚本生成助手",
    desc: "面向消费品行业的脚本与热点建议。",
    stats: ["4 技能", "0 文档"],
  },
  {
    title: "CloudWav客户挖掘助理",
    desc: "帮助业务快速分析客户画像与触达策略。",
    stats: ["1 技能", "0 文档"],
  },
]

function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = React.useState(false)

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw === "1") setCollapsed(true)
      if (raw === "0") setCollapsed(false)
    } catch {
      // ignore
    }
  }, [])

  const toggle = React.useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0")
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  return { collapsed, setCollapsed, toggle }
}

export function DashboardHome() {
  const { collapsed, toggle } = useSidebarCollapsed()

  return (
    <div className="w-full px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
      <div className="flex min-h-[calc(100dvh-1.5rem)] gap-4 lg:gap-6">
        <aside
          className={cn(
            "shrink-0 rounded-2xl border bg-background/80 backdrop-blur transition-[width] duration-200",
            "hidden lg:flex lg:flex-col",
            collapsed ? "w-[72px] p-3" : "w-[264px] p-5"
          )}
        >
          <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between")}>
            <div className={cn("flex items-center gap-2", collapsed ? "justify-center" : "")}>
              <div className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20">
                <SparklesIcon className="size-4" />
              </div>
              {!collapsed ? (
                <div className="text-base font-semibold tracking-tight">FunAiStation</div>
              ) : null}
            </div>

            <Button
              variant="ghost"
              size="icon-xs"
              onClick={toggle}
              className={cn("rounded-lg", collapsed ? "hidden" : "")}
              aria-label="收起侧边栏"
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
          </div>

          {collapsed ? (
            <div className="mt-3 flex flex-col items-center gap-2">
              <Button
                size="icon"
                className="rounded-xl"
                aria-label="新建Agent"
                title="新建Agent"
              >
                <PlusIcon className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={toggle}
                className="rounded-lg"
                aria-label="展开侧边栏"
                title="展开"
              >
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
          ) : (
            <Button className="mt-4 justify-start gap-2 rounded-xl">
              <PlusIcon className="size-4" />
              新建Agent
            </Button>
          )}

          <nav className={cn("mt-4 space-y-1 text-sm text-muted-foreground", collapsed ? "mt-6" : "mt-6")}>
            {navItems.map((item) => (
              <SidebarItem
                key={item.label}
                icon={item.icon}
                label={item.label}
                active={item.active}
                collapsed={collapsed}
              />
            ))}
          </nav>

          <div className="mt-auto">
            {collapsed ? (
              <div
                className="mx-auto grid size-10 place-items-center rounded-xl border bg-muted/30 text-xs text-muted-foreground"
                title="Yeah积分：剩余0"
              >
                <span className="font-semibold text-foreground">0</span>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground">
                <span>Yeah积分</span>
                <span className="font-semibold text-foreground">剩余0</span>
              </div>
            )}
          </div>
        </aside>

        <main className="min-w-0 flex-1 space-y-6">
          {/* Banner */}
          <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-primary/15 via-fuchsia-500/10 to-sky-500/10 p-6">
            <div className="pointer-events-none absolute -left-24 top-0 h-52 w-52 rounded-full bg-fuchsia-400/20 blur-3xl" />
            <div className="pointer-events-none absolute -right-28 -top-10 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,theme(colors.primary/0.12),transparent_55%)]" />

            <div className="relative flex items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground">发现</div>
                <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                  FunAiStation 专属 AI 解决方案
                </h1>
                <div className="flex items-center gap-2">
                  <Button className="rounded-xl">立即获取 →</Button>
                  <Button variant="outline" className="rounded-xl" asChild>
                    <Link href="/agents">了解更多</Link>
                  </Button>
                </div>
              </div>

              <div className="hidden items-center gap-4 lg:flex">
                <div className="size-20 rounded-2xl bg-white/40 ring-1 ring-border" />
                <div className="size-32 rounded-3xl bg-white/40 ring-1 ring-border" />
              </div>
            </div>
          </section>

          {/* AI应用 + 精选推荐 */}
          <section className="grid gap-6 lg:grid-cols-[1.25fr_2fr]">
            <Card className="border-muted/60">
              <CardHeader>
                <CardTitle className="text-base">AI应用</CardTitle>
                <CardDescription>快速开始：选一个模板，马上可用。</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border bg-background/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary">
                        <SparklesIcon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">Yeah客服</div>
                        <div className="truncate text-xs text-muted-foreground">
                          适用于电商平台，随时随地唤起，辅助客服快速专业问答
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button variant="outline" className="w-full rounded-xl">
                      了解更多 →
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm font-semibold">精选推荐</div>
                <div className="relative w-full max-w-md">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="搜索Agent名称" className="rounded-xl pl-9" />
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {featuredApps.map((app, idx) => (
                  <Card key={app.title} className="border-muted/60">
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <div className="size-11 rounded-full bg-primary/15 ring-2 ring-primary/20" />
                        <div className="min-w-0">
                          <CardTitle className="truncate text-base">{app.title}</CardTitle>
                          <CardDescription className="line-clamp-2">{app.desc}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex items-center gap-4 text-xs text-muted-foreground">
                      {app.stats.map((s) => (
                        <span key={s} className="inline-flex items-center gap-1">
                          <SparklesIcon className="size-3" />
                          {s}
                        </span>
                      ))}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {idx === 0 ? "0" : "1"} 文档
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* Agent 模板 */}
          <section className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="text-base font-semibold">Agent 模板</div>
                <div className="flex flex-wrap items-center gap-2">
                  {templates.map((t, idx) => (
                    <Badge
                      key={t}
                      variant={idx === 0 ? "default" : "secondary"}
                      className="rounded-full"
                    >
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="h-px bg-border" />

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {agentCards.map((card, idx) => (
                <Card key={card.title} className="border-muted/60">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-base">{card.title}</CardTitle>
                      <div className="size-11 rounded-full bg-primary/10 ring-2 ring-primary/15" />
                    </div>
                    <CardDescription>{card.desc}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center gap-4 text-xs text-muted-foreground">
                    {card.stats.map((s) => (
                      <span key={s} className="inline-flex items-center gap-1">
                        <SparklesIcon className="size-3" />
                        {s}
                      </span>
                    ))}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {idx % 2 === 0 ? "0" : "1"} 文档
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

function SidebarItem({
  icon: Icon,
  label,
  active,
  collapsed,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  active?: boolean
  collapsed: boolean
}) {
  return (
    <Link
      href="#"
      title={collapsed ? label : undefined}
      className={cn(
        "group flex items-center rounded-xl transition-colors",
        collapsed ? "justify-center px-0 py-2.5" : "gap-2 px-3 py-2",
        active ? "bg-primary/10 text-foreground" : "hover:bg-muted/60"
      )}
    >
      <Icon className={cn("size-4", active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")} />
      {collapsed ? null : <span>{label}</span>}
    </Link>
  )
}

