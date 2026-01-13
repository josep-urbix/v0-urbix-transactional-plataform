"use client"

import useSWR from "swr"
import { Card } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { MessageSquare, TrendingUp, AlertCircle, CheckCircle } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const STATUS_COLORS: Record<string, string> = {
  delivered: "#10b981",
  sent: "#3b82f6",
  queued: "#f59e0b",
  failed: "#ef4444",
}

const DEFAULT_STATS = {
  total24h: 0,
  total7days: 0,
  deliveryRate: 0,
  failed7days: 0,
  byDay: [],
  byStatus: [],
  topTemplates: [],
}

export function SMSDashboardClient() {
  const { data, error, isLoading } = useSWR("/api/admin/sms/dashboard", fetcher)

  if (isLoading) {
    return <div className="text-[#777777]">Cargando métricas...</div>
  }

  if (error) {
    return <div className="text-red-600">Error al cargar métricas: {error.message}</div>
  }

  const stats = data?.stats || DEFAULT_STATS
  const recentLogs = data?.recentLogs || []

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 bg-white border-[#E6E6E6]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[#777777]">SMS (24h)</p>
              <p className="text-3xl font-bold text-[#164AA6] mt-1">{stats.total24h}</p>
            </div>
            <MessageSquare className="h-8 w-8 text-[#0FB7EA]" />
          </div>
        </Card>

        <Card className="p-6 bg-white border-[#E6E6E6]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[#777777]">SMS (7 días)</p>
              <p className="text-3xl font-bold text-[#164AA6] mt-1">{stats.total7days}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-[#0FB7EA]" />
          </div>
        </Card>

        <Card className="p-6 bg-white border-[#E6E6E6]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[#777777]">Tasa de Entrega</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{(stats.deliveryRate || 0).toFixed(1)}%</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6 bg-white border-[#E6E6E6]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[#777777]">Fallidos (7 días)</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{stats.failed7days}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SMS by Day Chart */}
        <Card className="p-6 bg-white border-[#E6E6E6]">
          <h3 className="text-lg font-semibold text-[#164AA6] mb-4">SMS por Día (Últimos 30 días)</h3>
          {stats.byDay.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.byDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6E6E6" />
                <XAxis dataKey="date" tick={{ fill: "#777777", fontSize: 12 }} />
                <YAxis tick={{ fill: "#777777", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #E6E6E6", borderRadius: "8px" }}
                  labelStyle={{ color: "#164AA6", fontWeight: 600 }}
                />
                <Bar dataKey="count" fill="#0FB7EA" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-[#777777]">No hay datos disponibles</div>
          )}
        </Card>

        {/* SMS by Status Chart */}
        <Card className="p-6 bg-white border-[#E6E6E6]">
          <h3 className="text-lg font-semibold text-[#164AA6] mb-4">SMS por Estado (Últimos 7 días)</h3>
          {stats.byStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.byStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => {
                    if (!entry || typeof entry !== "object") return ""
                    const status = entry.status || ""
                    const count = entry.count || 0
                    if (!status || count === 0) return ""
                    return `${status}: ${count}`
                  }}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {stats.byStatus.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || "#8884d8"} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-[#777777]">No hay datos disponibles</div>
          )}
        </Card>
      </div>

      {/* Top Templates */}
      <Card className="p-6 bg-white border-[#E6E6E6]">
        <h3 className="text-lg font-semibold text-[#164AA6] mb-4">Plantillas Más Usadas (Últimos 7 días)</h3>
        {stats.topTemplates.length > 0 ? (
          <div className="space-y-3">
            {stats.topTemplates.map((t: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-[#F2F2F2] rounded-lg">
                <span className="font-mono text-sm text-[#164AA6]">{t.template}</span>
                <span className="text-lg font-semibold text-[#777777]">{t.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-[#777777]">No hay plantillas utilizadas</div>
        )}
      </Card>

      {/* Recent SMS Table */}
      <Card className="p-6 bg-white border-[#E6E6E6]">
        <h3 className="text-lg font-semibold text-[#164AA6] mb-4">SMS Recientes</h3>
        {recentLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E6E6E6]">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[#777777]">Fecha</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[#777777]">Teléfono</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[#777777]">Plantilla</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[#777777]">Estado</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[#777777]">Proveedor</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log: any) => (
                  <tr key={log.id} className="border-b border-[#E6E6E6] hover:bg-[#F2F2F2]">
                    <td className="py-3 px-4 text-sm text-[#777777]">
                      {new Date(log.created_at).toLocaleString("es-ES")}
                    </td>
                    <td className="py-3 px-4 text-sm font-mono text-[#164AA6]">{log.to_phone}</td>
                    <td className="py-3 px-4 text-sm font-mono text-[#777777]">{log.template_key || "-"}</td>
                    <td className="py-3 px-4">
                      <span
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: STATUS_COLORS[log.status] + "20",
                          color: STATUS_COLORS[log.status],
                        }}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-[#777777]">{log.provider}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-[#777777]">No hay SMS registrados</div>
        )}
      </Card>
    </div>
  )
}
