import Link from 'next/link';import {getPublicSupabase} from '../../lib/supabase';
export const dynamic='force-dynamic';export const metadata={title:'GigBee talent rankings'};
type Rank={id:string;username:string|null;display_name:string;headline:string;completed_jobs:number;average_rating:number|null;tier:string};
export default async function Rankings(){const db=getPublicSupabase();let ranks:Rank[]=[];
 if(db){const r=await db.from('freelancer_rankings').select('*').order('completed_jobs',{ascending:false}).limit(100);ranks=(r.data as Rank[])||[];}
 return <><section className="page-hero"><div className="shell"><span className="eyebrow-light"><span/> EARNED, NOT BOUGHT</span><h1>Reputation built<br/><em>through work.</em></h1>
 <p>Explore rankings based on client-approved project completions. A leaderboard can only fill up when real projects are recorded.</p></div></section>
 <section className="shell inner-section"><div className="app-banner"><div><h2>Three growth tiers</h2><p>Beginner: 0–4 completed jobs · Intermediate: 5–19 · Expert: 20+</p></div><Link href="/how-it-works">How it works →</Link></div>
 <div className="app-list">{ranks.length?ranks.map((r,i)=><div key={r.id} className="app-row"><strong style={{fontSize:24,color:'#6546F5',width:45}}>#{i+1}</strong>
 <div style={{flex:1}}><h3>{r.display_name}</h3><p>{r.headline} · {r.completed_jobs} approved projects · {r.average_rating||'Unrated'} ★</p></div>
 <span className="app-tag">{r.tier}</span>{r.username?<Link href={'/u/'+r.username}>Profile →</Link>:null}</div>):
 <div className="app-empty"><h2>No rankings yet</h2><p>Only real approved work can appear here.</p></div>}</div>
 </section></>;
}
