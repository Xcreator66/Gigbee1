'use client';
import React from 'react';import Link from 'next/link';
import {useGigBeeAuth} from '../lib/auth';
export function AppShell({title,subtitle,children}:{title:string;subtitle?:string;children:React.ReactNode}){
 const {user,loading,configured}=useGigBeeAuth();
 return <div className="app-backdrop"><div className="shell app-shell">
  <div className="app-heading"><div><span className="app-eyebrow">GIGBEE WORKSPACE</span><h1>{title}</h1>{subtitle?<p>{subtitle}</p>:null}</div><Link className="app-action-secondary" href="/">← Back to GigBee</Link></div>
  {!configured?<div className="app-alert">Connect your dedicated GigBee Supabase URL and publishable key in <code>apps/web/.env.local</code>.</div>:
   loading?<div className="app-loading">Loading account…</div>:!user?<div className="app-empty"><h2>Sign in to continue</h2><p>Your workspace contains private information and is available only to your account.</p><Link href="/sign-in" className="app-action">Sign in →</Link></div>:children}
 </div></div>;
}
export function Notice({children}:{children:React.ReactNode}){return <div className="app-alert">{children}</div>}
export function Status({value}:{value:string}){return <span className="app-tag">{value.replaceAll('_',' ')}</span>}
