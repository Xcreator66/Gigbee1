# GigBee V1.4 — Cloudflare Workers (vinext) Deployment

## Cause of the Cloudflare failure
Your last Cloudflare build passed `npm ci && npm run web:build`, but the deploy step
`npx wrangler deploy` was executed at the monorepo root, so Wrangler could not
determine which workspace app to deploy. Further, `next build` is not a
Cloudflare Worker output.

## Completed in THIS ISOLATED MIGRATION COPY
- `npx vinext check`: 100% compatible (10/10 supported; 0 issues).
- `npx vinext init --platform=cloudflare --name gigbee-web --cdn-cache=none --data-cache=none --image-optimization=none --no-prerender`.
- Generated `apps/web/vite.config.ts` and `apps/web/cloudflare.config.ts`.
- Added `build:vinext`, `deploy:vinext` and `preview:vinext` scripts.
- Pinned `vite@8.3.8` instead of 8.3.0; this removed the reported HIGH Vite advisory.
- `npm run build:vinext -w @gigbee/web`: passed.
- `npm run doctor`: 20/20 checks passed, so Expo compatibility was preserved.
- Five moderate dependency advisories remain; audit and investigate before a public launch.

The Vercel source and live database are not changed. Cloudflare's connected GitHub
repository has NOT been updated from this local copy.

## Files that must be committed in the same monorepo repository
- Root `package.json` with npm workspaces `apps/*` and `packages/*`
- Root `package-lock.json` (updated by vinext init and Vite patch)
- `apps/web/package.json`
- `apps/web/vite.config.ts`
- `apps/web/cloudflare.config.ts`
- `apps/web/tsconfig.json`
- `apps/web/.gitignore`
- All original app code and `packages/shared`

Do not upload `.env`, `.env.local`, Node modules, `.cloudflare/`, keys
or any `sb_secret_` / service-role credentials.

## Cloudflare dashboard configuration

Cloudflare > Workers & Pages > your Worker > Settings > Build:

| Setting | Value |
|---|---|
| Connected Git repository | GitBee monorepo, including shared package |
| Root directory | Repository root (leave blank if repo root selected) |
| Package installation | Cloudflare's auto `npm clean-install` (or `npm ci`) |
| Node version | 22 (24 also supports current Vite) |
| Build command | EMPTY — vinext deploy builds the app |
| Deploy command | `npm run deploy:vinext --workspace=@gigbee/web` |
| Non-production deploy command | `npm run preview:vinext --workspace=@gigbee/web` |

Remove the old `npm ci && npm run web:build` build command and the
old `npx wrangler deploy` command; they are not the correct Workers pipeline.
Do not set `SKIP_DEPENDENCY_INSTALL` if automatic npm installation is working.
The Vercel deployment remains available and protected; do not repoint your
custom domain to Cloudflare before end-to-end verification.

**Worker name**: This copy uses `gigbee-web` in
`apps/web/cloudflare.config.ts`. If your existing Cloudflare Worker has
another name, edit this value to match the exact existing Worker name,
or create a separate Worker named `gigbee-web`.
If Cloudflare's root is set to `apps/web`, switch to repo root so npm
can see the shared workspace package and the root lockfile.

## Public environment configuration

Add build variables AND Worker runtime variables where required:
- `NEXT_PUBLIC_SUPABASE_URL=https://<NEW_GIGBEE_REF>.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<PUBLISHABLE_KEY_ONLY>`

These are intentionally placeholders: a new GigBee Supabase project may be
created later, and the archived source has no local secrets. Do NOT expose
service-role keys in NEXT_PUBLIC_ variables.

Supabase Auth must allow the verified Cloudflare HTTPS callback/reset domains.
New database migrations and authenticated RLS workflows require separate
testing before exposing registration.

## Validation commands (from the MONOREPO ROOT)

```powershell
npm ci
npm run doctor
npm run verify
npm run build:vinext --workspace=@gigbee/web
npm audit --omit=dev
```

Only deploy to a test Worker or preview branch first. Then check the
homepage, /jobs, /services, /learn, /api/health, sign-in redirects, RLS
and authenticated client/freelancer journeys.

## Current release gate
NOT PRODUCTION CERTIFIED: the new Supabase migration and real authenticated
E2E flows are untested; five moderate dependencies are still reported;
Cloudflare credentials and worker deployment have not been verified here.

Docs:
- https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- https://vinext.dev/docs/getting-started/migrating
- https://vinext.dev/docs/deploying/cloudflare
- https://developers.cloudflare.com/workers/ci-cd/builds/advanced-setups/
