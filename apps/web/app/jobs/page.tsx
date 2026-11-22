import Link from 'next/link';
import {rupees,type Job,categories} from '@gigbee/shared';
import {getPublicSupabase} from '../../lib/supabase';
import JobCard from '../../components/JobCard';
import {Icon} from '../../components/Icon';
export const dynamic='force-dynamic';
export const metadata={title:'Find freelance work'};
type Search={q?:string;category?:string;budget?:string;sort?:string;page?:string};
export default async function JobsPage({searchParams}:{searchParams:Promise<Search>}){
 const query=await searchParams;
 const q=typeof query.q==='string'?query.q.trim().slice(0,80):'';
 const category=categories.find(c=>c===query.category)||'';
 const budget=['','1000','5000','25000'].includes(query.budget||'')?query.budget||'':'';
 const sort=['newest','low','high'].includes(query.sort||'')?query.sort||'newest':'newest';
 const page=Math.min(200,Math.max(1,Number.parseInt(query.page||'1',10)||1));
 const pageSize=24;
 const db=getPublicSupabase();
 let data:Job[]=[];let total=0;let errorMessage='';
 if(db){let request=db.from('jobs').select('*',{count:'exact'}).eq('status','open');
  if(category)request=request.eq('category',category);
  const term=q.replace(/[^a-zA-Z0-9\u0900-\u097F\u0A00-\u0A7F\s-]/g,' ').trim();
  if(term)request=request.or('title.ilike.%'+term+'%,description.ilike.%'+term+'%');
  if(budget)request=request.lte('budget_inr',Number(budget));
  if(sort==='low')request=request.order('budget_inr',{ascending:true});
  else if(sort==='high')request=request.order('budget_inr',{ascending:false});
  else request=request.order('created_at',{ascending:false});
  const result=await request.order('id',{ascending:false}).range((page-1)*pageSize,page*pageSize-1);
  data=(result.data??[]) as Job[];total=result.count??0;if(result.error)errorMessage=result.error.message;
 }
 const pageHref=(n:number)=>'/jobs?'+new URLSearchParams({...(q?{q}:{}),...(category?{category}:{}),...(budget?{budget}:{}),...(sort!=='newest'?{sort}:{}),page:String(n)}).toString();
 return <><section className="page-hero"><div className="shell"><span className="eyebrow-light"><span/> FIND YOUR NEXT PROJECT</span><h1>Find work that fits<br/><em>who you are.</em></h1><p>Browse real published opportunities, explore by category and budget, and choose where to take your skills next. Apply for free from GigBee mobile or web.</p></div></section>
 <section className="shell inner-section"><form method="GET" action="/jobs" className="filters-panel" aria-label="Filter freelance opportunities">
   <div className="field-wrap"><label htmlFor="search-title">Search projects</label><input id="search-title" type="search" name="q" defaultValue={q} maxLength={80} placeholder="Try: video editor, logo designer..."/></div>
   <div className="field-wrap"><label htmlFor="category">Category</label><select id="category" name="category" defaultValue={category}><option value="">All categories</option>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
   <div className="field-wrap"><label htmlFor="budget">Maximum budget</label><select id="budget" name="budget" defaultValue={budget}><option value="">Any budget</option><option value="1000">Up to {rupees(1000)}</option><option value="5000">Up to {rupees(5000)}</option><option value="25000">Up to {rupees(25000)}</option></select></div>
   <div className="field-wrap sort-field"><label htmlFor="sort">Sort by</label><select id="sort" name="sort" defaultValue={sort}><option value="newest">Newest first</option><option value="low">Budget: low to high</option><option value="high">Budget: high to low</option></select></div>
   <button className="btn btn-dark filter-button" type="submit"><Icon name="search" size={17}/> Find gigs</button>

 </form>
 {!db&&<div className="notice">A dedicated GigBee Supabase project has not been connected. The interface is ready; real listings will appear here after setup.</div>}
 {errorMessage&&<div className="notice error">There was a problem loading projects. Please try again later.</div>}
 <div className="result-summary"><span><strong>{total}</strong> {total===1?'open project':'open projects'} found · Showing {data.length?((page-1)*pageSize+1):0}–{Math.min(page*pageSize,total)}</span>{(q||category||budget||sort!=='newest')&&<Link href="/jobs">Clear filters</Link>}</div>
 {data.length>0?<div className="job-grid">{data.map(j=><JobCard key={j.id} job={j}/>)}</div>:<div className="jobs-empty"><div className="jobs-empty-icon"><Icon name="search" size={29}/></div><h2>{q||category||budget?'No projects match your filters.':'No open projects yet.'}</h2><p>{q||category||budget?'Try a broader search or remove some filters.':'Real projects posted from the GigBee app will show here when available. We never fill the marketplace with fake jobs.'}</p>{(q||category||budget)&&<Link className="btn btn-outline-purple" href="/jobs">View all opportunities <Icon name="arrow-right" size={17}/></Link>}</div>}
 {total>pageSize?<nav aria-label="Job result pages" className="app-inline-actions" style={{justifyContent:'center',marginTop:24}}>
  {page>1?<Link className="btn btn-outline-purple" href={pageHref(page-1)}>← Previous</Link>:null}
  <span style={{alignSelf:'center'}}>Page {page} of {Math.ceil(total/pageSize)}</span>
  {page*pageSize<total?<Link className="btn btn-outline-purple" href={pageHref(page+1)}>Next →</Link>:null}
 </nav>:null}
 <div className="notice">Sign in to apply for jobs on the website or mobile app. Client hiring and project collaboration are built into GigBee; live payments remain disabled until a supported payment provider is configured.</div>
 </section></>;
}
