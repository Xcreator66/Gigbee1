'use client';
import React,{useState} from 'react';import Link from 'next/link';import {useGigBeeAuth} from '../../lib/auth';
export default function ResetPassword(){const {supabase,configured}=useGigBeeAuth();const [password,setPassword]=useState('');const [confirm,setConfirm]=useState('');const [busy,setBusy]=useState(false);const [notice,setNotice]=useState('');
 async function reset(e:React.FormEvent){e.preventDefault();if(!supabase)return;if(password.length<12||!/[A-Za-z]/.test(password)||!/\d/.test(password)){setNotice('Use at least 12 characters, including a letter and a number.');return;}
 if(password!==confirm){setNotice('Passwords do not match.');return;}
 setBusy(true);const {error}=await supabase.auth.updateUser({password});setBusy(false);
 if(!error){setPassword('');setConfirm('');}
 setNotice(error?.message||'Password updated. You can now sign in.');}
 return <div className="app-backdrop"><div className="shell" style={{maxWidth:560}}><form className="auth-card" onSubmit={reset}><span className="app-eyebrow">GIGBEE ACCOUNT</span><h2>Set a new password</h2>
 <p>Open this page through your secure recovery email link.</p>{!configured?<p>Supabase is not connected.</p>:null}
 <label>New password<input type="password" autoComplete="new-password" value={password} minLength={12} onChange={e=>setPassword(e.target.value)}/></label>
 <label>Confirm password<input required type="password" autoComplete="new-password" value={confirm} minLength={12} onChange={e=>setConfirm(e.target.value)}/></label>
 {notice?<div className="app-alert">{notice}</div>:null}<button disabled={!configured||busy} className="app-action">{busy?'Saving…':'Save new password'}</button><p><Link href="/sign-in">Return to sign in →</Link></p></form></div></div>
}
