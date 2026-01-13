"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Code2 } from "lucide-react"

interface LemonwayMethod {
  id: string
  name: string
  endpoint: string
  http_method: string
  category: string
  description: string
  request_schema: any
  response_schema: any
  example_request: any
  example_response: any
  is_enabled: boolean
}

export function AvailableMethodsTab() {
  const [methods, setMethods] = useState<LemonwayMethod[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState("all")

  useEffect(() => {
    const fetchMethods = async () => {
      try {
        const res = await fetch("/api/admin/lemonway/methods")
        const data = await res.json()
        if (data.success) {
          setMethods(data.data || [])
        }
      } catch (error) {
        console.error("Error fetching methods:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMethods()
  }, [])

  const categories = Array.from(new Set(methods.map((m) => m.category)))
  const filteredMethods = selectedCategory === "all" ? methods : methods.filter((m) => m.category === selectedCategory)

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      AUTH: "bg-blue-600",
      ACCOUNTS: "bg-green-600",
      TRANSACTIONS: "bg-purple-600",
      PAYMENTS: "bg-orange-600",
      KYC: "bg-red-600",
    }
    return colors[category] || "bg-gray-600"
  }

  const getMethodBadge = (method: string) => {
    const colors: Record<string, string> = {
      GET: "bg-blue-500",
      POST: "bg-green-500",
      PUT: "bg-yellow-500",
      DELETE: "bg-red-500",
    }
    return colors[method] || "bg-gray-500"
  }

  if (isLoading) {
    return <div className="text-center py-8">Cargando métodos disponibles...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        <Button variant={selectedCategory === "all" ? "default" : "outline"} onClick={() => setSelectedCategory("all")}>
          Todos ({methods.length})
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? "default" : "outline"}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat} ({methods.filter((m) => m.category === cat).length})
          </Button>
        ))}
      </div>

      <div className="grid gap-4">
        {filteredMethods.map((method) => (
          <Card key={method.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="text-lg">{method.name}</CardTitle>
                    <Badge className={getMethodBadge(method.http_method)}>{method.http_method}</Badge>
                    <Badge className={getCategoryBadgeColor(method.category)}>{method.category}</Badge>
                  </div>
                  <CardDescription>{method.description}</CardDescription>
                  <code className="text-sm bg-muted p-2 rounded block mt-2 overflow-x-auto">{method.endpoint}</code>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="request" className="w-full">
                <TabsList>
                  <TabsTrigger value="request">Request</TabsTrigger>
                  <TabsTrigger value="response">Response</TabsTrigger>
                </TabsList>
                <TabsContent value="request" className="bg-muted p-3 rounded mt-2">
                  <pre className="text-xs overflow-x-auto">
                    <code>{JSON.stringify(method.example_request, null, 2)}</code>
                  </pre>
                </TabsContent>
                <TabsContent value="response" className="bg-muted p-3 rounded mt-2">
                  <pre className="text-xs overflow-x-auto">
                    <code>{JSON.stringify(method.example_response, null, 2)}</code>
                  </pre>
                </TabsContent>
              </Tabs>
              <Button className="mt-4 gap-2">
                <Code2 className="h-4 w-4" />
                Usar en Query
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
