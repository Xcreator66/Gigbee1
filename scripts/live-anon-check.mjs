/** Read-only, anonymous Supabase smoke checks. Never writes or uses a service key. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const envPath=path.join(root,'apps/mobile/.env');
if(!fs.existsSync(envPath)){console.error('SKIP: apps/mobile/.env is not configured');process.exit(2);}
const pairs=Object.fromEntries(fs.readFileSync(envPath,'utf8').split(/\r?\n/).filter(s=>s.trim()&&!s.trim().startsWith('#'))
  .map(line=>{const i=line.indexOf('=');return [line.slice(0,i).trim(),line.slice(i+1).trim().replace(/^['"]|['"]$/g,'')]}));
const url=pairs.EXPO_PUBLIC_SUPABASE_URL;
const key=pairs.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if(!url||!key){console.error('SKIP: Missing public GigBee URL/key');process.exit(2);}
const ref=new URL(url).hostname.split('.')[0];
if(ref!=='difltkijsmqcnrycjolz'){
 console.error('STOP: configured project is '+ref+' (expected dedicated GigBee difltkijsmqcnrycjolz); no tests sent');
 process.exit(2);
}
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const publicTables=['jobs','profiles','courses','service_packages','freelancer_stats'];
const restrictedTables=['projects','applications','payment_orders','user_roles','notification_deliveries','push_devices'];
let failures=0;
for(const table of publicTables){
 try{
  const {error}=await db.from(table).select('id',{head:true,count:'exact'}).limit(1);
  if(error){console.error('FAIL publicly readable: '+table+' '+error.code+' '+error.message);failures++;}
  else console.log('PASS public read: '+table);
 }catch(e){console.error('FAIL public read '+table+': '+e.message);failures++;}
}
for(const table of restrictedTables){
 try{
  const {data,error}=await db.from(table).select('*').limit(1);
  if(data?.length){console.error('FAIL anonymous row exposure: '+table);failures++;}
  else console.log('PASS anonymous rows restricted: '+table+(error?' (permission blocked)':' (RLS empty)'));
 }catch(e){console.log('PASS anonymous request blocked: '+table);}
}
const verify=await db.rpc('verify_gigbee_certificate',{p_code:randomUUID()});
if(verify.error||!Array.isArray(verify.data)||verify.data.length!==0){console.error('FAIL verification RPC',verify.error?.message);failures++;}
else console.log('PASS unknown certificate code reveals no record');
if(failures){console.error(failures+' checks failed: stop release');process.exit(1);}
console.log('PASS: anonymous read-only smoke checks. Authenticated ownership, payments and workflows NOT tested.');
