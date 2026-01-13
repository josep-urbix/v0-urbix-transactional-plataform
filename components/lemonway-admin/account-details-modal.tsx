"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

interface AccountDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  account: any
}

export function AccountDetailsModal({ isOpen, onClose, account }: AccountDetailsModalProps) {
  if (!account) return null

  const DetailRow = ({ label, value }: { label: string; value: any }) => (
    <div className="flex justify-between py-2 border-b">
      <span className="font-medium text-gray-600">{label}</span>
      <span className="text-gray-900">{value || "-"}</span>
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalles de la Solicitud {account.request_reference}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Estado */}
          <div>
            <h3 className="font-semibold mb-2">Estado</h3>
            <div className="flex gap-2">
              <Badge variant={account.status === "DRAFT" ? "outline" : "default"}>{account.status}</Badge>
              <Badge
                variant={
                  account.validation_status === "PENDING"
                    ? "outline"
                    : account.validation_status === "VALID"
                      ? "default"
                      : "destructive"
                }
              >
                {account.validation_status}
              </Badge>
            </div>
          </div>

          {/* Información Personal */}
          <div>
            <h3 className="font-semibold mb-3">Información Personal</h3>
            <DetailRow label="Nombre" value={account.first_name} />
            <DetailRow label="Apellido" value={account.last_name} />
            <DetailRow label="Email" value={account.email} />
            <DetailRow label="Teléfono" value={account.phone_number} />
            <DetailRow label="Fecha Nacimiento" value={account.birth_date} />
            <DetailRow label="Perfil" value={account.profile_type} />
          </div>

          {/* Dirección */}
          <div>
            <h3 className="font-semibold mb-3">Dirección</h3>
            <DetailRow label="Calle" value={account.street} />
            <DetailRow label="Ciudad" value={account.city} />
            <DetailRow label="Código Postal" value={account.postal_code} />
            <DetailRow label="Provincia" value={account.province} />
          </div>

          {/* Lemonway */}
          <div>
            <h3 className="font-semibold mb-3">Lemonway</h3>
            <DetailRow label="Wallet ID" value={account.lemonway_wallet_id} />
            <DetailRow label="Error" value={account.lemonway_error_message} />
            <DetailRow label="Reintentos" value={account.retry_count} />
          </div>

          {/* Fechas */}
          <div>
            <h3 className="font-semibold mb-3">Fechas</h3>
            <DetailRow label="Creada" value={new Date(account.created_at).toLocaleString("es-ES")} />
            <DetailRow label="Actualizada" value={new Date(account.updated_at).toLocaleString("es-ES")} />
            <DetailRow
              label="Enviada"
              value={account.submitted_at ? new Date(account.submitted_at).toLocaleString("es-ES") : "-"}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
