"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import CreateAccountForm from "@/components/lemonway-admin/create-account-form"
import AccountsListTab from "@/components/lemonway-admin/accounts-list-tab"
import KYCVerificationForm from "@/components/lemonway-admin/kyc-verification-form"

export default function LemonwayAccountsPage() {
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("create")

  const handleRequestCreated = (requestId: string) => {
    setSelectedRequestId(requestId)
    // Auto-navigate to list tab to show new request
    setActiveTab("list")
  }

  const handleEditRequest = (requestId: string) => {
    setSelectedRequestId(requestId)
    setActiveTab("create")
  }

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold">Gestión de Cuentas Lemonway</h1>
        <p className="text-gray-600 mt-2">Crear cuentas y completar verificación KYC</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create">Crear Cuenta (Fase 1)</TabsTrigger>
          <TabsTrigger value="list">Mis Solicitudes</TabsTrigger>
          <TabsTrigger value="kyc">Verificación KYC (Fase 2)</TabsTrigger>
        </TabsList>

        {/* FASE 1: Create Account */}
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Crear Nueva Cuenta en Lemonway</CardTitle>
              <CardDescription>
                Completa los datos mínimos para crear una cuenta. Se auto-guardará mientras escribes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CreateAccountForm onSuccess={handleRequestCreated} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* LISTA: View All Requests */}
        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Mis Solicitudes de Cuenta</CardTitle>
              <CardDescription>
                Listado completo de todas tus solicitudes con estado y opciones de recuperación
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AccountsListTab onSelectRequest={handleEditRequest} selectedRequestId={selectedRequestId} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* FASE 2: KYC Verification */}
        <TabsContent value="kyc">
          <Card>
            <CardHeader>
              <CardTitle>Completar Verificación KYC</CardTitle>
              <CardDescription>
                {selectedRequestId
                  ? "Completa los datos de verificación de identidad para la solicitud seleccionada."
                  : "Selecciona una solicitud en el tab 'Mis Solicitudes' para completar KYC."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedRequestId ? (
                <KYCVerificationForm requestId={selectedRequestId} />
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>Selecciona una solicitud en el tab "Mis Solicitudes" para continuar con KYC</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
