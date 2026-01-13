# Integrations Middleware

**Fecha de creación:** 1 de diciembre de 2025  
**Última actualización:** 7 de enero de 2026, 16:00h

Middleware de integración de Next.js listo para producción que se integra con webhooks de HubSpot para reuniones, extrae enlaces de Google Meet/reagendar/cancelar, actualiza contactos de HubSpot y proporciona un panel de administración seguro para monitoreo.

## Features

- **HubSpot Webhook Integration**: Receives webhooks when meetings are created
- **Automatic URL Extraction**: Extracts Google Meet, reschedule, and cancel links from meeting descriptions
- **Contact Updates**: Automatically updates HubSpot contacts with meeting URLs
- **Transaction Logging**: Logs all API interactions for monitoring and debugging
- **Admin Dashboard**: Secure dashboard with database-backed authentication
- **Settings Management**: Configure HubSpot access token directly from the UI

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Authentication**: Secure session-based authentication with bcrypt password hashing
- **Database**: Neon Postgres with SQL queries
- **UI**: shadcn/ui components with Tailwind CSS v4
- **Data Fetching**: SWR for real-time updates

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A HubSpot account with Private App access
- Database (Neon Postgres recommended)

### v0 Preview Mode

This preview is running in demo mode with simplified authentication. For full functionality:
- Deploy to Vercel with a real database
- Set up secure admin credentials in the database
- Set up HubSpot webhooks pointing to your production URL

