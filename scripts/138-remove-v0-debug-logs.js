// Script to remove all console.log("[v0]") debug statements
// Run with: node scripts/138-remove-v0-debug-logs.js

const fs = require("fs")
const path = require("path")

const filesToClean = [
  "app/api/admin/documents/versions/[id]/preview/route.ts",
  "app/api/admin/virtual-accounts/stats/route.ts",
  "app/api/auth/google/route.ts",
  "app/api/cron/retry-queue/route.ts",
  "app/api/lemonway/config/route.ts",
  "app/api/payment-accounts/route.ts",
  "components/documents/document-testing-manager.tsx",
  "components/documents/rich-text-editor.tsx",
  "components/hubspot-token-settings.tsx",
  "components/investors/investor-devices-list.tsx",
  "components/investors/investor-wallets-list.tsx",
  "components/payment-accounts-table.tsx",
  "components/permissions/unified-role-editor.tsx",
  "components/transactions-list.tsx",
  "components/users-table.tsx",
]

let totalRemoved = 0

filesToClean.forEach((filePath) => {
  const fullPath = path.join(process.cwd(), filePath)

  if (!fs.existsSync(fullPath)) {
    console.log(`❌ File not found: ${filePath}`)
    return
  }

  let content = fs.readFileSync(fullPath, "utf8")
  const originalLines = content.split("\n").length

  // Remove all console.log("[v0] lines
  const removedCount = (content.match(/console\.log\("\[v0\][^\n]*\n/g) || []).length
  content = content.replace(/\s*console\.log\("\[v0\][^\n]*\n/g, "\n")

  if (removedCount > 0) {
    fs.writeFileSync(fullPath, content, "utf8")
    console.log(`✅ ${filePath}: Removed ${removedCount} debug logs`)
    totalRemoved += removedCount
  }
})

console.log(`\n🎉 Total debug logs removed: ${totalRemoved}`)
