# InterviewPrep AI — Production Full-Stack Platform

InterviewPrep AI is a production-grade, AI-powered interview preparation and career acceleration platform designed for computer science students, software engineers, and hiring candidates.

It combines:
- **Canonical Topic Quizzes**: Instant practice with algorithmic/conceptual grading across 18 CS domains.
- **Voice & Text Mock Interviews**: Real-time evaluation of technical depth, communication clarity, and filler words.
- **Project Analyzer**: Deep repository analysis extracting architecture graphs, elevator pitches, and source-grounded defense questions.
- **Candidate Intelligence**: Adaptive competency tracking, misconception detection, and automated remediation.
- **ATS Resume Builder**: Multi-template resume editor with AI section polishing and clean PDF export.
- **BYOK (Bring Your Own Key)**: Full support for user-supplied Google Gemini API keys stored with AES-256-GCM encryption.

---

## Complete Architecture

```
interview-prep-app/
├── AII1/                               # React 18 + TypeScript + Vite SPA
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   │   ├── auth/              # AuthScreen, ResetPasswordScreen
│   │   │   │   ├── candidate/         # CandidateIntelligence, MisconceptionPanel
│   │   │   │   ├── help/              # HelpScreen (Comprehensive in-app user guide)
│   │   │   │   ├── onboarding/        # OnboardingModal (First-time user wizard)
│   │   │   │   ├── project/           # Question & pitch defense screens
│   │   │   │   ├── resume/            # Multi-template builder, PDF export
│   │   │   │   └── settings/          # AiProviderSettings (BYOK key configuration & test)
│   │   │   └── App.tsx                # Central router, state, layout & global listeners
│   │   ├── lib/
│   │   │   ├── api.ts                 # Hardened apiFetch with token refresh & 401 dispatch
│   │   │   ├── scoring.ts             # Canonical quiz score calculation
│   │   │   ├── supabase.ts            # Supabase JS browser client
│   │   │   └── topicRegistry.ts       # 18 canonical CS topic definitions & metadata
│   │   └── types/                     # Shared TypeScript interfaces
│   └── index.html                     # SEO optimized, OpenGraph tags, SVG favicon
│
└── server/                             # Express + TypeScript API Server
    ├── middleware/
    │   ├── auth.ts                    # Supabase JWT validation & req.userId extraction
    │   └── rateLimit.ts               # Tiered rate limiting (AI: 20/15min, General: 200/15min)
    ├── routes/
    │   ├── account.ts                 # Defense-in-depth cascading account deletion
    │   ├── aiCredentials.ts           # BYOK validation, status classification & encryption
    │   ├── candidate.ts               # Competency mastery & misconception endpoints
    │   ├── interview.ts               # Question generation & response evaluation
    │   ├── project.ts                 # ZIP archive analysis & GitHub repository ingestion
    │   ├── quiz.ts                    # Topic & custom note quiz generation
    │   ├── quiz-pdf.ts                # Authenticated PDF note upload & parsing
    │   └── resume.ts                  # Section polish, reference resume extraction & PDF export
    ├── lib/
    │   ├── crypto.ts                  # AES-256-GCM encryption for stored user API keys
    │   ├── gemini.ts                  # Gemini client factory supporting system or BYOK keys
    │   ├── repoAnalyzer.ts            # ZIP path traversal defense & repository parsing
    │   └── supabase.ts                # Supabase service-role client
    └── migrations/                    # Database schema & RLS migrations (001–005)
```

---

## Quick Start (Local Development)

### Prerequisites
- Node.js ≥ 18
- A [Supabase](https://supabase.com) project
- A [Google AI Studio Gemini API Key](https://aistudio.google.com/app/apikey) (free tier works)

### 1. Install Dependencies
```bash
# Backend dependencies
cd server && npm install

# Frontend dependencies
cd ../AII1 && npm install
```

### 2. Configure Environment Variables

**Backend (`server/.env`):**
```env
PORT=3001
GEMINI_API_KEY=your_gemini_api_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
CORS_ORIGINS=http://localhost:5173,http://localhost:4173
```

**Frontend (`AII1/.env.local`):**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
# Optional if deploying separately:
# VITE_API_BASE_URL=https://api.yourdomain.com
```

### 3. Run Database Migrations

Apply the migration scripts in your Supabase SQL Editor in numerical order:
1. `server/migrations/001_quiz_attempts.sql` — Quiz attempts table, indexes, and RLS policies
2. `server/migrations/002_interview_sessions.sql` — Mock interview sessions table and transcripts
3. `server/migrations/003_resumes.sql` — Resumes table with version tracking and RLS
4. `server/migrations/004_candidate_intelligence.sql` — Competencies, misconceptions, and BYOK credentials
5. `server/migrations/005_cascade_and_security.sql` — `ON DELETE CASCADE` foreign keys and mode check expansion

### 4. Start Development Servers

```bash
# Terminal 1 — Backend API
cd server && npm run dev

# Terminal 2 — Frontend App
cd AII1 && npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## Production Security Architecture

1. **Credential Isolation**:
   - The server's `GEMINI_API_KEY` and Supabase `SERVICE_ROLE_KEY` are strictly server-side and never exposed to the frontend.
   - User-supplied BYOK Gemini keys are validated against Google's API, classified into standard status codes (`VALID`, `INVALID`, `QUOTA_EXCEEDED`, `BILLING_REQUIRED`), encrypted using AES-256-GCM before database insertion, and decrypted in-memory only during route execution.

2. **Authentication & Session Lifecycle**:
   - Frontend requests carry a Supabase JWT in the `Authorization: Bearer <token>` header.
   - 401 Unauthorized responses trigger automatic session refresh; if unresolvable, a global `auth:session-expired` event logs the user out gracefully.
   - Password reset flow uses dedicated `ResetPasswordScreen` triggered by `#type=recovery` or `PASSWORD_RECOVERY` auth state events.

3. **Defense-in-Depth Account Deletion**:
   - `DELETE /api/account` explicitly removes all user rows across child tables (`quiz_attempts`, `interview_sessions`, `resumes`, `competency_scores`, `misconceptions`, `ai_credentials`, `ai_usage`, `learning_events`) before deleting the user from `auth.users`.
   - If deletion encounters an issue, the user is kept signed in and shown a clear error with a retry button.

4. **Upload Hardening**:
   - `repoAnalyzer.ts` defends against ZIP bombs and path traversal by validating normalized paths (rejecting `../`, absolute paths, and null bytes).
   - Project Analyzer strictly accepts ZIP archives (up to 20MB) with frontend size checks and drag-and-drop feedback.

5. **Rate Limiting & Health Probes**:
   - Cloud liveness endpoints: `GET /health` and `GET /api/health` return `{ status: "ok" }`.
   - Express rate limiting: 200 requests per 15 minutes for general routes; 20 requests per 15 minutes for generative AI routes.

---

## Production Deployment Checklist

- [ ] Ensure `.env` is listed in root `.gitignore`, `AII1/.gitignore`, and `server/.gitignore`.
- [ ] If deploying frontend on a CDN (e.g. Vercel, Netlify) and backend on a container (e.g. Render, Railway, Fly.io):
  - Set `VITE_API_BASE_URL` in frontend environment pointing to your backend URL.
  - Set `CORS_ORIGINS` in backend environment pointing to your frontend URL.
- [ ] In Supabase Dashboard:
  - Configure Site URL and Redirect URLs to your production domain.
  - Enable Google OAuth provider if Google Sign-In is required.
  - Run all 5 SQL migrations from `server/migrations/`.
- [ ] Run `npm run build` in both `server` and `AII1` to verify clean builds.
