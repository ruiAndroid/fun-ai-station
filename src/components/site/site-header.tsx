"use client"

import Link from "next/link"

import { LoginDialog } from "@/components/auth/login-dialog"
import { ModeToggle } from "@/components/mode-toggle"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center justify-between px-6">
        <Link href="/" className="font-semibold tracking-tight">
          FunAiStation
        </Link>
        <div className="flex items-center gap-1">
          <nav className="flex items-center gap-4 px-2 text-sm text-muted-foreground">
            <Link href="/agents" className="hover:text-foreground">
              Agents
            </Link>
            <Link href="/chat" className="hover:text-foreground">
              Chat
            </Link>
          </nav>
          <LoginDialog />
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}

