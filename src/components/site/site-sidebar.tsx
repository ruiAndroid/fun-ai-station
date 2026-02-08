"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { BotIcon, HomeIcon, MessagesSquareIcon, PlusIcon, SettingsIcon, SparklesIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type NavItem = { label: string; href: string; icon: React.ComponentType<{ className?: string }> }

const NAV_ITEMS: NavItem[] = [
  { label: "发现", href: "/", icon: HomeIcon },
  { label: "对话", href: "/chat", icon: MessagesSquareIcon },
  { label: "Agent", href: "/agents", icon: BotIcon },
  { label: "设置", href: "/settings", icon: SettingsIcon },
]

export function SiteSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <aside className="hidden shrink-0 lg:flex">
      <div className="flex h-full w-[264px] flex-col rounded-2xl border bg-background/80 p-5 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20">
            <SparklesIcon className="size-4" />
          </div>
          <div className="text-base font-semibold tracking-tight">FunAiStation</div>
        </div>

        <Button className="mt-4 w-full justify-start gap-2 rounded-xl">
          <PlusIcon className="size-4" />
          新建Agent
        </Button>

        <nav className="mt-4 space-y-1 text-sm text-muted-foreground">
          {NAV_ITEMS.map((item) => {
            const active = item.href !== "#" && pathname === item.href
            const Icon = item.icon
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => router.push(item.href)}
                className={cn(
                  "group flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors",
                  active ? "bg-primary/10 text-foreground" : "hover:bg-muted/60"
                )}
              >
                <Icon
                  className={cn(
                    "size-4",
                    active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}

