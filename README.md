# NyxAegis CRM

**Hospital Business Development Platform** — purpose-built for healthcare BD teams.

NyxAegis gives hospital business development organizations a unified platform to manage hospital accounts, track opportunity pipelines, assign territories, manage rep compliance, and close more contracts.

## Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth v5 (JWT + Credentials)
- **Payments**: Stripe
- **Email**: Resend
- **Styling**: Tailwind CSS + Radix UI
- **Deployment**: Vercel

## Roles

| Role | Portal | Access |
|------|--------|--------|
| `ADMIN` | `/admin/*` | Full platform access — all hospitals, reps, pipeline, analytics |
| `REP` | `/rep/*` | BD rep portal — their opportunities, territory, docs, payments |
| `ACCOUNT` | `/account/*` | Hospital portal — their engagements, invoices, contracts |

## Setup

### 1. Clone and install

```bash
git clone https://github.com/your-org/nyxaegis
cd nyxaegis
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL` — PostgreSQL connection string
- `AUTH_SECRET` — NextAuth secret (generate with `openssl rand -base64 32`)
- `STRIPE_SECRET_KEY` — Stripe secret key
- `RESEND_API_KEY` — Resend email API key

### 3. Database setup

```bash
npx prisma db push
npx prisma generate
npm run db:seed
```

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo Credentials

After seeding:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@nyxaegis.com` | `admin123!` |
| BD Rep | `rep@nyxaegis.com` | `rep123!` |
| Hospital | `contact@nashvillegeneral.com` | `account123!` |

## Project Structure

```
src/
  app/
    (admin)/admin/     # Admin portal
    (rep)/rep/         # BD Rep portal
    (account)/account/ # Hospital account portal
    api/               # API routes
    login/             # Login page
    signup/            # Signup page
    page.tsx           # Landing page
  components/
    layout/sidebar.tsx # Role-based sidebar
    providers.tsx      # NextAuth SessionProvider
  lib/
    auth.ts            # NextAuth config
    prisma.ts          # Prisma client singleton
    utils.ts           # Utility functions
    brand.ts           # Brand constants
  proxy.ts             # Edge middleware
prisma/
  schema.prisma        # Database schema
  seed.ts              # Seed data
```

## Key Models

- **Rep** — BD representative profiles, credentials, territories
- **Hospital** — Hospital/health system account records
- **Contact** — Hospital decision makers (CMO, CFO, etc.)
- **Lead** — Pre-account prospects in the funnel
- **Opportunity** — Active BD opportunities (Discovery → Closed Won)
- **Activity** — CRM activity log (calls, emails, meetings, etc.)
- **Contract** — Service agreements and MSAs
- **Invoice** — Billing records with Stripe integration
- **ComplianceDoc** — HIPAA certs, state licenses, BAAs, W-9s

## Deployment (Vercel)

1. Push to GitHub
2. Connect to Vercel
3. Set environment variables
4. Deploy — Vercel will run `prisma migrate deploy && next build`

---

© 2026 NyxCollective LLC — Hospital BD Platform
