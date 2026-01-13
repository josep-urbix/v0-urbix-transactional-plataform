import { neon } from "@neondatabase/serverless"
import * as bcrypt from "bcryptjs"

const sql = neon(process.env.DATABASE_URL!, {
  fetchOptions: {
    cache: "no-store",
  },
})

async function resetAdminPassword() {
  const newPassword = process.env.ADMIN_PASSWORD || "TempPassword123!"

  console.log("Resetting admin password...")
  console.log("Email: admin@urbix.es")
  console.log("New password:", newPassword)

  const salt = await bcrypt.genSalt(10)
  const passwordHash = await bcrypt.hash(newPassword, salt)

  await sql`
    UPDATE "User"
    SET "passwordHash" = ${passwordHash}
    WHERE email = 'admin@urbix.es'
  `

  console.log("Password reset successfully!")
  console.log("You can now login with the new password")
}

resetAdminPassword().catch(console.error)
