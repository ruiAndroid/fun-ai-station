const TOKEN_KEY = "fun-ai-station.token"

export function getAccessToken() {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(TOKEN_KEY)
}

export function setAccessToken(token: string) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(TOKEN_KEY, token)
  window.dispatchEvent(new Event("auth:token"))
}

export function clearAccessToken() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(TOKEN_KEY)
  window.dispatchEvent(new Event("auth:token"))
}

