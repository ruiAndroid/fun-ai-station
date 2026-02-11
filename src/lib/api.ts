import { clearAccessToken, getAccessToken } from "@/lib/auth-storage"

// Default to same-origin reverse proxy. In production, Nginx should proxy:
//   /api/* -> http://127.0.0.1:8001/*
// This avoids accidentally calling the user's own machine via "localhost".
const DEFAULT_BASE_URL = "/api"

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_BASE_URL
}

function getErrorMessage(res: Response, text: string) {
  const fallback = `${res.status} ${res.statusText}`
  if (!text) return fallback

  try {
    const json = JSON.parse(text) as unknown
    if (typeof json === "string") return json || fallback

    if (json && typeof json === "object") {
      const obj = json as Record<string, unknown>
      const detail = obj.detail
      if (typeof detail === "string" && detail.trim()) return detail
      if (detail != null) return typeof detail === "string" ? detail : JSON.stringify(detail)

      const message = obj.message
      if (typeof message === "string" && message.trim()) return message
    }
  } catch {
    // ignore JSON parse errors
  }

  return text || fallback
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const base = getApiBaseUrl().replace(/\/+$/, "")
  const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`

  const token = init.token ?? getAccessToken()

  const headers = new Headers(init.headers ?? {})
  if (!headers.has("Accept")) headers.set("Accept", "application/json")
  if (token) headers.set("Authorization", `Bearer ${token}`)

  const res = await fetch(url, { ...init, headers })
  const text = await res.text()

  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      // Token missing/expired: clear and prompt login globally.
      clearAccessToken()
      window.dispatchEvent(new Event("auth:required"))
    }
    const msg = getErrorMessage(res, text)
    throw new Error(msg)
  }

  if (!text) return undefined as T
  try {
    return JSON.parse(text) as T
  } catch {
    return text as T
  }
}

