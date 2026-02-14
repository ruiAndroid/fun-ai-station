"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CornerDownLeftIcon, MessageSquarePlusIcon, SparklesIcon } from "lucide-react"

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
import { apiFetch } from "@/lib/api"
import { executeAgentServiceAgent } from "@/lib/agent-service"
import { findAgentById, listAgents, type Agent } from "@/lib/agents"
import {
  createChatMessage,
  createChatSession,
  deleteChatSession,
  listChatMessages,
  listChatSessions,
  updateChatSession,
} from "@/lib/chat-api"
import { clearAccessToken, getAccessToken } from "@/lib/auth-storage"

type Role = "user" | "assistant"

type ChatMessage = {
  id: string
  role: Role
  agentId?: number
  content: string
  createdAt: number
}

type Conversation = {
  id: string
  title: string
  defaultAgentId: number | null
  messages: ChatMessage[]
  updatedAt: number
  backendSessionId?: string
}

function uid() {
  return (
    (typeof globalThis.crypto !== "undefined" &&
      "randomUUID" in globalThis.crypto &&
      globalThis.crypto.randomUUID()) ||
    `${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`
  )
}

type MentionHit = { agent: Agent; start: number; end: number }

function findMentionHits(content: string, agents: Agent[]): MentionHit[] {
  const hits: MentionHit[] = []

  const normalize = (s: string) => s.trim().toLowerCase()
  const stripAt = (s: string) => (s.startsWith("@") ? s.slice(1) : s)
  const stripTailPunct = (s: string) =>
    s.replace(/[，,。.!！?？:：;；、)\]）】》]+$/g, "")

  function matchAgent(tokenRaw: string) {
    const token = stripTailPunct(tokenRaw)
    const t = normalize(stripAt(token))
    if (!t) return null
    for (const a of agents) {
      const code = normalize(a.code || "")
      const name = normalize(a.name || "")
      const handleNoAt = normalize(stripAt(a.handle || ""))
      if (t === code || t === name || t === handleNoAt) return a
    }
    return null
  }

  // Parse all @xxx occurrences. Only treat as mention if at word boundary (start or whitespace).
  const re = /@([^\s@]+)/g
  for (const m of content.matchAll(re)) {
    const idx = m.index ?? -1
    if (idx < 0) continue
    if (idx > 0 && !/\s/.test(content[idx - 1]!)) continue
    const tokenRaw = m[1] ?? ""
    const agent = matchAgent(tokenRaw)
    if (!agent) continue
    hits.push({ agent, start: idx, end: idx + 1 + tokenRaw.length })
  }

  hits.sort((x, y) => x.start - y.start || y.end - x.end)

  // de-overlap
  const out: MentionHit[] = []
  let lastEnd = -1
  for (const h of hits) {
    if (h.start < lastEnd) continue
    out.push(h)
    lastEnd = h.end
  }
  return out
}

function removeMentions(content: string, hits: MentionHit[]) {
  if (!hits.length) return content
  let out = ""
  let last = 0
  for (const h of hits) {
    out += content.slice(last, h.start)
    last = h.end
  }
  out += content.slice(last)
  return out.replace(/\s+/g, " ").trim()
}

function buildDispatchPlan(
  content: string,
  agents: Agent[],
  fallbackAgentId: number | null | undefined
): { items: { agent: Agent; text: string }[]; sessionAgentId: number | null } {
  const hits = findMentionHits(content, agents)
  const cleaned = removeMentions(content, hits)

  if (!hits.length) {
    const targetId = fallbackAgentId ?? agents[0]?.id ?? null
    const target = findAgentById(agents, targetId)
    if (!target) return { items: [], sessionAgentId: null }
    return { items: [{ agent: target, text: content }], sessionAgentId: target.id }
  }

  const items: { agent: Agent; text: string }[] = []
  for (let i = 0; i < hits.length; i++) {
    const cur = hits[i]
    const next = hits[i + 1]
    const seg = content.slice(cur.end, next?.start ?? content.length).trim()
    // If user didn't write segment content, fall back to cleaned message
    items.push({ agent: cur.agent, text: seg || cleaned || content })
  }
  // session agent id: pick first mentioned agent
  return { items, sessionAgentId: items[0]?.agent.id ?? null }
}

