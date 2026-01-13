"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Shield, Users, Save, RefreshCw, Plus, Trash2, ChevronDown, CheckCircle2, Edit } from "lucide-react"
import { Progress } from "@/components/ui/progress"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface Permission {
  id: string
  name: string
  description: string | null
  resource: string
  action: string
}

interface Role {
  id: string
  name: string
  displayName: string
  description: string | null
  isSystem: boolean
  permissionCount: string
}

export function RolesManager() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [editRoleData, setEditRoleData] = useState({ displayName: "", description: "" })
  const [newRole, setNewRole] = useState({ name: "", displayName: "", description: "" })
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  const { data: rolesData, error: rolesError, mutate: mutateRoles } = useSWR<{ roles: Role[] }>("/api/roles", fetcher)

  const { data: allPermissionsData, error: permissionsError } = useSWR<{ permissions: Permission[] }>(
    "/api/permissions",
    fetcher,
  )

  const roles = rolesData?.roles || []
  const allPermissions = allPermissionsData?.permissions || []

  useEffect(() => {
    if (roles.length > 0) {
      Promise.all(
        roles.map(async (role) => {
          const response = await fetch(`/api/permissions?role=${role.name}`)
          const data = await response.json()
          return { role: role.name, permissions: data.permissions.map((p: Permission) => p.id) }
        }),
      ).then((results) => {
        const permsMap: Record<string, string[]> = {}
        results.forEach((result) => {
          permsMap[result.role] = result.permissions
        })
        setRolePermissions(permsMap)
      })
    }
  }, [roles])

  useEffect(() => {
    if (!selectedRole && roles.length > 0) {
      setSelectedRole(roles[0].name)
    }
  }, [roles, selectedRole])

  const groupedPermissions = allPermissions.reduce(
    (acc, perm) => {
      if (!acc[perm.resource]) {
        acc[perm.resource] = []
      }
      acc[perm.resource].push(perm)
      return acc
    },
    {} as Record<string, Permission[]>,
  )

  const handlePermissionToggle = (permissionId: string, checked: boolean) => {
    if (!selectedRole) return

    setRolePermissions((prev) => {
      const current = prev[selectedRole] || []
      return {
        ...prev,
        [selectedRole]: checked ? [...current, permissionId] : current.filter((id) => id !== permissionId),
      }
    })
  }

  const handleSave = async () => {
    if (!selectedRole) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/permissions?role=${selectedRole}`)
      const data = await response.json()
      const currentPerms = data.permissions || []
      const currentIds = currentPerms.map((p: Permission) => p.id)
      const newPerms = rolePermissions[selectedRole] || []

      const toAdd = newPerms.filter((id) => !currentIds.includes(id))
      const toRemove = currentIds.filter((id: string) => !newPerms.includes(id))

      for (const permId of toAdd) {
        await fetch("/api/permissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: selectedRole, permissionId: permId }),
        })
      }

      for (const permId of toRemove) {
        await fetch(`/api/permissions?role=${selectedRole}&permissionId=${permId}`, {
          method: "DELETE",
        })
      }

      await mutateRoles()
      alert("Permisos actualizados correctamente")
    } catch (error) {
      console.error("[v0] Error saving permissions:", error)
      alert("Error al guardar los permisos")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateRole = async () => {
    if (!newRole.name || !newRole.displayName) {
      alert("El nombre y nombre visible son requeridos")
      return
    }

    const existingRole = roles.find((r) => r.name.toLowerCase() === newRole.name.toLowerCase())
    if (existingRole) {
      alert(`Ya existe un rol con el nombre "${newRole.name}". Por favor, usa un nombre diferente.`)
      return
    }

    try {
      const response = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRole),
      })

      if (!response.ok) {
        const data = await response.json()
        alert(data.error || "Error al crear el rol")
        return
      }

      await mutateRoles()
      setShowCreateDialog(false)
      setNewRole({ name: "", displayName: "", description: "" })
      alert("Rol creado correctamente")
    } catch (error) {
      console.error("[v0] Error creating role:", error)
      alert("Error al crear el rol")
    }
  }

  const handleEditRole = async () => {
    if (!editingRole || !editRoleData.displayName) {
      alert("El nombre visible es requerido")
      return
    }

    try {
      const response = await fetch(`/api/roles?id=${editingRole.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: editRoleData.displayName,
          description: editRoleData.description,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        alert(data.error || "Error al actualizar el rol")
        return
      }

      await mutateRoles()
      setShowEditDialog(false)
      setEditingRole(null)
      alert("Rol actualizado correctamente")
    } catch (error) {
      console.error("[v0] Error updating role:", error)
      alert("Error al actualizar el rol")
    }
  }

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!confirm(`¿Estás seguro de eliminar el rol "${roleName}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/roles?id=${roleId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        alert(data.error || "Error al eliminar el rol")
        return
      }

      if (selectedRole === roleName && roles.length > 1) {
        setSelectedRole(roles[0].name === roleName ? roles[1].name : roles[0].name)
      }

      await mutateRoles()
      alert("Rol eliminado correctamente")
    } catch (error) {
      console.error("[v0] Error deleting role:", error)
      alert("Error al eliminar el rol")
    }
  }

  if (rolesError || permissionsError) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-500">Error al cargar los datos</div>
      </Card>
    )
  }

  if (!roles.length || !allPermissions.length) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">Cargando...</div>
      </Card>
    )
  }

  const currentRolePerms = selectedRole ? rolePermissions[selectedRole] || [] : []
  const selectedRoleData = roles.find((r) => r.name === selectedRole)

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Roles del Sistema</h3>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Crear Rol
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => {
            const isSelected = selectedRole === role.name
            const Icon = role.isSystem ? Shield : Users
            const permCount = rolePermissions[role.name]?.length || 0

            return (
              <Card
                key={role.id}
                className={`p-4 cursor-pointer transition-all ${
                  isSelected ? "border-primary shadow-md" : "hover:border-muted-foreground/50"
                }`}
                onClick={() => setSelectedRole(role.name)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="font-semibold">{role.displayName}</span>
                      {role.isSystem && (
                        <Badge variant="secondary" className="text-xs">
                          Sistema
                        </Badge>
                      )}
                    </div>
                    {role.description && <p className="text-xs text-muted-foreground">{role.description}</p>}
                    <Badge variant="outline" className="text-xs">
                      {permCount} permisos
                    </Badge>
                  </div>
                  {!role.isSystem && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingRole(role)
                          setEditRoleData({
                            displayName: role.displayName,
                            description: role.description || "",
                          })
                          setShowEditDialog(true)
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteRole(role.id, role.displayName)
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      </Card>

      {selectedRoleData && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Editando: {selectedRoleData.displayName}</h3>
              <p className="text-sm text-muted-foreground">Selecciona los permisos que tendrá este rol</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => mutateRoles()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(groupedPermissions).map(([resource, permissions]) => {
          const enabledCount = permissions.filter((p) => currentRolePerms.includes(p.id)).length
          const totalCount = permissions.length
          const percentage = Math.round((enabledCount / totalCount) * 100)
          const isExpanded = expandedGroups[resource]

          return (
            <Collapsible
              key={resource}
              open={isExpanded}
              onOpenChange={(open) => setExpandedGroups((prev) => ({ ...prev, [resource]: open }))}
            >
              <Card className="overflow-hidden">
                <CollapsibleTrigger className="w-full">
                  <div className="p-6 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg capitalize">{resource}</h3>
                        <ChevronDown
                          className={`h-5 w-5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </div>
                      <Badge variant={percentage === 100 ? "default" : percentage > 0 ? "secondary" : "outline"}>
                        {enabledCount} / {totalCount}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <Progress value={percentage} className="h-2" />
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{percentage}% habilitado</span>
                        {percentage === 100 && (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-xs font-medium">Completo</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-6 pb-6 pt-2 space-y-3 border-t">
                    {permissions.map((permission) => {
                      const isChecked = currentRolePerms.includes(permission.id)

                      return (
                        <div
                          key={permission.id}
                          className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <Checkbox
                            id={permission.id}
                            checked={isChecked}
                            onCheckedChange={(checked) => handlePermissionToggle(permission.id, checked as boolean)}
                            className="mt-1"
                          />
                          <div className="flex-1 space-y-1">
                            <label htmlFor={permission.id} className="text-sm font-medium cursor-pointer leading-none">
                              {permission.name}
                            </label>
                            {permission.description && (
                              <p className="text-xs text-muted-foreground">{permission.description}</p>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {permission.action}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )
        })}
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Rol</DialogTitle>
            <DialogDescription>Por favor, ingresa los detalles del nuevo rol que deseas crear.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role-name">Nombre del Rol (ID)</Label>
              <Input
                id="role-name"
                placeholder="ej: soporte, ventas, editor"
                value={newRole.name}
                onChange={(e) => setNewRole({ ...newRole, name: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
              />
              <p className="text-xs text-muted-foreground">
                Solo letras minúsculas, números y guiones bajos. Se usará internamente.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-displayName">Nombre Visible</Label>
              <Input
                id="role-displayName"
                placeholder="ej: Soporte Técnico"
                value={newRole.displayName}
                onChange={(e) => setNewRole({ ...newRole, displayName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-description">Descripción (Opcional)</Label>
              <Textarea
                id="role-description"
                placeholder="Describe las responsabilidades de este rol"
                value={newRole.description}
                onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateRole}>Crear Rol</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Rol</DialogTitle>
            <DialogDescription>Modifica el nombre visible y la descripción del rol.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-role-displayName">Nombre Visible</Label>
              <Input
                id="edit-role-displayName"
                placeholder="ej: Soporte Técnico"
                value={editRoleData.displayName}
                onChange={(e) => setEditRoleData({ ...editRoleData, displayName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role-description">Descripción</Label>
              <Textarea
                id="edit-role-description"
                placeholder="Describe las responsabilidades de este rol"
                value={editRoleData.description}
                onChange={(e) => setEditRoleData({ ...editRoleData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditRole}>Actualizar Rol</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
