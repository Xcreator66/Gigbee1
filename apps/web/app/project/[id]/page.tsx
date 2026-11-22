'use client';
import React,{useCallback,useEffect,useRef,useState} from 'react';import Link from 'next/link';
import {useParams} from 'next/navigation';
import {type Project,type Deliverable,type Message,rupees,shortDate} from '@gigbee/shared';
import {useGigBeeAuth} from '../../../lib/auth';import {AppShell,Status,Notice} from '../../../components/AppShell';
export default function ProjectPage(){const {id}=useParams<{id:string}>();const {user,supabase}=useGigBeeAuth();
 const [project,setProject]=useState<Project|null>(null);const [title,setTitle]=useState('');const [deliverables,setDeliverables]=useState<Deliverable[]>([]);
 const [messages,setMessages]=useState<Message[]>([]);const [messageLimit,setMessageLimit]=useState(100);const [messageTotal,setMessageTotal]=useState(0);const [body,setBody]=useState('');const [note,setNote]=useState('');const [upload,setUpload]=useState<File|null>(null);
 const [rating,setRating]=useState(5);const [comment,setComment]=useState('');const [already,setAlready]=useState(false);const [dispute,setDispute]=useState('');
 const [busy,setBusy]=useState(false);const [notice,setNotice]=useState('');const chatEnd=useRef<HTMLDivElement|null>(null);const preserveOlder=useRef(false);
 const refresh=useCallback(async()=>{if(!supabase||!id||!user)return;
  const [p,d,m,r]=await Promise.all([supabase.from('projects').select('*').eq('id',id).maybeSingle(),
   supabase.from('deliverables').select('*').eq('project_id',id).order('created_at',{ascending:false}),
   supabase.from('messages').select('*',{count:'exact'}).eq('project_id',id).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(messageLimit),
   supabase.from('reviews').select('id').eq('project_id',id).eq('reviewer_id',user.id).maybeSingle()]);
  setProject((p.data as Project|null)||null);setDeliverables((d.data as Deliverable[])||[]);setMessages(((m.data as Message[])||[]).slice().reverse());setMessageTotal(m.count??0);setAlready(Boolean(r.data));
  if(p.data){const j=await supabase.from('jobs').select('title').eq('id',p.data.job_id).maybeSingle();setTitle(j.data?.title||'Project workspace');}
 },[supabase,id,user?.id,messageLimit]);
 useEffect(()=>{refresh()},[refresh]);useEffect(()=>{if(preserveOlder.current){preserveOlder.current=false;return;}chatEnd.current?.scrollIntoView({behavior:'smooth',block:'nearest'});},[messages]);
 useEffect(()=>{setMessageLimit(100);},[id]);
 useEffect(()=>{if(!supabase||!id||!user)return;const ch=supabase.channel('gigbee-web-chat-'+id).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`project_id=eq.${id}`},()=>refresh()).subscribe();return()=>{supabase.removeChannel(ch)};},[supabase,id,user?.id,refresh]);
 async function execute(rpc:string,args:Record<string,unknown>,success:string){if(!supabase)return;setBusy(true);const {error}=await supabase.rpc(rpc,args);setBusy(false);setNotice(error?.message||success);if(!error)refresh();}
 async function send(e:React.FormEvent){e.preventDefault();if(!supabase||!user||!body.trim())return;setBusy(true);
  const {error}=await supabase.from('messages').insert({project_id:id,sender_id:user.id,body:body.trim()});setBusy(false);
  if(error)setNotice(error.message);else{setBody('');refresh();}}
 async function submitWork(e:React.FormEvent){e.preventDefault();if(!supabase||!user||!project||note.trim().length<10)return;setBusy(true);
 let path:string|null=null;
 if(upload){if(upload.size>25*1024*1024){setNotice('File must be under 25 MB.');setBusy(false);return;}
  path=`${user.id}/${project.id}/${Date.now()}-${upload.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
  const upl=await supabase.storage.from('gigbee-files').upload(path,await upload.arrayBuffer(),{contentType:upload.type||'application/octet-stream'});
  if(upl.error){setNotice(upl.error.message);setBusy(false);return;}}
 const {error}=await supabase.rpc('submit_deliverable',{p_project:project.id,p_note:note.trim(),p_file:path});
 if(error&&path){await supabase.storage.from('gigbee-files').remove([path]);}
 setBusy(false);
 setNotice(error?.message||'Delivered to client for review.');if(!error){setNote('');setUpload(null);refresh();}}
 async function viewFile(path:string){if(!supabase)return;const {data,error}=await supabase.storage.from('gigbee-files').createSignedUrl(path,300);
 if(error)setNotice(error.message);else if(data?.signedUrl)window.open(data.signedUrl,'_blank','noopener,noreferrer');}
 async function paymentLink(){if(!supabase||!project)return;setBusy(true);const {data,error}=await supabase.functions.invoke('create-payment-link',{body:{project_id:project.id}});setBusy(false);
 if(error||!data?.url){setNotice(data?.error||error?.message||'Merchant provider not enabled');return;}window.open(data.url,'_blank','noopener,noreferrer');}
 const client=user?.id===project?.client_id;
 return <AppShell title="Project workspace." subtitle="Private collaboration between the client and hired freelancer.">
  {!project?<div className="app-empty"><h2>Workspace unavailable</h2><p>Only the project participants can access it.</p></div>:<>
  {notice?<Notice>{notice}</Notice>:null}
  <div className="app-banner"><div><span className="app-eyebrow">PROJECT DETAILS</span><h2>{title}</h2><p>{rupees(project.agreed_budget_inr)} · {shortDate(project.created_at)} · Payment: {project.payment_status}</p></div><Status value={project.status}/></div>
  <div className="app-two-cols"><div className="app-list"><div className="app-card"><h2>Deliverables</h2><p>Client approval is recorded as a completed-work outcome. Payment is separately tracked and does not constitute escrow.</p>
  {deliverables.map(d=><div className="app-card" key={d.id} style={{marginBottom:12}}><div className="app-inline-actions"><Status value={d.status}/><small>{shortDate(d.created_at)}</small></div>
   <p style={{whiteSpace:'pre-wrap',color:'#34314B'}}>{d.note}</p>{d.file_path?<button className="app-action-secondary" onClick={()=>viewFile(d.file_path!)}>Open private attachment ↗</button>:null}
   {client&&project.status==='delivered'&&d.status==='submitted'?<div className="app-inline-actions" style={{marginTop:12}}>
    <button className="app-action" disabled={busy} onClick={()=>{if(window.confirm('Approve completed work?'))execute('review_deliverable',{p_deliverable:d.id,p_accept:true},'Work approved and work record issued.')}}>Approve work</button>
    <button className="app-action-secondary" disabled={busy} onClick={()=>execute('review_deliverable',{p_deliverable:d.id,p_accept:false},'Revision requested.')}>Request revision</button></div>:null}</div>)}
  {deliverables.length===0?<p>No work has been submitted yet.</p>:null}
  {!client&&['active','revision_requested'].includes(project.status)?<form onSubmit={submitWork}><label>Describe completed work<textarea required minLength={10} maxLength={5000} value={note} onChange={e=>setNote(e.target.value)}/></label>
   <label>Attachment (optional, max 25 MB)<input type="file" onChange={e=>setUpload(e.target.files?.[0]||null)}/></label>
   <button className="app-action" disabled={busy}>Submit deliverable →</button></form>:null}</div>
  <div className="app-card"><h2>Project messages</h2><div className="app-chat-scroll" aria-label="Project conversation">{messages.length<messageTotal?<button type="button" className="app-action-secondary" onClick={()=>{preserveOlder.current=true;setMessageLimit(n=>n+100);}}>Load earlier messages ({messages.length} of {messageTotal})</button>:null}{messages.length?messages.map(m=><div key={m.id} className={'app-message'+(m.sender_id===user?.id?' mine':'')}>{m.body}<small style={{display:'block',opacity:.7,marginTop:5}}>{new Date(m.created_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</small></div>):<p>No messages yet. Introduce yourself.</p>}<div ref={chatEnd}/></div>
   <form onSubmit={send} className="app-inline-actions" style={{marginTop:13}}><input style={{flex:1,padding:12,borderRadius:12,border:'1px solid #DFDCEB'}} value={body} onChange={e=>setBody(e.target.value)} placeholder="Message your collaborator…" maxLength={3000}/>
   <button className="app-action" disabled={busy||!body.trim()}>Send →</button></form></div></div></div>
  <div className="app-two-cols" style={{marginTop:20}}><div className="app-card"><h2>Payment status</h2><p>This is not an escrow account. Provider-governed collection and settlement require merchant configuration. Never treat a link-created status as payment confirmation.</p>
   <Status value={project.payment_status}/>{client&&['unpaid','link_created'].includes(project.payment_status)?<div style={{marginTop:15}}><button disabled={busy} className="app-action-secondary" onClick={paymentLink}>Request payment link</button></div>:null}</div>
   <div className="app-card"><h2>Trust & support</h2>{project.status==='completed'&&!already?<div><p>Leave a review based on completed work.</p><div className="app-rating">{[1,2,3,4,5].map(n=><button key={n} type="button" className={n<=rating?'active':''} onClick={()=>setRating(n)}>{n} ★</button>)}</div>
    <label>Review<textarea value={comment} maxLength={1000} onChange={e=>setComment(e.target.value)}/></label>
    <button className="app-action" disabled={busy} onClick={()=>execute('leave_review',{p_project:id,p_rating:rating,p_comment:comment},'Your review is published.')}>Publish review</button></div>:null}
   {project.status==='completed'&&already?<p>You already reviewed this project.</p>:null}
   {!['completed','cancelled','disputed'].includes(project.status)?<div><label>Need to dispute something?<textarea minLength={15} value={dispute} onChange={e=>setDispute(e.target.value)} placeholder="Describe the issue clearly…"/></label>
    <button className="app-action-secondary" disabled={busy||dispute.trim().length<15} onClick={()=>{if(window.confirm('Open a dispute for moderator review?'))execute('open_dispute',{p_project:id,p_reason:dispute.trim()},'Dispute opened.')}}>Open dispute</button></div>:null}</div></div>
  <p className="app-muted" style={{marginTop:20}}>Work certificates validate recorded client approval and do not certify identity, quality, payment settlement or professional accreditation.</p>
  </>}
 </AppShell>;
}
