import React,{useCallback,useState} from 'react';import {Alert,Pressable,Text,TextInput,View} from 'react-native';import {router,useFocusEffect} from 'expo-router';
import {categories,colors,rupees} from '@gigbee/shared';import {Button,Empty,Field,Page,s} from '../components/ui';
import {supabase} from '../lib/supabase';import {useAuth} from '../context/AuthContext';
type Service={id:string;freelancer_id:string;title:string;description:string;category:string;price_inr:number;delivery_days:number;status:string};
export default function Services(){const {session}=useAuth();const [services,setServices]=useState<Service[]>([]);const [query,setQuery]=useState('');const [requested,setRequested]=useState<string|null>(null);
 const [message,setMessage]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 useFocusEffect(useCallback(()=>{let a=true;supabase?.from('service_packages').select('*').eq('status','active').order('created_at',{ascending:false}).limit(100).then(({data,error:e})=>{if(a){setServices((data as Service[])||[]);setError(e?.message||'');}});return()=>{a=false};},[]));
 const shown=services.filter(s=>(s.title+' '+s.description+' '+s.category).toLowerCase().includes(query.toLowerCase()));
 async function request(service:Service){if(!supabase||!session)return;if(message.trim().length<10){Alert.alert('Add project details','Describe what you need in at least 10 characters.');return;}
 setBusy(true);const {error:e}=await supabase.rpc('request_service',{p_package:service.id,p_message:message.trim()});setBusy(false);
 if(e)Alert.alert('Unable to request',e.message);else{setRequested(null);setMessage('');Alert.alert('Request sent','The freelancer can accept it to create a project workspace.');}}
 return <Page><Text onPress={()=>router.back()} style={{color:colors.violet,fontWeight:'800'}}>← Back</Text><Text style={s.heading}>Explore services</Text><Text style={s.muted}>Hire a creative professional through a fixed-price package.</Text>
 <TextInput style={s.input} value={query} onChangeText={setQuery} placeholder="Search services…"/>
 <Button secondary title="Manage my packages & requests →" onPress={()=>router.push('/my-services')}/>
 {error?<Text style={{color:'#B42345'}}>{error}</Text>:shown.length?shown.map(service=><View key={service.id} style={s.card}>
  <Text style={s.badge}>{service.category}</Text><Text style={s.title}>{service.title}</Text><Text style={s.muted}>{service.description}</Text>
  <View style={s.row}><Text style={{color:colors.violet,fontSize:19,fontWeight:'900'}}>{rupees(service.price_inr)}</Text><Text style={s.muted}>{service.delivery_days} day delivery estimate</Text></View>
  {service.freelancer_id===session?.user.id?<Text style={s.badge}>Your package</Text>:requested===service.id?<>
   <Field label="Your requirements" value={message} onChangeText={setMessage} multiline maxLength={2000} placeholder="Describe the scope, style and expectations…"/>
   <Button title={busy?'Submitting…':'Send service request'} onPress={()=>request(service)} disabled={busy}/>
   <Button secondary title="Cancel" onPress={()=>setRequested(null)}/></>:<Button title="Request this service" onPress={()=>setRequested(service.id)}/>}</View>):<Empty title="No services yet" detail="Freelancers can create fixed-price packages. No invented listings will appear here."/>}
 </Page>;
}
