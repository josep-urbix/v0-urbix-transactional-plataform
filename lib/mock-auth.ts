// Mock authentication for v0 preview
// In production, this will use real NextAuth with database
export const mockAuth = {
  user: {
    id: "1",
    email: "admin@example.com",
    name: "Admin User",
    role: "admin",
  },
}

export async function getMockSession() {
  // In preview, return mock session
  // In production deployment, this would use real NextAuth
  if (process.env.NODE_ENV === "production" && process.env.DATABASE_URL) {
    return null // Real auth handles this
  }
  return {
    user: mockAuth.user,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }
}
