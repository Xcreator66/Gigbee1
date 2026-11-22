/** Dependency-free account integration smoke checks (V1.4); no runtime assertion. */
import fs from 'node:fs';
import path from 'node:path';
const base=path.resolve(import.meta.dirname,'..');
const read=(p)=>fs.readFileSync(path.join(base,p),'utf8');
const checks=[
 ['Mobile account settings route',read('apps/mobile/app/account-settings.tsx').includes('function AccountSettings')],
 ['Mobile account settings visible in Profile',read('apps/mobile/app/(tabs)/profile.tsx').includes("path:'/account-settings'")],
 ['Web account settings route',read('apps/web/app/settings/page.tsx').includes('function AccountSettingsPage')],
 ['Web account settings linked in dashboard',read('apps/web/app/dashboard/page.tsx').includes('href="/settings"')],
 ['Web account settings linked in site navigation',read('apps/web/app/layout.tsx').includes('href="/settings"')],
 ['Web settings styling loaded',read('apps/web/app/layout.tsx').includes("import './settings/settings.css'")],
 ['Mobile authenticated email change',read('apps/mobile/app/account-settings.tsx').includes('supabase.auth.updateUser({email: next})')],
 ['Web authenticated email change',read('apps/web/app/settings/page.tsx').includes('supabase.auth.updateUser({email: next})')],
 ['Mobile authenticated password change',read('apps/mobile/app/account-settings.tsx').includes('supabase.auth.updateUser({password: newPassword})')],
 ['Web authenticated password change',read('apps/web/app/settings/page.tsx').includes('supabase.auth.updateUser({password})')],
 ['Mobile privacy change limited to owner',read('apps/mobile/app/account-settings.tsx').includes(".eq('id', session.user.id)")],
 ['Web privacy change limited to owner',read('apps/web/app/settings/page.tsx').includes(".eq('id', user.id)")],
 ['Current-device sign out scoped locally',read('apps/mobile/app/(tabs)/profile.tsx').includes("auth.signOut({scope:'local'})")],
 ['Global sign out separate from local',read('apps/mobile/app/account-settings.tsx').includes("auth.signOut({scope: 'global'})") && read('apps/web/app/settings/page.tsx').includes("auth.signOut({scope: 'global'})")],
 ['Email opt-in does not reset push consent on web',read('apps/web/app/settings/page.tsx').includes('update({email_enabled: next, updated_at:')],
 ['Account deletion remains reviewed',read('apps/web/app/settings/page.tsx').includes('Deletion requests are reviewed')],
 ['Original account migrations preserved and V1.4 added',fs.readdirSync(path.join(base,'supabase/migrations')).filter(x=>x.endsWith('.sql')).length===5 && fs.existsSync(path.join(base,'supabase/migrations/20261122002647_course_integrity_and_push_registration.sql'))],
];
for(const [description,pass] of checks)console.log(`${pass?'PASS':'FAIL'} ${description}`);
if(checks.some(([,pass])=>!pass))process.exit(1);
console.log('17 account source integration checks passed. Does not verify runtime, mail, Supabase RLS or native builds.');
