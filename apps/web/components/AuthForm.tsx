'use client';
import React,{useState} from 'react';import Link from 'next/link';import {useRouter} from 'next/navigation';
import {getWebSupabase,webConfigured} from '../lib/auth';
export default function AuthForm({mode}:{mode:'login'|'register'}){
 const router=useRouter();const [name,setName]=useState('');const [email,setEmail]=useState('');const [password,setPassword]=useState('');
 const [confirm,setConfirm]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [message,setMessage]=useState('');
 async function submit(e:React.FormEvent){e.preventDefault();const db=getWebSupabase();if(!db)return;setError('');setBusy(true);
 if(mode==='register'){
  if(name.trim().length<2||password.length<12||!/[A-Za-z]/.test(password)||!/\d/.test(password)){setError('Enter your name and a password with 12+ characters, a letter and a number.');setBusy(false);return;}
  if(password!==confirm){setError('Passwords do not match.');setBusy(false);return;}
  const {data,error:e}=await db.auth.signUp({email:email.trim().toLowerCase(),password,options:{data:{full_name:name.trim()}}});
  if(e)setError(e.message);else if(!data.session)setMessage('Check your email to confirm your account, then sign in.');else router.push('/dashboard');
 }else{const {error:e}=await db.auth.signInWithPassword({email:email.trim(),password});if(e)setError(e.message);else router.push('/dashboard');}setBusy(false);}
 async function reset(){const db=getWebSupabase();if(!db||!email.trim()){setError('Enter your email address first.');return;}
 const {error:e}=await db.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin+'/reset-password'});if(e)setError(e.message);else setMessage('If this email has an account, a reset link will arrive.');}
 return <div className="app-backdrop"><div className="shell auth-layout">
  <div className="auth-story"><span className="app-eyebrow">GIGBEE · LEARN. WORK. GROW.</span><h1>Make your next<br/><em>opportunity</em> happen.</h1>
   <p>Learn real skills, apply without credits, and build a reputation based on completed work.</p>
   <div className="auth-orbits"><span>SKILL</span><span>WORK</span><span>PROOF</span></div></div>
  <form onSubmit={submit} className="auth-card"><span className="app-eyebrow">{mode==='login'?'WELCOME BACK':'WELCOME TO GIGBEE'}</span>
   <h2>{mode==='login'?'Sign in to your space':'Start building your future'}</h2><p>One account for learning, freelancing, hiring and teaching.</p>
   {!webConfigured?<div className="app-alert">Website Supabase configuration is missing.</div>:null}
   {mode==='register'?<label>Full name<input required minLength={2} value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" maxLength={100}/></label>:null}
   <label>Email address<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
   <label>Password<input required type="password" autoComplete={mode==='login'?'current-password':'new-password'} minLength={mode==='register'?12:1} value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==='register'?'12+ characters, letter and number':'Your password'}/></label>
   {mode==='register'?<label>Confirm password<input required type="password" autoComplete="new-password" minLength={12} value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>:null}
   {error?<div className="app-error">{error}</div>:null}{message?<div className="app-success">{message}</div>:null}
   <button className="app-action" disabled={busy||!webConfigured}>{busy?'Please wait…':mode==='login'?'Sign in →':'Create free account →'}</button>
   {mode==='login'?<button className="app-text-button" type="button" onClick={reset}>Forgot your password?</button>:null}
   <div className="auth-alternate">{mode==='login'?<>New to GigBee? <Link href="/sign-up">Create an account</Link></>:<>Already registered? <Link href="/sign-in">Sign in</Link></>}</div>
  </form></div></div>
}
