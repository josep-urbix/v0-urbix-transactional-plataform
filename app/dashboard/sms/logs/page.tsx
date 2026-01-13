import { SMSLogsClient } from "@/components/sms/sms-logs-client"

export default function SMSLogsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#164AA6]">Logs de SMS</h1>
        <p className="text-[#777777]">Historial de todos los SMS enviados y su estado</p>
      </div>
      <SMSLogsClient />
    </div>
  )
}
