'use client';
import React,{useCallback,useEffect,useState} from 'react';import Link from 'next/link';import {useParams} from 'next/navigation';
import {rupees} from '@gigbee/shared';import {useGigBeeAuth} from '../../../lib/auth';
type Service={id:string;title:string;description:string;category:string;price_inr:number;delivery_days:number;freelancer_id:string;status:string};
export default function ServiceDetail(){const {id}=useParams<{id:string}>();const {user,supabase}=useGigBeeAuth();const [service,setService]=useState<Service|null>(null);const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);const [notice,setNotice]=useState('');
 const refresh=useCallback(async()=>{if(!supabase)return;const r=await supabase.from('service_packages').select('*').eq('id',id).maybeSingle();setService((r.data as Service|null)||null);},[supabase,id]);useEffect(()=>{refresh()},[refresh]);
 async function request(e:React.FormEvent){e.preventDefault();if(!supabase||!user||!service)return;setBusy(true);const {error}=await supabase.rpc('request_service',{p_package:service.id,p_message:message.trim()});setBusy(false);
 setNotice(error?.message||'Your request has been sent to the freelancer. Once accepted, a private project workspace will be created.');if(!error)setMessage('');}
 return <div className="app-backdrop"><div className="shell app-shell" style={{maxWidth:1040}}><Link href="/services" className="back-link">← All services</Link>
 {!service?<div className="app-empty"><h2>Service unavailable</h2><p>Check back later.</p></div>:<div className="app-two-cols" style={{marginTop:25}}>
  <div className="app-card"><span className="app-eyebrow">{service.category}</span><h1 style={{fontSize:42,margin:'13px 0'}}>{service.title}</h1>
  <p style={{whiteSpace:'pre-wrap',fontSize:15,color:'#45445F'}}>{service.description}</p><span className="app-tag">Fixed scope</span></div>
  <div className="app-card"><span className="app-eyebrow">SERVICE PRICE</span><div className="app-stat">{rupees(service.price_inr)}</div>
   <p>Estimated delivery: {service.delivery_days} days after the freelancer accepts. Payment status is recorded separately; payment protection is not implied.</p>
   {!user?<div className="app-alert">Sign in to request a service. <Link className="app-link" href="/sign-in">Sign in →</Link></div>:user.id===service.freelancer_id?<div className="app-alert">This is your own package.</div>:<form onSubmit={request}>
     <label>Your requirements<textarea minLength={10} required maxLength={2000} value={message} onChange={e=>setMessage(e.target.value)} placeholder="What should the freelancer deliver?"/></label>
     <button disabled={busy} className="app-action">Request service →</button></form>}
    {notice?<div className="app-alert">{notice}</div>:null}</div></div>}
 </div></div>;
}