### Local Development

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Copy `.env.example` to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   ```

   Required variables:
   - `DATABASE_URL`: Database connection string (from Neon or Vercel Postgres)
   - `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
   - `NEXTAUTH_URL`: Your app URL (http://localhost:3000 for local, https://integrations.urbix.es for production)
   - `NEXT_PUBLIC_APP_URL`: Same as NEXTAUTH_URL
   - `HUBSPOT_ACCESS_TOKEN`: HubSpot Private App token (optional, can configure in UI)
   - `HUBSPOT_WEBHOOK_SECRET`: HubSpot webhook secret
   - `ALLOWED_EMAIL_DOMAINS`: Comma-separated list of allowed domains (default: urbix.es)

3. **Initialize the database**:
   ```bash
   # Run the SQL scripts in the scripts/ folder using your database client
   # Or use the Neon SQL editor to execute:
   # - 001-init-database.sql (creates tables)
   # - 002-create-admin-user.sql (creates admin user)
   # - 003-add-extracted-links.sql (adds link columns)
   # - 004-add-contact-email.sql (adds contact email column)
   ```
   
   **IMPORTANT - Set Admin Password**:
   After running the database scripts, you must set a secure admin password:
   
   ```bash
   # Set your desired admin password as an environment variable
   export ADMIN_PASSWORD="YourSecurePassword123!"
   
   # Run the password reset script from v0 Scripts panel
   # Or execute: node --loader ts-node/esm scripts/reset-admin-password.ts
   ```
   
   The default admin email is `admin@urbix.es`. After setting the password, you can login with this email and your chosen password.

4. **Run the development server**:
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

### HubSpot Setup

1. **Create a Private App**:
   - Go to Settings → Integrations → Private Apps
   - Create a new private app
   - Grant these scopes:
     - `crm.objects.contacts.write`
     - `crm.objects.contacts.read`
     - `crm.schemas.contacts.read`
     - `sales-email-read`
   - Copy the access token

2. **Configure Custom Contact Properties**:
   Create these custom properties in HubSpot Contacts:
   - `contacto_link` (Single-line text)
   - `contacto_reagendar` (Single-line text)
   - `contacto_cancelar` (Single-line text)

3. **Set Up Webhook**:
   - Go to Settings → Integrations → Webhooks
   - Create webhook for "Engagements → Meeting"
   - Set webhook URL to: `https://your-domain.com/api/hubspot/meetings/webhook`
   - **Add custom header**: `x-api-key` with your configured API key (secret name: "agendas")
   - The API key can be configured in the application Settings page under "Webhook Security"
   - If not configured in the UI, it will fallback to the `HUBSPOT_WEBHOOK_SECRET` environment variable

### Deployment to Vercel

1. **Connect Database**:
   - Add Neon integration in Vercel project settings
   - Or manually add `DATABASE_URL` environment variable

2. **Set Environment Variables**:
   In your Vercel project settings, add all required environment variables:
   - `NEXTAUTH_URL`: Your production URL (e.g., `https://integrations.urbix.es`)
   - `NEXT_PUBLIC_APP_URL`: Same as NEXTAUTH_URL
   - `NEXTAUTH_SECRET`: Generate a secure random string
   - `HUBSPOT_ACCESS_TOKEN` (optional, can configure in UI)
   - `HUBSPOT_WEBHOOK_SECRET`
   - `ALLOWED_EMAIL_DOMAINS`: Your allowed domains

3. **Deploy**:
   - Push to GitHub and connect to Vercel
   - Or use `vercel deploy` CLI
   - Run database scripts manually via Neon SQL editor

4. **Configure HubSpot Webhook**:
   - Update webhook URL to point to your production domain
   - `https://integrations.urbix.es/api/hubspot/meetings/webhook`

5. **Set Up Admin User**:
   - Run the `reset-admin-password.ts` script to set your admin password
   - Set the `ADMIN_PASSWORD` environment variable before running the script
   - Login with email `admin@urbix.es` and your password

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── session/                 # Session API for auth
│   │   ├── hubspot/meetings/        # HubSpot webhook endpoint
│   │   ├── settings/                # Settings API (token management)
│   │   └── transactions/            # Transactions API
│   ├── dashboard/
│   │   ├── transactions/            # Transactions list and detail pages
│   │   └── settings/                # Settings page
│   ├── login/                       # Login page
│   └── page.tsx                     # Home page
├── components/                      # React components
├── lib/
│   ├── auth.ts                     # Authentication (simplified for preview)
│   ├── auth-utils.ts               # Auth helper functions
│   ├── db.ts                       # Prisma client singleton
│   ├── hubspot-client.ts           # HubSpot API client
│   ├── transaction-logger.ts       # Transaction logging utility
│   └── url-extractor.ts            # URL extraction logic
├── prisma/
│   └── schema.prisma               # Database schema
└── scripts/
    ├── seed-admin-user.ts          # Database seeding script
    ├── create-test-user.ts         # Script to generate bcrypt password hash
    └── sql/
        ├── 001-init-database.sql   # Creates tables
        ├── 002-create-admin-user.sql # Creates admin user
        ├── 003-add-extracted-links.sql # Adds link columns
        └── 004-add-contact-email.sql # Adds contact email column
```

## API Endpoints

### Webhook
- `POST /api/hubspot/meetings/webhook` - Receives HubSpot meeting webhooks

### Transactions (Protected)
- `GET /api/transactions` - List transactions with filters and pagination
- `GET /api/transactions/[id]` - Get transaction details

### Settings (Protected)
- `GET /api/settings/hubspot-token` - Get token info (masked)
- `PUT /api/settings/hubspot-token` - Update HubSpot token

## Security

- **Authentication**: Database-backed authentication with bcrypt password hashing and rate limiting
- **Rate Limiting**: Maximum 5 failed login attempts per 15 minutes to prevent brute force attacks
- **Authorization**: All dashboard and API routes require authentication via secure session cookies
- **Token Security**: HubSpot tokens never logged or exposed in clear text
- **Password Hashing**: BCrypt with salt rounds for all user passwords
- **Session Management**: HTTP-only, secure cookies with strict SameSite policy
- **Security Headers**: XSS protection, Content Security Policy, and Frame Options enabled
- **Webhook Security**: API key authentication (secret name: "agendas") with timing-safe comparison to prevent attacks
  - API key can be configured in Settings UI or via `HUBSPOT_WEBHOOK_SECRET` environment variable
  - Database configuration takes precedence over environment variable

## Monitoring

The admin dashboard provides:
- Real-time transaction list with auto-refresh
- Filters by status, type, meeting ID, and date range
- Detailed transaction views with full request/response payloads
- Visual status indicators for success/error tracking
- Correlation IDs to trace related transactions

## License

MIT
