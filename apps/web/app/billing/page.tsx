'use client';
import React,{useEffect,useState} from 'react';
import Link from 'next/link';
import {useGigBeeAuth} from '../../lib/auth';
import {AppShell,Notice,Status} from '../../components/AppShell';
import {rupees,shortDate} from '@gigbee/shared';
type Item={project_id:string;project_title:string;role:'client'|'freelancer';agreed_budget_inr:number;payment_status:string;recorded_provider_status:string;created_at:string};
export default function Billing(){
 const {user,supabase}=useGigBeeAuth();
 const [items,setItems]=useState<Item[]>([]);const [error,setError]=useState('');
 const [filter,setFilter]=useState<'all'|'client'|'freelancer'>('all');
 useEffect(()=>{if(!supabase||!user)return;let active=true;
  supabase.rpc('my_gigbee_payment_activity').then(({data,error})=>{
   if(active){setItems((data as Item[])||[]);setError(error?.message||'');}});
  return()=>{active=false};
 },[supabase,user?.id]);
 const shown=items.filter(x=>filter==='all'||x.role===filter);
 return <AppShell title="Payment activity." subtitle="Clear project records without misleading wallet or payout claims.">
  <div className="app-card app-card-indigo">
   <span className="app-eyebrow">TRANSPARENCY FIRST</span><h2>Project budget ≠ earnings received.</h2>
   <p>This dashboard shows agreed project amounts and provider-recorded payment status. It does not represent escrow, a freelancer balance, invoices, refunds or completed payouts.</p>
  </div>
  {error?<Notice>{error}</Notice>:null}
  <div className="app-inline-actions" style={{margin:'20px 0'}}>
   {(['all','client','freelancer'] as const).map(v=><button key={v}
    className={filter===v?'app-action':'app-action-secondary'} onClick={()=>setFilter(v)}>
    {v==='all'?'All activity':v==='client'?'As client':'As freelancer'}
   </button>)}
  </div>
  <div className="app-list">{shown.length?shown.map(x=><div key={x.project_id} className="app-card">
   <div className="app-inline-actions"><div><h3>{x.project_title}</h3><small>{x.role==='client'?'Hiring client':'Freelancer'} · {shortDate(x.created_at)}</small></div><strong>{rupees(x.agreed_budget_inr)}</strong></div>
   <div className="app-inline-actions"><Status value={`payment: ${x.payment_status}`}/><Status value={`provider: ${x.recorded_provider_status}`}/>
    <Link className="app-link" href={`/project/${x.project_id}`}>View project →</Link></div>
  </div>):<div className="app-empty"><h2>No transaction activity yet</h2><p>When you are hired or hire someone, project payment details will appear here.</p></div>}</div>
  <div className="app-alert" style={{marginTop:20}}>For billing disputes or a refund request, open the relevant project and contact support through its dispute workflow. Never pay via unofficial links.</div>
 </AppShell>;
}
