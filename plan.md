# Job Radar — Complete Build Plan

> **Project**: Personalized Tech Job Discovery Platform  
> **Owner**: B.Tech CSE 2027 graduate, Associate SWE Intern @ ServiceNow  
> **Goal**: Auto-discover internship & new-grad tech jobs from real company career pages, match to profile, track applications — all from one dashboard.  
> **Workspace**: `c:\Coding\jobbb`

---

## 1. Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14+ (App Router, TypeScript) |
| Styling | Tailwind CSS + shadcn/ui + Lucide Icons |
| Database | PostgreSQL (local via Docker, Neon/Supabase for prod) |
| ORM | Prisma |
| Validation | Zod |
| Auth | NextAuth.js (Auth.js v5) |
| Job Collection | Custom source adapters (Greenhouse, Lever, Ashby APIs) |
| Scheduling | GitHub Actions cron + manual API trigger |
| Testing | Vitest + Playwright |
| Deployment | Vercel (web) + managed Postgres |

---

## 2. Project Structure

```
c:\Coding\jobbb\
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── seed.ts                # Company registry + profile seed
│   └── migrations/
├── src/
│   ├── app/                   # Next.js App Router pages
│   │   ├── layout.tsx         # Root layout with providers
│   │   ├── page.tsx           # Redirect to dashboard
│   │   ├── dashboard/         # Main dashboard
│   │   ├── jobs/
│   │   │   ├── page.tsx       # Job listing with search/filters
│   │   │   └── [id]/page.tsx  # Job detail
│   │   ├── saved/page.tsx     # Saved jobs
│   │   ├── applications/page.tsx  # Application tracker
│   │   ├── settings/page.tsx  # Profile editor
│   │   └── api/
│   │       ├── jobs/          # Job CRUD & search
│   │       ├── profile/       # Profile read/update
│   │       ├── companies/     # Company registry
│   │       ├── saved/         # Save/unsave jobs
│   │       ├── applications/  # Application tracking
│   │       ├── collect/       # Manual collection trigger
│   │       └── health/        # Collection health
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── layout/            # Sidebar, Header, Nav
│   │   ├── dashboard/         # Dashboard widgets
│   │   ├── jobs/              # JobCard, JobList, JobFilters
│   │   └── applications/     # ApplicationCard, StatusBadge
│   ├── lib/
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── matching/          # Matching engine
│   │   │   ├── engine.ts      # Score calculator
│   │   │   ├── rules.ts       # Eligibility rules
│   │   │   └── titles.ts      # Title normalization
│   │   ├── collectors/        # Job source adapters
│   │   │   ├── base.ts        # Base adapter interface
│   │   │   ├── greenhouse.ts  # Greenhouse Job Board API
│   │   │   ├── lever.ts       # Lever Postings API
│   │   │   ├── ashby.ts       # Ashby Public API
│   │   │   └── registry.ts    # Adapter registry
│   │   ├── normalizers/       # Job data normalization
│   │   ├── validators/        # Zod schemas
│   │   └── utils.ts
│   └── types/                 # TypeScript type definitions
├── tests/
│   ├── matching/              # Matching engine tests
│   ├── collectors/            # Adapter tests
│   └── fixtures/              # Test data (clearly marked)
├── .github/
│   └── workflows/
│       └── collect.yml        # Scheduled collection
├── docker-compose.yml         # Local PostgreSQL
├── .env.example
├── tailwind.config.ts
├── next.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 3. Database Schema (Core Entities)

### UserProfile
- id, name, email, degree, graduationYear, currentRole, currentCompany
- targetRoles (string[]), employmentTypes (string[]), skills (string[])
- minExperience, maxExperience, locations (string[])
- createdAt, updatedAt

### Company
- id, name, slug, websiteUrl, careersUrl, logoUrl
- atsType (GREENHOUSE | LEVER | ASHBY | WORKDAY | CUSTOM | NONE)
- atsBoardId (identifier for ATS API)
- isActive, priority (1-5), lastCollectedAt, lastSuccessAt
- notes, createdAt, updatedAt

### JobSource
- id, companyId (FK), sourceType, sourceUrl, boardIdentifier
- isActive, lastFetchedAt, lastSuccessAt, failureCount, lastError
- createdAt, updatedAt

### Job
- id, externalId (unique per source), companyId (FK), sourceId (FK)
- title, normalizedTitle, description, descriptionHtml
- locations (string[]), isRemote, remoteRestrictions
- employmentType (INTERNSHIP | FULL_TIME | CONTRACT | UNKNOWN)
- experienceMin, experienceMax, requiredSkills, preferredSkills
- eligibleGradYears (int[]), degreeRequirements
- applicationUrl, sourcePostedAt
- firstSeenAt, lastSeenAt, lastVerifiedAt
- listingStatus (OPEN | CLOSED | UNVERIFIED | STALE)
- rawData (JSON for original payload)
- createdAt, updatedAt

### JobMatch
- id, jobId (FK, unique), profileId (FK)
- overallScore (0-100), matchCategory (STRONG | POSSIBLE | LOW | INELIGIBLE | NEEDS_REVIEW)
- gradScore, roleScore, skillScore, locationScore, experienceScore
- matchReasons (string[]), missingSkills (string[]), concerns (string[])
- createdAt, updatedAt

### SavedJob
- id, jobId (FK), profileId (FK), savedAt
- unique(jobId, profileId)

### Application
- id, jobId (FK), profileId (FK)
- status (SAVED | APPLIED | ONLINE_ASSESSMENT | INTERVIEW | OFFER | REJECTED | WITHDRAWN)
- appliedAt, notes, followUpDate
- unique(jobId, profileId)
- createdAt, updatedAt

### CollectionRun
- id, sourceId (FK), startedAt, completedAt
- status (RUNNING | SUCCESS | PARTIAL | FAILED)
- jobsFound, jobsCreated, jobsUpdated, jobsUnchanged
- errors (JSON), durationMs

---

## 4. Job Collection Pipeline

### Source Adapters (Priority Order)
1. **Greenhouse** — `GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs` → returns JSON array of jobs with metadata
2. **Lever** — `GET https://api.lever.co/v0/postings/{company}?mode=json` → returns JSON array of postings
3. **Ashby** — `POST https://api.ashbyhq.com/posting-api/job-board/{board_slug}` → returns job postings

