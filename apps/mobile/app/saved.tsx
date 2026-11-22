import React,{useCallback,useState} from 'react';import {Text} from 'react-native';import {router,useFocusEffect} from 'expo-router';
import {type Job,colors} from '@gigbee/shared';import {Empty,JobCard,Page,s} from '../components/ui';import {supabase} from '../lib/supabase';import {useAuth} from '../context/AuthContext';
export default function Saved(){const {session}=useAuth();const [items,setItems]=useState<Job[]>([]);
 useFocusEffect(useCallback(()=>{if(!supabase||!session)return;let live=true;(async()=>{const b=await supabase.from('saved_jobs').select('job_id').eq('user_id',session.user.id);
 const ids=(b.data||[]).map(x=>x.job_id);if(!ids.length){if(live)setItems([]);return;}
 const j=await supabase.from('jobs').select('*').in('id',ids).eq('status','open');if(live)setItems((j.data as Job[])||[]);})();return()=>{live=false};},[session?.user.id]));
 return <Page><Text onPress={()=>router.back()} style={{color:colors.violet,fontWeight:'900'}}>← Back</Text><Text style={s.heading}>Saved opportunities</Text>
 {items.length?items.map(j=><JobCard key={j.id} job={j} onPress={()=>router.push({pathname:'/job/[id]',params:{id:j.id}})}/>):<Empty title="No saved jobs" detail="Bookmark opportunities in Explore to revisit them here."/>}</Page>;
}
