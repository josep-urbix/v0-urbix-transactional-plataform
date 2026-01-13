"use client"

import { Suspense, useState } from "react"

export default function ClientDebugPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Sistema de Diagnóstico</h1>
      <Suspense fallback={<div>Cargando...</div>}>
        <DebugPanel />
      </Suspense>
    </div>
  )
}

function DebugPanel() {
  const [accountsResult, setAccountsResult] = useState<any>(null)

  const handleListAccounts = async () => {
    try {
      const response = await fetch("/api/debug/list-accounts")
      const data = await response.json()
      setAccountsResult(data)
      alert(`Se encontraron ${data.count} cuentas en la base de datos. Ver detalles abajo.`)
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h2 className="font-semibold text-yellow-800 mb-2">Instrucciones</h2>
        <p className="text-sm text-yellow-700">
          Primero ejecuta la migración de base de datos y luego ejecuta el test completo del sistema de sincronización.
        </p>
      </div>

      <div className="space-y-3">
        <button
          onClick={async () => {
            const result = await fetch("/api/debug/run-migration", { method: "POST" })
            const data = await result.json()
            alert(data.success ? data.message : `Error: ${data.error}`)
          }}
          className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-medium"
        >
          1️⃣ Ejecutar Migración de Base de Datos
        </button>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
          Esta migración cambia la columna 'country' de VARCHAR(2) a VARCHAR(3) para soportar códigos como ESP, FRA, USA
        </div>
      </div>

      <a
        href="/api/debug/test-full-sync"
        target="_blank"
        className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
        rel="noreferrer"
      >
        2️⃣ Ejecutar Test Completo
      </a>

      <button
        onClick={handleListAccounts}
        className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 font-medium"
      >
        3️⃣ Listar Cuentas en Base de Datos
      </button>

      {accountsResult && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Resultado de cuentas en base de datos:</h3>
          <p className="text-sm mb-2">Total: {accountsResult.count} cuenta(s)</p>
          <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto max-h-96">
            {JSON.stringify(accountsResult.accounts, null, 2)}
          </pre>
        </div>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold mb-2">Pasos que se probarán:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
          <li>Conexión con la API de Lemonway</li>
          <li>Extracción de datos de la cuenta</li>
          <li>Inserción en la base de datos PostgreSQL</li>
          <li>Lectura de la base de datos para confirmar</li>
        </ol>
      </div>
    </div>
  )
}
