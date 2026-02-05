import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ModeToggle } from "@/components/mode-toggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FunAiStation",
  description: "一个聚合多智能体的网页平台：对话、@智能体、工作流编排。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-dvh bg-background text-foreground antialiased`}
      >
        <ThemeProvider>
          <div className="min-h-dvh">
            <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
              <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
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

            <main className="mx-auto w-full max-w-6xl px-4 py-10">
              {children}
            </main>

            <footer className="border-t py-8 text-sm text-muted-foreground">
              <div className="mx-auto max-w-6xl px-4">
                © {new Date().getFullYear()} FunAiStation
              </div>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
