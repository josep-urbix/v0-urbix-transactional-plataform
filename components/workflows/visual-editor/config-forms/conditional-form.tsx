"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const conditionalSchema = z.object({
  leftOperand: z.string().min(1, "Operando izquierdo requerido"),
  operator: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "contains", "startsWith", "endsWith"]),
  rightOperand: z.string().min(1, "Operando derecho requerido"),
  trueStepId: z.string().optional(),
  falseStepId: z.string().optional(),
})

type ConditionalFormValues = z.infer<typeof conditionalSchema>

interface ConditionalFormProps {
  config: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
}

const operators = [
  { value: "eq", label: "Igual a (==)" },
  { value: "neq", label: "Diferente de (!=)" },
  { value: "gt", label: "Mayor que (>)" },
  { value: "gte", label: "Mayor o igual (>=)" },
  { value: "lt", label: "Menor que (<)" },
  { value: "lte", label: "Menor o igual (<=)" },
  { value: "contains", label: "Contiene" },
  { value: "startsWith", label: "Empieza con" },
  { value: "endsWith", label: "Termina con" },
]

export function ConditionalForm({ config, onChange }: ConditionalFormProps) {
  const form = useForm<ConditionalFormValues>({
    resolver: zodResolver(conditionalSchema),
    defaultValues: {
      leftOperand: (config.leftOperand as string) || "",
      operator: (config.operator as ConditionalFormValues["operator"]) || "eq",
      rightOperand: (config.rightOperand as string) || "",
      trueStepId: (config.trueStepId as string) || "",
      falseStepId: (config.falseStepId as string) || "",
    },
  })

  useEffect(() => {
    const subscription = form.watch((values) => {
      onChange({
        leftOperand: values.leftOperand,
        operator: values.operator,
        rightOperand: values.rightOperand,
        trueStepId: values.trueStepId || undefined,
        falseStepId: values.falseStepId || undefined,
      })
    })
    return () => subscription.unsubscribe()
  }, [form, onChange])

  return (
    <Form {...form}>
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="leftOperand"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor a evaluar</FormLabel>
              <FormControl>
                <Input
                  placeholder="{{trigger.status}} o {{steps.step1.output.value}}"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                />
              </FormControl>
              <FormDescription>Usa {"{{variable}}"} para valores dinámicos</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="operator"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Operador</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {operators.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="rightOperand"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comparar con</FormLabel>
              <FormControl>
                <Input
                  placeholder="valor esperado"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                />
              </FormControl>
              <FormDescription>Puede ser un valor fijo o {"{{variable}}"}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="rounded-lg border bg-muted/50 p-3">
          <p className="text-sm text-muted-foreground">
            <strong>Nota:</strong> Las conexiones "Sí" y "No" se definen visualmente arrastrando desde los handles verde
            y rojo del nodo.
          </p>
        </div>
      </div>
    </Form>
  )
}