### Adapter Interface
```typescript
interface JobSourceAdapter {
  name: string;
  fetch(source: JobSource): Promise<RawJob[]>;
  normalize(raw: RawJob): NormalizedJob;
}
```

### Pipeline Steps
1. Get active sources from DB → 2. For each: fetch → normalize → deduplicate → upsert → 3. Update match scores → 4. Log metrics

### Company ATS Mapping (Verified Examples)
| Company | ATS | Board ID | Status |
|---------|-----|----------|--------|
| Cloudflare | Greenhouse | cloudflare | ✅ Verified |
| Figma | Greenhouse | figma | ✅ Verified |
| Twilio | Greenhouse | twilio | ✅ Verified |
| MongoDB | Greenhouse | mongodb | ✅ Verified |
| Postman | Greenhouse | postman | ✅ Verified |
| Confluent | Greenhouse | confluent | ✅ Verified |
| Snowflake | Greenhouse | snowflakeinc | ✅ Verified |
| CrowdStrike | Greenhouse | crowdstrike | ✅ Verified |
| Palantir | Greenhouse | palantir | ✅ Verified |
| Databricks | Greenhouse | databricks | ✅ Verified |
| Coinbase | Greenhouse | coinbase | ✅ Verified |
| Plaid | Greenhouse | plaid | ✅ Verified |
| Stripe | Greenhouse | stripe | ✅ Verified |
| Rippling | Greenhouse | rippling | ✅ Verified |
| Dropbox | Greenhouse | dropbox | ✅ Verified |
| Canva | Greenhouse | canva | ✅ Verified |
| UiPath | Greenhouse | uipath | ✅ Verified |
| Elastic | Greenhouse | elastic | ✅ Verified |
| BrowserStack | Greenhouse | browserstack | ✅ Verified |
| Freshworks | Greenhouse | freshworks | ✅ Verified |
| Lever companies | Lever | {slug} | 🔍 Need to verify each |
| Others | Custom/None | N/A | 📋 Manual careers link only |

> **IMPORTANT**: Every board ID must be verified against the live API before being marked active. Unverified entries are stored but not collected from.

---

## 5. Matching Engine

### Scoring Algorithm (Deterministic)
```
totalScore = (gradScore × 0.25) + (roleScore × 0.25) + (skillScore × 0.30) + (locationScore × 0.10) + (experienceScore × 0.10)
```

### Eligibility Hard Fails (Override Score)
- Requires grad year ≠ 2027 explicitly → INELIGIBLE
- Requires 3+ years full-time experience → INELIGIBLE  
- Non-technical role (HR, Sales, Marketing) → INELIGIBLE
- Requires work authorization in non-India country with no remote-India option → INELIGIBLE

