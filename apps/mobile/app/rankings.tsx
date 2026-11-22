import React,{useCallback,useState} from 'react';import {Pressable,Text,View} from 'react-native';import {router,useFocusEffect} from 'expo-router';
import {colors} from '@gigbee/shared';import {Empty,Page,s} from '../components/ui';import {supabase} from '../lib/supabase';
type Rank={id:string;display_name:string;username:string|null;headline:string;completed_jobs:number;average_rating:number|null;tier:string};
export default function Rankings(){const [list,setList]=useState<Rank[]>([]);const [error,setError]=useState('');
 useFocusEffect(useCallback(()=>{let active=true;supabase?.from('freelancer_rankings').select('*').order('completed_jobs',{ascending:false}).limit(100)
 .then(({data,error:e})=>{if(active){setList((data as Rank[])||[]);setError(e?.message||'');}});return()=>{active=false};},[]));
 return <Page><Text onPress={()=>router.back()} style={{color:colors.violet,fontWeight:'900'}}>← Back</Text><Text style={s.heading}>GigBee rankings</Text>
 <Text style={s.muted}>Transparent levels based on client-approved projects, not bought credits.</Text>
 <View style={[s.card,{backgroundColor:colors.navy,borderColor:colors.navy}]}><Text style={{color:'white',fontWeight:'900',fontSize:18}}>Beginner → Intermediate → Expert</Text>
 <Text style={{color:'#DCD8FF'}}>Beginner: 0–4 completed jobs · Intermediate: 5–19 · Expert: 20+</Text></View>
 {error?<Text style={{color:'#A82E49'}}>{error}</Text>:list.length?list.map((r,i)=><Pressable key={r.id} onPress={()=>router.push({pathname:'/freelancer/[id]',params:{id:r.id}})} style={[s.card,s.row]}>
 <View style={{width:36,height:36,borderRadius:12,backgroundColor:colors.soft,alignItems:'center',justifyContent:'center'}}><Text style={{fontWeight:'900',color:colors.violet}}>{i+1}</Text></View>
 <View style={{flex:1}}><Text style={s.title}>{r.display_name}</Text><Text style={s.muted}>{r.headline||r.tier}</Text>
 <Text style={s.muted}>{r.completed_jobs} completed · {r.average_rating??'No rating'} ★</Text></View><Text style={s.badge}>{r.tier}</Text></Pressable>):
 <Empty title="No rankings yet" detail="Only real approved project completions can appear on the leaderboard."/>}</Page>;
}
