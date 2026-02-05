import Link from "next/link"
import {
  ArrowRightIcon,
  BotIcon,
  SparklesIcon,
  WorkflowIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default function Home() {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 -top-28 -z-10 h-[420px] overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500/18 via-fuchsia-500/12 to-emerald-500/12 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,theme(colors.primary/0.08),transparent_62%)]" />
      </div>

      <section className="py-10 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <Badge variant="secondary">MVP</Badge>
              <span className="hidden sm:inline">
                多智能体工作台：对话 + @智能体 + 工作流（即将）
              </span>
              <span className="sm:hidden">对话 + @智能体 + 工作流</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
                FunAiStation
              </h1>
              <p className="text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
                把常用智能体聚合成一个生产力工作台。自由对话或在消息里{" "}
                <span className="font-mono">@提及</span> 指派智能体接管任务，后续沉淀为可复用工作流。
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="h-11 rounded-xl">
                <Link href="/chat">
                  进入 Chat <ArrowRightIcon className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-11 rounded-xl"
              >
                <Link href="/agents">浏览 Agents</Link>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="内置 Agents" value="5+" />
              <Stat label="@提及路由" value="已支持" />
              <Stat label="工作流" value="Coming Soon" />
            </div>
          </div>

          <div className="lg:justify-self-end lg:pl-6">
            <Card className="w-full overflow-hidden lg:max-w-[520px]">
              <CardHeader className="border-b">
                <CardTitle className="text-base">控制台预览</CardTitle>
                <CardDescription>
                  这是一个纯前端交互 MVP 预览，后续将接入后端流式输出与任务队列。
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid gap-0 sm:grid-cols-[200px_1fr]">
                  <div className="border-b p-4 sm:border-b-0 sm:border-r">
                    <div className="text-xs text-muted-foreground">会话</div>
                    <div className="mt-3 space-y-2">
                      <div className="rounded-lg bg-accent px-3 py-2 text-sm">
                        新会话
                        <div className="mt-1 truncate text-xs text-muted-foreground">
                          欢迎来到 FunAiStation…
                        </div>
                      </div>
                      <div className="rounded-lg px-3 py-2 text-sm hover:bg-accent/60">
                        PRD 大纲
                        <div className="mt-1 truncate text-xs text-muted-foreground">
                          @产品经理 给我写…
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        默认智能体：通用助手
                      </div>
                      <Badge variant="secondary">@通用助手</Badge>
                    </div>
                    <div className="mt-4 space-y-3">
                      <div className="rounded-xl border bg-card px-3 py-2 text-sm leading-6">
                        你可以在消息中输入 <span className="font-mono">@研发助手</span>{" "}
                        或 <span className="font-mono">@数据分析</span>{" "}
                        来指定处理者。
                      </div>
                      <div className="ml-auto max-w-[85%] rounded-xl bg-primary px-3 py-2 text-sm leading-6 text-primary-foreground">
                        @研发助手 帮我生成一个 Next.js + FastAPI 的项目结构
                      </div>
                      <div className="rounded-xl border bg-card px-3 py-2 text-sm leading-6">
                        （占位回复）我将由 研发助手 处理这条消息，并以流式输出返回。
                      </div>
                    </div>
                    <div className="mt-4 rounded-xl border bg-background px-3 py-2 text-sm text-muted-foreground">
                      输入框（MVP）…
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Separator />

      <section className="py-10 sm:py-14">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Why</div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              让 AI 更像“工作台”，而不是“聊天工具”
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              FunAiStation 的核心是把智能体能力产品化：可选择、可路由、可复用、可审计。
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Feature
            icon={<SparklesIcon className="size-4" />}
            title="多智能体会话"
            desc="每个会话有默认智能体，消息中 @ 可将单条任务定向给其它智能体。"
            href="/chat"
            cta="去体验 Chat"
          />
          <Feature
            icon={<BotIcon className="size-4" />}
            title="预置智能体库"
            desc="前期提供一批稳定好用的 Agents；后续扩展到可配置、可发布与市场化。"
            href="/agents"
            cta="去浏览 Agents"
          />
          <Feature
            icon={<WorkflowIcon className="size-4" />}
            title="工作流（Coming Soon）"
            desc="把 @智能体 + 工具调用 的执行过程沉淀为可复用流程，支持异步任务与回放。"
            href="/chat"
            cta="先从对话开始"
          />
        </div>
      </section>

      <Separator />

      <section className="py-10 sm:py-14">
        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">How</div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              三步上手：从对话到可复用工作流
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              先把交互跑通，再逐步接入后端：流式输出、工具调用、任务队列、权限与审计。
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">建议里程碑（MVP）</CardTitle>
              <CardDescription>你可以按这个顺序推进。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <Badge variant="secondary">1</Badge>
                <div>
                  Chat + @路由（已完成）
                  <div className="text-xs">
                    会话/消息/默认智能体/提及选择
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="secondary">2</Badge>
                <div>
                  接入后端流式输出（下一步）
                  <div className="text-xs">SSE/WebSocket + token streaming</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="secondary">3</Badge>
                <div>
                  工作流 & 任务队列
                  <div className="text-xs">异步执行、回放、审计</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Step
            n="01"
            title="选一个默认智能体"
            desc="比如“通用助手”作为会话默认处理者。"
          />
          <Step
            n="02"
            title="用 @ 定向派单"
            desc="在消息中 @研发助手 / @数据分析，完成特定任务。"
          />
          <Step
            n="03"
            title="沉淀为工作流"
            desc="把多次成功执行的步骤固化为可复用流程（即将上线）。"
          />
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background/60 px-4 py-3 backdrop-blur">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tracking-tight">{value}</div>
    </div>
  )
}

function Feature({
  icon,
  title,
  desc,
  href,
  cta,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  href: string
  cta: string
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="inline-flex size-8 items-center justify-center rounded-lg border bg-background">
            {icon}
          </span>
          {title}
        </CardTitle>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline" size="sm">
          <Link href={href}>
            {cta} <ArrowRightIcon className="size-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function Step({
  n,
  title,
  desc,
}: {
  n: string
  title: string
  desc: string
}) {
  return (
    <Card>
      <CardHeader>
        <div className="text-xs text-muted-foreground">{n}</div>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
    </Card>
  )
}
