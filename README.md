# Xledger

Xledger is a private internal finance tracker built with React, Vite, TypeScript, shadcn/ui, and Supabase.

## Local setup

1. Copy `.env.example` to `.env.local`
2. Fill in:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Install dependencies with `npm install`
4. Start the app with `npm run dev`

## Scripts

- `npm run dev` -> start the Vite dev server
- `npm run build` -> build the production bundle
- `npm run preview` -> preview the built app locally
- `npm run lint` -> run ESLint

## Deployment workflow

The staging/production workflow is documented in [docs/deployment-workflow.md](./docs/deployment-workflow.md).

Use separate Supabase projects for production and staging, and map them through Vercel environment variables:

- Vercel `Production` env vars -> production Supabase
- Vercel `Preview` env vars -> staging Supabase

Branch workflow:

- `master` -> production
- `staging` -> staging / validation
