"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const callApiSchema = z.object({
  endpoint: z.string().min(1, "Endpoint requerido"),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  headers: z.string().optional(),
  body: z.string().optional(),
  timeout: z.coerce.number().min(1000).max(60000).optional(),
})

type CallApiFormValues = z.infer<typeof callApiSchema>

interface CallApiFormProps {
  config: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
  isWebhook?: boolean
}

export function CallApiForm({ config, onChange, isWebhook = false }: CallApiFormProps) {
  const form = useForm<CallApiFormValues>({
    resolver: zodResolver(callApiSchema),
    defaultValues: {
      endpoint: (config.endpoint as string) || (config.url as string) || "",
      method: (config.method as "GET" | "POST" | "PUT" | "PATCH" | "DELETE") || "POST",
      headers: config.headers ? JSON.stringify(config.headers, null, 2) : "",
      body: config.body ? JSON.stringify(config.body, null, 2) : "",
      timeout: (config.timeout as number) || 30000,
    },
  })

  useEffect(() => {
    const subscription = form.watch((values) => {
      let headers = {}
      let body = undefined

      try {
        if (values.headers) headers = JSON.parse(values.headers)
      } catch {
        // Ignorar JSON inválido
      }

      try {
        if (values.body) body = JSON.parse(values.body)
      } catch {
        // Ignorar JSON inválido
      }

      const result: Record<string, unknown> = {
        method: values.method,
        headers,
        timeout: values.timeout,
      }

      if (isWebhook) {
        result.url = values.endpoint
      } else {
        result.endpoint = values.endpoint
      }

      if (body) result.body = body

      onChange(result)
    })
    return () => subscription.unsubscribe()
  }, [form, onChange, isWebhook])

  return (
    <Form {...form}>
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="endpoint"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{isWebhook ? "URL del Webhook" : "Endpoint"}</FormLabel>
              <FormControl>
                <Input
                  placeholder={isWebhook ? "https://api.example.com/webhook" : "/api/users/{{trigger.userId}}"}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                />
              </FormControl>
              <FormDescription>
                {isWebhook ? "URL completa del webhook externo" : "Ruta relativa de la API interna"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="method"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Método HTTP</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="headers"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Headers (JSON)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder='{"Authorization": "Bearer {{token}}"}'
                  className="font-mono text-sm"
                  rows={3}
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

        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Body (JSON)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder='{"userId": "{{trigger.userId}}"}'
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

        <FormField
          control={form.control}
          name="timeout"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Timeout (ms)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1000}
                  max={60000}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                />
              </FormControl>
              <FormDescription>Tiempo máximo de espera (1000-60000 ms)</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </Form>
  )
}
