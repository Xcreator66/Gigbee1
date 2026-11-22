import React,{useCallback,useState} from 'react';
import {Text,View,Pressable} from 'react-native';
import {router,useFocusEffect} from 'expo-router';
import {colors,rupees,shortDate} from '@gigbee/shared';
import {Empty,Page,s} from '../components/ui';
import {supabase} from '../lib/supabase';
import {useAuth} from '../context/AuthContext';
type Entry={project_id:string;project_title:string;role:'client'|'freelancer';agreed_budget_inr:number;payment_status:string;recorded_provider_status:string;created_at:string};
export default function PaymentActivity(){
 const {session}=useAuth();const [data,setData]=useState<Entry[]>([]);const [error,setError]=useState('');
 const [filter,setFilter]=useState<'all'|'client'|'freelancer'>('all');
 useFocusEffect(useCallback(()=>{if(!supabase||!session)return;let active=true;
  supabase.rpc('my_gigbee_payment_activity').then(({data,error})=>{
   if(!active)return;setData((data as Entry[])||[]);setError(error?.message||'');});
  return()=>{active=false};
 },[session?.user.id]));
 const shown=data.filter(x=>filter==='all'||x.role===filter);
 return <Page>
  <Text onPress={()=>router.back()} style={{color:colors.violet,fontWeight:'800'}}>← Profile</Text>
  <Text style={s.heading}>Payment activity<Text style={{color:colors.violet}}>.</Text></Text>
  <View style={[s.card,{backgroundColor:colors.navy,borderColor:colors.navy,padding:22}]}>
   <Text style={{color:colors.yellow,fontSize:11,fontWeight:'900',letterSpacing:1}}>TRANSACTION VISIBILITY</Text>
   <Text style={{color:'white',fontSize:24,fontWeight:'900'}}>Know the payment status.</Text>
   <Text style={{color:'#D9D6EF',lineHeight:21}}>Project budgets are not your wallet balance. A captured payment does not mean the freelancer has received a payout.</Text>
  </View>
  <View style={[s.row,{gap:7}]}>{(['all','client','freelancer'] as const).map(value=><Pressable key={value} onPress={()=>setFilter(value)}
   style={{flex:1,padding:12,borderRadius:14,alignItems:'center',backgroundColor:value===filter?colors.violet:colors.soft}}>
   <Text style={{fontSize:12,fontWeight:'800',color:value===filter?'white':colors.violet}}>{value==='all'?'All':value==='client'?'Hiring':'Freelancing'}</Text>
  </Pressable>)}</View>
  {error?<Text style={{color:'#C43E56'}}>{error}</Text>:null}
  {!shown.length?<Empty title="No payment activity yet" detail="When you hire or are hired, the project payment status will appear here."/>:
   shown.map(x=><Pressable key={x.project_id} onPress={()=>router.push({pathname:'/project/[id]',params:{id:x.project_id}})} style={s.card}>
    <View style={s.row}><Text style={[s.title,{flex:1}]}>{x.project_title}</Text><Text style={{color:colors.violet,fontWeight:'900'}}>{rupees(x.agreed_budget_inr)}</Text></View>
    <Text style={s.muted}>{x.role==='client'?'You are the hiring client':'You are the freelancer'} · {shortDate(x.created_at)}</Text>
    <Text style={s.badge}>Payment: {x.payment_status.replaceAll('_',' ')}</Text>
    <Text style={s.muted}>Provider record: {x.recorded_provider_status.replaceAll('_',' ')}</Text>
    <Text style={{fontSize:12,fontWeight:'800',color:colors.violet}}>Open project →</Text>
   </Pressable>)}
  <Text style={s.muted}>This is a read-only summary, not a tax invoice, escrow statement, or evidence of freelancer settlement. Actual refunds and payouts require approved payment-provider operations.</Text>
 </Page>;
}
