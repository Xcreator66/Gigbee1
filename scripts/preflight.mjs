/** GigBee V1.4 dependency-free structural checks. Real typechecking and live integration remain required. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const at=(p)=>path.join(root,p);
const json=(p)=>JSON.parse(fs.readFileSync(at(p),'utf8'));
const required=[
 'package.json','apps/mobile/package.json','apps/mobile/app.json','apps/mobile/tsconfig.json',
 'apps/web/package.json','packages/shared/package.json',
 'apps/mobile/app/account-settings.tsx','apps/web/app/settings/page.tsx',
 'apps/mobile/app/notification-settings.tsx','apps/mobile/app/payment-activity.tsx','apps/mobile/app/delete-account.tsx',
 'apps/web/app/billing/page.tsx','apps/web/app/delete-account/page.tsx',
 'supabase/migrations/202611190001_foundation.sql','supabase/migrations/202611190002_marketplace.sql',
 'supabase/migrations/202611190003_notifications_finance_audit.sql',
 'supabase/migrations/202611190004_account_rights.sql',
 'supabase/migrations/20261122002647_course_integrity_and_push_registration.sql',
 'supabase/functions/deliver-notifications/index.ts','supabase/schema.sql',
 'apps/mobile/assets/skills/design.png','apps/mobile/assets/skills/video-editing.png',
];
const failures=[];
for(const f of required)if(!fs.existsSync(at(f)))failures.push('Missing '+f);
const rootPkg=json('package.json'),mobile=json('apps/mobile/package.json'),web=json('apps/web/package.json'),config=json('apps/mobile/app.json'),tsconfig=json('apps/mobile/tsconfig.json');
if(mobile.dependencies.react!==web.dependencies.react)failures.push('Mobile/web React versions disagree');
if(config.expo.newArchEnabled!==undefined||config.expo.splash!==undefined)failures.push('Deprecated Expo config fields present');
if(tsconfig.compilerOptions.baseUrl!==undefined)failures.push('Deprecated TS baseUrl still present');
if(config.expo.experiments?.typedRoutes!==false)failures.push('Typed routes must remain off until SDK58 router is validated');
if(!mobile.dependencies['expo-router']?.startsWith('~58.0.32'))failures.push('Router not updated to SDK 58 recommended patch');
if(!rootPkg.scripts.typecheck?.includes('--workspaces'))failures.push('Outdated npm -ws argument');
for(const name of ['expo-notifications','expo-device','expo-splash-screen'])if(!mobile.dependencies[name])failures.push(`Missing ${name}`);
const sql=fs.readFileSync(at('supabase/schema.sql'),'utf8');
for(const phrase of ['create table if not exists public.projects','create table if not exists public.courses','create or replace function public.hire_applicant','create or replace function public.verify_gigbee_certificate','create table if not exists public.notification_preferences','create or replace function public.claim_gigbee_deliveries','create or replace function public.my_gigbee_payment_activity','create table if not exists public.account_deletion_requests','create or replace function public.add_gigbee_quiz_question','create trigger gigbee_chat_notification'])if(!sql.includes(phrase))failures.push('Schema missing '+phrase);
if(failures.length){console.error('PREFLIGHT FAILED:\n'+failures.join('\n'));process.exit(1);}
console.log('PASS GigBee V1.4 structural checks: files, JSON, dependency alignment, Expo config and SQL sections.');
console.log('NOT covered: dependency installation, TypeScript typecheck, Expo Doctor, database execution, EAS build, actual push/email, payments or device testing.');
