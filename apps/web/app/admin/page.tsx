'use client';
import React,{useEffect,useState} from 'react';import Link from 'next/link';
import {useGigBeeAuth} from '../../lib/auth';import {AppShell,Status,Notice} from '../../components/AppShell';
type Deletion={id:string;user_id:string;note:string;status:string;created_at:string};
type Audit={id:string;actor_id:string|null;target_table:string;target_id:string;old_status:string|null;new_status:string|null;created_at:string};
type Report={id:string;reason:string;status:string;created_at:string;job_id:string|null;subject_id:string|null};
type Dispute={id:string;project_id:string;reason:string;status:string;resolution:string|null;created_at:string};
export default function Admin(){const {user,supabase}=useGigBeeAuth();const [authorized,setAuthorized]=useState<boolean|null>(null);const [reports,setReports]=useState<Report[]>([]);
 const [disputes,setDisputes]=useState<Dispute[]>([]);const [deletions,setDeletions]=useState<Deletion[]>([]);const [audit,setAudit]=useState<Audit[]>([]);const [notice,setNotice]=useState('');const [busy,setBusy]=useState(false);
 async function refresh(){if(!supabase||!user)return;const ok=await supabase.rpc('is_gigbee_staff');setAuthorized(ok.data===true);
 if(ok.data!==true)return;const [r,d,log,del]=await Promise.all([supabase.from('reports').select('*').order('created_at',{ascending:false}).limit(100),supabase.from('disputes').select('*').order('created_at',{ascending:false}).limit(100),supabase.rpc('gigbee_staff_audit',{p_limit:50}),supabase.from('account_deletion_requests').select('*').order('created_at',{ascending:false}).limit(100)]);
 setReports((r.data as Report[])||[]);setDisputes((d.data as Dispute[])||[]);setAudit((log.data as Audit[])||[]);setDeletions((del.data as Deletion[])||[]);}
 useEffect(()=>{refresh()},[supabase,user?.id]);
 async function moderate(table:'reports'|'disputes',id:string,status:string,resolution?:string){if(!supabase)return;setBusy(true);
 const payload=table==='disputes'?{status,resolution:resolution||null,resolved_at:status==='resolved'?new Date().toISOString():null}:{status};
 const {error}=await supabase.from(table).update(payload).eq('id',id);setBusy(false);setNotice(error?.message||'Moderation record updated.');if(!error)refresh();}
 async function hideJob(id:string){if(!supabase||!window.confirm('Close this reported job?'))return;const {error}=await supabase.from('jobs').update({status:'closed'}).eq('id',id);setNotice(error?.message||'Job closed.');}
 return <AppShell title="Moderation & trust." subtitle="Restricted admin operations with database-enforced staff authorization.">
 {authorized===null?<p>Verifying staff permissions…</p>:!authorized?<div className="app-empty"><h2>Restricted area</h2><p>Your account is not authorized for moderation. Staff roles must be assigned by the Supabase project owner.</p><Link className="app-link" href="/dashboard">Back to dashboard →</Link></div>:<>
 {notice?<Notice>{notice}</Notice>:null}
 <div className="app-grid"><div className="app-card app-card-indigo"><span className="app-eyebrow">USER REPORTS</span><div className="app-stat">{reports.filter(x=>x.status==='open').length}</div><p>Need review</p></div>
  <div className="app-card"><span className="app-eyebrow">PROJECT DISPUTES</span><div className="app-stat">{disputes.filter(x=>x.status==='open').length}</div><p>Awaiting review</p></div>
  <div className="app-card"><span className="app-eyebrow">TRUST RULE</span><h2>Document decisions.</h2><p>Moderators do not alter payment confirmations or issue certificates manually.</p></div></div>
 <h2 className="app-subtitle">User reports</h2><div className="app-list">{reports.length?reports.map(r=><div key={r.id} className="app-card"><div className="app-inline-actions"><Status value={r.status}/><small>{new Date(r.created_at).toLocaleString('en-IN')}</small></div>
  <p>{r.reason}</p><div className="app-inline-actions">{r.job_id?<button className="app-action-secondary" onClick={()=>hideJob(r.job_id!)}>Close reported job</button>:null}
  <button disabled={busy} className="app-action-secondary" onClick={()=>moderate('reports',r.id,'reviewing')}>Under review</button>
  <button disabled={busy} className="app-action" onClick={()=>moderate('reports',r.id,'resolved')}>Resolve</button>
  <button disabled={busy} className="app-text-button" onClick={()=>moderate('reports',r.id,'dismissed')}>Dismiss</button></div></div>):<div className="app-empty">No reports submitted.</div>}</div>
 <h2 className="app-subtitle">Project disputes</h2><div className="app-list">{disputes.length?disputes.map(d=><div key={d.id} className="app-card"><div className="app-inline-actions"><Status value={d.status}/><small>Project {d.project_id.slice(0,8)}</small></div><p>{d.reason}</p>
  <div className="app-inline-actions"><button disabled={busy} className="app-action-secondary" onClick={()=>moderate('disputes',d.id,'under_review')}>Reviewing</button>
  <button disabled={busy} className="app-action" onClick={()=>{const note=window.prompt('Resolution notes (required):');if(note?.trim())moderate('disputes',d.id,'resolved',note.trim())}}>Resolve with notes</button>
  <button disabled={busy} className="app-text-button" onClick={()=>moderate('disputes',d.id,'dismissed')}>Dismiss</button></div></div>):<div className="app-empty">No disputes reported.</div>}</div>
 <h2 className="app-subtitle">Account deletion requests</h2>
 <p className="app-lead">Requests are reviewed against outstanding contracts and legally required financial retention. Do not mark completed before actual deletion is performed securely.</p>
 <div className="app-list">{deletions.length?deletions.map(d=><div className="app-card" key={d.id}>
 <div className="app-inline-actions"><strong>Account {d.user_id.slice(0,8)}</strong><Status value={d.status}/></div>
 <p>{d.note||'No note provided.'}</p><small>Requested {new Date(d.created_at).toLocaleString('en-IN')}</small>
 <div className="app-inline-actions"><button className="app-action-secondary" disabled={busy||d.status!=='requested'} onClick={async()=>{if(!supabase)return;setBusy(true);
 const r=await supabase.from('account_deletion_requests').update({status:'reviewing',updated_at:new Date().toISOString()}).eq('id',d.id).eq('status','requested');
 setBusy(false);setNotice(r.error?.message||'Request set to reviewing');if(!r.error)refresh();}}>Start review</button></div>
 </div>):<div className="app-empty">No account deletion requests.</div>}</div>
 <h2 className="app-subtitle">Moderation audit trail</h2>
 <p className="app-lead">The database automatically records each report/dispute status change, including which signed-in staff member made it.</p>
 <div className="app-list">{audit.length?audit.map(a=><div key={a.id} className="app-card">
 <div className="app-inline-actions"><strong>{a.target_table} · {a.target_id.slice(0,8)}</strong><small>{new Date(a.created_at).toLocaleString('en-IN')}</small></div>
 <p><Status value={a.old_status||'unknown'}/> → <Status value={a.new_status||'unknown'}/></p>
 <small>Actor: {a.actor_id||'system / service role'}</small>
 </div>):<div className="app-empty">No moderation activity yet.</div>}</div>
 </>}
 </AppShell>;
}
