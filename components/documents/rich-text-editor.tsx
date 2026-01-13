"use client"

import { useEffect, useRef, useState } from "react"
import { Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2 } from "lucide-react"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [showVariableDialog, setShowVariableDialog] = useState(false)
  const [variableInput, setVariableInput] = useState("")
  const [validationResult, setValidationResult] = useState<{
    valid: boolean
    error?: string
    fullVariable?: string
    dataType?: string
  } | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [pendingVariable, setPendingVariable] = useState<string | null>(null)

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value
    }
  }, [value])

  useEffect(() => {
    if (pendingVariable && editorRef.current && !showVariableDialog) {
      editorRef.current.focus()

      setTimeout(() => {
        if (editorRef.current) {
          const selection = window.getSelection()

          if (!selection || selection.rangeCount === 0 || !editorRef.current.contains(selection.anchorNode)) {
            const range = document.createRange()
            range.selectNodeContents(editorRef.current)
            range.collapse(false)
            selection?.removeAllRanges()
            selection?.addRange(range)
          }

          const inserted = document.execCommand("insertText", false, pendingVariable)

          if (!inserted) {
            const sel = window.getSelection()
            if (sel && sel.rangeCount > 0) {
              const range = sel.getRangeAt(0)
              range.deleteContents()
              const textNode = document.createTextNode(pendingVariable)
              range.insertNode(textNode)
              range.setStartAfter(textNode)
              range.setEndAfter(textNode)
              sel.removeAllRanges()
              sel.addRange(range)
            } else {
              editorRef.current.innerHTML += pendingVariable
            }
          }

          const newContent = editorRef.current.innerHTML
          onChange(newContent)

          setPendingVariable(null)
        }
      }, 100)
    }
  }, [pendingVariable, showVariableDialog, onChange])

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
  }

  const validateVariable = async () => {
    if (!variableInput.trim()) {
      setValidationResult({ valid: false, error: "Introduce un nombre de variable" })
      return
    }

    setIsValidating(true)
    setValidationResult(null)

    try {
      const response = await fetch("/api/admin/documents/validate-variable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variable: variableInput.trim() }),
      })

      const data = await response.json()
      setValidationResult(data)
    } catch (error) {
      setValidationResult({ valid: false, error: "Error al validar la variable" })
    } finally {
      setIsValidating(false)
    }
  }

  const insertValidatedVariable = () => {
    if (validationResult?.valid && validationResult.fullVariable) {
      const variableText = `{{${validationResult.fullVariable}}}`

      setPendingVariable(variableText)
      setShowVariableDialog(false)
      setVariableInput("")
      setValidationResult(null)
    }
  }

  const openVariableDialog = () => {
    setShowVariableDialog(true)
    setVariableInput("")
    setValidationResult(null)
  }

  return (
    <>
      <div className="w-full">
        <div className="border rounded-lg overflow-hidden bg-white">
          {/* Toolbar */}
          <div className="bg-gray-50 border-b p-2 flex flex-wrap gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => execCommand("bold")} title="Negrita">
              <Bold className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => execCommand("italic")} title="Cursiva">
              <Italic className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => execCommand("underline")} title="Subrayado">
              <Underline className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => execCommand("insertUnorderedList")}
              title="Lista con viñetas"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => execCommand("insertOrderedList")}
              title="Lista numerada"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => execCommand("justifyLeft")}
              title="Alinear izquierda"
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => execCommand("justifyCenter")}
              title="Centrar"
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => execCommand("justifyRight")}
              title="Alinear derecha"
            >
              <AlignRight className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <select
              className="h-8 text-sm border rounded px-2"
              onChange={(e) => execCommand("formatBlock", e.target.value)}
              defaultValue=""
            >
              <option value="">Párrafo</option>
              <option value="h1">Título 1</option>
              <option value="h2">Título 2</option>
              <option value="h3">Título 3</option>
            </select>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <Button type="button" variant="outline" size="sm" onClick={openVariableDialog} title="Insertar variable">
              {"{{var}}"}
            </Button>
          </div>

          {/* Editor - Estilo optimizado para desktop con ancho y altura adecuados */}
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            className="min-h-[500px] max-h-[600px] overflow-y-auto p-8 focus:outline-none prose max-w-none bg-white"
            style={{
              fontSize: "14px",
              lineHeight: "1.6",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
            data-placeholder={placeholder}
          />

          <style jsx>{`
            [contenteditable][data-placeholder]:empty:before {
              content: attr(data-placeholder);
              color: #9ca3af;
              pointer-events: none;
            }
          `}</style>
        </div>
      </div>

      <Dialog open={showVariableDialog} onOpenChange={setShowVariableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insertar Variable de Inversor</DialogTitle>
            <DialogDescription>
              Introduce el nombre de la columna de la tabla investors.User (ej: email, display_name, first_name)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="variable">Nombre de la columna</Label>
              <Input
                id="variable"
                value={variableInput}
                onChange={(e) => setVariableInput(e.target.value)}
                placeholder="Ej: display_name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    validateVariable()
                  }
                }}
              />
            </div>

            {validationResult && (
              <Alert variant={validationResult.valid ? "default" : "destructive"}>
                {validationResult.valid ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertDescription>
                  {validationResult.valid ? (
                    <div>
                      <strong>Campo válido:</strong> {validationResult.fullVariable}
                      <br />
                      <span className="text-sm text-muted-foreground">Tipo: {validationResult.dataType}</span>
                    </div>
                  ) : (
                    validationResult.error
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVariableDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={validateVariable} disabled={isValidating || !variableInput.trim()}>
              {isValidating ? "Validando..." : "Validar"}
            </Button>
            <Button
              onClick={insertValidatedVariable}
              disabled={!validationResult?.valid}
              className="bg-green-600 hover:bg-green-700"
            >
              Insertar Variable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
