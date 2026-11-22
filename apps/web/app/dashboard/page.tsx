'use client';
import React,{useCallback,useEffect,useState} from 'react';import Link from 'next/link';
import {type Job,type Profile,type Project,type Application,type Certificate,rupees,shortDate,categories} from '@gigbee/shared';
import {useGigBeeAuth} from '../../lib/auth';import {AppShell,Status,Notice} from '../../components/AppShell';

type Tab='overview'|'projects'|'hiring'|'applications'|'profile'|'portfolio'|'credentials';
type Portfolio={id:string;title:string;description:string;project_url:string|null};
export default function Dashboard(){const {user,supabase}=useGigBeeAuth();const [tab,setTab]=useState<Tab>('overview');
 const [profile,setProfile]=useState<Profile|null>(null);const [form,setForm]=useState({display_name:'',username:'',headline:'',bio:'',city:'',website:'',is_public:false});
 const [roles,setRoles]=useState<string[]>([]);const [jobs,setJobs]=useState<Job[]>([]);const [apps,setApps]=useState<Application[]>([]);const [projects,setProjects]=useState<Project[]>([]);
 const [certs,setCerts]=useState<Certificate[]>([]);const [port,setPort]=useState<Portfolio[]>([]);const [jobNames,setJobNames]=useState<Record<string,string>>({});
 const [jobApps,setJobApps]=useState<Application[]>([]);const [people,setPeople]=useState<Record<string,Profile>>({});const [currentJob,setCurrentJob]=useState<string>('');
 const [jobForm,setJobForm]=useState({title:'',description:'',category:'Video Editing',budget_inr:'2500'});
 const [portForm,setPortForm]=useState({title:'',description:'',project_url:''});const [notice,setNotice]=useState('');const [busy,setBusy]=useState(false);
 const refresh=useCallback(async()=>{if(!supabase||!user)return;
  const [p,r,j,a,pr,c,po]=await Promise.all([
   supabase.from('profiles').select('*').eq('id',user.id).maybeSingle(),supabase.from('user_roles').select('role').eq('user_id',user.id),
   supabase.from('jobs').select('*').eq('client_id',user.id).order('created_at',{ascending:false}),
   supabase.from('applications').select('*').eq('freelancer_id',user.id).order('created_at',{ascending:false}),
   supabase.from('projects').select('*').order('created_at',{ascending:false}),
   supabase.from('certificates').select('*').eq('owner_id',user.id).order('issued_at',{ascending:false}),
   supabase.from('portfolio_items').select('*').eq('user_id',user.id).order('created_at',{ascending:false})
  ]);
  const pf=(p.data as Profile|null)||null;setProfile(pf);setForm({display_name:pf?.display_name||'',username:pf?.username||'',headline:pf?.headline||'',bio:pf?.bio||'',city:pf?.city||'',website:pf?.website||'',is_public:pf?.is_public||false});
  setRoles((r.data||[]).map(x=>x.role));setJobs((j.data as Job[])||[]);setApps((a.data as Application[])||[]);setProjects((pr.data as Project[])||[]);setCerts((c.data as Certificate[])||[]);setPort((po.data as Portfolio[])||[]);
  const ids=[...new Set([...(a.data||[]).map(x=>x.job_id),...(pr.data||[]).map(x=>x.job_id)])];
  if(ids.length){const names=await supabase.from('jobs').select('id,title').in('id',ids);setJobNames(Object.fromEntries((names.data||[]).map(x=>[x.id,x.title])));}
 },[supabase,user?.id]);
 useEffect(()=>{refresh()},[refresh]);
 async function openApplicants(jobId:string){if(!supabase)return;setCurrentJob(jobId);setTab('hiring');
  const r=await supabase.from('applications').select('*').eq('job_id',jobId).order('created_at',{ascending:false});const items=(r.data as Application[])||[];setJobApps(items);
  const ids=[...new Set(items.map(x=>x.freelancer_id))];if(ids.length){const p=await supabase.from('profiles').select('*').in('id',ids);setPeople(Object.fromEntries(((p.data as Profile[])||[]).map(x=>[x.id,x])));}
 }
 async function hire(a:Application){if(!supabase||!window.confirm('Hire this freelancer? The job will close and a project workspace will be created.'))return;
  setBusy(true);const {data,error}=await supabase.rpc('hire_applicant',{p_application:a.id});setBusy(false);
  if(error)setNotice(error.message);else{window.location.href='/project/'+String(data);}}
 async function closeJob(jobId:string){if(!supabase||!user||!window.confirm('Close this job to new applications?'))return;
  setBusy(true);const {error}=await supabase.from('jobs').update({status:'closed'}).eq('id',jobId).eq('client_id',user.id).eq('status','open');
  setBusy(false);setNotice(error?.message||'This job is closed to new applications.');if(!error)refresh();}
 async function activate(role:string){if(!supabase||!user)return;const {error}=await supabase.from('user_roles').insert({user_id:user.id,role});if(error&&error.code!=='23505')setNotice(error.message);else refresh();}
 async function saveProfile(e:React.FormEvent){e.preventDefault();if(!supabase||!user)return;
  if(form.display_name.trim().length<2||form.username&&!/^[a-z0-9_]{3,24}$/.test(form.username)||form.is_public&&!form.username){setNotice('Check your name and username format.');return;}
  setBusy(true);const {error}=await supabase.from('profiles').update({...form,username:form.username||null}).eq('id',user.id);setBusy(false);setNotice(error?.message||'Profile saved.');if(!error)refresh();}
 async function postJob(e:React.FormEvent){e.preventDefault();if(!supabase||!user)return;if(jobForm.title.trim().length<8||jobForm.description.trim().length<60||!Number.isInteger(Number(jobForm.budget_inr))||Number(jobForm.budget_inr)<100||Number(jobForm.budget_inr)>10000000){setNotice('Enter a title of 8+ characters, description of 60+ characters and budget of ₹100+.');return;}
  setBusy(true);if(!roles.includes('client')){const rr=await supabase.from('user_roles').insert({user_id:user.id,role:'client'});if(rr.error&&rr.error.code!=='23505'){setNotice(rr.error.message);setBusy(false);return;}}
  const {error}=await supabase.from('jobs').insert({client_id:user.id,title:jobForm.title.trim(),description:jobForm.description.trim(),category:jobForm.category,budget_inr:+jobForm.budget_inr});
  setBusy(false);setNotice(error?.message||'Job published.');if(!error){setJobForm({title:'',description:'',category:'Video Editing',budget_inr:'2500'});refresh();}}
 async function addPortfolio(e:React.FormEvent){e.preventDefault();if(!supabase||!user)return;const {error}=await supabase.from('portfolio_items').insert({user_id:user.id,...portForm,project_url:portForm.project_url||null});
  setNotice(error?.message||'Portfolio updated.');if(!error){setPortForm({title:'',description:'',project_url:''});refresh();}}
 async function signOut(){if(!supabase)return;const {error}=await supabase.auth.signOut({scope:'local'});if(error)setNotice(error.message);else window.location.href='/';}
 const tabs:{key:Tab;label:string}[]=[{key:'overview',label:'Overview'},{key:'projects',label:'Projects'},{key:'hiring',label:'Hiring'},{key:'applications',label:'Applied'},{key:'profile',label:'Profile'},{key:'portfolio',label:'Portfolio'},{key:'credentials',label:'Credentials'}];
 return <AppShell title="Your GigBee space." subtitle="One identity. Real jobs, real learning, verifiable outcomes.">
  <div className="app-banner"><div><span className="app-eyebrow">WELCOME BACK</span><h2>{profile?.display_name||user?.email||'GigBee member'}</h2>
   <p>Keep working, growing your skills, and building a stronger profile.</p></div><Link href="/jobs">Find work →</Link></div>
  <nav className="app-nav" aria-label="Your workspace sections">{tabs.map(t=><button key={t.key} type="button" className={tab===t.key?'active':''} onClick={()=>{setTab(t.key);setNotice('')}}>{t.label}</button>)}</nav>
  {notice?<Notice>{notice}</Notice>:null}
  {tab==='overview'?<><div className="app-grid">
    <div className="app-card app-card-indigo"><span className="app-eyebrow">ACTIVE WORK</span><div className="app-stat">{projects.filter(p=>!['completed','cancelled'].includes(p.status)).length}</div><p>Live project workspaces</p></div>
    <div className="app-card"><span className="app-eyebrow">APPLICATIONS</span><div className="app-stat">{apps.length}</div><p>Free proposals sent</p></div>
    <div className="app-card"><span className="app-eyebrow">PROOF OF WORK</span><div className="app-stat">{certs.length}</div><p>Issued credentials</p></div>
   </div><div className="app-two-cols" style={{marginTop:18}}><div className="app-card"><h2>Continue your journey</h2><p>Jobs aren't the only way to grow. Add portfolio work and complete real courses.</p>
    <div className="app-inline-actions"><Link href="/jobs" className="app-action">Discover gigs</Link><Link href="/learn" className="app-action-secondary">Explore Academy</Link><Link href="/billing" className="app-action-secondary">Payment activity</Link></div></div>
    <div className="app-card"><h2>Roles on your account</h2><div className="app-inline-actions">{['freelancer','client','learner','creator'].map(role=><button key={role} type="button" className={roles.includes(role)?'app-tag good':'app-tag'} disabled={roles.includes(role)} onClick={()=>activate(role)}>{role}{roles.includes(role)?' ✓':' +'}</button>)}</div>
    <p>No separate accounts are needed for hiring or teaching.</p></div></div>
   </>:null}
  {tab==='projects'?<div className="app-list">{projects.length?projects.map(p=><div key={p.id} className="app-row"><div><h3>{jobNames[p.job_id]||'Project '+p.id.slice(0,8)}</h3>
   <p>{rupees(p.agreed_budget_inr)} · Payment {p.payment_status}</p></div><div className="app-inline-actions"><Status value={p.status}/><Link href={'/project/'+p.id}>Open workspace →</Link></div></div>):
   <div className="app-empty"><h2>No projects yet</h2><p>Once a client hires a freelancer, a shared workspace appears here.</p></div>}</div>:null}
  {tab==='hiring'?<div className="app-two-cols"><div className="app-list"><div className="app-card"><h2>Your job postings</h2><p>Choose a listing to review applications and hire freelancers.</p></div>
   {jobs.map(j=><div className="app-row" key={j.id}><div><h3>{j.title}</h3><p>{rupees(j.budget_inr)} · {j.status}</p></div><div className="app-inline-actions"><button className="app-action-secondary" onClick={()=>openApplicants(j.id)}>Applications</button>{j.status==='open'?<button className="app-text-button" disabled={busy} onClick={()=>closeJob(j.id)}>Close job</button>:null}</div></div>)}
   <div className="app-card"><h2>Post a fixed-price job</h2><form onSubmit={postJob}>
   <label>Title<input required minLength={8} maxLength={120} value={jobForm.title} onChange={e=>setJobForm({...jobForm,title:e.target.value})}/></label>
   <label>Category<select value={jobForm.category} onChange={e=>setJobForm({...jobForm,category:e.target.value})}>{categories.map(c=><option key={c}>{c}</option>)}</select></label>
   <label>Budget (INR)<input required type="number" min={100} max={10000000} value={jobForm.budget_inr} onChange={e=>setJobForm({...jobForm,budget_inr:e.target.value})}/></label>
   <label>Description<input required minLength={60} maxLength={6000} value={jobForm.description} onChange={e=>setJobForm({...jobForm,description:e.target.value})} placeholder="Explain the scope and deliverables…"/></label>
   <button disabled={busy} className="app-action">Publish job →</button></form></div></div>
   <div className="app-card"><h2>Job applications</h2>{currentJob?<p>Applications on the selected job.</p>:<p>Select a job on the left.</p>}
    <div className="app-list">{jobApps.map(a=><div className="app-card" key={a.id}><h3>{people[a.freelancer_id]?.display_name||'Freelancer'}</h3>
     <p>{people[a.freelancer_id]?.headline||'No headline'}</p><p style={{whiteSpace:'pre-wrap'}}>{a.proposal}</p><Status value={a.status}/>
     {a.status==='submitted'&&jobs.find(j=>j.id===currentJob)?.status==='open'?<button className="app-action" disabled={busy} onClick={()=>hire(a)}>Hire freelancer</button>:null}
     </div>)}{currentJob&&!jobApps.length?<p>No applications yet.</p>:null}</div></div></div>:null}
  {tab==='applications'?<div className="app-list">{apps.length?apps.map(a=><div className="app-row" key={a.id}><div><h3>{jobNames[a.job_id]||'Application submitted'}</h3>
   <p>Applied {shortDate(a.created_at)}</p></div><Status value={a.status}/></div>):<div className="app-empty"><h2>No applications yet</h2><p><Link href="/jobs" className="app-link">Explore open gigs →</Link></p></div>}</div>:null}
  {tab==='profile'?<div className="app-two-cols"><div className="app-card"><h2>Public identity</h2><form onSubmit={saveProfile}>
   {(['display_name','username','headline','city','website'] as const).map(key=><label key={key}>{key.replace('_',' ')}<input value={form[key]} maxLength={key==='username'?24:key==='headline'?140:200} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>)}
   <label>About you<textarea value={form.bio} maxLength={2000} onChange={e=>setForm({...form,bio:e.target.value})}/></label>
   <label className="app-check-row"><input type="checkbox" checked={form.is_public} onChange={e=>setForm({...form,is_public:e.target.checked})}/> Make my profile public</label>
   <button disabled={busy} className="app-action">Save profile</button></form></div>
   <div className="app-card"><h2>Account</h2><p>{user?.email}</p><p>Public profiles are discoverable by clients. Private profiles only appear to project participants and clients who receive your applications.</p>
   {profile?.username&&profile.is_public?<Link className="app-link" href={'/u/'+profile.username}>View public profile →</Link>:null}<div className="app-divider"/>
   <div className="app-inline-actions"><Link href="/billing" className="app-action-secondary">Payment activity</Link><Link href="/settings" className="app-action-secondary">Account settings</Link><Link href="/delete-account" className="app-action-secondary">Delete account</Link></div><button className="app-action-secondary" onClick={signOut}>Sign out</button></div></div>:null}
  {tab==='portfolio'?<div className="app-two-cols"><div className="app-card"><h2>Add portfolio work</h2><form onSubmit={addPortfolio}>
   <label>Project title<input required minLength={4} maxLength={120} value={portForm.title} onChange={e=>setPortForm({...portForm,title:e.target.value})}/></label>
   <label>Description<textarea value={portForm.description} onChange={e=>setPortForm({...portForm,description:e.target.value})}/></label>
   <label>Project URL<input type="url" value={portForm.project_url} onChange={e=>setPortForm({...portForm,project_url:e.target.value})}/></label>
   <button className="app-action">Add to portfolio →</button></form></div>
   <div className="app-list">{port.map(item=><div className="app-card" key={item.id}><h3>{item.title}</h3><p>{item.description}</p>
    {item.project_url?<a className="app-link" href={item.project_url} target="_blank" rel="noopener noreferrer">View work ↗</a>:null}
    <div><button className="app-text-button" onClick={async()=>{const r=await supabase?.from('portfolio_items').delete().eq('id',item.id);setNotice(r?.error?.message||'Removed');refresh()}}>Remove</button></div></div>)}
    {!port.length?<div className="app-empty"><h2>Show your work</h2><p>Add projects with permission to showcase them.</p></div>:null}</div></div>:null}
  {tab==='credentials'?<div className="app-grid">{certs.length?certs.map(c=><div className="app-card" key={c.id}><span className="app-eyebrow">{c.kind==='work'?'CLIENT-APPROVED WORK':'COURSE ASSESSMENT'}</span><h2>{c.title}</h2>
   <p>Issued {shortDate(c.issued_at)}</p><Link className="app-action-secondary" href={'/verify/'+c.code}>Verify record ↗</Link></div>):<div className="app-empty"><h2>No credentials yet</h2><p>Complete real work or pass an assessment to earn one.</p></div>}</div>:null}
  <div className="app-banner" style={{marginTop:28}}><div><h2>Keep learning. Keep creating.</h2><p>Freelance experience and learning records in one professional identity.</p></div><Link href="/learn">Open Academy →</Link></div>
 </AppShell>;
}
