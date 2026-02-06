import Link from "next/link"
import { notFound } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { AGENTS, getAgentById } from "@/lib/agents"

export function generateStaticParams() {
  return AGENTS.map((a) => ({ agentId: a.id }))
}

export default function AgentDetailPage({
  params,
}: {
  params: { agentId: string }
}) {
  const agent = getAgentById(params.agentId)
  if (!agent) notFound()

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">FunAiStation</div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">{agent.name}</h1>
          <div className="flex items-center gap-2">
            <div className="font-mono text-xs text-muted-foreground">{agent.handle}</div>
            <Button asChild size="sm">
              <Link href={`/chat?agent=${encodeURIComponent(agent.id)}`}>用它聊天</Link>
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
            - 试试在聊天里输入：<span className="font-mono">@研发助手</span> 帮我生成一个 Next.js + FastAPI
            的项目结构
          </div>
          <div>
            - 或者：<span className="font-mono">@产品经理</span> 给我写一个多智能体平台的 PRD 大纲
          </div>
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

