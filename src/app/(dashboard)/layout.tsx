import { SiteHeader } from "@/components/site/site-header"
import { SiteSidebar } from "@/components/site/site-sidebar"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-muted/20">
      <SiteHeader />
      <div className="mx-auto flex w-full items-stretch gap-4 px-6 py-8 lg:gap-6">
        <SiteSidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}

