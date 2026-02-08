"use client"

import * as React from "react"
import { LogInIcon, LogOutIcon, UserIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { apiFetch } from "@/lib/api"
import { clearAccessToken, getAccessToken, setAccessToken } from "@/lib/auth-storage"

type TokenResponse = { access_token: string; token_type: string }
type MeResponse = { id: string; email: string }
type RegisterResponse = { id: string; email: string }

export function LoginDialog() {
  const [open, setOpen] = React.useState(false)
  const [mode, setMode] = React.useState<"login" | "register">("login")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [password2, setPassword2] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [me, setMe] = React.useState<MeResponse | null>(null)
  const [authed, setAuthed] = React.useState(false)

  async function refreshMe() {
    try {
      if (!getAccessToken()) {
        setMe(null)
        setAuthed(false)
        return
      }
      const data = await apiFetch<MeResponse>("/auth/me")
      setMe(data)
      setAuthed(true)
    } catch {
      setMe(null)
      setAuthed(false)
    }
  }

  async function doLogin(nextEmail: string, nextPassword: string) {
    const body = new URLSearchParams()
    body.set("username", nextEmail)
    body.set("password", nextPassword)

    const token = await apiFetch<TokenResponse>("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      token: null,
    })

    setAccessToken(token.access_token)
    setOpen(false)
    setPassword("")
    setPassword2("")
    await refreshMe()
  }

  React.useEffect(() => {
    setAuthed(!!getAccessToken())
    refreshMe()
    const onToken = () => refreshMe()
    window.addEventListener("auth:token", onToken)
    return () => window.removeEventListener("auth:token", onToken)
  }, [])

  async function login() {
    setLoading(true)
    setError(null)
    try {
      await doLogin(email, password)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  async function register() {
    setLoading(true)
    setError(null)
    try {
      if (password !== password2) {
        throw new Error("两次输入的密码不一致")
      }

      await apiFetch<RegisterResponse>("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        token: null,
      })

      // 注册成功后自动登录
      await doLogin(email, password)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    clearAccessToken()
    setMe(null)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {authed ? (
          <Button variant="ghost" size="sm" className="gap-2">
            <UserIcon className="size-4" />
            {me?.email ?? "已登录"}
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="gap-2">
            <LogInIcon className="size-4" />
            登录
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{authed ? "账号" : mode === "login" ? "登录" : "注册"}</DialogTitle>
          <DialogDescription className="sr-only">
            登录或注册 FunAiStation 账号
          </DialogDescription>
        </DialogHeader>

        {authed ? (
          <div className="space-y-3">
            <div className="rounded-xl border bg-muted/20 p-3 text-sm">
              当前账号：<span className="font-medium">{me?.email ?? "—"}</span>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                关闭
              </Button>
              <Button variant="destructive" onClick={logout} className="gap-2">
                <LogOutIcon className="size-4" />
                退出登录
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <Tabs value={mode} onValueChange={(v) => setMode(v as "login" | "register")}>
              <TabsList className="w-full">
                <TabsTrigger value="login" className="flex-1">
                  登录
                </TabsTrigger>
                <TabsTrigger value="register" className="flex-1">
                  注册
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-3">
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault()
                    login()
                  }}
                >
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="邮箱（如 dev2@example.com）"
                  autoComplete="email"
                />
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="密码"
                  type="password"
                  autoComplete="current-password"
                />

                {error ? <div className="text-sm text-destructive">{error}</div> : null}

                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    取消
                  </Button>
                  <Button type="submit" disabled={loading || !email.trim() || !password}>
                    {loading ? "登录中…" : "登录"}
                  </Button>
                </DialogFooter>
                </form>
              </TabsContent>

              <TabsContent value="register" className="space-y-3">
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault()
                    register()
                  }}
                >
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="邮箱（用于登录）"
                  autoComplete="email"
                />
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="密码"
                  type="password"
                  autoComplete="new-password"
                />
                <Input
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  placeholder="确认密码"
                  type="password"
                  autoComplete="new-password"
                />

                {error ? <div className="text-sm text-destructive">{error}</div> : null}

                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    取消
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      loading ||
                      !email.trim() ||
                      !password ||
                      !password2 ||
                      password !== password2
                    }
                  >
                    {loading ? "注册中…" : "注册并登录"}
                  </Button>
                </DialogFooter>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

