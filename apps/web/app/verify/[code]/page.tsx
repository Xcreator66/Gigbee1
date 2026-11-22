import Link from 'next/link';import {getPublicSupabase} from '../../../lib/supabase';import {shortDate} from '@gigbee/shared';
export const dynamic='force-dynamic';
export default async function VerifyRecord({params}:{params:Promise<{code:string}>}){
 const {code}=await params;const db=getPublicSupabase();let record:{kind:string;title:string;issued_at:string;holder_name:string}|null=null;let name='';
 if(db&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code)){
  const r=await db.rpc('verify_gigbee_certificate',{p_code:code});record=(r.data?.[0] as {kind:string;title:string;issued_at:string;holder_name:string}|undefined)??null;
  if(record)name=record.holder_name;
 }
 return <div className="app-backdrop"><div className="shell app-shell" style={{maxWidth:850}}><Link href="/verify" className="back-link">← Verify another certificate</Link>
 {record?<div className="app-card" style={{marginTop:25,padding:38,borderTop:'7px solid #6546F5'}}><span className="app-tag good">✓ Active GigBee record</span>
 <div className="app-eyebrow" style={{marginTop:23}}>{record.kind==='work'?'CLIENT-APPROVED COMPLETION':'COURSE ASSESSMENT'}</div><h1 style={{fontSize:44,margin:'16px 0'}}>{record.title}</h1>
 {name?<p style={{fontSize:19,fontWeight:800}}>{name}</p>:<p>Credential holder's public name is unavailable.</p>}
 <div className="app-divider"/><p>Issued: {shortDate(record.issued_at)}<br/>Code: <code>{code}</code></p>
 <div className="app-alert">{record.kind==='work'?'This certificate records client approval of project deliverables inside GigBee. It does not establish payment settlement or guarantee independent professional accreditation.':'This certificate records a passing score on the course creator’s GigBee assessment. It is not an accredited qualification unless separately stated by an authorized body.'}</div>
 </div>:<div className="app-empty" style={{marginTop:25}}><h2>No valid record found</h2><p>Check the code. The record may not exist or may have been revoked.</p></div>}
 </div></div>;
}
