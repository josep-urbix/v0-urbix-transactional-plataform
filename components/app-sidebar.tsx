"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import {
  UserCircle,
  FileText,
  CreditCard,
  Contact,
  Mail,
  MessageSquare,
  ListTodo,
  Settings,
  Wallet,
  Database,
  ChevronRight,
  Workflow,
  Shield,
  Home,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { isAdminRole } from "@/lib/auth/roles"

interface AppSidebarProps {
  userRole?: string
}

export function AppSidebar({ userRole }: AppSidebarProps) {
  const pathname = usePathname()
  const isAdmin = isAdminRole(userRole)

  const isPathActive = (basePath: string) => pathname.startsWith(basePath)
  const isExactPath = (href: string) => pathname === href

  const mainItems = [
    {
      title: "Dashboard",
      icon: Home,
      basePath: "/dashboard",
      items: [{ href: "/dashboard", label: "Home" }],
    },
    {
      title: "Virtual Accounts",
      icon: CreditCard,
      basePath: "/dashboard/virtual-accounts",
      items: [
        { href: "/dashboard/virtual-accounts", label: "Cuentas Virtuales" },
        { href: "/dashboard/virtual-accounts/operation-types", label: "Tipos de Operación" },
        { href: "/dashboard/investors/wallets", label: "Wallets Vinculados" },
      ],
    },
    {
      title: "Inversores",
      icon: UserCircle,
      basePath: "/dashboard/investors",
      items: [
        { href: "/dashboard/investors", label: "Lista de Inversores" },
        { href: "/dashboard/investors/sessions", label: "Sesiones Activas" },
        { href: "/dashboard/investors/devices", label: "Dispositivos" },
        { href: "/dashboard/investors/activity", label: "Actividad" },
      ],
    },
    {
      title: "Documentos",
      icon: FileText,
      basePath: "/dashboard/documents",
      items: [
        { href: "/dashboard/documents", label: "Tipos de Documentos" },
        { href: "/dashboard/documents/signatures", label: "Documentos Firmados" },
        { href: "/dashboard/documents/testing", label: "Testing Documentos" },
      ],
    },
    {
      title: "Tareas",
      icon: ListTodo,
      basePath: "/dashboard/tasks",
      items: [
        { href: "/dashboard/tasks?filter=my-tareas", label: "Mis Tareas" },
        { href: "/dashboard/tasks?filter=pending", label: "Tareas Pendientes" },
        { href: "/dashboard/tasks?filter=critical", label: "Críticas" },
        { href: "/dashboard/tasks?filter=all", label: "Todas las Tareas" },
        { href: "/dashboard/tasks/sla-config", label: "Configuración SLA", adminOnly: true },
        { href: "/dashboard/tasks/types", label: "Tipos de Tareas", adminOnly: true },
        { href: "/dashboard/tasks/processes", label: "Gestión de Procesos", adminOnly: true },
      ],
    },
  ]

  const integrationsItems = [
    {
      title: "Hubspot",
      icon: Contact,
      basePath: "/dashboard/transactions",
      items: [
        { href: "/dashboard/transactions", label: "All Transactions" },
        { href: "/dashboard/transactions/failed", label: "Failed Transactions" },
        { href: "/dashboard/transactions/pending", label: "Pending Transactions" },
        { href: "/dashboard/app-settings", label: "Configuración", adminOnly: true },
      ],
    },
    {
      title: "Lemonway",
      icon: CreditCard,
      basePath: "/dashboard/lemonway",
      items: [
        { href: "/dashboard/admin/lemonway", label: "Panel Admin", adminOnly: true },
        { href: "/dashboard/admin/lemonway/accounts", label: "Crear Cuentas", adminOnly: true },
        { href: "/dashboard/lemonway-transactions", label: "Transacciones" },
        { href: "/dashboard/lemonway-webhooks", label: "Webhooks", adminOnly: true },
        { href: "/dashboard/lemonway-api-explorer", label: "API Explorer", adminOnly: true },
        { href: "/dashboard/lemonway/imports", label: "Importaciones", adminOnly: true },
        { href: "/dashboard/lemonway/temp-movimientos", label: "Movimientos Temp", adminOnly: true },
        { href: "/dashboard/lemonway-config", label: "Configuración", adminOnly: true },
      ],
    },
    {
      title: "Gmail",
      icon: Mail,
      basePath: "/dashboard/email",
      items: [
        { href: "/dashboard/email-templates", label: "Plantillas Email", adminOnly: true },
        { href: "/dashboard/email-sends", label: "Historial Emails", adminOnly: true },
      ],
    },
    {
      title: "SMS",
      icon: MessageSquare,
      basePath: "/dashboard/sms",
      items: [
        { href: "/dashboard/sms/dashboard", label: "Dashboard SMS", adminOnly: true },
        { href: "/dashboard/sms/templates", label: "Plantillas SMS", adminOnly: true },
        { href: "/dashboard/sms/logs", label: "Logs SMS", adminOnly: true },
        { href: "/dashboard/sms/api", label: "API & Credenciales", adminOnly: true },
      ],
    },
  ]

  const toolsItems = [
    {
      title: "BPM",
      icon: Workflow,
      basePath: "/dashboard/bpm",
      items: [
        { href: "/dashboard/bpm", label: "Lista de Procesos" },
        { href: "/dashboard/bpm/events", label: "Eventos" },
      ],
    },
    { href: "/dashboard/payment-accounts", label: "Wallets", icon: Wallet, adminOnly: true },
    { href: "/dashboard/sql-logs", label: "SQL Logs", icon: Database, adminOnly: true },
    { href: "/dashboard/access-logs", label: "Access Logs", icon: Shield, adminOnly: true },
  ]

  const settingsItems = [
    { href: "/dashboard/settings/cron-jobs", label: "Tareas Cron", adminOnly: true },
    { href: "/dashboard/settings/users", label: "Usuarios", adminOnly: true },
    { href: "/dashboard/settings/roles", label: "Roles", adminOnly: true },
    { href: "/dashboard/settings/device-tracking", label: "Device Tracking", adminOnly: true },
    { href: "/dashboard/settings/investor-portal", label: "Investor Portal", adminOnly: true },
    { href: "/dashboard/investors/settings", label: "Configuración OAuth Inversores", adminOnly: true },
    { href: "/dashboard/settings/document-storage", label: "Almacenamiento Docs", adminOnly: true },
    { href: "/dashboard/settings/oauth", label: "Configuración OAuth", adminOnly: true },
    { href: "/dashboard/settings", label: "Mi Perfil" },
  ]

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-3">
        <Link href="/dashboard" className="flex items-center justify-center">
          <Image
            src="/images/urbix-logo-new.png"
            alt="URBIX"
            width={140}
            height={45}
            className="h-9 w-auto group-data-[collapsible=icon]:hidden"
            priority
          />
          <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center w-8 h-8 bg-[#3B5998] rounded-lg">
            <span className="text-white font-bold text-sm">U</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {/* Dashboard - Standalone */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <Collapsible asChild defaultOpen={isPathActive("/dashboard")} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip="Dashboard" isActive={isPathActive("/dashboard")}>
                      <Home className="h-4 w-4" />
                      <span>Dashboard</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={pathname === "/dashboard"}>
                          <Link href="/dashboard">Home</Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Core Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="font-bold">Core</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.slice(1).map((item) => (
                <Collapsible
                  key={item.title}
                  asChild
                  defaultOpen={isPathActive(item.basePath)}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={item.title} isActive={isPathActive(item.basePath)}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                        <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.href}>
                            <SidebarMenuSubButton asChild isActive={pathname.startsWith(subItem.href)}>
                              <Link href={subItem.href}>{subItem.label}</Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Integrations Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="font-bold">Integraciones</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {integrationsItems.map((item) => {
                const hasVisibleItems = item.items.some((subItem) => !subItem.adminOnly || isAdmin)
                if (!hasVisibleItems) return null

                return (
                  <Collapsible
                    key={item.title}
                    asChild
                    defaultOpen={isPathActive(item.basePath)}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.title} isActive={isPathActive(item.basePath)}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                          <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((subItem) => {
                            if (subItem.adminOnly && !isAdmin) return null
                            return (
                              <SidebarMenuSubItem key={subItem.href}>
                                <SidebarMenuSubButton asChild isActive={pathname.startsWith(subItem.href)}>
                                  <Link href={subItem.href}>{subItem.label}</Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            )
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Tools Section */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="font-bold">Herramientas</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {toolsItems.map((item) => {
                  if ("adminOnly" in item && item.adminOnly && !isAdmin) return null

                  // Item with subitems
                  if ("items" in item) {
                    return (
                      <Collapsible
                        key={item.title}
                        asChild
                        defaultOpen={isPathActive(item.basePath)}
                        className="group/collapsible"
                      >
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton tooltip={item.title} isActive={isPathActive(item.basePath)}>
                              <item.icon className="h-4 w-4" />
                              <span>{item.title}</span>
                              <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {item.items.map((subItem) => (
                                <SidebarMenuSubItem key={subItem.href}>
                                  <SidebarMenuSubButton asChild isActive={pathname.startsWith(subItem.href)}>
                                    <Link href={subItem.href}>{subItem.label}</Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    )
                  }

                  // Single item
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)} tooltip={item.label}>
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Settings Section */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="font-bold">Configuración</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <Collapsible
                  asChild
                  defaultOpen={pathname.startsWith("/dashboard/settings")}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip="Settings" isActive={pathname.startsWith("/dashboard/settings")}>
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                        <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {settingsItems.map((item) => {
                          if (item.adminOnly && !isAdmin) return null
                          return (
                            <SidebarMenuSubItem key={item.href}>
                              <SidebarMenuSubButton asChild isActive={isExactPath(item.href)}>
                                <Link href={item.href}>{item.label}</Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <div className="text-xs text-muted-foreground text-center group-data-[collapsible=icon]:hidden">
          © {new Date().getFullYear()} Urbix
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
