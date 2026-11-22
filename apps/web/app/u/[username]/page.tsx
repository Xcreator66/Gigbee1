import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getPublicSupabase} from '../../../lib/supabase';
import {Icon} from '../../../components/Icon';
export const dynamic='force-dynamic';
type Person={id:string;display_name:string;username:string;headline:string;bio:string;city:string|null;website:string|null;created_at:string};
type Portfolio={id:string;title:string;description:string;project_url:string|null};
type Stats={completed_jobs:number;average_rating:number|null};
export default async function PublicProfile({params}:{params:Promise<{username:string}>}){
 const {username}=await params;if(!/^[a-z0-9_]{3,24}$/.test(username))notFound();
 const db=getPublicSupabase();if(!db)notFound();
 const {data}=await db.from('profiles').select('id,display_name,username,headline,bio,city,website,created_at')
   .eq('username',username).eq('is_public',true).maybeSingle();
 if(!data)notFound();const p=data as Person;
 const [portfolioResult,statsResult]=await Promise.all([
   db.from('portfolio_items').select('id,title,description,project_url').eq('user_id',p.id).order('created_at',{ascending:false}).limit(18),
   db.from('freelancer_stats').select('completed_jobs,average_rating').eq('id',p.id).maybeSingle()
 ]);
 const work=(portfolioResult.data||[]) as Portfolio[];const stats=(statsResult.data as Stats|null)||null;
 return <><section className="page-hero"><div className="shell"><span className="eyebrow-light"><span/> GIGBEE TALENT</span><h1>Real people.<br/><em>Real possibility.</em></h1><p>Public work samples and platform-recorded completion history, clearly distinguished.</p></div></section>
 <div className="shell inner-section"><Link className="back-link" href="/freelancers">← Explore public talent</Link>
 <section className="profile-sheet" style={{maxWidth:960,marginTop:22}}>
  <div className="profile-header"><div className="avatar">{(p.display_name||p.username).slice(0,1).toUpperCase()}</div><div><h1>{p.display_name||p.username}</h1><div className="profile-handle">@{p.username}</div>{p.headline?<p style={{fontSize:18,marginTop:10}}>{p.headline}</p>:null}</div></div>
  <div className="app-grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',margin:'18px 0'}}>
   <div className="app-card"><span className="app-eyebrow">CLIENT-APPROVED PROJECTS</span><div className="app-stat">{stats?.completed_jobs??'—'}</div><p>Recorded on GigBee</p></div>
   <div className="app-card"><span className="app-eyebrow">PROJECT REVIEWS</span><div className="app-stat">{stats?.average_rating?`${stats.average_rating}/5`:'—'}</div><p>{stats?.average_rating?'From completed-work reviews':'No verified rating yet'}</p></div>
  </div>
  {p.bio?<><h2>About</h2><p className="bio" style={{whiteSpace:'pre-wrap'}}>{p.bio}</p></>:null}
  {p.city?<p className="profile-meta"><Icon name="globe" size={14}/> {p.city}</p>:null}
  {p.website&&/^https:\/\//i.test(p.website)?<p><a className="app-link" href={p.website} target="_blank" rel="noopener noreferrer">Personal website ↗</a></p>:null}
  <h2 style={{marginTop:28}}>Selected work</h2>
  {work.length?<div className="app-grid">{work.map(item=><article key={item.id} className="app-card"><h3>{item.title}</h3><p style={{whiteSpace:'pre-wrap'}}>{item.description}</p>{item.project_url?<a className="app-link" href={item.project_url} target="_blank" rel="noopener noreferrer">Open portfolio item ↗</a>:null}</article>)}</div>:<div className="app-empty"><p>No portfolio projects have been made public yet.</p></div>}
  <div className="profile-meta"><Icon name="clock" size={14}/> GigBee member since {new Date(p.created_at).toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</div>
  <div className="notice">Portfolio items and personal information are self-reported. Completed-work counts and review averages are calculated from GigBee project records; they are not independently audited professional qualifications or payment guarantees.</div>
  <Link className="btn btn-dark" href="/dashboard">Open your workspace <Icon name="arrow" size={16}/></Link>
 </section></div></>;
}
