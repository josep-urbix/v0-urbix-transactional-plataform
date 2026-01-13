import { neon } from "@neondatabase/serverless"
import * as bcrypt from "bcryptjs"

console.log("Starting admin password update...")

if (!process.env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL not found")
  process.exit(1)
}

if (!process.env.ADMIN_PASSWORD) {
  console.error("ERROR: ADMIN_PASSWORD environment variable not set")
  console.error("Please set ADMIN_PASSWORD in your environment variables")
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL, {
  fetchConnectionCache: true,
  disableWarningInBrowsers: true,
})
const newPassword = process.env.ADMIN_PASSWORD

console.log("Updating admin password...")
const adminEmail = "josep@urbix.es"

// Hash the new password
const passwordHash = await bcrypt.hash(newPassword, 10)

const result = await sql`
  UPDATE "User" 
  SET "passwordHash" = ${passwordHash}
  WHERE email = ${adminEmail}
  RETURNING id, email
`

if (result.length > 0) {
  console.log("\n✓ Password updated successfully!")
  console.log("  User: ", result[0].email)
  console.log("  ID: ", result[0].id)
  console.log("  You can now login with josep@urbix.es and the ADMIN_PASSWORD")
} else {
  console.error("\nERROR: Admin user not found in database")
  console.log(`Looking for: ${adminEmail}`)
  console.log("\nChecking what users exist...")

  const allUsers = await sql`
    SELECT id, email, "createdAt"
    FROM "User"
    ORDER BY "createdAt" ASC
    LIMIT 10
  `

  console.log("\nFound users:")
  allUsers.forEach((user, index) => {
    console.log(`  ${index + 1}. ${user.email} (ID: ${user.id})`)
  })

  process.exit(1)
}
