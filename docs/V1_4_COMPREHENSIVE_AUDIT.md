# GigBee V1.4 — Comprehensive screen, function and logic audit
Date: 22 November 2026
Release: 1.4.0 (Android versionCode 14)
Status: **Audited source / closed-beta candidate, NOT production-certified.**

## Scope and method
Reviewed the Expo Router screen inventory, Next.js route components, shared UI/auth code,
Supabase SQL migrations, Storage policies, Realtime, notifications and payment Edge Functions.
Reviewed navigation, controls, queries, validation, role checking, ownership, state transitions,
data visibility, loading/error handling, duplicate prevention, accessibility and pagination.
Typechecked both app projects, rendered key routes with headless Edge at desktop and mobile widths, compiled the Next.js production site, exported Android
Metro JavaScript/Hermes, checked Expo dependencies, ran source smoke checks, parsed
all SQL scripts, executed **read-only anonymous** Supabase checks, and requested 23 website routes.

**Test limitations:** no account passwords or authorized test users were available, so login,
email confirmations, password recovery, two-account hiring and client/freelancer handoff,
live RPC execution, RLS abuse with authenticated attackers, EAS signing, real device UI,
FCM delivery, merchant transactions, payout/escrow and accessibility screen-reader testing
have NOT been independently verified. HTTP 200 is not proof that interactive browser code works.

## Mobile routes reviewed

| Area | Screens / actions | Key validation |
|---|---|---|
| App shell | app/index, app/_layout, tabs/_layout | Login routing, session guard, tabs, notifications deep links |
| Authentication | (auth)/login, register, forgot | Supabase email/password, signup checks, reset redirect |
| Home | (tabs)/index | Real job feed, unread indicators, active work counts |
| Job discovery | (tabs)/explore, job/[id], saved | Server-side filtering/pagination, duplicate application, bookmarking |
| Hiring | post-job, (tabs)/work | Role activation, fixed budget, hiring RPC and posted jobs |
| Projects | project/[id], chat/[id], inbox | Participant RLS, recent chat, history, delivery/review/dispute and attachments |
| Learning | (tabs)/learn, course/[id], studio | Published catalogue, enrollment/progress, private quiz keys and creator safeguards |
| Services | services, my-services | Fixed quotes, service requests, freelancer responses and outgoing client requests |
| Identity | (tabs)/profile, freelancer/[id], portfolio, rankings, certificates | Profile privacy, HTTPS links, real reviews and verifiable codes |
| Account control | account-settings, notification-settings, notifications | Password/email change, scoped sign out, opt-in preferences, push devices |
| Support/finance | report, delete-account, payment-activity | Staff reporting, reviewed deletion intake, read-only financial activity |

## Website routes reviewed

| Functional area | Routes |
|---|---|
| Public brand | /, /about, /for-clients, /how-it-works |
| Public marketplace | /jobs, /jobs/[id], /freelancers, /u/[username], /services, /services/[id] |
| Learning and reputation | /learn, /learn/[id], /rankings, /verify, /verify/[code] |
| Auth and account | /sign-in, /sign-up, /reset-password, /settings, /delete-account |
| Work and finance | /dashboard, /project/[id], /my-services, /billing |
| Governance | /admin |
| Route/fallback | /_not-found |

## Confirmed fixes in V1.4

1. **Chat history cutoff** — Previously the oldest 150/200 records were loaded and recent messages vanished in long projects. Both apps now fetch recent messages in descending order and render chronologically; earlier chat can be retrieved in batches.
2. **Course publication integrity** — Draft-only lesson/question changes, a trigger preventing publication without lessons and answered assessments, and immutability rules for published content. Existing already-published invalid content requires individual review.
3. **Quiz answer-key partial failure** — One server-side RPC transaction saves both quiz question and protected correct answer, preventing half-finished questions.
4. **Client service tracking** — The app and website now show outgoing requests, their quoted original prices, statuses and accepted project links.
5. **Service request abuse** — A database-side per-client 24-hour cap and duplicate pending-request prevention, with recorded original quote. Ordinary clients cannot directly insert forged service_requests.
6. **Service forms** — Validate integer prices and delivery estimates against database constraints; mobile supports package pause/reactivation.
7. **Notifications** — Added in-app notification trigger for new project chat messages without copying private chat text to external channels; short deduplication prevents repetitive alert floods.
8. **Push device account switch** — New user+token index and server-controlled disable of previous accounts' registrations when the token changes owners; matching upsert client behavior.
9. **Moderation evidence protection** — Narrowed UPDATE grants so staff only change status/resolution fields, not original user reports, dispute reasons or deletion-request content; job status audit trigger added.
10. **Attachment cleanup** — When a deliverable record fails, both clients attempt cleanup of their own unreferenced upload. Storage policy permits deletion only of unreferenced owner files; replaced avatar cleanup is supported.
11. **Paginated discovery** — Courses on mobile, plus web course/service/public-talent directories, now support server-side search/pagination and clear status/error feedback.
12. **Navigation/accessibility** — Added route-level login guard for mobile deep links, accessible labels to shared form fields and buttons, clearer Inbox project titles.
13. **Project counts** — Cancelled projects no longer count as active work on the mobile home screen.
14. **HTTPS safety** — New profile/portfolio links require HTTPS in mobile forms; public website hides non-HTTPS personal links.
15. **Supply-chain vulnerability** — Patched transitive minimatch 10.2.6 to 11.0.9 with an exact npm override and lockfile update; no forced Expo downgrade.
16. **Public messaging** — About-page descriptions distinguish existing source features from unverified production and payment features.

