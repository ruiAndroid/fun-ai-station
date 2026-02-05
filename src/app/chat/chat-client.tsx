"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  CornerDownLeftIcon,
  MessageSquarePlusIcon,
  SparklesIcon,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { AGENTS, getAgentById } from "@/lib/agents"

type Role = "user" | "assistant"

type ChatMessage = {
  id: string
  role: Role
  agentId?: string
  content: string
  createdAt: number
}

type Conversation = {
  id: string
  title: string
  defaultAgentId: string
  messages: ChatMessage[]
  updatedAt: number
}

function uid() {
  return (
    (typeof globalThis.crypto !== "undefined" &&
      "randomUUID" in globalThis.crypto &&
      globalThis.crypto.randomUUID()) ||
    `${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`
  )
}

function pickMentionAgentId(content: string) {
  // 简单规则：取第一处命中的 @handle
  for (const a of AGENTS) {
    if (content.includes(a.handle)) return a.id
  }
  return null
}

function makeTitleFromFirstUserMessage(content: string) {
  const t = content.trim().replace(/\s+/g, " ")
  return t.length > 18 ? `${t.slice(0, 18)}…` : t || "新会话"
}

type MentionState = {
  open: boolean
  query: string
  start: number
  end: number
}

function computeMentionState(value: string, caret: number): MentionState | null {
  const before = value.slice(0, caret)
  const at = before.lastIndexOf("@")
  if (at < 0) return null
  const prev = at === 0 ? "" : before[at - 1]
  if (prev && !/\s/.test(prev)) return null
  const query = before.slice(at + 1)
  if (/\s/.test(query)) return null
  return { open: true, query, start: at, end: caret }
}

