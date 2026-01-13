export type TipoCuenta = "INVERSOR" | "PROMOTOR" | "PROYECTO" | "PLATAFORMA_COMISIONES" | "PLATAFORMA_FONDOS_TRANSITO"
export type EstadoCuenta = "ACTIVA" | "BLOQUEADA" | "CERRADA"
export type SignoContable = "+" | "-" | "0"

export interface CuentaVirtual {
  id: string
  tipo: TipoCuenta
  referenciaExternaTipo: string
  referenciaExternaId: string
  moneda: string
  saldoDisponible: number
  saldoBloqueado: number
  estado: EstadoCuenta
  createdAt: Date
  updatedAt: Date
}

export interface TipoOperacionContable {
  id: string
  codigo: string
  nombre: string
  descripcion?: string
  afectaSaldoDisponible: boolean
  afectaSaldoBloqueado: boolean
  signoSaldoDisponible: SignoContable
  signoSaldoBloqueado: SignoContable
  visibleParaInversor: boolean
  requiereAprobacion: boolean
  activo: boolean
  ordenVisual?: number
  createdAt: Date
  updatedAt: Date
}

export interface MovimientoCuenta {
  id: string
  cuentaId: string
  tipoOperacionId: string
  fecha: Date
  importe: number
  moneda: string
  saldoDisponibleResultante: number
  saldoBloqueadoResultante: number
  proyectoId?: string
  inversionId?: string
  usuarioExternoId?: string
  promotorId?: string
  origen: string
  descripcion?: string
  workflowRunId?: string
  idempotencyKey?: string
  createdByAdminId?: string
  createdByType?: string
  createdAt: Date
}

export interface RegisterMovementInput {
  cuentaId: string
  codigoTipoOperacion: string
  importe: number
  moneda?: string
  proyectoId?: string
  inversionId?: string
  usuarioExternoId?: string
  promotorId?: string
  origen: string
  descripcion?: string
  workflowRunId?: string
  idempotencyKey?: string
  createdByAdminId?: string
  createdByType?: string
}
