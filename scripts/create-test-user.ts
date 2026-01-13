// Script to generate the correct bcrypt hash for Admin123! and create/update the test user
import bcrypt from "bcryptjs"

async function main() {
  const password = "Admin123!"
  const salt = await bcrypt.genSalt(10)
  const hash = await bcrypt.hash(password, salt)
  console.log("\n=== BCRYPT HASH GENERATOR ===")
  console.log(`Password: ${password}`)
  console.log(`Hash: ${hash}`)
  console.log("\nUse this hash in your database for the admin@urbix.es user")
  console.log("SQL Command:")
  console.log(`UPDATE "User" SET "passwordHash" = '${hash}' WHERE email = 'admin@urbix.es';`)
}

main().catch(console.error)
