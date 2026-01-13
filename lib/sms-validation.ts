import { z } from "zod"

export const SMSTemplateSchema = z.object({
  key: z
    .string()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9._-]+$/, "Key must contain only lowercase letters, numbers, dots, hyphens and underscores"),
  name: z.string().min(3).max(200),
  description: z.string().max(500).optional().nullable(),
  category: z.string().min(2).max(50),
  body: z.string().min(10).max(500),
  sender: z.string().max(50).optional().nullable(),
  variables: z.array(
    z.object({
      name: z.string(),
      type: z.enum(["string", "number"]),
      required: z.boolean(),
    }),
  ),
  is_active: z.boolean(),
})

export const SMSApiConfigSchema = z.object({
  provider_name: z.string().min(2).max(100),
  base_url: z.string().url(),
  auth_type: z.string().min(2).max(50),
  access_token: z.string().min(1).optional().or(z.literal("")),
  default_sender: z.string().max(50).optional().nullable(),
  test_mode: z.boolean(),
  webhook_url: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .refine((val) => !val || val === "" || z.string().url().safeParse(val).success, "Must be a valid URL or empty"),
})
