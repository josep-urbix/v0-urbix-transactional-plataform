"use client"

import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const sendEmailSchema = z.object({
  templateKey: z.string().min(1, "Template requerido"),
  toTemplate: z.string().min(1, "Destinatario requerido"),
  subject: z.string().optional(),
  variablesTemplate: z.string().optional(),
})

type SendEmailFormValues = z.infer<typeof sendEmailSchema>

interface SendEmailFormProps {
  config: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
}

const emailTemplates = [
  { key: "welcome", label: "Bienvenida" },
  { key: "verification", label: "Verificación" },
  { key: "reset-password", label: "Reset de contraseña" },
  { key: "notification", label: "Notificación general" },
  { key: "investment-confirmation", label: "Confirmación de inversión" },
]

function safeStringify(value: unknown): string {
  if (!value) return ""
  if (typeof value === "string") return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return ""
  }
}

function safeParse(value: string): Record<string, unknown> {
  if (!value) return {}
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

export function SendEmailForm({ config, onChange }: SendEmailFormProps) {
  const defaultValues = useMemo(() => {
    const templateKey = String(config?.templateKey || "")
    const toTemplate = String(config?.toTemplate || config?.to || "")
    const subject = String(config?.subject || "")
    const variablesTemplate = safeStringify(config?.variablesTemplate || config?.variables)

    return {
      templateKey,
      toTemplate,
      subject,
      variablesTemplate,
    }
  }, []) // Empty deps - only calculate once on mount

  const form = useForm<SendEmailFormValues>({
    resolver: zodResolver(sendEmailSchema),
    defaultValues,
  })

  useEffect(() => {
    const subscription = form.watch((values) => {
      onChange({
        templateKey: values.templateKey || "",
        toTemplate: values.toTemplate || "",
        subject: values.subject || "",
        variablesTemplate: safeParse(values.variablesTemplate || ""),
      })
    })
    return () => subscription.unsubscribe()
  }, [form, onChange])

  return (
    <Form {...form}>
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="templateKey"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Template de Email</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un template" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {emailTemplates.map((template) => (
                    <SelectItem key={template.key} value={template.key}>
                      {template.label}
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
          name="toTemplate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Destinatario</FormLabel>
              <FormControl>
                <Input
                  placeholder="{{context.user.email}} o email@example.com"
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
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Asunto (opcional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Asunto del email"
                  value={field.value || ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                />
              </FormControl>
              <FormDescription>Sobrescribe el asunto del template</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="variablesTemplate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Variables (JSON)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder='{"loginUrl": "https://...", "userName": "{{context.user.name}}"}'
                  className="font-mono text-sm"
                  rows={4}
                  value={field.value || ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                />
              </FormControl>
              <FormDescription>Variables adicionales para el template</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </Form>
  )
}
