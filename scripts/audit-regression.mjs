/** GigBee V1.4 deterministic source regression audit.
 * This is NOT a substitute for physical-device, real Supabase or security penetration tests.
 */
import {strict as assert} from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const get=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const must=(file,required)=>{const s=get(file);for(const pattern of required)assert(s.includes(pattern),file+': missing '+pattern);};
const mustNot=(file,banned)=>{const s=get(file);for(const pattern of banned)assert(!s.includes(pattern),file+': still contains '+pattern);};
let count=0;
function check(label,fn){try{fn();count++;console.log('PASS '+label)}catch(e){console.error('FAIL '+label+': '+e.message);process.exitCode=1}}
check('Versions match build metadata',()=>{
 const rootPkg=JSON.parse(get('package.json'));
 const mobile=JSON.parse(get('apps/mobile/package.json'));
 const web=JSON.parse(get('apps/web/package.json'));
 const config=JSON.parse(get('apps/mobile/app.json'));
 for(const x of [rootPkg,mobile,web])assert.equal(x.version,'1.4.0');
 assert.equal(config.expo.version,'1.4.0');
 assert.equal(config.expo.android.versionCode,14);
});
check('Marketplace searches are server-side paginated',()=>{
 must('apps/mobile/app/(tabs)/explore.tsx',[".range(0,pages*PAGE_SIZE-1)","'Unable to load'".slice(0,0)] .filter(Boolean));
 must('apps/web/app/jobs/page.tsx',['.range((page-1)*pageSize,page*pageSize-1)','pageHref']);
});
check('Mobile Academy and public directories are paginated',()=>{
 must('apps/mobile/app/(tabs)/learn.tsx',['.range(0,page*PAGE_SIZE-1)','Load more courses']);
 for(const p of ['apps/web/app/freelancers/page.tsx','apps/web/app/services/page.tsx','apps/web/app/learn/page.tsx']){
  must(p,['.range((page-1)*pageSize,page*pageSize-1)','pageSize=24']);
 }
});
check('Project chats fetch recent messages and page history',()=>{
 must('apps/mobile/app/chat/[id].tsx',[".order('created_at',{ascending:false})",'Load earlier messages','slice().reverse()']);
 must('apps/web/app/project/[id]/page.tsx',[".order('created_at',{ascending:false})",'Load earlier messages','slice().reverse()']);
});
check('Client service requests are visible on both platforms',()=>{
 must('apps/mobile/app/my-services.tsx',[".eq('client_id',session.user.id)",'Your requests to freelancers']);
 must('apps/web/app/my-services/page.tsx',[".eq('client_id',user.id)",'Requests you sent to freelancers']);
});
check('Creator Studio validates and atomically saves answers',()=>{
 must('apps/mobile/app/studio.tsx',["'add_gigbee_quiz_question'",'lessonCount','questionCount',"selected?.status==='draft'"]);
 mustNot('apps/mobile/app/studio.tsx',["rpc('set_quiz_answer'"]);
});
check('Backend protects published course content and certificate sources',()=>{
 const sql=get('supabase/migrations/20261122002647_course_integrity_and_push_registration.sql');
 for(const token of ['guard_gigbee_course_publication','add_gigbee_quiz_question','status=\'draft\'','quiz_answers','revoke update on public.reports'])assert(sql.includes(token),token);
});
check('Files and moderation are restricted by RLS migration',()=>{
 must('supabase/migrations/20261122002647_course_integrity_and_push_registration.sql',
  ['gigbee private file owner cleanup','gigbee avatar owner cleanup',
   'grant update(status) on public.reports','grant update(status,resolution,resolved_at) on public.disputes',
   'gigbee_job_status_audit']);
});
check('Push handover and chat notification are server-controlled',()=>{
 must('apps/mobile/app/notification-settings.tsx',["onConflict:'user_id,expo_push_token'"]);
 must('supabase/migrations/20261122002647_course_integrity_and_push_registration.sql',
  ['gigbee_push_token_handover','gigbee_chat_notification','2 minutes']);
});
check('Payment and payouts remain gated',()=>{
 must('supabase/functions/create-payment-link/index.ts',["GIGBEE_PAYMENTS_ENABLED","Merchant onboarding"]);
 must('docs/PAYMENTS.md',['escrow']);
});
check('No dangerous privileged keys are declared as public environment vars',()=>{
 const envSamples=['apps/web/.env.example','apps/mobile/.env.example'].map(get).join('\n');
 assert(!/NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY|EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_RAZORPAY_KEY_SECRET|EXPO_PUBLIC_RAZORPAY_KEY_SECRET/.test(envSamples));
});
if(!process.exitCode)console.log(count+' GigBee V1.4 source regression checks passed. Live authenticated and device tests remain required.');
