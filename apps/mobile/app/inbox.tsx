import React,{useCallback,useState} from 'react';
import {Text,Pressable,View} from 'react-native';
import {router,useFocusEffect} from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import {type Project,colors,rupees} from '@gigbee/shared';
import {Button,Empty,Page,s} from '../components/ui';
import {supabase} from '../lib/supabase';
import {useAuth} from '../context/AuthContext';

export default function Inbox(){
 const {session}=useAuth();
 const [items,setItems]=useState<Project[]>([]);
 const [titles,setTitles]=useState<Record<string,string>>({});
 const [error,setError]=useState('');
 const [revision,setRevision]=useState(0);
 useFocusEffect(useCallback(()=>{
  if(!supabase||!session)return;
  let active=true;
  (async()=>{
   const p=await supabase.from('projects').select('*').or(
    'client_id.eq.'+session.user.id+',freelancer_id.eq.'+session.user.id)
    .order('created_at',{ascending:false}).limit(200);
   if(p.error){if(active){setError(p.error.message);setItems([]);}return;}
   const projects=(p.data as Project[])||[];
   const ids=[...new Set(projects.map(x=>x.job_id))];
   const jobs=ids.length?await supabase.from('jobs').select('id,title').in('id',ids):{data:[],error:null};
   if(active){setItems(projects);setTitles(Object.fromEntries((jobs.data||[]).map(x=>[x.id,x.title])));
    setError(jobs.error?.message||'');}
  })().catch(e=>{if(active)setError(String(e));});
  return()=>{active=false};
 },[session?.user.id,revision]));
 return <Page>
  <Text onPress={()=>router.back()} style={{color:colors.violet,fontWeight:'800'}}>← Back</Text>
  <Text style={s.heading}>Messages</Text>
  <Text style={s.muted}>Your private conversations are linked to hired projects.</Text>
  {error?<View style={s.card}><Text style={{color:'#AE2D4F'}}>{error}</Text>
   <Button secondary title="Retry" onPress={()=>setRevision(x=>x+1)}/></View>:null}
  {items.length?items.map(x=><Pressable accessibilityRole="button" accessibilityLabel={'Open chat for '+(titles[x.job_id]||'project')}
   onPress={()=>router.push({pathname:'/chat/[id]',params:{id:x.id}})} key={x.id} style={[s.card,s.row]}>
   <View style={{height:48,width:48,borderRadius:16,backgroundColor:colors.soft,alignItems:'center',justifyContent:'center'}}>
    <Ionicons name="chatbubble-ellipses" size={22} color={colors.violet}/>
   </View>
   <View style={{flex:1}}><Text style={s.title}>{titles[x.job_id]||'Project '+x.id.slice(0,8)}</Text>
    <Text style={s.muted}>{rupees(x.agreed_budget_inr)} · {x.status}</Text></View>
   <Ionicons name="chevron-forward" color={colors.violet} size={20}/>
  </Pressable>):!error?<Empty title="No conversations yet" detail="Once a client hires a freelancer, their private project chat appears here."/>:null}
 </Page>;
}
