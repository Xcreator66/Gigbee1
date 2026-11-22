/** Read-only GigBee hosting preflight. Never changes remote infrastructure. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pathOf=(p)=>path.join(root,p);
const loadEnv=(file)=>{
 if(!fs.existsSync(pathOf(file)))return {};
 return Object.fromEntries(fs.readFileSync(pathOf(file),'utf8')
  .split(/\r?\n/).filter(line=>line.trim()&&!line.trim().startsWith('#'))
  .map(line=>{const i=line.indexOf('=');return [line.slice(0,i).trim(),line.slice(i+1).trim().replace(/^['"]|['"]$/g,'')];})
  .filter(([key])=>key.length));
};
const web=loadEnv('apps/web/.env.local');
const mobile=loadEnv('apps/mobile/.env');
const expected='https://difltkijsmqcnrycjolz.supabase.co';
const result=[];
function check(title,ok,message){result.push({title,status:ok?'PASS':'BLOCK',message});}
check('Source version',JSON.parse(fs.readFileSync(pathOf('package.json'),'utf8')).version==='1.4.0','GigBee release must be V1.4.0');
check('Web uses dedicated GigBee',web.NEXT_PUBLIC_SUPABASE_URL===expected,'Expected GigBee project ref, never SiteFlow');
check('Mobile uses dedicated GigBee',mobile.EXPO_PUBLIC_SUPABASE_URL===expected,'Expected same project on mobile');
check('Public keys consistent',Boolean(web.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY&&web.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY===mobile.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY),'Website/mobile must use identical publishable key');
check('No privileged key exposed',!Object.keys({...web,...mobile}).some(x=>/SERVICE_ROLE|SECRET_KEY|RAZORPAY_KEY_SECRET/i.test(x)),'Only Supabase publishable keys belong in public clients');
check('Payments gated',!Object.values({...web,...mobile}).some(x=>String(x).trim()==='GIGBEE_PAYMENTS_ENABLED=true'),'Real payments are disabled');
check('Database migrations present',fs.readdirSync(pathOf('supabase/migrations')).filter(x=>x.endsWith('.sql')).length===5,'Five migrations: four originals plus one upgrade');
check('Health endpoint exists',fs.existsSync(pathOf('apps/web/app/api/health/route.ts')),'Deployment uptime check');
check('Vercel project linked',fs.existsSync(pathOf('apps/web/.vercel/project.json'))||fs.existsSync(pathOf('.vercel/project.json')),'Vercel deployment link not yet verified');
const passed=result.filter(x=>x.status==='PASS').length;
for(const x of result)console.log(x.status.padEnd(5),x.title,':',x.message);
console.log('LOCAL CONFIGURATION: '+passed+'/'+result.length+' gates passed.');
console.log('REMOTE LAUNCH GATES: Supabase management access, migration history, staging execution, Vercel hosting, DNS/HTTPS/auth redirects, E2E user tests, legal review and Android signing are NOT certified.');
if(passed!==result.length)process.exitCode=2;
