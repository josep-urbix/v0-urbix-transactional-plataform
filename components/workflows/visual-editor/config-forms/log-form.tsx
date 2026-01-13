"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const logSchema = z.object({
  message: z.string().min(1, "Mensaje requerido"),
  level: z.enum(["debug", "info", "warn", "error"]),
})

type LogFormValues = z.infer<typeof logSchema>

interface LogFormProps {
  config: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
}

const logLevels = [
  { value: "debug", label: "Debug", color: "text-slate-500" },
  { value: "info", label: "Info", color: "text-blue-500" },
  { value: "warn", label: "Warning", color: "text-amber-500" },
  { value: "error", label: "Error", color: "text-red-500" },
]

export function LogForm({ config, onChange }: LogFormProps) {
  const form = useForm<LogFormValues>({
    resolver: zodResolver(logSchema),
    defaultValues: {
      message: (config.message as string) || "",
      level: (config.level as LogFormValues["level"]) || "info",
    },
  })

  useEffect(() => {
    const subscription = form.watch((values) => {
      onChange({
        message: values.message,
        level: values.level,
      })
    })
    return () => subscription.unsubscribe()
  }, [form, onChange])

  return (
    <Form {...form}>
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="level"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nivel de Log</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {logLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <span className={level.color}>{level.label}</span>
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
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mensaje</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Usuario {{trigger.userId}} completó la acción. Estado: {{steps.step1.output.status}}"
                  rows={4}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                />
              </FormControl>
              <FormDescription>Usa {"{{variable}}"} para incluir valores dinámicos del contexto</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </Form>
  )
}
