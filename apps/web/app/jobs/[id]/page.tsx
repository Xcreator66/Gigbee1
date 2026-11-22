import Link from 'next/link';
import {notFound} from 'next/navigation';
import {rupees,type Job} from '@gigbee/shared';
import {getPublicSupabase} from '../../../lib/supabase';
import {Icon} from '../../../components/Icon';
import ApplyPanel from '../../../components/ApplyPanel';
export const dynamic='force-dynamic';
export default async function JobPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))notFound();
 const db=getPublicSupabase();if(!db)notFound();
 const {data}=await db.from('jobs').select('id,title,description,category,budget_inr,created_at,client_id,status').eq('id',id).eq('status','open').maybeSingle();if(!data)notFound();
 const job=data as Job;
 return <><section className="page-hero"><div className="shell"><span className="eyebrow-light"><span/> OPPORTUNITY DETAILS</span><h1>Every great project<br/><em>starts with a brief.</em></h1><p>Read the details carefully before deciding if this project matches your skills and availability.</p></div></section>
 <div className="shell inner-section"><Link href="/jobs" className="back-link">← All opportunities</Link><div className="detail-grid" style={{marginTop:24}}><article className="detail-main"><span className="pill pill-lilac">{job.category}</span><h1>{job.title}</h1><div className="detail-meta"><span><Icon name="clock" size={16}/> Published {new Date(job.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</span><span><Icon name="briefcase" size={16}/> Fixed-price project</span></div><div className="detail-body"><h2>Project description</h2><p>{job.description}</p></div><div className="notice">Apply for free. A private project workspace is created after the client hires a freelancer. Payment status is tracked separately and is not a promise of escrow.</div></article>
 <aside className="detail-aside"><span className="eyebrow-light"><span/> PROJECT BUDGET</span><div className="amount">{rupees(job.budget_inr)}</div><small>Fixed-price total stated by the client</small><ul><li><Icon name="check" size={17}/> Free to submit a proposal</li><li><Icon name="file" size={17}/> Read full scope before applying</li><li><Icon name="shield" size={17}/> Never pay a client to secure a gig</li></ul><Link href="/how-it-works" className="btn btn-dark">How applications work <Icon name="arrow" size={17}/></Link><ApplyPanel jobId={job.id} clientId={job.client_id}/></aside></div></div></>;
}
