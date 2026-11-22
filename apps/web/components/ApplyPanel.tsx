'use client';
import React,{useEffect,useState} from 'react';import Link from 'next/link';
import {useGigBeeAuth} from '../lib/auth';
export default function ApplyPanel({jobId,clientId}:{jobId:string;clientId:string}){
 const {user,supabase,loading}=useGigBeeAuth();const [proposal,setProposal]=useState('');const [applied,setApplied]=useState(false);const [busy,setBusy]=useState(false);const [notice,setNotice]=useState('');
 useEffect(()=>{if(!supabase||!user)return;supabase.from('applications').select('id').eq('job_id',jobId).eq('freelancer_id',user.id).maybeSingle().then(({data})=>setApplied(Boolean(data)));},[supabase,user?.id,jobId]);
 async function submit(e:React.FormEvent){e.preventDefault();if(!supabase||!user)return;if(proposal.trim().length<30){setNotice('Please write at least 30 characters.');return;}
  setBusy(true);const {error}=await supabase.from('applications').insert({job_id:jobId,freelancer_id:user.id,proposal:proposal.trim()});setBusy(false);
  if(error)setNotice(error.message);else{setApplied(true);setNotice('Your application is now with the client.');}}
 if(loading)return <p>Checking your account…</p>;
 if(!user)return <div className="app-alert">Sign in to apply without tokens. <Link className="app-link" href="/sign-in">Sign in →</Link></div>;
 if(user.id===clientId)return <Link className="app-action" href="/dashboard">Manage your applicants →</Link>;
 if(applied)return <div className="app-success">Your free application has been submitted. <Link href="/dashboard" className="app-link">Track it →</Link></div>;
 return <form onSubmit={submit} className="app-card" style={{marginTop:20}}><h3>Apply for free</h3>
  <label>Tell the client how you can help<textarea required minLength={30} maxLength={2000} value={proposal} onChange={e=>setProposal(e.target.value)} placeholder="Relevant work, timeline, and your approach…"/></label>
  {notice?<div className="app-alert">{notice}</div>:null}<button className="app-action" disabled={busy}>{busy?'Sending…':'Send free application →'}</button></form>;
}
