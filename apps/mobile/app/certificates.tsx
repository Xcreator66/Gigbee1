import React,{useCallback,useState} from 'react';import {Linking,Text,View} from 'react-native';import {router,useFocusEffect} from 'expo-router';
import {type Certificate,colors,shortDate} from '@gigbee/shared';import {Button,Empty,Page,s} from '../components/ui';import {supabase} from '../lib/supabase';import {useAuth} from '../context/AuthContext';
export default function Certificates(){const {session}=useAuth();const [list,setList]=useState<Certificate[]>([]);
 useFocusEffect(useCallback(()=>{if(!supabase||!session)return;let alive=true;supabase.from('certificates').select('*').eq('owner_id',session.user.id).order('issued_at',{ascending:false}).then(({data})=>{if(alive)setList((data as Certificate[])||[])});return()=>{alive=false};},[session?.user.id]));
 const site=process.env.EXPO_PUBLIC_SITE_URL||'';
 return <Page><Text onPress={()=>router.back()} style={{color:colors.violet,fontWeight:'800'}}>← Back</Text><Text style={s.heading}>Verified credentials</Text>
 <Text style={s.muted}>Issued only after completed work is approved or a course assessment is passed.</Text>
 {list.length?list.map(c=><View key={c.id} style={s.card}><Text style={s.badge}>{c.kind==='work'?'CLIENT-APPROVED WORK':'COURSE ASSESSMENT'}</Text>
  <Text style={s.title}>{c.title}</Text><Text style={s.muted}>Issued {shortDate(c.issued_at)} · {c.revoked_at?'Revoked':'Active'}</Text>
  <Text selectable style={{fontSize:11,color:colors.muted}}>Verification code: {c.code}</Text>
  {site?<Button secondary title="Open public verification" onPress={()=>Linking.openURL(site.replace(/\/$/,'')+'/verify/'+c.code)}/>:null}
  </View>):<Empty title="No credentials yet" detail="Complete approved projects or pass course assessments to earn real records."/>}
 </Page>;
}
