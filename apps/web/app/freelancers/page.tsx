import Link from 'next/link';
import {getPublicSupabase} from '../../lib/supabase';
import {Icon} from '../../components/Icon';
export const dynamic='force-dynamic';
export const metadata={title:'Explore talent'};
type Person={display_name:string;username:string;headline:string;bio:string};
type Query={q?:string;page?:string};
const pageSize=24;
export default async function Freelancers({searchParams}:{searchParams:Promise<Query>}){
 const params=await searchParams;
 const q=(typeof params.q==='string'?params.q:'').trim().slice(0,70);
 const term=q.replace(/[^a-zA-Z0-9\u0900-\u097F\u0A00-\u0A7F\s-]/g,' ').trim();
 const page=Math.min(200,Math.max(1,Number.parseInt(params.page||'1',10)||1));
 const db=getPublicSupabase();
 let people:Person[]=[];let total=0;let failed=false;
 if(db){
  let req=db.from('profiles').select('display_name,username,headline,bio',{count:'exact'})
   .eq('is_public',true).not('username','is',null);
  if(term)req=req.or('headline.ilike.%'+term+'%,display_name.ilike.%'+term+'%');
  const result=await req.order('created_at',{ascending:false}).order('id',{ascending:false})
   .range((page-1)*pageSize,page*pageSize-1);
  if(result.error)failed=true;
  else{people=(result.data??[]).filter((p):p is Person=>Boolean(p.username));total=result.count??0;}
 }
 const pageUrl=(n:number)=>'/freelancers?'+new URLSearchParams({...(q?{q}:{}),page:String(n)}).toString();
 return <>
 <section className="page-hero"><div className="shell"><span className="eyebrow-light"><span/> THE PEOPLE BEHIND THE PROJECTS</span>
  <h1>Explore talent.<br/><em>Find your people.</em></h1>
  <p>Discover members who have chosen to share their professional profiles. No invented reviews or badges.</p>
 </div></section>
 <section className="shell inner-section">
  <form className="filters-panel" action="/freelancers" method="GET" style={{gridTemplateColumns:'minmax(0,1fr) auto'}}
   aria-label="Search professional profiles">
   <div className="field-wrap"><label htmlFor="talent-search">Search people or skills</label>
    <input id="talent-search" name="q" type="search" defaultValue={q} maxLength={70}
     placeholder="Try: designer, developer, video editor…"/></div>
   <button type="submit" className="btn btn-dark filter-button"><Icon name="search" size={16}/> Search talent</button>
  </form>
  {!db?<div className="notice">Connect the dedicated GigBee Supabase project to see public member profiles.</div>:null}
  {failed?<div className="notice error" role="alert">Talent profiles could not be loaded right now.</div>:null}
  <div className="result-summary"><span><strong>{total}</strong> public profiles found</span>
   {q?<Link href="/freelancers">Clear search</Link>:null}</div>
  {people.length?<div className="talent-grid">{people.map(p=><Link key={p.username} href={'/u/'+p.username}
   className="talent-card">
   <span className="avatar small">{(p.display_name||p.username).charAt(0).toUpperCase()}</span>
   <h3>{p.display_name||p.username}</h3><span className="handle">@{p.username}</span>
   <p>{p.headline||'GigBee community member'}</p>
   <span className="more">View public profile <Icon name="arrow" size={16}/></span>
  </Link>)}</div>:!failed?<div className="jobs-empty"><span className="jobs-empty-icon"><Icon name="users" size={28}/></span>
   <h2>{q?'No matching public profiles.':'The talent directory is getting started.'}</h2>
   <p>Profiles only appear when members opt in to public visibility and choose a username.</p>
   {q?<Link href="/freelancers" className="btn btn-outline-purple">See all profiles</Link>:null}
  </div>:null}
  {total>pageSize?<nav aria-label="Talent result pages" className="app-inline-actions" style={{justifyContent:'center',marginTop:24}}>
   {page>1?<Link href={pageUrl(page-1)} className="btn btn-outline-purple">← Previous</Link>:null}
   <span style={{alignSelf:'center'}}>Page {page} of {Math.ceil(total/pageSize)}</span>
   {page*pageSize<total?<Link href={pageUrl(page+1)} className="btn btn-outline-purple">Next →</Link>:null}
  </nav>:null}
  <div className="notice">Public profiles are self-reported. Completed-work records are shown separately when earned.</div>
 </section></>;
}
