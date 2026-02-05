import { Suspense } from "react"
import { ChatClient } from "./chat-client"

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">加载中…</div>}>
      <ChatClient />
    </Suspense>
  )
}

