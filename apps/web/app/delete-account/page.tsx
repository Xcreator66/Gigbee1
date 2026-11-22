'use client';
import React,{useEffect,useState} from 'react';
import Link from 'next/link';
import {AppShell,Notice,Status} from '../../components/AppShell';
import {useGigBeeAuth} from '../../lib/auth';
type Request={status:string;created_at:string};
export default function AccountDeletion(){
 const {supabase,user}=useGigBeeAuth();const [request,setRequest]=useState<Request|null>(null);
 const [note,setNote]=useState('');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 useEffect(()=>{if(!supabase||!user)return;let mounted=true;
  supabase.from('account_deletion_requests').select('status,created_at').eq('user_id',user.id).maybeSingle()
   .then(({data,error})=>{if(mounted){setRequest((data as Request|null)||null);if(error)setMessage(error.message);}});
  return()=>{mounted=false};
 },[supabase,user?.id]);
 async function submit(e:React.FormEvent){e.preventDefault();if(!supabase||!user||busy||!window.confirm('Submit your GigBee account deletion request?'))return;
  setBusy(true);const {error}=await supabase.from('account_deletion_requests').insert({user_id:user.id,note:note.trim()});setBusy(false);
  if(error)setMessage(error.message);else{setRequest({status:'requested',created_at:new Date().toISOString()});setMessage('Request received. Your account has not been deleted yet.');}
 }
 return <AppShell title="Delete your account." subtitle="Request a review and deletion of personal information, subject to legal and open-transaction obligations.">
  <div className="app-card"><h2>How it works</h2>
   <p>Submit your request from your signed-in account. GigBee staff review outstanding projects, disputes and any legally required retention before completing deletion. This is a request process, not instantaneous account removal.</p>
   <p>For status questions, use the official <Link href="/about" className="app-link">GigBee contact information</Link>.</p>
  </div>
  {message?<Notice>{message}</Notice>:null}
  {request?<div className="app-card"><h2>Your existing request</h2><Status value={request.status}/><p>Submitted {new Date(request.created_at).toLocaleDateString('en-IN')}.</p></div>:
  <form className="app-card" onSubmit={submit}><h2>Submit deletion request</h2>
   <label>Optional details<textarea maxLength={1000} value={note} onChange={e=>setNote(e.target.value)}/></label>
   <button type="submit" disabled={busy} className="app-action">{busy?'Submitting…':'Request account deletion'}</button>
  </form>}
 </AppShell>;
}
