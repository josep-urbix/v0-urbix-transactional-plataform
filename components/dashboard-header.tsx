"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { UserMenu } from "@/components/user-menu"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { usePathname } from "next/navigation"

// Map paths to readable names
const pathNames: Record<string, string> = {
  dashboard: "Dashboard",
  investors: "Inversores",
  sessions: "Sesiones",
  devices: "Dispositivos",
  activity: "Actividad",
  settings: "Configuración",
  documents: "Documentos",
  signatures: "Firmas",
  testing: "Testing",
  "virtual-accounts": "Virtual Accounts",
  "operation-types": "Tipos de Operación",
  wallets: "Wallets",
  tasks: "Tareas",
  "my-tasks": "Mis Tareas",
  pending: "Pendientes",
  critical: "Críticas",
  all: "Todas",
  "sla-config": "Configuración SLA",
  types: "Tipos",
  transactions: "Transacciones",
  "app-settings": "Configuración Hubspot",
  "lemonway-transactions": "Transacciones Lemonway",
  "lemonway-webhooks": "Webhooks",
  "lemonway-test": "Probar API",
  "lemonway-config": "Configuración Lemonway",
  "email-templates": "Plantillas Email",
  "email-sends": "Historial Emails",
  sms: "SMS",
  templates: "Plantillas",
  logs: "Logs",
  api: "API",
  bpm: "BPM",
  events: "Eventos",
  "payment-accounts": "Wallets",
  "sql-logs": "SQL Logs",
  users: "Usuarios",
  roles: "Roles",
  "device-tracking": "Device Tracking",
  "investor-portal": "Investor Portal",
  "document-storage": "Almacenamiento Docs",
  oauth: "OAuth",
  "cron-jobs": "Tareas Cron",
}

interface DashboardHeaderProps {
  user: {
    id: string
    email: string
    name: string
    role: string
  }
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  // Build breadcrumb items
  const breadcrumbItems = segments.map((segment, index) => {
    const path = "/" + segments.slice(0, index + 1).join("/")
    const name = pathNames[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
    const isLast = index === segments.length - 1

    return { name, path, isLast }
  })

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[#E6E6E6] bg-white px-4">
      <SidebarTrigger className="-ml-1 text-[#164AA6] hover:bg-[#164AA6]/10" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      <Breadcrumb className="flex-1">
        <BreadcrumbList>
          {breadcrumbItems.map((item, index) => (
            <span key={item.path} className="contents">
              <BreadcrumbItem>
                {item.isLast ? (
                  <BreadcrumbPage className="text-[#164AA6] font-medium">{item.name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={item.path} className="text-[#777777] hover:text-[#164AA6]">
                    {item.name}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!item.isLast && <BreadcrumbSeparator />}
            </span>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <UserMenu user={user} />
    </header>
  )
}
