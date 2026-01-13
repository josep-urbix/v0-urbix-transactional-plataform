"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Users,
  Shield,
  User,
  Database,
  Wallet,
  CreditCard,
  Clock,
  Mail,
  ChevronDown,
  Settings,
  Contact,
  LayoutDashboard,
  UserCircle,
  Key,
  ListTodo,
  Smartphone,
  FileText,
  MessageSquare,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const navItems = [
  { href: "/dashboard/payment-accounts", label: "Wallets", icon: Wallet, adminOnly: true },
  { href: "/dashboard/sql-logs", label: "Sql", icon: Database, adminOnly: true },
]

const hubspotItems = [
  { href: "/dashboard/transactions", label: "Transactions" },
  { href: "/dashboard/app-settings", label: "Configuración Hubspot", adminOnly: true },
]

const lemonwayItems = [
  { href: "/dashboard/lemonway-transactions", label: "Transacciones" },
  { href: "/dashboard/lemonway-webhooks", label: "Webhooks", adminOnly: true },
  { href: "/dashboard/lemonway-test", label: "Probar Api", adminOnly: true },
  { href: "/dashboard/lemonway-config", label: "Configuración", adminOnly: true },
]

const gmailItems = [
  { href: "/dashboard/email-templates", label: "Plantillas Email", adminOnly: true },
  { href: "/dashboard/email-sends", label: "Historial Emails", adminOnly: true },
]

const smsItems = [
  { href: "/dashboard/sms/dashboard", label: "Dashboard SMS", adminOnly: true },
  { href: "/dashboard/sms/templates", label: "Plantillas SMS", adminOnly: true },
  { href: "/dashboard/sms/logs", label: "Logs SMS", adminOnly: true },
  { href: "/dashboard/sms/api", label: "API & Credenciales", adminOnly: true },
]

const settingsItems = [
  { href: "/dashboard/settings/cron-jobs", label: "Tareas Cron", icon: Clock, adminOnly: true },
  { href: "/dashboard/settings/users", label: "Usuarios", icon: Users, adminOnly: true },
  { href: "/dashboard/settings/roles", label: "Roles", icon: Shield, adminOnly: true },
  { href: "/dashboard/settings/device-tracking", label: "Device Tracking", icon: Smartphone, adminOnly: true },
  { href: "/dashboard/settings/investor-portal", label: "Investor Portal", icon: UserCircle, adminOnly: true },
  { href: "/dashboard/settings/document-storage", label: "Almacenamiento Docs", icon: FileText, adminOnly: true },
  { href: "/dashboard/settings/oauth", label: "Configuración OAuth", icon: Key, adminOnly: true },
  { href: "/dashboard/settings", label: "Mi Perfil", icon: User },
]

const tasksItems = [
  { href: "/dashboard/tasks/my-tasks", label: "Mis Tareas" },
  { href: "/dashboard/tasks/pending", label: "Tareas Pendientes" },
  { href: "/dashboard/tasks/critical", label: "Críticas" },
  { href: "/dashboard/tasks/all", label: "Todas las Tareas" },
  { href: "/dashboard/tasks/sla-config", label: "Configuración SLA", adminOnly: true },
  { href: "/dashboard/tasks/types", label: "Tipos de Tareas", adminOnly: true },
]

const bpmItems = [
  { href: "/dashboard/bpm", label: "Lista de Procesos" },
  { href: "/dashboard/bpm/events", label: "Eventos" },
]

const investorsItems = [
  { href: "/dashboard/investors", label: "Lista de Inversores" },
  { href: "/dashboard/investors/sessions", label: "Sesiones Activas" },
  { href: "/dashboard/investors/devices", label: "Dispositivos" },
  { href: "/dashboard/investors/activity", label: "Actividad" },
  { href: "/dashboard/investors/settings", label: "Configuración" },
]

const virtualAccountsItems = [
  { href: "/dashboard/virtual-accounts", label: "Lista de Cuentas" },
  { href: "/dashboard/virtual-accounts/operation-types", label: "Tipos de Operación" },
  { href: "/dashboard/investors/wallets", label: "Wallets Vinculados" },
]

const documentsItems = [
  { href: "/dashboard/documents", label: "Tipos de Documentos" },
  { href: "/dashboard/documents/signatures", label: "Documentos Firmados" },
  { href: "/dashboard/documents/testing", label: "Testing Documentos" },
]

