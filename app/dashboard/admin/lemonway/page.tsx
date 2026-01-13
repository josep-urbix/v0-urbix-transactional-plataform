import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QueueManagementTab } from "@/components/lemonway-admin/queue-management-tab"
import { CustomQueriesTab } from "@/components/lemonway-admin/custom-queries-tab"
import { OperationTypesTab } from "@/components/lemonway-admin/operation-types-tab"
import { ApiExplorerTab } from "@/components/lemonway-admin/api-explorer-tab"
import { FieldMappingsTab } from "@/components/lemonway-admin/field-mappings-tab"
import { WebhooksTab } from "@/components/lemonway-admin/webhooks-tab"
import { HealthCheckTab } from "@/components/lemonway-admin/health-check-tab"
import { DashboardHeader } from "@/components/lemonway-admin/dashboard-header"
import { AvailableMethodsTab } from "@/components/lemonway-admin/available-methods-tab"

export const metadata = {
  title: "Lemonway Admin Dashboard - URBIX",
  description: "Panel administrativo centralizado para Lemonway",
}

export default function LemonwayAdminPage() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <div className="container mx-auto py-6">
        <Tabs defaultValue="queue" className="w-full">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="queue">Cola</TabsTrigger>
            <TabsTrigger value="methods">Métodos</TabsTrigger>
            <TabsTrigger value="queries">Queries</TabsTrigger>
            <TabsTrigger value="operations">Operaciones</TabsTrigger>
            <TabsTrigger value="explorer">API Explorer</TabsTrigger>
            <TabsTrigger value="mappings">Campos</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="health">Estado</TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="mt-6">
            <QueueManagementTab />
          </TabsContent>

          <TabsContent value="methods" className="mt-6">
            <AvailableMethodsTab />
          </TabsContent>

          <TabsContent value="queries" className="mt-6">
            <CustomQueriesTab />
          </TabsContent>

          <TabsContent value="operations" className="mt-6">
            <OperationTypesTab />
          </TabsContent>

          <TabsContent value="explorer" className="mt-6">
            <ApiExplorerTab />
          </TabsContent>

          <TabsContent value="mappings" className="mt-6">
            <FieldMappingsTab />
          </TabsContent>

          <TabsContent value="webhooks" className="mt-6">
            <WebhooksTab />
          </TabsContent>

          <TabsContent value="health" className="mt-6">
            <HealthCheckTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
