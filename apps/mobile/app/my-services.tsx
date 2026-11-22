import React,{useCallback,useState} from 'react';
import {Alert,Text,View} from 'react-native';
import {router,useFocusEffect} from 'expo-router';
import {categories,colors,rupees} from '@gigbee/shared';
import {Button,Empty,Field,Page,s} from '../components/ui';
import {useAuth} from '../context/AuthContext';
import {supabase} from '../lib/supabase';

type Service={id:string;title:string;status:string;price_inr:number};
type Request={
 id:string;package_id:string;client_id:string;status:string;message:string;
 project_id:string|null;quoted_price_inr:number|null;quoted_title:string|null;
};
export default function MyServices(){
 const {session}=useAuth();
 const [services,setServices]=useState<Service[]>([]);
 const [incoming,setIncoming]=useState<Request[]>([]);
 const [outgoing,setOutgoing]=useState<Request[]>([]);
 const [title,setTitle]=useState('');const [description,setDescription]=useState('');
 const [category,setCategory]=useState<(typeof categories)[number]>('Design');const [price,setPrice]=useState('');
 const [days,setDays]=useState('7');const [busy,setBusy]=useState(false);const [error,setError]=useState('');

 const refresh=useCallback(async()=>{
  if(!supabase||!session)return;
  const [servicesResult,incomingResult,outgoingResult]=await Promise.all([
   supabase.from('service_packages').select('id,title,status,price_inr')
    .eq('freelancer_id',session.user.id).order('created_at',{ascending:false}),
   supabase.from('service_requests').select('id,package_id,client_id,status,message,project_id,quoted_price_inr,quoted_title')
    .eq('freelancer_id',session.user.id).order('created_at',{ascending:false}),
   supabase.from('service_requests').select('id,package_id,client_id,status,message,project_id,quoted_price_inr,quoted_title')
    .eq('client_id',session.user.id).order('created_at',{ascending:false}),
  ]);
  setServices((servicesResult.data as Service[])||[]);
  setIncoming((incomingResult.data as Request[])||[]);
  setOutgoing((outgoingResult.data as Request[])||[]);
  setError(servicesResult.error?.message||incomingResult.error?.message||outgoingResult.error?.message||'');
 },[session?.user.id]);
 useFocusEffect(useCallback(()=>{refresh()},[refresh]));
 async function create(){
  if(!supabase||!session||busy)return;
  const amount=Number(price),duration=Number(days);
  if(title.trim().length<8||description.trim().length<60||
     !Number.isSafeInteger(amount)||amount<100||amount>10000000||
     !Number.isSafeInteger(duration)||duration<1||duration>365||
     !categories.includes(category)){
   Alert.alert('Check service details','Title: 8+ characters; description: 60+; price: ₹100–₹1 crore; delivery: 1–365 whole days.');
   return;
  }
  setBusy(true);
  try{
   const {error}=await supabase.from('service_packages').insert({
    freelancer_id:session.user.id,title:title.trim(),description:description.trim(),
    category,price_inr:amount,delivery_days:duration,
   });
   if(error)throw error;
   setTitle('');setDescription('');setPrice('');
   await refresh();Alert.alert('Service published','Your service is now available to clients.');
  }catch(e){Alert.alert('Unable to publish',e instanceof Error?e.message:String(e));}
  finally{setBusy(false);}
 }
 async function toggle(item:Service){
  if(!supabase||!session||busy)return;setBusy(true);
  const next=item.status==='active'?'paused':'active';
  const {error}=await supabase.from('service_packages').update({status:next})
    .eq('id',item.id).eq('freelancer_id',session.user.id);
  setBusy(false);
  if(error)Alert.alert('Unable to update service',error.message);else refresh();
 }
 async function respond(item:Request,accept:boolean){
  if(!supabase||busy)return;
  setBusy(true);
  const {data,error}=await supabase.rpc('respond_service_request',{
   p_request:item.id,p_accept:accept,
  });
  setBusy(false);
  if(error)Alert.alert('Unable to respond',error.message);
  else{await refresh();if(data)router.push({pathname:'/project/[id]',params:{id:String(data)}});}
 }
 const requestCard=(r:Request,isIncoming:boolean)=><View key={r.id} style={s.card}>
  <View style={s.row}><Text style={[s.title,{flex:1}]}>{r.quoted_title||'Service request'}</Text>
   <Text style={s.badge}>{r.status}</Text></View>
  {r.quoted_price_inr!=null?<Text style={s.muted}>Original quote: {rupees(r.quoted_price_inr)}</Text>:null}
  <Text style={s.text}>{r.message}</Text>
  {isIncoming&&r.status==='pending'?<>
   <Button title={busy?'Working…':'Accept and open workspace'} disabled={busy}
    onPress={()=>Alert.alert('Accept service request?','This creates a project at the original agreed quote.',[
     {text:'Cancel',style:'cancel'},{text:'Accept',onPress:()=>respond(r,true)}])}/>
   <Button secondary title="Decline request" disabled={busy}
    onPress={()=>Alert.alert('Decline this request?','The client will be notified.',[
     {text:'Cancel',style:'cancel'},{text:'Decline',onPress:()=>respond(r,false)}])}/>
  </>:r.project_id?<Button secondary title="Open project workspace" onPress={()=>router.push({pathname:'/project/[id]',params:{id:r.project_id!}})}/>:
   <Text style={s.muted}>{isIncoming?'No project was created.':'The freelancer has not accepted this request yet.'}</Text>}
 </View>;
 return <Page>
  <Text onPress={()=>router.back()} style={{color:colors.violet,fontWeight:'800'}}>← Back</Text>
  <Text style={s.heading}>Service studio</Text>
  <Text style={s.muted}>Your fixed-price services, clients and requests in one place.</Text>
  {error?<View style={s.card}><Text style={{color:'#AE2D4F'}}>{error}</Text>
   <Button secondary title="Retry loading" onPress={refresh}/></View>:null}
  <View style={s.card}><Text style={s.title}>Create a service package</Text>
   <Field label="Title" value={title} onChangeText={setTitle} maxLength={120}/>
   <Field label="Deliverables (60+ characters)" value={description} onChangeText={setDescription} multiline maxLength={6000}/>
   <Text style={s.label}>Category</Text>
   <View style={{flexDirection:'row',gap:7,flexWrap:'wrap'}}>{categories.map(c=>
    <Text key={c} onPress={()=>setCategory(c)} style={{fontWeight:'700',color:category===c?'white':colors.violet,
      backgroundColor:category===c?colors.violet:colors.soft,padding:10,borderRadius:13}}>{c}</Text>)}</View>
   <Field label="Price (INR)" value={price} onChangeText={setPrice} keyboardType="numeric"/>
   <Field label="Estimated delivery in days" value={days} onChangeText={setDays} keyboardType="numeric"/>
   <Button title={busy?'Publishing…':'Publish service'} disabled={busy} onPress={create}/>
  </View>
  <Text style={s.title}>Your packages ({services.length})</Text>
  {services.length?services.map(x=><View key={x.id} style={s.card}>
   <Text style={s.title}>{x.title}</Text>
   <Text style={s.muted}>{rupees(x.price_inr)} · {x.status}</Text>
   <Button secondary title={x.status==='active'?'Pause new requests':'Reactivate service'}
    disabled={busy} onPress={()=>toggle(x)}/>
  </View>):<Empty title="No packages yet" detail="Publish a fixed-price service to receive requests."/>}
  <Text style={s.title}>Incoming requests ({incoming.length})</Text>
  {incoming.length?incoming.map(r=>requestCard(r,true)):
   <Text style={s.muted}>No incoming client requests yet.</Text>}
  <Text style={s.title}>Your requests to freelancers ({outgoing.length})</Text>
  {outgoing.length?outgoing.map(r=>requestCard(r,false)):
   <Empty title="No requests sent" detail="Browse services to request your first package."/>}
  <Button secondary title="Explore services" onPress={()=>router.push('/services')}/>
 </Page>;
}
