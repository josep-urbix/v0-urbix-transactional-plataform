"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const setVariableSchema = z.object({
  variableName: z
    .string()
    .min(1, "Nombre de variable requerido")
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Nombre inválido"),
  valueType: z.enum(["string", "number", "boolean", "json", "expression"]),
  value: z.string().min(1, "Valor requerido"),
})

type SetVariableFormValues = z.infer<typeof setVariableSchema>

interface SetVariableFormProps {
  config: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
}

export function SetVariableForm({ config, onChange }: SetVariableFormProps) {
  const form = useForm<SetVariableFormValues>({
    resolver: zodResolver(setVariableSchema),
    defaultValues: {
      variableName: (config.variableName as string) || "",
      valueType: (config.valueType as SetVariableFormValues["valueType"]) || "string",
      value: typeof config.value === "object" ? JSON.stringify(config.value, null, 2) : String(config.value || ""),
    },
  })

  useEffect(() => {
    const subscription = form.watch((values) => {
      let parsedValue: unknown = values.value

      if (values.valueType === "number") {
        parsedValue = Number(values.value)
      } else if (values.valueType === "boolean") {
        parsedValue = values.value === "true"
      } else if (values.valueType === "json") {
        try {
          parsedValue = JSON.parse(values.value || "{}")
        } catch {
          parsedValue = {}
        }
      }

      onChange({
        variableName: values.variableName,
        valueType: values.valueType,
        value: parsedValue,
      })
    })
    return () => subscription.unsubscribe()
  }, [form, onChange])

  const valueType = form.watch("valueType")

  return (
    <Form {...form}>
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="variableName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de la Variable</FormLabel>
              <FormControl>
                <Input
                  placeholder="miVariable"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                />
              </FormControl>
              <FormDescription>Accesible como {"{{variables.miVariable}}"}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="valueType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Valor</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="string">Texto</SelectItem>
                  <SelectItem value="number">Número</SelectItem>
                  <SelectItem value="boolean">Booleano</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="expression">Expresión</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {valueType === "json" && (
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder='{"key": "value"}'
                    className="font-mono text-sm"
                    rows={4}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {valueType === "boolean" && (
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="true">Verdadero (true)</SelectItem>
                    <SelectItem value="false">Falso (false)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {valueType === "number" && (
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="valor numérico"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {(valueType === "string" || valueType === "expression") && (
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder={valueType === "expression" ? "{{trigger.amount * 2}}" : "valor"}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                  />
                </FormControl>
                {valueType === "expression" && (
                  <FormDescription>Usa {"{{variable}}"} para valores dinámicos</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>
    </Form>
  )
}
