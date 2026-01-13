"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  GitBranch,
  FileText,
  ChevronDown,
  Eye,
  Pencil,
  PlayCircle,
  Settings,
  Save,
  RotateCcw,
  AlertCircle,
  Shield,
  Users,
  DollarSign,
  Mail,
  Clock,
  CreditCard,
  Database,
  Key,
  Wallet,
  Building2,
  FileSpreadsheet,
  Zap,
} from "lucide-react"
import { toast } from "sonner"

interface Permission {
  key: string
  label: string
  granted: boolean
}

interface PermissionCategory {
  name: string
  icon: React.ReactNode
  permissions: Permission[]
}

interface RoleData {
  name: string
  displayName: string
  description?: string | null
}

export function UnifiedRoleEditor() {
  const [selectedRole, setSelectedRole] = useState<string>("")
  const [roles, setRoles] = useState<RoleData[]>([])
  const [permissionSections, setPermissionSections] = useState<
    { title: string; icon: React.ReactNode; color: string; categories: PermissionCategory[]; expanded: boolean }[]
  >([])
  const [originalPermissions, setOriginalPermissions] = useState<string>("")
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchRoles()
  }, [])

  useEffect(() => {
    if (selectedRole) {
      fetchRolePermissions(selectedRole)
    }
  }, [selectedRole])

  useEffect(() => {
    const currentState = JSON.stringify(permissionSections)
    setHasChanges(currentState !== originalPermissions && originalPermissions !== "")
  }, [permissionSections, originalPermissions])

  async function fetchRoles() {
    console.log("[v0] [UnifiedRoleEditor] Fetching roles from API...")
    try {
      const res = await fetch("/api/roles")
      console.log("[v0] [UnifiedRoleEditor] Roles API response status:", res.status)

      if (res.ok) {
        const data = await res.json()
        console.log("[v0] [UnifiedRoleEditor] Roles API data:", data)
        console.log("[v0] [UnifiedRoleEditor] Roles array length:", data.roles?.length || 0)

        setRoles(data.roles || [])
        if (data.roles && data.roles.length > 0) {
          console.log("[v0] [UnifiedRoleEditor] Setting selected role to:", data.roles[0].name)
          setSelectedRole(data.roles[0].name)
        } else {
          console.log("[v0] [UnifiedRoleEditor] No roles found in response")
        }
      } else {
        console.error("[v0] [UnifiedRoleEditor] Roles API error status:", res.status)
      }
    } catch (error) {
      console.error("[v0] [UnifiedRoleEditor] Error fetching roles:", error)
      toast.error("Error al cargar roles")
    }
  }

  async function fetchRolePermissions(role: string) {
    console.log("[v0] [UnifiedRoleEditor] Fetching permissions for role:", role)
    setIsLoading(true)
    try {
      const res = await fetch(`/api/permissions?role=${role}`)
      console.log("[v0] [UnifiedRoleEditor] Permissions API response status:", res.status)

      if (res.ok) {
        const data = await res.json()
        console.log("[v0] [UnifiedRoleEditor] Permissions data:", data)
        console.log("[v0] [UnifiedRoleEditor] Granted permissions count:", data.permissions?.length || 0)

        const grantedPerms = (data.permissions || []).map((p: any) => p.name)

        const sections = [
          {
            title: "Permisos de Usuarios",
            icon: <Users className="h-5 w-5" />,
            color: "bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400",
            categories: buildUserCategories(grantedPerms),
            expanded: true,
          },
          {
            title: "Permisos de Transacciones",
            icon: <DollarSign className="h-5 w-5" />,
            color: "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400",
            categories: buildTransactionCategories(grantedPerms),
            expanded: true,
          },
          {
            title: "Permisos de Emails",
            icon: <Mail className="h-5 w-5" />,
            color: "bg-cyan-100 dark:bg-cyan-900 text-cyan-600 dark:text-cyan-400",
            categories: buildEmailCategories(grantedPerms),
            expanded: true,
          },
          {
            title: "Permisos de Cron Jobs",
            icon: <Clock className="h-5 w-5" />,
            color: "bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400",
            categories: buildCronCategories(grantedPerms),
            expanded: true,
          },
          {
            title: "Permisos de Payment Accounts",
            icon: <CreditCard className="h-5 w-5" />,
            color: "bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-400",
            categories: buildPaymentAccountCategories(grantedPerms),
            expanded: true,
          },
          {
            title: "Permisos de Field Mappings",
            icon: <FileSpreadsheet className="h-5 w-5" />,
            color: "bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400",
            categories: buildFieldMappingCategories(grantedPerms),
            expanded: true,
          },
          {
            title: "Permisos de Roles y Seguridad",
            icon: <Shield className="h-5 w-5" />,
            color: "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400",
            categories: buildRoleCategories(grantedPerms),
            expanded: true,
          },
          {
            title: "Permisos de SQL Logs",
            icon: <Database className="h-5 w-5" />,
            color: "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400",
            categories: buildSqlLogCategories(grantedPerms),
            expanded: true,
          },
          {
            title: "Permisos de Lemonway",
            icon: <Zap className="h-5 w-5" />,
            color: "bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400",
            categories: buildLemonwayCategories(grantedPerms),
            expanded: true,
          },
          {
            title: "Permisos de Wallets",
            icon: <Wallet className="h-5 w-5" />,
            color: "bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400",
            categories: buildWalletCategories(grantedPerms),
            expanded: true,
          },
          {
            title: "Permisos de Configuración",
            icon: <Settings className="h-5 w-5" />,
            color: "bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400",
            categories: buildAppSettingsCategories(grantedPerms),
            expanded: true,
          },
          {
            title: "Permisos de Cuentas Virtuales",
            icon: <Building2 className="h-5 w-5" />,
            color: "bg-teal-100 dark:bg-teal-900 text-teal-600 dark:text-teal-400",
            categories: buildVirtualAccountCategories(grantedPerms),
            expanded: true,
          },
          {
            title: "Permisos de Tareas",
            icon: <FileText className="h-5 w-5" />,
            color: "bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400",
            categories: buildTaskCategories(grantedPerms),
            expanded: true,
          },
          {
            title: "Permisos BPM",
            icon: <GitBranch className="h-5 w-5" />,
            color: "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400",
            categories: buildBpmCategories(grantedPerms),
            expanded: true,
          },
        ]

        setPermissionSections(sections)
        setOriginalPermissions(JSON.stringify(sections))
      }
    } catch (error) {
      console.error("Error fetching permissions:", error)
      toast.error("Error al cargar permisos")
    } finally {
      setIsLoading(false)
    }
  }

  function buildBpmCategories(grantedPerms: string[]): PermissionCategory[] {
    return [
      {
        name: "Lectura",
        icon: <Eye className="h-4 w-4" />,
        permissions: [
          { key: "bpm:list", label: "Listar procesos", granted: grantedPerms.includes("bpm:list") },
          { key: "bpm:view", label: "Ver detalles", granted: grantedPerms.includes("bpm:view") },
          { key: "bpm:view_runs", label: "Ver ejecuciones", granted: grantedPerms.includes("bpm:view_runs") },
          {
            key: "bpm:view_run_details",
            label: "Ver detalles de ejecución",
            granted: grantedPerms.includes("bpm:view_run_details"),
          },
          { key: "bpm:view_versions", label: "Ver versiones", granted: grantedPerms.includes("bpm:view_versions") },
        ],
      },
      {
        name: "Escritura",
        icon: <Pencil className="h-4 w-4" />,
        permissions: [
          { key: "bpm:create", label: "Crear procesos", granted: grantedPerms.includes("bpm:create") },
          { key: "bpm:update", label: "Editar procesos", granted: grantedPerms.includes("bpm:update") },
          { key: "bpm:delete", label: "Eliminar procesos", granted: grantedPerms.includes("bpm:delete") },
          { key: "bpm:manage_steps", label: "Gestionar pasos", granted: grantedPerms.includes("bpm:manage_steps") },
          {
            key: "bpm:manage_triggers",
            label: "Gestionar triggers",
            granted: grantedPerms.includes("bpm:manage_triggers"),
          },
        ],
      },
      {
        name: "Ejecución",
        icon: <PlayCircle className="h-4 w-4" />,
        permissions: [
          { key: "bpm:execute", label: "Ejecutar procesos", granted: grantedPerms.includes("bpm:execute") },
          { key: "bpm:cancel", label: "Cancelar ejecuciones", granted: grantedPerms.includes("bpm:cancel") },
          { key: "bpm:retry", label: "Reintentar ejecuciones", granted: grantedPerms.includes("bpm:retry") },
          { key: "bpm:schedule", label: "Programar ejecuciones", granted: grantedPerms.includes("bpm:schedule") },
        ],
      },
      {
        name: "Configuración",
        icon: <Settings className="h-4 w-4" />,
        permissions: [
          {
            key: "bpm:manage_schedules",
            label: "Gestionar programaciones",
            granted: grantedPerms.includes("bpm:manage_schedules"),
          },
          { key: "bpm:view_analytics", label: "Ver analíticas", granted: grantedPerms.includes("bpm:view_analytics") },
          {
            key: "bpm:view_audit_logs",
            label: "Ver logs de auditoría",
            granted: grantedPerms.includes("bpm:view_audit_logs"),
          },
        ],
      },
    ]
  }

  function buildTaskCategories(grantedPerms: string[]): PermissionCategory[] {
    return [
      {
        name: "Lectura",
        icon: <Eye className="h-4 w-4" />,
        permissions: [
          { key: "tasks:list", label: "Listar tareas", granted: grantedPerms.includes("tasks:list") },
          { key: "tasks:view", label: "Ver detalles", granted: grantedPerms.includes("tasks:view") },
          { key: "tasks:view_all", label: "Ver todas las tareas", granted: grantedPerms.includes("tasks:view_all") },
        ],
      },
      {
        name: "Escritura",
        icon: <Pencil className="h-4 w-4" />,
        permissions: [
          { key: "tasks:create", label: "Crear tareas", granted: grantedPerms.includes("tasks:create") },
          { key: "tasks:update", label: "Editar tareas", granted: grantedPerms.includes("tasks:update") },
          { key: "tasks:delete", label: "Eliminar tareas", granted: grantedPerms.includes("tasks:delete") },
          { key: "tasks:assign", label: "Asignar tareas", granted: grantedPerms.includes("tasks:assign") },
          { key: "tasks:complete", label: "Completar tareas", granted: grantedPerms.includes("tasks:complete") },
        ],
      },
      {
        name: "Configuración",
        icon: <Settings className="h-4 w-4" />,
        permissions: [
          { key: "tasks:manage_types", label: "Gestionar tipos", granted: grantedPerms.includes("tasks:manage_types") },
          { key: "tasks:manage_sla", label: "Gestionar SLA", granted: grantedPerms.includes("tasks:manage_sla") },
          { key: "tasks:view_stats", label: "Ver estadísticas", granted: grantedPerms.includes("tasks:view_stats") },
        ],
      },
    ]
  }

  function togglePermission(sectionIndex: number, categoryIndex: number, permIndex: number) {
    setPermissionSections((prev) => {
      const newSections = [...prev]
      newSections[sectionIndex].categories[categoryIndex].permissions[permIndex].granted =
        !newSections[sectionIndex].categories[categoryIndex].permissions[permIndex].granted
      return newSections
    })
  }

  function toggleSection(sectionIndex: number) {
    setPermissionSections((prev) => {
      const newSections = [...prev]
      newSections[sectionIndex].expanded = !newSections[sectionIndex].expanded
      return newSections
    })
  }

  async function handleSave() {
    setIsSaving(true)
    try {
      const [currentRes, allPermsRes] = await Promise.all([
        fetch(`/api/permissions?role=${selectedRole}`),
        fetch("/api/permissions"),
      ])

      const currentData = await currentRes.json()
      const allPermsData = await allPermsRes.json()

      const currentPerms = (currentData.permissions || []).map((p: any) => p.name)
      const permissionMap = new Map((allPermsData.permissions || []).map((p: any) => [p.name, p.id]))

      const allPerms = permissionSections.flatMap((section) =>
        section.categories.flatMap((cat) => cat.permissions.filter((p) => p.granted).map((p) => p.key)),
      )

      const toAdd = allPerms.filter((key) => !currentPerms.includes(key))
      const toRemove = currentPerms.filter((key: string) => !allPerms.includes(key))

      console.log("[v0] Permissions to add:", toAdd.length)
      console.log("[v0] Permissions to remove:", toRemove.length)

      for (const permKey of toAdd) {
        const permId = permissionMap.get(permKey)
        if (permId) {
          const response = await fetch("/api/permissions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              role: selectedRole,
              permissionId: permId,
            }),
          })

          if (!response.ok) {
            console.error(`Failed to add permission ${permKey}:`, await response.text())
          }

          await new Promise((resolve) => setTimeout(resolve, 50))
        }
      }

      for (const permKey of toRemove) {
        const permId = permissionMap.get(permKey)
        if (permId) {
          const response = await fetch(`/api/permissions?role=${selectedRole}&permissionId=${permId}`, {
            method: "DELETE",
          })

          if (!response.ok) {
            const errorText = await response.text()
            console.error(`Failed to remove permission ${permKey}:`, errorText)
          }

          await new Promise((resolve) => setTimeout(resolve, 50))
        }
      }

      toast.success("Permisos actualizados correctamente")
      setOriginalPermissions(JSON.stringify(permissionSections))
      setHasChanges(false)
    } catch (error) {
      console.error("Error saving permissions:", error)
      toast.error("Error al guardar permisos")
    } finally {
      setIsSaving(false)
    }
  }

  function handleReset() {
    if (originalPermissions) {
      setPermissionSections(JSON.parse(originalPermissions))
      toast.info("Cambios descartados")
    }
  }

  function getPermissionSummary(categories: PermissionCategory[]): { granted: number; total: number } {
    let granted = 0
    let total = 0
    categories.forEach((cat) => {
      cat.permissions.forEach((perm) => {
        total++
        if (perm.granted) granted++
      })
    })
    return { granted, total }
  }

  const selectedRoleData = roles.find((r) => r.name === selectedRole)

  return (
    <div className="space-y-6">
      {console.log(
        "[v0] [UnifiedRoleEditor] Rendering - roles:",
        roles.length,
        "selected:",
        selectedRole,
        "isLoading:",
        isLoading,
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-xl">Editor de Permisos por Rol</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Selecciona un rol y configura sus permisos en el sistema
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Select value={selectedRole} onValueChange={setSelectedRole} disabled={isLoading}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.name} value={role.name}>
                      {role.displayName || role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasChanges && (
                <>
                  <Button variant="outline" size="sm" onClick={handleReset} disabled={isSaving}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Descartar
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Guardando..." : "Guardar Cambios"}
                  </Button>
                </>
              )}
            </div>
          </div>
          {selectedRoleData?.description && (
            <div className="mt-4 p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">{selectedRoleData.description}</p>
            </div>
          )}
        </CardHeader>
      </Card>

      {hasChanges && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Tienes cambios sin guardar. Haz clic en &quot;Guardar Cambios&quot; para aplicarlos o &quot;Descartar&quot;
            para cancelar.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {permissionSections.map((section, sectionIndex) => {
          const summary = getPermissionSummary(section.categories)

          return (
            <Collapsible key={section.title} open={section.expanded} onOpenChange={() => toggleSection(sectionIndex)}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-lg ${section.color}`}>{section.icon}</div>
                        <div>
                          <CardTitle className="text-base">{section.title}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {summary.granted}/{summary.total} activos
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <ChevronDown
                        className={`h-5 w-5 text-muted-foreground transition-transform ${
                          section.expanded ? "" : "-rotate-90"
                        }`}
                      />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {isLoading ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">Cargando permisos...</div>
                    ) : (
                      <div className="space-y-6">
                        {section.categories.map((category, catIndex) => (
                          <div key={category.name}>
                            <div className="flex items-center gap-2 mb-3">
                              <div className="p-1.5 rounded bg-muted">{category.icon}</div>
                              <h4 className="text-sm font-semibold">{category.name}</h4>
                            </div>
                            <div className="space-y-2 pl-8">
                              {category.permissions.map((perm, permIndex) => (
                                <div key={perm.key} className="flex items-center justify-between py-1.5">
                                  <label htmlFor={perm.key} className="text-sm cursor-pointer flex-1">
                                    {perm.label}
                                  </label>
                                  <Switch
                                    id={perm.key}
                                    checked={perm.granted}
                                    onCheckedChange={() => togglePermission(sectionIndex, catIndex, permIndex)}
                                  />
                                </div>
                              ))}
                            </div>
                            {catIndex < section.categories.length - 1 && <Separator className="mt-4" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )
        })}
      </div>
    </div>
  )
}

function buildUserCategories(grantedPerms: string[]): PermissionCategory[] {
  return [
    {
      name: "Gestión de Usuarios",
      icon: <Users className="h-4 w-4" />,
      permissions: [
        { key: "users:read", label: "Ver usuarios", granted: grantedPerms.includes("users:read") },
        { key: "users:create", label: "Crear usuarios", granted: grantedPerms.includes("users:create") },
        { key: "users:update", label: "Editar usuarios", granted: grantedPerms.includes("users:update") },
        { key: "users:delete", label: "Eliminar usuarios", granted: grantedPerms.includes("users:delete") },
      ],
    },
  ]
}

function buildTransactionCategories(grantedPerms: string[]): PermissionCategory[] {
  return [
    {
      name: "Gestión de Transacciones",
      icon: <DollarSign className="h-4 w-4" />,
      permissions: [
        { key: "transactions:read", label: "Ver transacciones", granted: grantedPerms.includes("transactions:read") },
        {
          key: "transactions:export",
          label: "Exportar transacciones",
          granted: grantedPerms.includes("transactions:export"),
        },
        {
          key: "transactions:manage",
          label: "Gestionar transacciones",
          granted: grantedPerms.includes("transactions:manage"),
        },
      ],
    },
  ]
}

function buildEmailCategories(grantedPerms: string[]): PermissionCategory[] {
  return [
    {
      name: "Gestión de Emails",
      icon: <Mail className="h-4 w-4" />,
      permissions: [
        { key: "emails:send_email", label: "Enviar emails", granted: grantedPerms.includes("emails:send_email") },
        {
          key: "emails:view_email_logs",
          label: "Ver logs de emails",
          granted: grantedPerms.includes("emails:view_email_logs"),
        },
        {
          key: "emails:manage_email_templates",
          label: "Gestionar plantillas",
          granted: grantedPerms.includes("emails:manage_email_templates"),
        },
      ],
    },
  ]
}

function buildCronCategories(grantedPerms: string[]): PermissionCategory[] {
  return [
    {
      name: "Gestión de Cron Jobs",
      icon: <Clock className="h-4 w-4" />,
      permissions: [
        {
          key: "cron:manage_cron_jobs",
          label: "Gestionar cron jobs",
          granted: grantedPerms.includes("cron:manage_cron_jobs"),
        },
        {
          key: "cron:view_cron_logs",
          label: "Ver logs de cron",
          granted: grantedPerms.includes("cron:view_cron_logs"),
        },
      ],
    },
  ]
}

function buildPaymentAccountCategories(grantedPerms: string[]): PermissionCategory[] {
  return [
    {
      name: "Gestión de Payment Accounts",
      icon: <CreditCard className="h-4 w-4" />,
      permissions: [
        {
          key: "payment_accounts:read",
          label: "Ver payment accounts",
          granted: grantedPerms.includes("payment_accounts:read"),
        },
        {
          key: "payment_accounts:create",
          label: "Crear payment accounts",
          granted: grantedPerms.includes("payment_accounts:create"),
        },
        {
          key: "payment_accounts:update",
          label: "Editar payment accounts",
          granted: grantedPerms.includes("payment_accounts:update"),
        },
        {
          key: "payment_accounts:sync",
          label: "Sincronizar payment accounts",
          granted: grantedPerms.includes("payment_accounts:sync"),
        },
      ],
    },
  ]
}

function buildFieldMappingCategories(grantedPerms: string[]): PermissionCategory[] {
  return [
    {
      name: "Gestión de Field Mappings",
      icon: <FileSpreadsheet className="h-4 w-4" />,
      permissions: [
        { key: "field_mappings:read", label: "Ver mappings", granted: grantedPerms.includes("field_mappings:read") },
        {
          key: "field_mappings:create",
          label: "Crear mappings",
          granted: grantedPerms.includes("field_mappings:create"),
        },
        {
          key: "field_mappings:update",
          label: "Editar mappings",
          granted: grantedPerms.includes("field_mappings:update"),
        },
        {
          key: "field_mappings:delete",
          label: "Eliminar mappings",
          granted: grantedPerms.includes("field_mappings:delete"),
        },
      ],
    },
  ]
}

function buildRoleCategories(grantedPerms: string[]): PermissionCategory[] {
  return [
    {
      name: "Gestión de Roles y Permisos",
      icon: <Key className="h-4 w-4" />,
      permissions: [
        { key: "roles:manage_roles", label: "Gestionar roles", granted: grantedPerms.includes("roles:manage_roles") },
        {
          key: "roles:manage_permissions",
          label: "Gestionar permisos",
          granted: grantedPerms.includes("roles:manage_permissions"),
        },
        { key: "roles:assign_roles", label: "Asignar roles", granted: grantedPerms.includes("roles:assign_roles") },
      ],
    },
  ]
}

function buildSqlLogCategories(grantedPerms: string[]): PermissionCategory[] {
  return [
    {
      name: "Gestión de SQL Logs",
      icon: <Database className="h-4 w-4" />,
      permissions: [
        {
          key: "sql_logs:view_sql_logs",
          label: "Ver SQL logs",
          granted: grantedPerms.includes("sql_logs:view_sql_logs"),
        },
        {
          key: "sql_logs:export_sql_logs",
          label: "Exportar SQL logs",
          granted: grantedPerms.includes("sql_logs:export_sql_logs"),
        },
      ],
    },
  ]
}

function buildLemonwayCategories(grantedPerms: string[]): PermissionCategory[] {
  return [
    {
      name: "Gestión de Lemonway",
      icon: <Zap className="h-4 w-4" />,
      permissions: [
        {
          key: "lemonway:manage_lemonway",
          label: "Gestionar Lemonway",
          granted: grantedPerms.includes("lemonway:manage_lemonway"),
        },
        {
          key: "lemonway:view_lemonway_transactions",
          label: "Ver transacciones Lemonway",
          granted: grantedPerms.includes("lemonway:view_lemonway_transactions"),
        },
        {
          key: "lemonway:sync_lemonway",
          label: "Sincronizar Lemonway",
          granted: grantedPerms.includes("lemonway:sync_lemonway"),
        },
      ],
    },
  ]
}

function buildWalletCategories(grantedPerms: string[]): PermissionCategory[] {
  return [
    {
      name: "Gestión de Wallets",
      icon: <Wallet className="h-4 w-4" />,
      permissions: [
        {
          key: "wallets:manage_wallets",
          label: "Gestionar wallets",
          granted: grantedPerms.includes("wallets:manage_wallets"),
        },
        {
          key: "wallets:link_wallets",
          label: "Vincular wallets",
          granted: grantedPerms.includes("wallets:link_wallets"),
        },
        {
          key: "wallets:unlink_wallets",
          label: "Desvincular wallets",
          granted: grantedPerms.includes("wallets:unlink_wallets"),
        },
      ],
    },
  ]
}

function buildAppSettingsCategories(grantedPerms: string[]): PermissionCategory[] {
  return [
    {
      name: "Configuración de la Aplicación",
      icon: <Settings className="h-4 w-4" />,
      permissions: [
        {
          key: "app_settings:manage_app_settings",
          label: "Gestionar configuración",
          granted: grantedPerms.includes("app_settings:manage_app_settings"),
        },
      ],
    },
  ]
}

function buildVirtualAccountCategories(grantedPerms: string[]): PermissionCategory[] {
  return [
    {
      name: "Lectura",
      icon: <Eye className="h-4 w-4" />,
      permissions: [
        {
          key: "virtual_accounts:read",
          label: "Ver cuentas virtuales",
          granted: grantedPerms.includes("virtual_accounts:read"),
        },
        {
          key: "virtual_accounts:view_stats",
          label: "Ver estadísticas",
          granted: grantedPerms.includes("virtual_accounts:view_stats"),
        },
        {
          key: "virtual_accounts:view_movements",
          label: "Ver movimientos",
          granted: grantedPerms.includes("virtual_accounts:view_movements"),
        },
      ],
    },
    {
      name: "Escritura",
      icon: <Pencil className="h-4 w-4" />,
      permissions: [
        {
          key: "virtual_accounts:create",
          label: "Crear cuentas",
          granted: grantedPerms.includes("virtual_accounts:create"),
        },
        {
          key: "virtual_accounts:update",
          label: "Editar cuentas",
          granted: grantedPerms.includes("virtual_accounts:update"),
        },
        {
          key: "virtual_accounts:delete",
          label: "Eliminar cuentas",
          granted: grantedPerms.includes("virtual_accounts:delete"),
        },
        {
          key: "virtual_accounts:manage_movements",
          label: "Gestionar movimientos",
          granted: grantedPerms.includes("virtual_accounts:manage_movements"),
        },
      ],
    },
    {
      name: "Administración",
      icon: <Settings className="h-4 w-4" />,
      permissions: [
        {
          key: "virtual_accounts:block",
          label: "Bloquear cuentas",
          granted: grantedPerms.includes("virtual_accounts:block"),
        },
        {
          key: "virtual_accounts:unblock",
          label: "Desbloquear cuentas",
          granted: grantedPerms.includes("virtual_accounts:unblock"),
        },
        {
          key: "virtual_accounts:export_data",
          label: "Exportar datos",
          granted: grantedPerms.includes("virtual_accounts:export_data"),
        },
      ],
    },
  ]
}
