import React,{useCallback,useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {router,useFocusEffect} from 'expo-router';
import {type Job,type Project,colors,rupees,shortDate} from '@gigbee/shared';
import {Button,Empty,Page,s,SectionHeading} from '../../components/ui';
import {supabase} from '../../lib/supabase';
import {useAuth} from '../../context/AuthContext';
type MyApp={id:string;job_id:string;status:string;created_at:string};
export default function Work(){
 const {session}=useAuth();const [view,setView]=useState<'projects'|'applications'|'jobs'>('projects');
 const [applications,setApplications]=useState<MyApp[]>([]);const [jobs,setJobs]=useState<Job[]>([]);
 const [projects,setProjects]=useState<Project[]>([]);const [titles,setTitles]=useState<Record<string,string>>({});const [error,setError]=useState('');
 useFocusEffect(useCallback(()=>{if(!supabase||!session)return;let active=true;
  (async()=>{
   const [a,j,p]=await Promise.all([
    supabase.from('applications').select('id,job_id,status,created_at').eq('freelancer_id',session.user.id).order('created_at',{ascending:false}),
    supabase.from('jobs').select('*').eq('client_id',session.user.id).order('created_at',{ascending:false}),
    supabase.from('projects').select('*').order('created_at',{ascending:false})
   ]);const ids=[...new Set([...(a.data??[]).map(x=>x.job_id),...(p.data??[]).map(x=>x.job_id)])];
   const jt=ids.length?await supabase.from('jobs').select('id,title').in('id',ids):{data:[]};
   if(active){setApplications((a.data??[]) as MyApp[]);setJobs((j.data??[]) as Job[]);setProjects((p.data??[]) as Project[]);
    setTitles(Object.fromEntries((jt.data??[]).map(x=>[x.id,x.title])));setError(a.error?.message||j.error?.message||p.error?.message||'');}
  })();return()=>{active=false};
 },[session?.user.id]));
 return <Page><Text style={s.heading}>My work<Text style={{color:colors.violet}}>.</Text></Text>
  <Text style={s.muted}>Applications, live projects, and hiring—all in one place.</Text>
  <View style={{flexDirection:'row',gap:7}}>{[{k:'projects',t:'Projects'},{k:'applications',t:'Applied'},{k:'jobs',t:'Posted'}].map(x=>
   <Pressable key={x.k} onPress={()=>setView(x.k as any)} style={{flex:1,padding:12,borderRadius:15,backgroundColor:view===x.k?colors.violet:colors.soft,alignItems:'center'}}>
   <Text style={{color:view===x.k?'white':colors.violet,fontWeight:'800',fontSize:12}}>{x.t}</Text></Pressable>)}</View>
  {error?<Text style={{color:'#AE2D4F'}}>{error}</Text>:null}
  {view==='projects'?<>{projects.length?<>{projects.map(p=><Pressable key={p.id} onPress={()=>router.push({pathname:'/project/[id]',params:{id:p.id}})} style={s.card}>
    <View style={s.row}><Text style={[s.title,{flex:1}]}>{titles[p.job_id]||'Project workspace'}</Text><Text style={s.badge}>{p.status.replace('_',' ')}</Text></View>
    <Text style={s.muted}>Agreed budget · {rupees(p.agreed_budget_inr)}</Text><Text style={{color:colors.violet,fontWeight:'800'}}>Open workspace →</Text>
   </Pressable>)}</>:<Empty title="No project workspaces" detail="Once a client hires a freelancer, a secure workspace appears here."/>}
   <Button secondary title="Messages and conversations →" onPress={()=>router.push('/inbox')}/></>:
   view==='applications'?applications.length?applications.map(a=><View key={a.id} style={s.card}>
    <Text style={s.title}>{titles[a.job_id]||'Submitted application'}</Text><Text style={s.muted}>Applied {shortDate(a.created_at)}</Text><Text style={s.badge}>{a.status}</Text></View>):<Empty title="No applications" detail="Explore jobs to submit your first free proposal."/>:
   jobs.length?jobs.map(j=><View key={j.id} style={s.card}><View style={s.row}><Text style={[s.title,{flex:1}]}>{j.title}</Text><Text style={{color:colors.violet,fontWeight:'900'}}>{rupees(j.budget_inr)}</Text></View>
    <Text style={s.muted}>{j.status} · {j.category}</Text><Button secondary title="View applications →" onPress={()=>router.push({pathname:'/job/[id]',params:{id:j.id}})}/></View>):
   <Empty title="Nothing posted" detail="Create a job to find and hire freelance talent."/>}
  {view==='jobs'?<Button title="Post a new job" onPress={()=>router.push('/post-job')}/>:<Button secondary title="Explore jobs" onPress={()=>router.push('/(tabs)/explore')}/>}
 </Page>;
}
