"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const delaySchema = z.object({
  value: z.coerce.number().min(1, "Valor mínimo: 1"),
  unit: z.enum(["seconds", "minutes", "hours", "days"]),
})

type DelayFormValues = z.infer<typeof delaySchema>

interface DelayFormProps {
  config: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
}

const unitMultipliers: Record<string, number> = {
  seconds: 1000,
  minutes: 60 * 1000,
  hours: 60 * 60 * 1000,
  days: 24 * 60 * 60 * 1000,
}

const unitLabels: Record<string, string> = {
  seconds: "Segundos",
  minutes: "Minutos",
  hours: "Horas",
  days: "Días",
}

function msToUnit(ms: number): { value: number; unit: string } {
  if (ms >= unitMultipliers.days && ms % unitMultipliers.days === 0) {
    return { value: ms / unitMultipliers.days, unit: "days" }
  }
  if (ms >= unitMultipliers.hours && ms % unitMultipliers.hours === 0) {
    return { value: ms / unitMultipliers.hours, unit: "hours" }
  }
  if (ms >= unitMultipliers.minutes && ms % unitMultipliers.minutes === 0) {
    return { value: ms / unitMultipliers.minutes, unit: "minutes" }
  }
  return { value: ms / 1000, unit: "seconds" }
}

export function DelayForm({ config, onChange }: DelayFormProps) {
  const delayMs = (config.delayMs as number) || 60000
  const { value, unit } = msToUnit(delayMs)

  const form = useForm<DelayFormValues>({
    resolver: zodResolver(delaySchema),
    defaultValues: {
      value,
      unit: unit as "seconds" | "minutes" | "hours" | "days",
    },
  })

  useEffect(() => {
    const subscription = form.watch((values) => {
      if (values.value && values.unit) {
        const ms = values.value * unitMultipliers[values.unit]
        onChange({ delayMs: ms })
      }
    })
    return () => subscription.unsubscribe()
  }, [form, onChange])

  return (
    <Form {...form}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duración</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
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
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unidad</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(unitLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormDescription>
          El workflow pausará su ejecución durante este tiempo antes de continuar al siguiente paso.
        </FormDescription>
      </div>
    </Form>
  )
}
