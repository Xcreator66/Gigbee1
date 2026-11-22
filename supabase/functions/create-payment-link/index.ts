// GigBee Razorpay Payment Link adapter. A Payment Link is NOT escrow or a freelancer payout.
// Live payment collection must only be enabled after merchant onboarding, legal/settlement review and approval.
import { createClient } from 'npm:@supabase/supabase-js@2.119.1';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,apikey,content-type', 'Access-Control-Allow-Methods':'POST,OPTIONS' };
const reply = (data: unknown,status=200) => new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
Deno.serve(async request => {
 if(request.method==='OPTIONS') return new Response('ok',{headers:cors});
 if(request.method!=='POST') return reply({error:'Method not allowed'},405);
 try {
  if(Deno.env.get('GIGBEE_PAYMENTS_ENABLED')!=='true') return reply({error:'Payments are not yet enabled. Merchant onboarding required.'},503);
  const projectRef=Deno.env.get('SUPABASE_URL')!;
  const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const razorpayId=Deno.env.get('RAZORPAY_KEY_ID')!;
  const razorpaySecret=Deno.env.get('RAZORPAY_KEY_SECRET')!;
  if(!serviceKey||!razorpayId||!razorpaySecret) return reply({error:'Payment provider not configured'},503);
  const token=(request.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');
  const db=createClient(projectRef,serviceKey,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data:{user},error:userError}=await db.auth.getUser(token);
  if(userError||!user)return reply({error:'Sign in required'},401);
  const body=await request.json();
  const projectId=String(body.project_id||'');
  if(!/^[0-9a-f-]{36}$/i.test(projectId)) return reply({error:'Invalid project'},400);
  const {data:project,error}=await db.from('projects').select('id,client_id,agreed_budget_inr,status,payment_status').eq('id',projectId).single();
  if(error||!project||project.client_id!==user.id) return reply({error:'Only the hiring client can fund this project'},403);
  if(project.status!=='active'||!['unpaid','link_created'].includes(project.payment_status))return reply({error:'Project is not eligible for payment'},409);
  const {data:existing}=await db.from('payment_orders').select('provider_link_url').eq('project_id',projectId).eq('provider','razorpay').maybeSingle();
  if(existing?.provider_link_url) return reply({url:existing.provider_link_url});
  const amountPaise=project.agreed_budget_inr*100;
  const payload={amount:amountPaise,currency:'INR',accept_partial:false,
    reference_id:project.id,description:'GigBee project payment '+project.id.slice(0,8),
    reminder_enable:false,notes:{project_id:project.id}};
  const response=await fetch('https://api.razorpay.com/v1/payment_links',{
    method:'POST',headers:{'Content-Type':'application/json',Authorization:'Basic '+btoa(razorpayId+':'+razorpaySecret)},body:JSON.stringify(payload)});
  const result=await response.json();
  if(!response.ok||!result.id||!result.short_url)return reply({error:'Payment provider rejected request',detail:result.error?.description||''},502);
  const {error:insertError}=await db.from('payment_orders').insert({
    project_id:projectId,provider:'razorpay',provider_link_id:result.id,provider_link_url:result.short_url,
    amount_paise:amountPaise,status:'created'});
  if(insertError)return reply({error:'Unable to record payment link. Contact support before making payment.'},500);
  await db.from('projects').update({payment_status:'link_created'}).eq('id',projectId).eq('payment_status','unpaid');
  return reply({url:result.short_url});
 } catch(e) {return reply({error:'Payment request failed',detail:String(e)},500);}
});