## Source and verification results

| Check | Outcome |
|---|---|
| Npm install with lockfile | PASS |
| Source parsing and local import checks | PASS |
| V1.2 account integration structural checks | 17/17 PASS |
| V1.4 source regression tests | 11/11 PASS |
| Mobile and website TypeScript | PASS |
| Next.js production build | PASS |
| Website GET smoke (23 paths) | 23/23 returned HTTP 200 |
| Edge browser desktop/mobile (12 routes x 2 viewports) | 24/24 PASS; no JS page errors or horizontal overflow; mobile nav opened |
| Expo Doctor | 20/20 PASS |
| Expo Metro Android export | PASS (Hermes JS bundle) |
| Live anonymous Supabase security smoke | 12/12 PASS, READ-ONLY |
| npm audit --omit=dev --audit-level=moderate | 0 known vulnerabilities |
| PostgreSQL SQL syntax parse | 5/5 migrations + combined schema parse (357 SQL statements) |
| Original four migration file hashes | 4/4 unchanged from V1.3 |
| Native APK/AAB with correct Gradle | NOT BUILT (Gradle 9.4.1 download previously blocked) |
| Real two/three-account RLS and hiring E2E | NOT RUN |
| New V1.4 SQL migration deployed | NO — source only |
| Real email, push, finance and production settlement | NOT CERTIFIED |

## Database deployment rule — IMPORTANT

The four original GigBee migrations are preserved. V1.4 adds one new migration:
`supabase/migrations/20261122002647_course_integrity_and_push_registration.sql`.
It is also appended to `supabase/schema.sql` for a **new empty** installation.
For an existing GigBee installation apply **only the new migration after staging review**,
not the composite bootstrap. Verify the project ID is GigBee `difltkijsmqcnrycjolz`.
Never apply GigBee SQL to either SiteFlow project.

SQL syntax parsing is not PostgreSQL execution. The migration still requires a staging
transaction, RLS/user-role testing, and inspection of existing published courses and
existing push-device registrations before any production rollout.

**Upgrade order:** back up database; deploy/test the migration in GigBee staging; verify
course creator, ordinary learner, freelancer, client and moderator access; then deploy
matching V1.4 app/site packages. The new Creator Studio quiz RPC requires the migration
to have been deployed first.

## Remaining launch gates and risks

- Run a **two/three account smoke**: signup, email confirmation, create/open job, free
  proposal, hire, private chat, upload and delivery, revisions, acceptance, review,
  work certificate, free learning and quiz/certificate, service request and moderation.
- Test ownership denial as a third user for private jobs, messages, deliverables,
  uploads, member profiles, account deletion requests and payment records.
- Verify the V1.4 migration and all RLS policies on a dedicated GigBee staging database.
- Configure working auth email redirects, EAS app project ID, FCM and sender service,
  push receipts, and scheduled dispatcher with secret management before enabling alerts.
- Run Android physical-device smoke and signed APK/AAB builds using the **correct**
  Gradle version; confirm Google Play data safety, links, account deletion and legal pages.
- Keep payments disabled until merchant/provider reconciliation, refunds, legal terms,
  KYC, tax, payouts and customer support are established. Razorpay Payment Links are not escrow.
- Implement operational monitoring, contact/support process and privacy/terms review.

**Launch recommendation:** do not market this as a production-certified marketplace.
Use V1.4 as an audited source candidate for a controlled closed-beta validation.
