"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LemonwayMethodsList } from "@/components/lemonway-api/methods-list"
import { LemonwayMethodDetail } from "@/components/lemonway-api/method-detail"
import { LemonwayCallHistory } from "@/components/lemonway-api/call-history"
import { LemonwayPresets } from "@/components/lemonway-api/presets"
import { Card } from "@/components/ui/card"

export function LemonwayApiExplorer() {
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleMethodSelect = (methodId: string) => {
    setSelectedMethodId(methodId)
  }

  const handleTestExecuted = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <LemonwayMethodsList onMethodSelect={handleMethodSelect} selectedMethodId={selectedMethodId} />
      </div>

      <div className="lg:col-span-2">
        {selectedMethodId ? (
          <Tabs defaultValue="detail" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="detail">Detalle & Test</TabsTrigger>
              <TabsTrigger value="history">Historial</TabsTrigger>
              <TabsTrigger value="presets">Presets</TabsTrigger>
            </TabsList>

            <TabsContent value="detail" className="mt-4">
              <LemonwayMethodDetail methodId={selectedMethodId} onTestExecuted={handleTestExecuted} />
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <LemonwayCallHistory methodId={selectedMethodId} refreshTrigger={refreshTrigger} />
            </TabsContent>

            <TabsContent value="presets" className="mt-4">
              <LemonwayPresets methodId={selectedMethodId} />
            </TabsContent>
          </Tabs>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Selecciona un método de la lista para ver sus detalles</p>
          </Card>
        )}
      </div>
    </div>
  )
}