export function ChatClient() {
  const params = useSearchParams()
  const agentFromUrl = params.get("agent")
  const initialAgentId =
    (agentFromUrl && getAgentById(agentFromUrl)?.id) ?? AGENTS[0]?.id ?? "general"

  const [conversations, setConversations] = React.useState<Conversation[]>(() => {
    const id = uid()
    return [
      {
        id,
        title: "新会话",
        defaultAgentId: initialAgentId,
        updatedAt: Date.now(),
        messages: [
          {
            id: uid(),
            role: "assistant",
            agentId: initialAgentId,
            content:
              "欢迎来到 FunAiStation（前端 MVP）。你可以直接聊天，或在消息里输入 @智能体 来指定处理者。",
            createdAt: Date.now(),
          },
        ],
      },
    ]
  })
  const [activeId, setActiveId] = React.useState(() => conversations[0]?.id ?? "")

  const active = React.useMemo(
    () => conversations.find((c) => c.id === activeId) ?? conversations[0],
    [conversations, activeId]
  )

  React.useEffect(() => {
    if (!activeId && conversations[0]?.id) setActiveId(conversations[0].id)
  }, [activeId, conversations])

  const [draft, setDraft] = React.useState("")
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)
  const [mention, setMention] = React.useState<MentionState | null>(null)

  const mentionCandidates = React.useMemo(() => {
    const q = (mention?.query ?? "").trim().toLowerCase()
    if (!mention?.open) return []
    return AGENTS.filter((a) => {
      if (!q) return true
      return (
        a.name.toLowerCase().includes(q) ||
        a.handle.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q)) ||
        a.capabilities.some((c) => c.toLowerCase().includes(q))
      )
    }).slice(0, 8)
  }, [mention])

  function updateMentionFromCaret(nextValue: string) {
    const el = textareaRef.current
    const caret = el?.selectionStart ?? nextValue.length
    setMention(computeMentionState(nextValue, caret))
  }

  function onChange(next: string) {
    setDraft(next)
    queueMicrotask(() => updateMentionFromCaret(next))
  }

  function applyMention(agentId: string) {
    const a = getAgentById(agentId)
    if (!a || !mention) return
    const insert = a.handle + " "
    const next = draft.slice(0, mention.start) + insert + draft.slice(mention.end)
    const caret = (draft.slice(0, mention.start) + insert).length

    setDraft(next)
    setMention(null)
    queueMicrotask(() => {
      const el = textareaRef.current
      if (!el) return
      el.focus()
      el.setSelectionRange(caret, caret)
    })
  }

  function createConversation(withAgentId?: string) {
    const id = uid()
    const defaultAgentId = withAgentId ?? AGENTS[0]?.id ?? "general"
    const c: Conversation = {
      id,
      title: "新会话",
      defaultAgentId,
      updatedAt: Date.now(),
      messages: [
        {
          id: uid(),
          role: "assistant",
          agentId: defaultAgentId,
          content:
            "已创建新会话。提示：输入 @研发助手 / @数据分析 等，可将本条消息定向给对应智能体。",
          createdAt: Date.now(),
        },
      ],
    }
    setConversations((prev) => [c, ...prev])
    setActiveId(id)
    setDraft("")
    setMention(null)
  }

  function setDefaultAgent(agentId: string) {
    if (!active) return
    setConversations((prev) =>
      prev.map((c) =>
        c.id === active.id ? { ...c, defaultAgentId: agentId, updatedAt: Date.now() } : c
      )
    )
  }

  function send() {
    if (!active) return
    const content = draft.trim()
    if (!content) return

    const targetAgentId = pickMentionAgentId(content) ?? active.defaultAgentId

    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      content,
      // eslint-disable-next-line react-hooks/purity
      createdAt: Date.now(),
    }
    const assistantMsg: ChatMessage = {
      id: uid(),
      role: "assistant",
      agentId: targetAgentId,
      content: `（MVP 占位回复）我将由 ${getAgentById(targetAgentId)?.name ?? "智能体"} 处理这条消息。\n\n下一步：我们会接入后端流式接口，把真实生成内容逐 token 输出到这里。`,
      // eslint-disable-next-line react-hooks/purity
      createdAt: Date.now(),
    }

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== active.id) return c
        const nextTitle = c.title === "新会话" ? makeTitleFromFirstUserMessage(content) : c.title
        return {
          ...c,
          title: nextTitle,
          updatedAt: Date.now(),
          messages: [...c.messages, userMsg, assistantMsg],
        }
      })
    )

    setDraft("")
    setMention(null)
    queueMicrotask(() => textareaRef.current?.focus())
  }

  const defaultAgent = getAgentById(active?.defaultAgentId ?? initialAgentId)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">FunAiStation</div>
          <h1 className="text-2xl font-semibold tracking-tight">Chat</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            多智能体对话 MVP：会话列表、消息区、默认智能体选择、以及输入框里的 @ 提及选择。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/agents">浏览 Agents</Link>
          </Button>
          <Button onClick={() => createConversation(active?.defaultAgentId)}>
            <MessageSquarePlusIcon className="size-4" />
            新会话
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="py-0">
          <CardHeader className="border-b py-4">
            <CardTitle className="text-base">会话</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <ScrollArea className="h-[520px]">
              <div className="p-2">
                {conversations
                  .slice()
                  .sort((a, b) => b.updatedAt - a.updatedAt)
                  .map((c) => {
                    const isActive = c.id === active?.id
                    const a = getAgentById(c.defaultAgentId)
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setActiveId(c.id)}
                        className={[
                          "w-full rounded-lg px-3 py-2 text-left transition-colors",
                          isActive ? "bg-accent" : "hover:bg-accent/60",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate text-sm font-medium">{c.title}</div>
                          <Badge variant="secondary" className="shrink-0">
                            {a?.name ?? "—"}
                          </Badge>
                        </div>
                        <div className="mt-1 truncate text-xs text-muted-foreground">
                          {c.messages.at(-1)?.content ?? ""}
                        </div>
                      </button>
                    )
                  })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="py-0">
          <CardHeader className="border-b py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base">{active?.title ?? "—"}</CardTitle>
                <div className="text-xs text-muted-foreground">
                  默认智能体：{defaultAgent?.name ?? "—"}{" "}
                  <span className="font-mono">{defaultAgent?.handle ?? ""}</span>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <SparklesIcon className="size-4" />
                    选择默认智能体
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>默认智能体</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {AGENTS.map((a) => (
                    <DropdownMenuItem
                      key={a.id}
                      onClick={() => setDefaultAgent(a.id)}
                    >
                      <div className="flex w-full items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{a.name}</span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {a.handle}
                          </span>
                        </div>
                        {active?.defaultAgentId === a.id ? "✓" : ""}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>

          <CardContent className="px-0">
            <ScrollArea className="h-[420px]">
              <div className="space-y-4 p-4">
                {active?.messages.map((m) => (
                  <MessageBubble key={m.id} m={m} />
                ))}
              </div>
            </ScrollArea>

            <Separator />

            <div className="p-4">
              <Popover open={!!mention?.open} onOpenChange={(open) => !open && setMention(null)}>
                <PopoverAnchor asChild>
                  <div className="space-y-2">
                    <Textarea
                      ref={textareaRef}
                      value={draft}
                      onChange={(e) => onChange(e.target.value)}
                      onSelect={() => updateMentionFromCaret(draft)}
                      onKeyUp={() => updateMentionFromCaret(draft)}
                      onKeyDown={(e) => {
                        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                          e.preventDefault()
                          send()
                        }
                      }}
                      placeholder="输入消息，试试 @研发助手 ..."
                      className="min-h-[88px] resize-none"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-muted-foreground">
                        Enter 换行，Ctrl/⌘ + Enter 发送。可在文本中输入 @ 触发智能体选择。
                      </div>
                      <Button
                        onClick={send}
                        disabled={!draft.trim()}
                        className="shrink-0"
                      >
                        <CornerDownLeftIcon className="size-4" />
                        发送
                      </Button>
                    </div>
                  </div>
                </PopoverAnchor>

                <PopoverContent
                  align="start"
                  side="top"
                  className="w-[360px] p-2"
                >
                  <Command shouldFilter={false}>
                    <CommandList>
                      <CommandEmpty>没有匹配的智能体</CommandEmpty>
                      <CommandGroup heading="选择要 @ 的智能体">
                        {mentionCandidates.map((a) => (
                          <CommandItem
                            key={a.id}
                            value={a.id}
                            onSelect={() => applyMention(a.id)}
                          >
                            <div className="flex w-full items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium">
                                  {a.name}{" "}
                                  <span className="font-mono text-xs text-muted-foreground">
                                    {a.handle}
                                  </span>
                                </div>
                                <div className="truncate text-xs text-muted-foreground">
                                  {a.description}
                                </div>
                              </div>
                              <Badge variant="secondary" className="shrink-0">
                                {a.tags[0] ?? "Agent"}
                              </Badge>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MessageBubble({ m }: { m: ChatMessage }) {
  const isUser = m.role === "user"
  const agent = m.agentId ? getAgentById(m.agentId) : null
  return (
    <div className={["flex gap-3", isUser ? "justify-end" : "justify-start"].join(" ")}>
      {!isUser ? (
        <Avatar className="size-8">
          <AvatarFallback>{agent?.name?.slice(0, 1) ?? "A"}</AvatarFallback>
        </Avatar>
      ) : null}

      <div className={["max-w-[78%] space-y-1", isUser ? "items-end" : ""].join(" ")}>
        <div className={["text-xs text-muted-foreground", isUser ? "text-right" : ""].join(" ")}>
          {isUser ? "你" : agent?.name ?? "智能体"}
          {!isUser && agent?.handle ? (
            <span className="ml-2 font-mono">{agent.handle}</span>
          ) : null}
        </div>
        <div
          className={[
            "whitespace-pre-wrap rounded-xl border px-3 py-2 text-sm leading-6",
            isUser ? "bg-primary text-primary-foreground" : "bg-card",
          ].join(" ")}
        >
          {m.content}
        </div>
      </div>

      {isUser ? (
        <Avatar className="size-8">
          <AvatarFallback>你</AvatarFallback>
        </Avatar>
      ) : null}
    </div>
  )
}

