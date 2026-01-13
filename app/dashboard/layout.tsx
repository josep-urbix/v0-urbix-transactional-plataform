import type React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { DeviceTrackingWrapper } from "@/components/device-tracking-wrapper"
import { VersionInfo } from "@/components/version-info"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"

export const metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
}

export const dynamic = "force-dynamic"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  return (
    <SidebarProvider>
      <DeviceTrackingWrapper />
      <AppSidebar userRole={session.user.role} />
      <SidebarInset className="bg-[#F2F2F2]">
        <DashboardHeader user={session.user} />
        <main className="flex-1 p-6">{children}</main>
        <footer className="border-t border-[#E6E6E6] bg-white mt-auto">
          <div className="px-6 py-3 flex items-center justify-between">
            <p className="text-xs text-[#777777]">© {new Date().getFullYear()} Urbix. All rights reserved.</p>
            <VersionInfo />
          </div>
        </footer>
      </SidebarInset>
    </SidebarProvider>
  )
}
