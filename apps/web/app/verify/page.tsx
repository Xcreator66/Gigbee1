'use client';
import React,{useState} from 'react';import {useRouter} from 'next/navigation';
export default function Verify(){const router=useRouter();const [code,setCode]=useState('');
 return <><section className="page-hero"><div className="shell"><span className="eyebrow-light"><span/> CHECK THE RECORD</span>
 <h1>Proof that goes<br/><em>beyond a badge.</em></h1><p>Look up a GigBee certificate by its verification code. Valid records are generated from completed courses or client-approved projects, not user-created graphics.</p></div></section>
 <div className="shell inner-section"><div className="app-card" style={{maxWidth:660,margin:'0 auto'}}><span className="app-eyebrow">VERIFY A GIGBEE RECORD</span><h2>Enter a certificate code</h2>
 <form onSubmit={e=>{e.preventDefault();if(/^[0-9a-f-]{36}$/i.test(code))router.push('/verify/'+code.trim());}}>
  <label>Verification UUID<input type="text" required pattern="[0-9a-fA-F-]{36}" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={code} onChange={e=>setCode(e.target.value)}/></label>
  <button className="app-action">Verify certificate →</button></form>
 <p style={{fontSize:12,color:'#777'}}>A GigBee work record means a client marked a submitted deliverable as complete. It does not independently guarantee identity, legal qualifications, payment, or work quality.</p></div></div></>;
}
