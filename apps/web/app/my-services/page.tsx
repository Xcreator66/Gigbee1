'use client';
import React,{useCallback,useEffect,useState} from 'react';import Link from 'next/link';
import {categories,rupees} from '@gigbee/shared';import {useGigBeeAuth} from '../../lib/auth';import {AppShell,Status,Notice} from '../../components/AppShell';
type Package={id:string;title:string;description:string;category:string;price_inr:number;delivery_days:number;status:string};
type Request={id:string;package_id:string;client_id:string;message:string;status:string;project_id:string|null;quoted_price_inr:number|null;quoted_title:string|null};
export default function MyServices(){const {user,supabase}=useGigBeeAuth();const [packages,setPackages]=useState<Package[]>([]);const [requests,setRequests]=useState<Request[]>([]);const [outgoing,setOutgoing]=useState<Request[]>([]);
 const [title,setTitle]=useState('');const [description,setDescription]=useState('');const [category,setCategory]=useState('Design');const [price,setPrice]=useState('');const [deliveryDays,setDeliveryDays]=useState('7');const [busy,setBusy]=useState(false);const [notice,setNotice]=useState('');
 const refresh=useCallback(async()=>{if(!supabase||!user)return;
 const [p,r,o]=await Promise.all([supabase.from('service_packages').select('*').eq('freelancer_id',user.id).order('created_at',{ascending:false}),supabase.from('service_requests').select('*').eq('freelancer_id',user.id).order('created_at',{ascending:false}),supabase.from('service_requests').select('*').eq('client_id',user.id).order('created_at',{ascending:false})]);
 setPackages((p.data as Package[])||[]);setRequests((r.data as Request[])||[]);setOutgoing((o.data as Request[])||[]);
 if(p.error||r.error||o.error)setNotice(p.error?.message||r.error?.message||o.error?.message||'Unable to load services');},[supabase,user?.id]);
 useEffect(()=>{refresh()},[refresh]);
 async function create(e:React.FormEvent){e.preventDefault();if(!supabase||!user||busy)return;
 const amount=Number(price),days=Number(deliveryDays);
 if(title.trim().length<8||description.trim().length<60||!Number.isSafeInteger(amount)||amount<100||amount>10000000||!Number.isSafeInteger(days)||days<1||days>365){setNotice('Provide a valid title, 60+ character description, price ₹100–₹1 crore, and 1–365 whole delivery days.');return;}
 setBusy(true);const {error}=await supabase.from('service_packages').insert({freelancer_id:user.id,title:title.trim(),description:description.trim(),category,price_inr:Number(price),delivery_days:Number(deliveryDays)});setBusy(false);
 if(error)setNotice(error.message);else{setNotice('Service package published.');setTitle('');setDescription('');setPrice('');refresh();}}
 async function respond(id:string,accept:boolean){if(!supabase||busy)return;setBusy(true);const {data,error}=await supabase.rpc('respond_service_request',{p_request:id,p_accept:accept});setBusy(false);setNotice(error?.message|| (accept?'Request accepted. Your project workspace is ready.':'Request declined.'));if(!error){refresh();if(data)window.location.href='/project/'+String(data);}}
 async function toggle(p:Package){if(!supabase||busy)return;setBusy(true);const next=p.status==='active'?'paused':'active';const {error}=await supabase.from('service_packages').update({status:next}).eq('id',p.id);setBusy(false);setNotice(error?.message||`Service ${next}.`);if(!error)refresh();}
 return <AppShell title="Your service studio." subtitle="Publish fixed-price offers and handle client requests without paid bids.">
  {notice?<Notice>{notice}</Notice>:null}
  <div className="app-two-cols"><section className="app-card"><span className="app-eyebrow">CREATE A SERVICE PACKAGE</span><h2>What can you deliver?</h2>
   <form onSubmit={create}><label>Service title<input value={title} required minLength={8} maxLength={120} onChange={e=>setTitle(e.target.value)} placeholder="Example: Edit 5 vertical videos"/></label>
    <label>Description<textarea required minLength={60} maxLength={6000} value={description} onChange={e=>setDescription(e.target.value)}/></label>
    <label>Category<select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></label>
    <label>Fixed price in INR<input required type="number" min={100} max={10000000} value={price} onChange={e=>setPrice(e.target.value)}/></label>
    <label>Delivery estimate (days)<input required type="number" min={1} max={365} value={deliveryDays} onChange={e=>setDeliveryDays(e.target.value)}/></label>
    <button disabled={busy} className="app-action">Publish package →</button>
   </form></section>
   <section className="app-card"><span className="app-eyebrow">MY ACTIVE OFFERS</span><h2>Your services</h2>
    {packages.length?packages.map(p=><div key={p.id} className="app-row"><div><h3>{p.title}</h3><p>{rupees(p.price_inr)} · {p.delivery_days} days · <Status value={p.status}/></p></div><div className="app-inline-actions"><button disabled={busy} className="app-action-secondary" onClick={()=>toggle(p)}>{p.status==='active'?'Pause':'Activate'}</button><Link className="app-link" href={'/services/'+p.id}>View ↗</Link></div></div>):<p>No published services yet. Your published offers appear in <Link className="app-link" href="/services">the public service directory</Link>.</p>}</section></div>
   <h2 className="app-subtitle">Incoming client requests</h2>
   {requests.length?<div className="app-grid">{requests.map(r=><article key={r.id} className="app-card"><Status value={r.status}/><p style={{whiteSpace:'pre-wrap'}}>{r.message}</p>
    {r.quoted_price_inr?<p><strong>Agreed quote: {rupees(r.quoted_price_inr)}</strong></p>:null}
    {r.status==='pending'?<div className="app-inline-actions"><button disabled={busy} className="app-action" onClick={()=>respond(r.id,true)}>Accept and create project</button><button disabled={busy} className="app-action-secondary" onClick={()=>respond(r.id,false)}>Decline</button></div>:r.project_id?<Link href={'/project/'+r.project_id} className="app-link">Open project →</Link>:null}
   </article>)}</div>:<div className="app-empty"><h2>No requests yet.</h2><p>Once a client requests one of your packages, it will appear here.</p></div>}
   <h2 className="app-subtitle">Requests you sent to freelancers</h2>
   {outgoing.length?<div className="app-grid">{outgoing.map(r=><article key={r.id} className="app-card">
    <h3>{r.quoted_title||'Requested service'}</h3><Status value={r.status}/>
    {r.quoted_price_inr!=null?<p>Original quote: <strong>{rupees(r.quoted_price_inr)}</strong></p>:null}
    <p>{r.message}</p>
    {r.project_id?<Link href={'/project/'+r.project_id} className="app-link">Open project →</Link>:<p>{r.status==='pending'?'Waiting for the freelancer to respond.':'No project was created.'}</p>}
   </article>)}</div>:<div className="app-empty"><p>No service requests sent yet. <Link className="app-link" href="/services">Explore services →</Link></p></div>}
 </AppShell>;
}
