import Link from 'next/link';
import {type Course} from '@gigbee/shared';
import {getPublicSupabase} from '../../lib/supabase';

export const dynamic='force-dynamic';
export const metadata={title:'Academy — learn practical freelance skills'};
type Query={q?:string;page?:string};
const pageSize=24;
export default async function Academy({searchParams}:{searchParams:Promise<Query>}){
 const params=await searchParams;
 const q=(typeof params.q==='string'?params.q:'').trim().slice(0,70);
 const term=q.replace(/[^a-zA-Z0-9\u0900-\u097F\u0A00-\u0A7F\s-]/g,' ').trim();
 const page=Math.min(200,Math.max(1,Number.parseInt(params.page||'1',10)||1));
 const db=getPublicSupabase();
 let courses:Course[]=[];let total=0;let errorMessage='';
 if(db){
  let request=db.from('courses').select('*',{count:'exact'}).eq('status','published');
  if(term)request=request.or('title.ilike.%'+term+'%,description.ilike.%'+term+'%');
  const {data,count,error}=await request.order('created_at',{ascending:false}).order('id',{ascending:false})
   .range((page-1)*pageSize,page*pageSize-1);
  if(error)errorMessage='Course catalogue is temporarily unavailable.';
  else{courses=(data as Course[])||[];total=count??0;}
 }
 const url=(n:number)=>'/learn?'+new URLSearchParams({...(q?{q}:{}),page:String(n)}).toString();
 return <>
  <section className="page-hero"><div className="shell"><span className="eyebrow-light"><span/> GIGBEE ACADEMY</span>
   <h1>Skills that open<br/><em>new doors.</em></h1>
   <p>Learn practical skills for free. Complete lessons and pass a real assessment to earn a course record.</p>
   <Link href="/dashboard" className="btn btn-yellow">My learning space →</Link>
  </div></section>
  <section className="shell inner-section">
   <div className="section-heading"><div><span className="eyebrow-light"><span/> KEEP LEARNING</span>
    <h2>Explore courses<br/><em>built for doing.</em></h2></div></div>
   <form action="/learn" method="GET" className="filters-panel" aria-label="Find courses">
    <div className="field-wrap"><label htmlFor="course-search">Search courses</label>
     <input id="course-search" type="search" name="q" maxLength={70} defaultValue={q} placeholder="Try: design, editing, coding…"/></div>
    <button className="btn btn-dark filter-button" type="submit">Search Academy</button>
   </form>
   {!db?<div className="notice">The dedicated GigBee database is not configured.</div>:null}
   {errorMessage?<div className="notice error" role="alert">{errorMessage}</div>:null}
   <div className="result-summary"><span><strong>{total}</strong> published courses found</span>
    {q?<Link href="/learn">Clear search</Link>:null}</div>
   <div className="app-grid">{courses.length?courses.map(c=><Link href={'/learn/'+c.id} key={c.id} className="app-card" style={{display:'block'}}>
    <div style={{borderRadius:18,height:130,marginBottom:18,background:'linear-gradient(135deg,#D8CEFF,#FFF0D5)',display:'grid',placeItems:'center',color:'#5735C9',fontSize:52}}>✦</div>
    <span className="app-eyebrow">{c.category}</span><h2>{c.title}</h2><p>{c.description}</p>
    <span className="app-tag good">FREE</span><span className="app-link" style={{float:'right'}}>Start learning →</span>
   </Link>):!errorMessage?<div className="app-empty"><h2>No matching published courses.</h2>
    <p>Creator-published courses appear when available. We do not publish fictional courses.</p>
    <Link className="app-link" href="/dashboard">Open your workspace →</Link></div>:null}</div>
   {total>pageSize?<nav aria-label="Course result pages" className="app-inline-actions" style={{justifyContent:'center',marginTop:24}}>
    {page>1?<Link href={url(page-1)} className="btn btn-outline-purple">← Previous</Link>:null}
    <span style={{alignSelf:'center'}}>Page {page} of {Math.ceil(total/pageSize)}</span>
    {page*pageSize<total?<Link href={url(page+1)} className="btn btn-outline-purple">Next →</Link>:null}
   </nav>:null}
   <div className="app-banner"><div><h2>Have skills worth sharing?</h2>
    <p>Create free lessons and assessments using GigBee Creator Studio in the mobile app.</p></div>
    <Link href="/dashboard">Explore GigBee →</Link></div>
  </section>
 </>;
}
