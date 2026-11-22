// Verified Razorpay Payment Link events. This does not establish escrow, split settlement or payouts.
// The webhook secret and Supabase service key must NEVER be used in the mobile or web client.
import {createClient} from 'npm:@supabase/supabase-js@2.119.1';
const encoder=new TextEncoder();
function constantTimeEqual(a:string,b:string){
 if(a.length!==b.length)return false;
 let difference=0;for(let i=0;i<a.length;i++)difference|=a.charCodeAt(i)^b.charCodeAt(i);
 return difference===0;
}
const reply=(message:string,status=200)=>new Response(message,{status});
Deno.serve(async request=>{
 if(request.method!=='POST')return reply('Method not allowed',405);
 const secret=Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
 const url=Deno.env.get('SUPABASE_URL');
 const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!secret||!url||!serviceKey)return reply('Webhook not configured',503);
 const raw=await request.text();
 const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const digest=await crypto.subtle.sign('HMAC',key,encoder.encode(raw));
 const signature=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('');
 if(!constantTimeEqual(signature,request.headers.get('x-razorpay-signature')||''))return reply('Invalid signature',401);
 const eventId=request.headers.get('x-razorpay-event-id');
 if(!eventId)return reply('Missing event id',400);
 let event:Record<string,any>;
 try{event=JSON.parse(raw);}catch{return reply('Invalid JSON',400);}
 const db=createClient(url,serviceKey,{auth:{persistSession:false}});
 const {data:seen,error:seenError}=await db.from('payment_events').select('provider_event_id').eq('provider_event_id',eventId).maybeSingle();
 if(seenError)return reply('Database unavailable',500);
 if(seen)return reply('duplicate');
 const type=String(event.event||'');
 const link=event?.payload?.payment_link?.entity;
 if(type==='payment_link.paid'){
   if(!link?.id)return reply('Missing payment link',422);
   const {data:order,error}=await db.from('payment_orders').select('project_id,amount_paise').eq('provider_link_id',link.id).maybeSingle();
   if(error)return reply('Unable to find order',500);
   if(!order)return reply('Unknown payment link',422);
   // Validate the amount paid and the currency, never trust a client-supplied payment amount.
   if(link.currency!=='INR'||Number(link.amount_paid)!==Number(order.amount_paise)||link.status!=='paid')return reply('Payment mismatch',422);
   const paymentId=event?.payload?.payment?.entity?.id||null;
   const {error:orderError}=await db.from('payment_orders').update({status:'paid',provider_payment_id:paymentId}).eq('provider_link_id',link.id);
   if(orderError)return reply('Unable to update order',500);
   const {error:projectError}=await db.from('projects').update({payment_status:'captured'}).eq('id',order.project_id).in('payment_status',['unpaid','link_created','failed']);
   if(projectError)return reply('Unable to update project',500);
 }else if(['payment_link.cancelled','payment_link.expired'].includes(type)){
   if(!link?.id)return reply('Missing payment link',422);
   const {data:order,error}=await db.from('payment_orders').select('project_id,status').eq('provider_link_id',link.id).maybeSingle();
   if(error)return reply('Unable to find order',500);
   // A delayed cancellation must never overwrite confirmed payment.
   if(order&&order.status!=='paid'){
    const {error:orderError}=await db.from('payment_orders').update({status:'failed'}).eq('provider_link_id',link.id).neq('status','paid');
    if(orderError)return reply('Unable to update order',500);
    const {error:projectError}=await db.from('projects').update({payment_status:'failed'}).eq('id',order.project_id).in('payment_status',['unpaid','link_created']);
    if(projectError)return reply('Unable to update project',500);
   }
 }
 // Persist only AFTER state updates succeed. Retried webhook deliveries then repair partial failures.
 // DB-level unique constraint ensures the event is only recorded once.
 const {error:recordError}=await db.from('payment_events').insert({provider_event_id:eventId,event_type:type,order_id:link?.id||null});
 if(recordError?.code==='23505')return reply('duplicate');
 if(recordError)return reply('Unable to log event',500);
 return reply('ok');
});
