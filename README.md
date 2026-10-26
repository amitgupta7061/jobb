# Job Radar — Personalized Tech Job Discovery Platform

A full-stack, automated web application tailored for a **B.Tech CSE 2027 graduate with ServiceNow ASE internship experience**. Job Radar automatically discovers technical internships, fresher/new-grad roles, and 0–1 year experience engineering positions directly from company career APIs and ranks them using a deterministic, explainable matching engine.

---

## 🌟 Key Features

1. **Personalized Dashboard**
   - High-level overview: Strong Matches (80%+), Possible Matches (55–79%), New Jobs Discovered Today, Saved Jobs, and Active Applications.
   - Live synchronization status with one-click manual sync.

2. **Verified Job Collection Pipeline**
   - Direct integration with public ATS APIs (**Greenhouse Job Board API** and **Lever Postings API**).
   - Zero scraping or fragile HTML parsing; uses official, rate-limit-compliant REST endpoints.
   - Deduplication via compound keys (`externalId` + `companyId`), preserving original application links.
   - Disappearance handling: unlisted jobs are retained and marked unverified or stale rather than prematurely closed.

3. **Deterministic, Explainable Matching Engine**
   - **Graduation Batch & Degree (25%)**: 2027 batch prioritisation, B.Tech CSE preference.
   - **Job Role & Experience (25%)**: Software Engineer, SDE, ASE, GET, New Grad, Backend, Full-Stack, Platform, Cloud, DevOps.
   - **Technical Skills (30%)**: Matches C, C++, Java, Python, JavaScript, TypeScript, React, Next.js, Node.js, Spring Boot, SQL, PostgreSQL, MongoDB, Prisma, Git, Docker, REST APIs, Microservices, Distributed Systems.
   - **Location & Arrangement (10%)**: India (Bengaluru, Hyderabad, Pune, Gurgaon, etc.) and remote positions explicitly open to India.
   - **Internship & Project Experience (10%)**: ServiceNow internship and prior engineering experience.
   - **Hard Fails**: Automatic override to `INELIGIBLE` for roles requiring 3+ years experience, conflicting graduation batches (e.g. 2024 only), or non-technical roles (Sales, HR, Marketing).

4. **Interactive Application Tracker**
   - Track application stages: `Saved`, `Applied`, `Online Assessment`, `Interviewing`, `Offer Received`, `Rejected`, `Withdrawn`.
   - Add custom notes (interviewer details, assessment topics, follow-up dates).

5. **Configurable Settings**
   - Edit graduation year, target roles, skills tags, and experience thresholds with automatic re-scoring of all active jobs.
   - Browse the complete company registry across Product, Fintech, Consumer Tech, Banking/Trading, and IT Consulting.

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 14+ (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons
- **Backend**: Next.js Route Handlers (`/api/jobs`, `/api/profile`, `/api/saved`, `/api/applications`, `/api/collect`, `/api/health`)
- **Database & ORM**: PostgreSQL (Neon Serverless) + Prisma ORM
- **Validation**: Zod
- **Automated Scheduling**: GitHub Actions (`.github/workflows/collect.yml`)

---

## 🚀 Getting Started

### 1. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `DATABASE_URL` is configured with your PostgreSQL connection string.

### 2. Database Migration & Seed
Run Prisma to apply schema and seed 80+ company records and default profile:
```bash
npx prisma db push
npx tsx prisma/seed.ts
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Run Unit Tests
```bash
npx tsx --test tests/matching.test.ts
npx tsx --test tests/adapters.test.ts
```

---

## 📡 Source Integration Guide

### Verified Automated ATS Integrations
The following companies are verified and have active automated collectors:
| Company | ATS Type | Board Identifier | Status |
|---------|----------|-------------------|--------|
| Cloudflare | Greenhouse | `cloudflare` | ✅ Verified Live |
| Figma | Greenhouse | `figma` | ✅ Verified Live |
| Stripe | Greenhouse | `stripe` | ✅ Verified Live |
| Databricks | Greenhouse | `databricks` | ✅ Verified Live |
| Elastic | Greenhouse | `elastic` | ✅ Verified Live |
| Coinbase | Greenhouse | `coinbase` | ✅ Verified Live |
| Twilio | Greenhouse | `twilio` | ✅ Verified Live |
| Dropbox | Greenhouse | `dropbox` | ✅ Verified Live |
| MongoDB | Greenhouse | `mongodb` | ✅ Verified Live |
| InMobi | Greenhouse | `inmobi` | ✅ Verified Live |
| CRED | Lever | `cred` | ✅ Verified Live |
| Meesho | Lever | `meesho` | ✅ Verified Live |

### Adding a New Verified Company
1. Verify the company's public board slug:
   - For Greenhouse: `https://boards-api.greenhouse.io/v1/boards/{slug}/jobs`
   - For Lever: `https://api.lever.co/v0/postings/{slug}?mode=json`
2. Add the company to `prisma/seed.ts` or directly through the database.
3. Re-run `npx tsx prisma/seed.ts` or add a `JobSource` entry in the database.

---

## ⏰ Scheduled Collection
A GitHub Actions workflow is provided at `.github/workflows/collect.yml`.
- Runs automatically every 12 hours (06:00 and 18:00 UTC).
- Supports manual trigger via `workflow_dispatch` in GitHub Actions.
- Set `NEXT_PUBLIC_APP_URL` and `COLLECTION_SECRET` in your GitHub repository secrets.