export function DashboardNav({ userRole }: { userRole?: string }) {
  const pathname = usePathname()
  const isAdmin = userRole?.toLowerCase() === "admin" || userRole?.toLowerCase() === "superadmin"
  const isDashboardHome = pathname === "/dashboard"
  const isHubspotActive =
    pathname.startsWith("/dashboard/transactions") || pathname.startsWith("/dashboard/app-settings")
  const isLemonwayActive =
    pathname.startsWith("/dashboard/lemonway-transactions") ||
    pathname.startsWith("/dashboard/lemonway-webhooks") ||
    pathname.startsWith("/dashboard/lemonway-test") ||
    pathname.startsWith("/dashboard/lemonway-config")
  const isGmailActive =
    pathname.startsWith("/dashboard/email-templates") || pathname.startsWith("/dashboard/email-sends")
  const isSmsActive = pathname.startsWith("/dashboard/sms")
  const isSettingsActive = pathname.startsWith("/dashboard/settings")
  const isBpmActive = pathname.startsWith("/dashboard/bpm")
  const isInvestorsActive = pathname.startsWith("/dashboard/investors")
  const isVirtualAccountsActive = pathname.startsWith("/dashboard/virtual-accounts")
  const isTasksActive = pathname.startsWith("/dashboard/tasks")
  const isDocumentsActive = pathname.startsWith("/dashboard/documents")

  return (
    <nav className="flex gap-4">
      <Link
        href="/dashboard"
        className={cn(
          "text-sm font-medium transition-colors flex items-center gap-1",
          isDashboardHome ? "text-[#0FB7EA]" : "text-white hover:text-white/80",
        )}
      >
        <LayoutDashboard className={cn("h-4 w-4", isDashboardHome ? "text-[#0FB7EA]" : "text-white")} />
        Dashboard
      </Link>

      {isAdmin && (
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "text-sm font-medium transition-colors flex items-center gap-1 outline-none",
              isInvestorsActive ? "text-[#0FB7EA]" : "text-white hover:text-white/80",
            )}
          >
            <UserCircle className="h-4 w-4" />
            Inversores
            <ChevronDown className="h-3 w-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={8} className="bg-white border-[#E6E6E6]">
            {investorsItems.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link
                  href={item.href}
                  className={cn(
                    "w-full cursor-pointer text-[#777777] hover:text-[#164AA6] hover:bg-[#F2F2F2]",
                    pathname === item.href ? "bg-[#F2F2F2] text-[#164AA6]" : "",
                  )}
                >
                  {item.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {isAdmin && (
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "text-sm font-medium transition-colors flex items-center gap-1 outline-none",
              isDocumentsActive ? "text-[#0FB7EA]" : "text-white hover:text-white/80",
            )}
          >
            <FileText className="h-4 w-4" />
            Documentos
            <ChevronDown className="h-3 w-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={8} className="bg-white border-[#E6E6E6]">
            {documentsItems.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link
                  href={item.href}
                  className={cn(
                    "w-full cursor-pointer text-[#777777] hover:text-[#164AA6] hover:bg-[#F2F2F2]",
                    pathname.startsWith(item.href) ? "bg-[#F2F2F2] text-[#164AA6]" : "",
                  )}
                >
                  {item.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {isAdmin && (
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "text-sm font-medium transition-colors flex items-center gap-1 outline-none",
              isVirtualAccountsActive ? "text-[#0FB7EA]" : "text-white hover:text-white/80",
            )}
          >
            <CreditCard className="h-4 w-4" />
            Virtual Accounts
            <ChevronDown className="h-3 w-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={8} className="bg-white border-[#E6E6E6]">
            {virtualAccountsItems.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link
                  href={item.href}
                  className={cn(
                    "w-full cursor-pointer text-[#777777] hover:text-[#164AA6] hover:bg-[#F2F2F2]",
                    pathname === item.href ? "bg-[#F2F2F2] text-[#164AA6]" : "",
                  )}
                >
                  {item.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "text-sm font-medium transition-colors flex items-center gap-1 outline-none",
            isHubspotActive ? "text-[#0FB7EA]" : "text-white hover:text-white/80",
          )}
        >
          <Contact className="h-4 w-4" />
          Hubspot
          <ChevronDown className="h-3 w-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={8} className="bg-white border-[#E6E6E6]">
          {hubspotItems.map((item) => {
            if (item.adminOnly && !isAdmin) {
              return null
            }
            return (
              <DropdownMenuItem key={item.href} asChild>
                <Link
                  href={item.href}
                  className={cn(
                    "w-full cursor-pointer text-[#777777] hover:text-[#164AA6] hover:bg-[#F2F2F2]",
                    pathname.startsWith(item.href) ? "bg-[#F2F2F2] text-[#164AA6]" : "",
                  )}
                >
                  {item.label}
                </Link>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "text-sm font-medium transition-colors flex items-center gap-1 outline-none",
            isLemonwayActive ? "text-[#0FB7EA]" : "text-white hover:text-white/80",
          )}
        >
          <CreditCard className="h-4 w-4" />
          Lemonway
          <ChevronDown className="h-3 w-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={8} className="bg-white border-[#E6E6E6]">
          {lemonwayItems.map((item) => {
            if (item.adminOnly && !isAdmin) {
              return null
            }
            return (
              <DropdownMenuItem key={item.href} asChild>
                <Link
                  href={item.href}
                  className={cn(
                    "w-full cursor-pointer text-[#777777] hover:text-[#164AA6] hover:bg-[#F2F2F2]",
                    pathname.startsWith(item.href) ? "bg-[#F2F2F2] text-[#164AA6]" : "",
                  )}
                >
                  {item.label}
                </Link>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {isAdmin && (
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "text-sm font-medium transition-colors flex items-center gap-1 outline-none",
              isGmailActive ? "text-[#0FB7EA]" : "text-white hover:text-white/80",
            )}
          >
            <Mail className="h-4 w-4" />
            Gmail
            <ChevronDown className="h-3 w-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={8} className="bg-white border-[#E6E6E6]">
            {gmailItems.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link
                  href={item.href}
                  className={cn(
                    "w-full cursor-pointer text-[#777777] hover:text-[#164AA6] hover:bg-[#F2F2F2]",
                    pathname.startsWith(item.href) ? "bg-[#F2F2F2] text-[#164AA6]" : "",
                  )}
                >
                  {item.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {isAdmin && (
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "text-sm font-medium transition-colors flex items-center gap-1 outline-none",
              isSmsActive ? "text-[#0FB7EA]" : "text-white hover:text-white/80",
            )}
          >
            <MessageSquare className="h-4 w-4" />
            SMS
            <ChevronDown className="h-3 w-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={8} className="bg-white border-[#E6E6E6]">
            {smsItems.map((item) => {
              if (item.adminOnly && !isAdmin) {
                return null
              }
              return (
                <DropdownMenuItem key={item.href} asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "w-full cursor-pointer text-[#777777] hover:text-[#164AA6] hover:bg-[#F2F2F2]",
                      pathname.startsWith(item.href) ? "bg-[#F2F2F2] text-[#164AA6]" : "",
                    )}
                  >
                    {item.icon && <item.icon className="h-4 w-4 mr-2" />}
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {navItems.map((item) => {
        if (item.adminOnly && !isAdmin) {
          return null
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "text-sm font-medium transition-colors flex items-center gap-1",
              pathname.startsWith(item.href) ? "text-[#0FB7EA]" : "text-white hover:text-white/80",
            )}
          >
            {item.icon && <item.icon className="h-4 w-4" />}
            {item.label}
          </Link>
        )
      })}

      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "text-sm font-medium transition-colors flex items-center gap-1 outline-none",
            isTasksActive ? "text-[#0FB7EA]" : "text-white hover:text-white/80",
          )}
        >
          <ListTodo className="h-4 w-4" />
          Tareas
          <ChevronDown className="h-3 w-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={8} className="bg-white border-[#E6E6E6]">
          {tasksItems.map((item) => {
            if (item.adminOnly && !isAdmin) {
              return null
            }
            return (
              <DropdownMenuItem key={item.href} asChild>
                <Link
                  href={item.href}
                  className={cn(
                    "w-full cursor-pointer text-[#777777] hover:text-[#164AA6] hover:bg-[#F2F2F2]",
                    pathname === item.href ? "bg-[#F2F2F2] text-[#164AA6]" : "",
                  )}
                >
                  {item.icon && <item.icon className="h-4 w-4 mr-2" />}
                  {item.label}
                </Link>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {isAdmin && (
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "text-sm font-medium transition-colors flex items-center gap-1 outline-none",
              isBpmActive ? "text-[#0FB7EA]" : "text-white hover:text-white/80",
            )}
          >
            <Settings className="h-4 w-4" />
            BPM
            <ChevronDown className="h-3 w-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={8} className="bg-white border-[#E6E6E6]">
            {bpmItems.map((item) => {
              if (item.adminOnly && !isAdmin) {
                return null
              }
              return (
                <DropdownMenuItem key={item.href} asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "w-full cursor-pointer text-[#777777] hover:text-[#164AA6] hover:bg-[#F2F2F2]",
                      pathname.startsWith(item.href) ? "bg-[#F2F2F2] text-[#164AA6]" : "",
                    )}
                  >
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {isAdmin && (
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "text-sm font-medium transition-colors flex items-center gap-1 outline-none",
              isSettingsActive ? "text-[#0FB7EA]" : "text-white hover:text-white/80",
            )}
          >
            <Settings className="h-4 w-4" />
            Settings
            <ChevronDown className="h-3 w-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={8} className="bg-white border-[#E6E6E6]">
            {settingsItems.map((item) => {
              if (item.adminOnly && !isAdmin) {
                return null
              }
              return (
                <DropdownMenuItem key={item.href} asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "w-full cursor-pointer text-[#777777] hover:text-[#164AA6] hover:bg-[#F2F2F2]",
                      pathname.startsWith(item.href) ? "bg-[#F2F2F2] text-[#164AA6]" : "",
                    )}
                  >
                    {item.icon && <item.icon className="h-4 w-4 mr-2" />}
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </nav>
  )
}
