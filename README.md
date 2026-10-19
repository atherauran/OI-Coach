# OI Coach

Practice competitive programming problems by talking them through with an AI coach.
Next.js 16 + Tailwind 4, Supabase (auth + Postgres), DeepSeek via the AI SDK, deployed to Cloudflare Workers with OpenNext.

## Run locally

1. Create a Supabase project and apply `supabase/migrations/0001_init.sql` (SQL editor, or `supabase link` + `supabase db push`).
2. In Supabase Auth settings, turn off public sign-ups. Accounts are created by the server with an invite code; the first account needs no code.
3. Copy `.env.example` to `.env.local` and fill in the keys.
4. `npm install`, then `npm run dev`.

## Deploy

`npm run deploy` builds with OpenNext and deploys with Wrangler. Set the same variables as Worker secrets:
`npx wrangler secret put SUPABASE_SECRET_KEY` (and the others).

## Layout

- `src/prompts/` — editable prompts: pack builder (`pack.ts`), coach (`coach.ts`), graders and idea cards (`grader.ts`).
- `src/lib/pack.ts` — problem pack pipeline: fetch statement → solve → key points, code blanks, idea tags.
- `src/lib/coach.ts` + `src/app/api/coach` — coach tools (reveal point, claim card, code blanks, hint, wrap-up) and session state.
- `src/lib/review.ts` — daily queue: identify-the-idea, key-point recall (2/7/14 days), template mastery decay.
- `src/lib/ideas.ts` — the fixed idea taxonomy.
- `src/lib/dict.ts` — Chinese and English UI text.

All database access goes through the server with the secret key; RLS is on with no policies.