async function routeAgentsByBackend(text: string) {
  const res = await apiFetch<{ ok: boolean; agents: string[]; mode?: string }>("/routing/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  })
  return Array.isArray(res.agents) ? res.agents : []
}

function makeTitleFromFirstUserMessage(content: string) {
  const t = content.trim().replace(/\s+/g, " ")
  return t.length > 18 ? `${t.slice(0, 18)}…` : t || "新会话"
}

function isAuthError(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error)
  return msg.includes("Could not validate credentials") || msg.includes("401")
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

  const [agents, setAgents] = React.useState<Agent[]>([])
  const [agentsHint, setAgentsHint] = React.useState<string | null>(null)
  const [serviceError, setServiceError] = React.useState<string | null>(null)
  const [sending, setSending] = React.useState(false)

  const initialAgentId = React.useMemo(() => {
    if (!agentFromUrl) return null
    const n = Number(agentFromUrl)
    return Number.isFinite(n) ? n : null
  }, [agentFromUrl])

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
            agentId: initialAgentId ?? undefined,
            content:
              "欢迎来到 FunAiStation。你可以直接聊天，或在消息里输入 @智能体 来指定处理者。",
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
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null)
  const messagesScrollRef = React.useRef<HTMLDivElement | null>(null)
  const [mention, setMention] = React.useState<MentionState | null>(null)
  const [historyLoading, setHistoryLoading] = React.useState(false)
  const [historyError, setHistoryError] = React.useState<string | null>(null)
  const [sessionsLoaded, setSessionsLoaded] = React.useState(false)
  const [creatingSession, setCreatingSession] = React.useState(false)
  const [renamingId, setRenamingId] = React.useState<string | null>(null)
  const [renameValue, setRenameValue] = React.useState("")

  const loadAgents = React.useCallback(async () => {
    try {
      const data = await listAgents()
      setAgents(data)
      setAgentsHint(null)
    } catch (e) {
      setAgents([])
      setAgentsHint(e instanceof Error ? e.message : String(e))
    }
  }, [])

  React.useEffect(() => {
    loadAgents()
    window.addEventListener("auth:token", loadAgents)
    return () => window.removeEventListener("auth:token", loadAgents)
  }, [loadAgents])

  // Require login when entering chat
  React.useEffect(() => {
    const token = getAccessToken()
    if (!token) {
      window.dispatchEvent(new Event("auth:required"))
    }
  }, [])

  React.useEffect(() => {
    async function loadSessions() {
      const token = getAccessToken()
      if (!token || sessionsLoaded) return
      try {
        const sessions = await listChatSessions()
        if (!sessions.length) {
          setSessionsLoaded(true)
          return
        }
        const mapped = sessions.map((s) => ({
            id: uid(),
            title: s.title || "新会话",
            defaultAgentId: s.agent_id ?? null,
            updatedAt: new Date(s.updated_at).getTime(),
            backendSessionId: s.id,
            messages: [],
        }))
        setConversations(mapped)
        setActiveId(mapped[0]?.id ?? "")
      } catch (e) {
        if (isAuthError(e)) {
          clearAccessToken()
          window.dispatchEvent(new Event("auth:required"))
          setHistoryError(null)
          return
        }
        setHistoryError(e instanceof Error ? e.message : String(e))
      } finally {
        setSessionsLoaded(true)
      }
    }
    loadSessions()
  }, [sessionsLoaded])

  React.useEffect(() => {
    async function loadHistory() {
      const token = getAccessToken()
      if (!token) return
      if (!active?.backendSessionId) return
      setHistoryLoading(true)
      setHistoryError(null)
      try {
        const messages = await listChatMessages(active.backendSessionId)
        const mapped: ChatMessage[] = messages.map((m) => ({
          id: m.id,
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
          createdAt: new Date(m.created_at).getTime(),
        }))
        setConversations((prev) =>
          prev.map((c) => (c.id === active.id ? { ...c, messages: mapped } : c))
        )
      } catch (e) {
        if (isAuthError(e)) {
          clearAccessToken()
          window.dispatchEvent(new Event("auth:required"))
          setHistoryError(null)
          return
        }
        setHistoryError(e instanceof Error ? e.message : String(e))
      } finally {
        setHistoryLoading(false)
      }
    }
    loadHistory()
  }, [active?.backendSessionId, active?.id])

  React.useEffect(() => {
    // 如果当前会话没有默认智能体，且后端返回了 Agents，则默认选第一个
    if (!agents.length) return
    setConversations((prev) =>
      prev.map((c, idx) => (idx === 0 && !c.defaultAgentId ? { ...c, defaultAgentId: agents[0].id } : c))
    )
  }, [agents])

  React.useEffect(() => {
    const viewport = messagesScrollRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement | null
    if (!viewport) return
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" })
  }, [active?.id, active?.messages.length, historyLoading])

  const mentionCandidates = React.useMemo(() => {
    const q = (mention?.query ?? "").trim().toLowerCase()
    if (!mention?.open) return []
    return agents
      .filter((a) => {
      if (!q) return true
      return (
        a.name.toLowerCase().includes(q) ||
        a.handle.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q)) ||
        a.capabilities.some((c) => c.toLowerCase().includes(q))
      )
    })
      .slice(0, 8)
  }, [mention, agents])

  function updateMentionFromCaret(nextValue: string) {
    const el = textareaRef.current
    const caret = el?.selectionStart ?? nextValue.length
    setMention(computeMentionState(nextValue, caret))
  }

  function onChange(next: string) {
    setDraft(next)
    queueMicrotask(() => updateMentionFromCaret(next))
  }

  function applyMention(agentId: number) {
    const a = findAgentById(agents, agentId)
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

  async function createConversation(withAgentId?: number | null) {
    const id = uid()
    const defaultAgentId = withAgentId ?? agents[0]?.id ?? null
    const c: Conversation = {
      id,
      title: "新会话",
      defaultAgentId,
      updatedAt: Date.now(),
      messages: [
        {
          id: uid(),
          role: "assistant",
          agentId: defaultAgentId ?? undefined,
          content:
            "已创建新会话。提示：输入 @智能体 来将本条消息定向给对应智能体。",
          createdAt: Date.now(),
        },
      ],
    }
    setConversations((prev) => [c, ...prev])
    setActiveId(id)
    setDraft("")
    setMention(null)

    const token = getAccessToken()
    if (!token || defaultAgentId == null) return

    setCreatingSession(true)
    try {
      const session = await createChatSession({
        agent_id: defaultAgentId,
        title: c.title,
      })
      setConversations((prev) =>
        prev.map((item) => (item.id === id ? { ...item, backendSessionId: session.id } : item))
      )
    } catch (e) {
      if (isAuthError(e)) {
        clearAccessToken()
        return
      }
    } finally {
      setCreatingSession(false)
    }
  }

  async function renameConversation() {
    if (!renamingId) return
    const next = renameValue.trim()
    if (!next) return
    const conv = conversations.find((c) => c.id === renamingId)
    setRenamingId(null)
    setRenameValue("")
    if (!conv) return
    setConversations((prev) => prev.map((c) => (c.id === conv.id ? { ...c, title: next } : c)))
    if (conv.backendSessionId) {
      try {
        await updateChatSession(conv.backendSessionId, { title: next })
      } catch (e) {
        if (isAuthError(e)) {
          clearAccessToken()
        }
        // ignore remote errors for now
      }
    }
  }

  async function removeConversation(convId: string) {
    let backendSessionId: string | undefined
    setConversations((prev) => {
      const conv = prev.find((c) => c.id === convId)
      backendSessionId = conv?.backendSessionId
      const next = prev.filter((c) => c.id !== convId)
      if (activeId === convId) {
        setActiveId(next[0]?.id ?? "")
      }
      return next
    })
    if (backendSessionId) {
      try {
        await deleteChatSession(backendSessionId)
      } catch (e) {
        if (isAuthError(e)) {
          clearAccessToken()
        }
        // ignore remote errors for now
      }
    }
  }

  function setDefaultAgent(agentId: number) {
    if (!active) return
    setConversations((prev) =>
      prev.map((c) => (c.id === active.id ? { ...c, defaultAgentId: agentId, updatedAt: Date.now() } : c))
    )
  }

  async function send() {
    if (!active) return
    const content = draft.trim()
    if (!content) return

    const mentionHits = findMentionHits(content, agents)
    let items: { agent: Agent; text: string }[] = []
    let sessionAgentId: number | null = null

    if (mentionHits.length) {
      const plan = buildDispatchPlan(content, agents, active.defaultAgentId ?? agents[0]?.id ?? null)
      items = plan.items
      sessionAgentId = plan.sessionAgentId
    } else {
      // Use backend router (same as WeCom/OpenClaw routing) when no explicit @ mentions.
      try {
        const codes = await routeAgentsByBackend(content)
        const routed: { agent: Agent; text: string }[] = []
        for (const code of codes) {
          const a = agents.find((x) => x.code === code) ?? agents.find((x) => x.name === code) ?? null
          if (a) routed.push({ agent: a, text: content })
        }
        if (routed.length) {
          items = routed
          sessionAgentId = routed[0]!.agent.id
        }
      } catch {
        // ignore router failure; fallback below
      }

      if (!items.length) {
        const plan = buildDispatchPlan(content, agents, active.defaultAgentId ?? agents[0]?.id ?? null)
        items = plan.items
        sessionAgentId = plan.sessionAgentId
      }
    }

    if (!items.length) {
      const assistantMsg: ChatMessage = {
        id: uid(),
        role: "assistant",
        content: "当前没有可用智能体，请稍后再试。",
        createdAt: Date.now(),
      }
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== active.id) return c
          return { ...c, updatedAt: Date.now(), messages: [...c.messages, assistantMsg] }
        })
      )
      return
    }

    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      content,
      createdAt: Date.now(),
    }
    const nextTitle = active.title === "新会话" ? makeTitleFromFirstUserMessage(content) : active.title
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== active.id) return c
        return { ...c, title: nextTitle, updatedAt: Date.now(), messages: [...c.messages, userMsg] }
      })
    )

    setDraft("")
    setMention(null)
    queueMicrotask(() => textareaRef.current?.focus())

    setSending(true)
    const pendingId = uid()
    const pendingMsg: ChatMessage = {
      id: pendingId,
      role: "assistant",
      agentId: items.length === 1 ? items[0]!.agent.id : undefined,
      content:
        items.length === 1
          ? `正在调用智能体 ${items[0]!.agent.name} …`
          : `正在依次调用 ${items.map((i) => i.agent.name).join("、")} …`,
      createdAt: Date.now(),
    }
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== active.id) return c
        return { ...c, updatedAt: Date.now(), messages: [...c.messages, pendingMsg] }
      })
    )
    try {
      const results: { agent: Agent; output: string; error?: string }[] = []
      for (let i = 0; i < items.length; i++) {
        const it = items[i]!
        try {
          const res = await executeAgentServiceAgent(it.agent.code || it.agent.name, it.text, {
            original_input: content,
            segment_index: i,
            segment_total: items.length,
            previous_outputs: results.map((r) => ({
              agent: r.agent.code || r.agent.name,
              output: r.output,
            })),
          })
          results.push({ agent: it.agent, output: res.output ?? "" })
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          results.push({ agent: it.agent, output: "", error: msg })
        }
      }

      const combined =
        results.length === 1
          ? results[0]!.output || (results[0]!.error ? `调用失败：${results[0]!.error}` : "")
          : results
              .map((r) => {
                const body = r.output || (r.error ? `调用失败：${r.error}` : "")
                return `【${r.agent.name}】${body}`
              })
              .join("\n\n")
      const assistantMsg: ChatMessage = {
        id: pendingId,
        role: "assistant",
        agentId: items.length === 1 ? items[0]!.agent.id : undefined,
        content: combined,
        createdAt: Date.now(),
      }
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== active.id) return c
          return {
            ...c,
            updatedAt: Date.now(),
            messages: c.messages.map((m) => (m.id === pendingId ? assistantMsg : m)),
          }
        })
      )

      // Persist to backend if user is authenticated and an agent_id is available.
      if (sessionAgentId != null) {
        let backendSessionId = active.backendSessionId
        if (!backendSessionId) {
          try {
            const session = await createChatSession({
              agent_id: sessionAgentId,
              title: nextTitle,
            })
            backendSessionId = session.id
            setConversations((prev) =>
              prev.map((c) => (c.id === active.id ? { ...c, backendSessionId } : c))
            )
          } catch (e) {
            if (isAuthError(e)) {
              clearAccessToken()
              return
            }
            setServiceError(`保存会话失败：${e instanceof Error ? e.message : String(e)}`)
            return
          }
        }

        try {
          await createChatMessage(backendSessionId, { role: "user", content })
          await createChatMessage(backendSessionId, {
            role: "assistant",
            content: assistantMsg.content,
          })
        } catch (e) {
          if (isAuthError(e)) {
            clearAccessToken()
            return
          }
          setServiceError(`保存消息失败：${e instanceof Error ? e.message : String(e)}`)
        }
      }
    } catch (e) {
      const assistantMsg: ChatMessage = {
        id: pendingId,
        role: "assistant",
        agentId: items.length === 1 ? items[0]!.agent.id : undefined,
        content: `Agent Service 调用失败：${e instanceof Error ? e.message : String(e)}`,
        createdAt: Date.now(),
      }
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== active.id) return c
          return {
            ...c,
            updatedAt: Date.now(),
            messages: c.messages.map((m) => (m.id === pendingId ? assistantMsg : m)),
          }
        })
      )
    } finally {
      setSending(false)
    }
  }

  const defaultAgent = findAgentById(agents, active?.defaultAgentId ?? initialAgentId)

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">FunAiStation</div>
          <h1 className="text-2xl font-semibold tracking-tight">Chat</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            多智能体对话 MVP：会话列表、消息区、默认智能体选择、以及输入框里的 @ 提及选择。
          </p>
          {agentsHint ? (
            <div className="rounded-xl border bg-muted/20 p-3 text-sm text-muted-foreground">
              Agents 未就绪：{agentsHint}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/agents">浏览 Agents</Link>
          </Button>
          <Button onClick={() => createConversation(active?.defaultAgentId)} disabled={creatingSession}>
            <MessageSquarePlusIcon className="size-4" />
            {creatingSession ? "创建中…" : "新会话"}
          </Button>
        </div>
      </div>

      {serviceError ? (
        <div className="fixed right-6 top-20 z-50 max-w-[420px] rounded-md border bg-muted/95 p-3 text-sm text-muted-foreground shadow">
          Agent Service 错误：{serviceError}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="py-0">
          <CardHeader className="border-b py-4">
            <CardTitle className="text-base">会话</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <div className="h-[520px] overflow-y-auto">
              <div className="p-2">
                <div className="space-y-3">
                  {conversations
                    .slice()
                    .sort((a, b) => b.updatedAt - a.updatedAt)
                    .map((c) => {
                      const isActive = c.id === active?.id
                      const a = findAgentById(agents, c.defaultAgentId)
                      return (
                        <div
                          key={c.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            if (renamingId === c.id) return
                            setActiveId(c.id)
                          }}
                          onKeyDown={(e) => {
                            if (renamingId === c.id) return
                            if (e.key === "Enter" || e.key === " ") setActiveId(c.id)
                          }}
                          className={[
                            "relative w-full cursor-pointer select-none rounded-lg px-3 py-4 text-left transition-colors min-w-0",
                            "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                            isActive ? "bg-accent" : "hover:bg-accent/60",
                          ].join(" ")}
                        >
                        <div className="flex min-w-0 items-center justify-between gap-2">
                          {renamingId === c.id ? (
                            <input
                              className="h-7 w-full rounded-md border bg-background px-2 text-sm"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onBlur={renameConversation}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") renameConversation()
                                if (e.key === "Escape") {
                                  setRenamingId(null)
                                  setRenameValue("")
                                }
                              }}
                              autoFocus
                            />
                          ) : (
                            <div className="flex-1 truncate text-left text-sm font-medium">
                              {c.title}
                            </div>
                          )}
                          <Badge variant="secondary" className="shrink-0">
                            {a?.name ?? "—"}
                          </Badge>
                        </div>
                        <div className="mt-1 relative min-w-0 text-xs text-muted-foreground">
                          <div className="min-w-0 truncate pr-24">
                            {c.messages.at(-1)?.content ?? ""}
                          </div>
                          <div className="absolute inset-y-0 right-0 flex items-center gap-2">
                            <button
                              type="button"
                              className="hover:text-foreground"
                              onClick={(e) => {
                                e.stopPropagation()
                                setRenamingId(c.id)
                                setRenameValue(c.title)
                              }}
                            >
                              重命名
                            </button>
                            <button
                              type="button"
                              className="text-destructive hover:text-destructive/80"
                              onClick={(e) => {
                                e.stopPropagation()
                                removeConversation(c.id)
                              }}
                            >
                              删除
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
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
                  <Button variant="outline" size="sm" disabled={!agents.length}>
                    <SparklesIcon className="size-4" />
                    选择默认智能体
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>默认智能体</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {!agents.length ? (
                    <DropdownMenuItem disabled>暂无可用 Agents</DropdownMenuItem>
                  ) : (
                    agents.map((a) => (
                      <DropdownMenuItem key={a.id} onClick={() => setDefaultAgent(a.id)}>
                        <div className="flex w-full items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{a.name}</span>
                            <span className="font-mono text-xs text-muted-foreground">{a.handle}</span>
                          </div>
                          {active?.defaultAgentId === a.id ? "✓" : ""}
                        </div>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>

          <CardContent className="px-0">
            <ScrollArea className="h-[420px]" ref={messagesScrollRef}>
              <div className="space-y-4 p-4">
                {historyLoading ? (
                  <div className="text-xs text-muted-foreground">加载历史消息中…</div>
                ) : null}
                {historyError ? (
                  <div className="text-xs text-muted-foreground">历史消息加载失败：{historyError}</div>
                ) : null}
                {active?.messages.map((m) => (
                  <MessageBubble key={m.id} m={m} agents={agents} />
                ))}
                <div ref={messagesEndRef} />
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
                      placeholder="输入消息，试试 @智能体 ..."
                      className="min-h-[88px] resize-none"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-muted-foreground">
                        使用 @ 选择智能体（数据来自 Agent Service）
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Enter 换行，Ctrl/⌘ + Enter 发送。可在文本中输入 @ 触发智能体选择。
                      </div>
                      <Button onClick={send} disabled={!draft.trim() || sending} className="shrink-0">
                        <CornerDownLeftIcon className="size-4" />
                        {sending ? "发送中…" : "发送"}
                      </Button>
                    </div>
                  </div>
                </PopoverAnchor>

                <PopoverContent align="start" side="top" className="w-[360px] p-2">
                  <Command shouldFilter={false}>
                    <CommandList>
                      <CommandEmpty>没有匹配的智能体</CommandEmpty>
                      <CommandGroup heading="选择要 @ 的智能体">
                        {mentionCandidates.map((a) => (
                          <CommandItem key={a.id} value={String(a.id)} onSelect={() => applyMention(a.id)}>
                            <div className="flex w-full items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium">
                                  {a.name}{" "}
                                  <span className="font-mono text-xs text-muted-foreground">{a.handle}</span>
                                </div>
                                <div className="truncate text-xs text-muted-foreground">{a.description}</div>
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

function MessageBubble({ m, agents }: { m: ChatMessage; agents: Agent[] }) {
  const isUser = m.role === "user"
  const agent = m.agentId ? findAgentById(agents, m.agentId) : null
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
          {!isUser && agent?.handle ? <span className="ml-2 font-mono">{agent.handle}</span> : null}
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

