'use client';
import {useEffect,useMemo,useState} from 'react';
import {createClient,type User} from '@supabase/supabase-js';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const webConfigured=Boolean(url&&key&&!url.includes('YOUR-GIGBEE'));
const supabase=webConfigured?createClient(url!,key!,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
export const getWebSupabase=()=>supabase;
export function useGigBeeAuth(){
 const [user,setUser]=useState<User|null>(null);const [loading,setLoading]=useState(true);
 useEffect(()=>{if(!supabase){setLoading(false);return;}let live=true;
  supabase.auth.getUser().then(({data})=>{if(live){setUser(data.user);setLoading(false);}}).catch(()=>{if(live)setLoading(false)});
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>{if(live){setUser(s?.user||null);setLoading(false);}});
  return()=>{live=false;subscription.unsubscribe()};
 },[]);
 return {user,loading,supabase,configured:webConfigured};
}
