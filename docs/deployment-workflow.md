# Xledger Deployment Workflow

## Environment split

- Production app: deploys from `master` on Vercel
- Staging app: deploys from the `staging` branch as a Vercel preview deployment
- Production database: dedicated Supabase project for live business data
- Staging database: separate Supabase project for validation and testing

Never point the staging app at the production database.

## Vercel environment variables

Configure the same two variables in both Vercel environments:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Use these values:

- `Production` environment -> production Supabase project
- `Preview` environment -> staging Supabase project

This makes every preview deployment, including `staging`, talk to the staging database while the production branch keeps talking to production.

## Branch roles

- `master`: the production branch
- `staging`: the long-lived validation branch

Normal workflow:

1. Make changes on `staging`
2. Push to GitHub
3. Wait for the Vercel preview deployment for `staging`
4. Validate the changes there
5. Merge `staging` into `master`
6. Wait for the production deployment

Hotfix workflow:

1. Apply the urgent fix on `master`
2. Push and verify production
3. Merge `master` back into `staging`

Do not leave `staging` behind after a hotfix, or the next release will become confusing.

## Staging database setup

The staging Supabase project should be production-like, but isolated:

- Copy schema, tables, views, functions, RLS policies, and storage setup
- Seed representative business data once for realistic testing
- Create staging-only auth users manually
- Create matching `profiles` rows for those staging users

Do not copy production auth users or passwords into staging.

Refresh staging data manually only when needed. Avoid continuous sync from production so test data is not overwritten.

## Release checklist

Before releasing from `staging` to production:

1. Open the latest `staging` preview deployment
2. Verify login works against the staging Supabase project
3. Test at least one create/update path that matters for the current change
4. Confirm any test records only appear in staging
5. Merge `staging` into `master`
6. Open the production deployment
7. Verify the same area quickly against production data

## Phase 2

Future improvements when you want more rigor:

- Add repo-tracked Supabase migrations
- Automate schema promotion between staging and production
- Add CI checks before merging to `master`
