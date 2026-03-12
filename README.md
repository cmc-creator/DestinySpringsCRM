# NyxAegis — Destiny Springs Healthcare CRM

**Behavioral Health Admission & Referral Management Platform** — purpose-built for Destiny Springs Healthcare, an inpatient acute psychiatric hospital in Arizona.

NyxAegis gives Destiny Springs Healthcare's liaison team a unified platform to manage sending facilities, track the admission pipeline (inquiry → clinical review → insurance auth → admitted → discharged), assign territories, manage liaison compliance, and grow referral volume.

## Behavioral Health Features

- **Admissions Pipeline** — BH-specific stages: Inquiry → Clinical Review → Insurance Auth → Admitted → Active → Discharged
- **Title 36 Tracking** — Arizona ARS §36-520 emergency psychiatric hold workflow
- **Census Snapshot** — Daily bed availability by unit (Adult, Adolescent, Geriatric, Dual Diagnosis)
- **Payor Mix** — AHCCCS, BCBSAZ, Medicare, Aetna Better Health, UHC Community Plan tracking
- **Referral Sources** — ED social workers, PCPs, courts, crisis lines, peer support organizations
- **Arizona Geography** — Phoenix Metro, Scottsdale, Tucson, East Valley, Southern AZ territories

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
| `ADMIN` | `/admin/*` | Full platform access — facilities, liaisons, admissions pipeline, analytics, census |
| `REP` | `/rep/*` | Liaison portal — their admissions, territory, documents, payments |
| `ACCOUNT` | `/account/*` | Sending facility portal — their engagements, invoices, contracts |

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
- `DATABASE_URL` - PostgreSQL connection string
- `AUTH_SECRET` - NextAuth secret (generate with `openssl rand -base64 32`)
- `STRIPE_SECRET_KEY` - Stripe secret key
- `RESEND_API_KEY` - Resend email API key

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

- **Rep** - BD representative profiles, credentials, territories
- **Hospital** - Hospital/health system account records
- **Contact** - Hospital decision makers (CMO, CFO, etc.)
- **Lead** - Pre-account prospects in the funnel
- **Opportunity** - Active BD opportunities (Discovery to Closed Won)
- **Activity** - CRM activity log (calls, emails, meetings, etc.)
- **Contract** - Service agreements and MSAs
- **Invoice** - Billing records with Stripe integration
- **ComplianceDoc** - HIPAA certs, state licenses, BAAs, W-9s

## Deployment (Vercel)

1. Push to GitHub
2. Connect to Vercel
3. Set environment variables
4. Deploy - Vercel will run `prisma migrate deploy && next build`

---

© 2026 NyxCollective LLC - Hospital BD Platform