### Title Normalization
Map equivalent titles: SDE ↔ Software Engineer ↔ Software Development Engineer ↔ Developer, ASE ↔ Associate Software Engineer, GET ↔ Graduate Engineer Trainee, etc.

### Categories
- 80-100 → STRONG match
- 55-79 → POSSIBLE match  
- 30-54 → LOW match
- Hard fail → INELIGIBLE
- Missing critical info → NEEDS_REVIEW

---

## 6. Key API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/jobs | List/search jobs with filters, pagination |
| GET | /api/jobs/[id] | Job detail with match info |
| GET | /api/profile | Get user profile |
| PUT | /api/profile | Update profile |
| GET | /api/companies | List companies |
| POST | /api/saved | Save a job |
| DELETE | /api/saved/[jobId] | Unsave a job |
| GET | /api/saved | List saved jobs |
| POST | /api/applications | Create application record |
| PUT | /api/applications/[id] | Update application status |
| GET | /api/applications | List applications with filters |
| POST | /api/collect | Trigger manual collection (protected) |
| GET | /api/health | Collection health & last sync |

---

## 7. UI Pages

| Page | Key Components |
|------|---------------|
| **Dashboard** | Stats cards (new today, strong matches, saved, applied), recent jobs list, sync status, source health |
| **Jobs** | Search bar, filter sidebar (company, location, type, match, date), paginated job cards, sort options |
| **Job Detail** | Full description, match breakdown, save/apply buttons, application link |
| **Saved** | Saved jobs list with unsave option |
| **Applications** | Kanban or table view, status updates, notes, follow-up dates |
| **Settings** | Profile editor (all fields), company registry viewer, collection schedule |

---

## 8. Build Order (Phases)

### Phase 1: Foundation ⬅ START HERE
- [x] Initialize Next.js + TypeScript + Tailwind
- [x] Set up Prisma + PostgreSQL (Docker)
- [x] Create database schema + migrations
- [x] Seed company registry + default profile
- [x] Set up shadcn/ui

### Phase 2: Core UI
- [x] Root layout with sidebar navigation
- [x] Dashboard page with stats
- [x] Settings page (profile editor)
- [x] Jobs listing page with filters
- [x] Job detail page

### Phase 3: Collection Pipeline
- [x] Base adapter interface
- [x] Greenhouse adapter
- [x] Lever adapter  
- [x] Ashby adapter
- [x] Collection orchestrator
- [x] Manual trigger API

### Phase 4: Matching Engine
- [x] Title normalization
- [x] Eligibility rules
- [x] Score calculator
- [x] Match categorization
- [x] Bulk match recalculation

### Phase 5: Application Tracking
- [x] Save/unsave API + UI
- [x] Application CRUD API + UI
- [x] Status workflow
- [x] Notes and follow-ups

### Phase 6: Polish & Deploy
- [x] Search & filtering (full)
- [x] Health monitoring dashboard
- [x] GitHub Actions schedule
- [x] Tests (Vitest / node:test)
- [x] README + deployment docs
- [x] .env.example + docker-compose

---

## 9. Environment Variables Required

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/jobradar

# Auth
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000

# Collection (for protected manual trigger)
COLLECTION_SECRET=your-collection-secret

# Optional: AI parsing (future)
# OPENAI_API_KEY=sk-...
```

---

## 10. Key Design Decisions

1. **Single-user initially** — no multi-tenant complexity; profile stored in DB, editable via Settings
2. **No fake data in production** — empty states shown when no jobs collected yet
3. **Stale not closed** — jobs missing from one run marked STALE/UNVERIFIED, not CLOSED
4. **Deterministic matching first** — no LLM dependency for core eligibility
5. **Adapters are modular** — each ATS type is a separate file implementing common interface
6. **Board IDs verified** — only confirmed ATS identifiers are set to active
7. **Server-side secrets** — API keys, DB creds never exposed to browser

---

## 11. For Another AI Continuing This Work

**Current state**: Check `package.json`, `prisma/schema.prisma`, and `src/` to see what's built.  
**Database**: Run `npx prisma migrate dev` after setting `DATABASE_URL`.  
**Seed data**: Run `npx prisma db seed` for companies + default profile.  
**Dev server**: `npm run dev` on port 3000.  
**Key files**: Schema in `prisma/schema.prisma`, adapters in `src/lib/collectors/`, matching in `src/lib/matching/`, API routes in `src/app/api/`.  
**What matters most**: Real job data from real APIs, deterministic matching, no fabricated listings.
