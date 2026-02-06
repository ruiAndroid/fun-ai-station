import Link from "next/link"

import { ModeToggle } from "@/components/mode-toggle"

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center justify-between px-6">
          <Link href="/" className="font-semibold tracking-tight">
            FunAiStation
          </Link>
          <div className="flex items-center gap-2">
            <nav className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link href="/agents" className="hover:text-foreground">
                Agents
              </Link>
              <Link href="/chat" className="hover:text-foreground">
                Chat
              </Link>
            </nav>
            <ModeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1400px] px-6 py-8">{children}</main>

      <footer className="border-t py-8 text-sm text-muted-foreground">
        <div className="mx-auto max-w-[1400px] px-6">
          © {new Date().getFullYear()} FunAiStation
        </div>
      </footer>
    </div>
  )
}

