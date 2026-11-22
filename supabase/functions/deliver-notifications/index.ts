/**
 * GigBee notification dispatcher. NEVER call from a mobile/web client.
 * POST with header X-GigBee-Dispatch-Key: <GIGBEE_DISPATCH_SECRET>.
 * Configure as verify_jwt=false, then schedule only from a private cron/secure server.
 * Push uses Expo's push service; email uses Resend only when those secrets are configured.
 * Accepted push tickets are NOT proof of device delivery; receipt polling is still required.
 */
import {createClient} from 'npm:@supabase/supabase-js@2.119.1';

type Delivery={id:string;channel:'push'|'email';destination:string;title:string;body:string;href:string|null};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{
  status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},
});
function escapeHtml(text:string){return text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
async function send(d:Delivery):Promise<{ok:boolean;error?:string;permanent?:boolean}>{
  if(d.channel==='push'){
    if(!/^Expo(nent)?PushToken\[[\w-]+\]$/.test(d.destination)) return {ok:false,error:'Invalid Expo token',permanent:true};
    const r=await fetch('https://exp.host/--/api/v2/push/send',{
      method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify({to:d.destination,title:d.title,body:d.body,sound:'default',priority:'default',data:{href:d.href||null}}),
    });
    const result=await r.json().catch(()=>null);
    const ticket=result?.data;
    if(r.ok&&ticket?.status==='ok')return {ok:true};
    const reason=String(ticket?.details?.error||ticket?.message||result?.errors?.[0]?.message||'Expo rejected notification');
    return {ok:false,error:reason,permanent:reason==='DeviceNotRegistered'||r.status===400};
  }
  const apiKey=Deno.env.get('RESEND_API_KEY');
  const from=Deno.env.get('GIGBEE_EMAIL_FROM');
  if(!apiKey||!from)return {ok:false,error:'Email integration not configured'};
  const r=await fetch('https://api.resend.com/emails',{
    method:'POST',headers:{'Authorization':`Bearer ${apiKey}`,'Content-Type':'application/json'},
    body:JSON.stringify({from,to:[d.destination],subject:`GigBee · ${d.title}`,
      html:`<div style="font-family:system-ui,sans-serif;max-width:580px;margin:auto;padding:24px"><h1 style="color:#6045e8">GigBee</h1><h2>${escapeHtml(d.title)}</h2><p>${escapeHtml(d.body)}</p><p style="color:#70758c;font-size:12px">This is an account notification. Manage email preferences in GigBee.</p></div>`}),
  });
  const body=await r.json().catch(()=>null);
  return r.ok?{ok:true}:{ok:false,error:String(body?.message||'Email service rejected request'),permanent:r.status===400||r.status===422};
}
Deno.serve(async(req)=>{
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  const secret=Deno.env.get('GIGBEE_DISPATCH_SECRET');
  if(!secret||secret.length<32||req.headers.get('X-GigBee-Dispatch-Key')!==secret)return json({error:'Forbidden'},403);
  const url=Deno.env.get('SUPABASE_URL');const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!key)return json({error:'Backend not configured'},503);
  const db=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data,error}=await db.rpc('claim_gigbee_deliveries',{p_limit:25});
  if(error)return json({error:'Queue unavailable',message:error.message},500);
  const results=[];
  for(const item of (data||[]) as Delivery[]){
    let outcome:{ok:boolean;error?:string;permanent?:boolean};
    try{outcome=await send(item);}catch(e){outcome={ok:false,error:String(e)};}
    const {error:finishError}=await db.rpc('finish_gigbee_delivery',{
      p_id:item.id,p_success:outcome.ok,p_error:outcome.error||null,p_permanent:Boolean(outcome.permanent),
    });
    results.push({id:item.id,ok:outcome.ok,recorded:!finishError,channel:item.channel});
  }
  return json({processed:results.length,successes:results.filter(x=>x.ok).length,results});
});
