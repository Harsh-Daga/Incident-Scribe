# IncidentScribe Frontend

Next.js 15 frontend for IncidentScribe AI - the AI-powered incident management system.

## Prerequisites

- Node.js 20+
- Supabase project configured
- Kestra running (optional, for workflow features)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

3. Run development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/login` | Login page |
| `/signup` | Signup with invite code |
| `/dashboard` | Incident list |
| `/incident/[id]` | Incident detail with AI analysis |
| `/dashboard/docs` | Documentation |
| `/dashboard/webhooks` | Webhook setup guide |
| `/dashboard/organization` | Org settings (admin) |
| `/dashboard/admin` | Platform admin |

## API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/incidents` | GET | List incidents |
| `/api/incidents/[id]` | GET | Get incident |
| `/api/analyze` | POST | Stream AI analysis |
| `/api/kestra/trigger` | POST | Trigger workflow |
| `/api/analysis/save` | POST | Save AI results |
| `/api/webhooks/ingest` | POST | Webhook ingestion |

## Key Components

- `MarkdownRenderer` - Renders AI analysis with proper formatting
- `QuickStartGuide` - Onboarding wizard
- `UserMenu` - Auth dropdown with portal for z-index
- `LoadingSpinner` - Consistent loading states

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **Auth**: Supabase Auth + RLS
- **AI**: Vercel AI SDK + Gemini
- **Markdown**: react-markdown + remark-gfm

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Harsh-Daga/Incident-Scribe)

Set environment variables in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
