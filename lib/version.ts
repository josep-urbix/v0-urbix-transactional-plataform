export const APP_VERSION = "0.1.0"
export const BUILD_DATE = new Date().toISOString().split("T")[0]

export function getBuildInfo() {
  return {
    version: APP_VERSION,
    buildDate: BUILD_DATE,
    commitSha: "dev",
    environment: "production",
  }
}
