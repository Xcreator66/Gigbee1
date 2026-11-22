import Link from 'next/link';
import {rupees,categories} from '@gigbee/shared';
import {getPublicSupabase} from '../../lib/supabase';
export const dynamic='force-dynamic';
export const metadata={title:'Freelance services'};
type Service={id:string;title:string;description:string;category:string;price_inr:number;delivery_days:number};
type Query={q?:string;category?:string;page?:string};
const pageSize=24;
export default async function Services({searchParams}:{searchParams:Promise<Query>}){
 const params=await searchParams;
 const q=(typeof params.q==='string'?params.q:'').trim().slice(0,70);
 const term=q.replace(/[^a-zA-Z0-9\u0900-\u097F\u0A00-\u0A7F\s-]/g,' ').trim();
 const category=categories.find(c=>c===params.category)||'';
 const page=Math.min(200,Math.max(1,Number.parseInt(params.page||'1',10)||1));
 const db=getPublicSupabase();
 let services:Service[]=[];let total=0;let errorMessage='';
 if(db){
  let req=db.from('service_packages').select('id,title,description,category,price_inr,delivery_days',{count:'exact'}).eq('status','active');
  if(category)req=req.eq('category',category);
  if(term)req=req.or('title.ilike.%'+term+'%,description.ilike.%'+term+'%');
  const r=await req.order('created_at',{ascending:false}).order('id',{ascending:false}).range((page-1)*pageSize,page*pageSize-1);
  if(r.error)errorMessage='Services cannot be loaded right now.';
  else{services=(r.data as Service[])||[];total=r.count??0;}
 }
 const pageUrl=(n:number)=>'/services?'+new URLSearchParams({...(q?{q}:{}),...(category?{category}:{}),page:String(n)}).toString();
 return <><section className="page-hero"><div className="shell"><span className="eyebrow-light"><span/> DONE-FOR-YOU SERVICES</span>
  <h1>Great work.<br/><em>Clear scope.</em></h1>
  <p>Find fixed-price freelance services offered by GigBee members, and request a project directly.</p>
 </div></section>
 <section className="shell inner-section">
  <form className="filters-panel" action="/services" method="GET" aria-label="Search fixed-price services">
   <div className="field-wrap"><label htmlFor="service-search">Search services</label>
    <input id="service-search" name="q" type="search" maxLength={70} defaultValue={q} placeholder="Try: logo, reels, marketing…"/></div>
   <div className="field-wrap"><label htmlFor="service-category">Category</label>
    <select id="service-category" name="category" defaultValue={category}><option value="">All categories</option>
     {categories.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
   <button type="submit" className="btn btn-dark filter-button">Find services</button>
  </form>
  {!db?<div className="notice">The GigBee database has not been configured.</div>:null}
  {errorMessage?<div className="notice error" role="alert">{errorMessage}</div>:null}
  <div className="result-summary"><span><strong>{total}</strong> services found</span>
   {q||category?<Link href="/services">Clear filters</Link>:null}</div>
  <div className="app-grid">{services.length?services.map(item=><Link key={item.id} href={'/services/'+item.id} className="app-card">
   <span className="app-eyebrow">{item.category}</span><h2>{item.title}</h2><p>{item.description}</p>
   <div className="app-divider"/><div className="app-inline-actions">
    <span className="app-stat" style={{fontSize:25}}>{rupees(item.price_inr)}</span>
    <span className="app-tag">{item.delivery_days} days</span></div>
   <span className="app-link">Request service →</span>
  </Link>):!errorMessage?<div className="app-empty"><h2>No matching services.</h2>
   <p>Freelancers can create genuine fixed-price packages in their GigBee workspace.</p>
   <Link className="app-link" href="/jobs">Explore jobs →</Link></div>:null}</div>
  {total>pageSize?<nav aria-label="Service result pages" className="app-inline-actions" style={{justifyContent:'center',marginTop:24}}>
   {page>1?<Link href={pageUrl(page-1)} className="btn btn-outline-purple">← Previous</Link>:null}
   <span style={{alignSelf:'center'}}>Page {page} of {Math.ceil(total/pageSize)}</span>
   {page*pageSize<total?<Link href={pageUrl(page+1)} className="btn btn-outline-purple">Next →</Link>:null}
  </nav>:null}
 </section></>;
}
