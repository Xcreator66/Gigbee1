import React,{useState} from 'react';
import {Alert,Pressable,Text,View} from 'react-native';
import {Redirect,router} from 'expo-router';
import {categories,colors} from '@gigbee/shared';
import {Button,Field,Page,s} from '../components/ui';
import {useAuth} from '../context/AuthContext';
import {supabase} from '../lib/supabase';
export default function PostJob(){
  const {session,loading}=useAuth();
  const [title,setTitle]=useState('');const [description,setDescription]=useState('');
  const [category,setCategory]=useState<string>('Video Editing');const [budget,setBudget]=useState('');const [busy,setBusy]=useState(false);
  if(!loading&&!session)return <Redirect href="/(auth)/login"/>;
  async function publish(){
    if(!supabase||!session)return;
    const rupees=Number(budget);
    if(title.trim().length<8||description.trim().length<60||!Number.isInteger(rupees)||rupees<100||rupees>10000000){
      Alert.alert('Please complete project details','Title needs 8+ characters, description 60+ characters and budget between ₹100 and ₹1 crore.');return;
    }
    setBusy(true);
    // A user can be a freelancer and a client with the SAME identity.
    const {data:roles,error:readErr}=await supabase.from('user_roles').select('role').eq('user_id',session.user.id).eq('role','client');
    if(readErr){setBusy(false);Alert.alert('Cannot check account',readErr.message);return;}
    if(!roles?.length){
      const {error:roleErr}=await supabase.from('user_roles').insert({user_id:session.user.id,role:'client'});
      if(roleErr && roleErr.code!=='23505'){setBusy(false);Alert.alert('Unable to activate client mode',roleErr.message);return;}
    }
    const {data,error}=await supabase.from('jobs').insert({client_id:session.user.id,title:title.trim(),
      description:description.trim(),category,budget_inr:rupees,status:'open'}).select('id').single();
    setBusy(false);
    if(error)Alert.alert('Could not publish',error.message);
    else if(data){Alert.alert('Job published','Your project is now visible on GigBee.');router.replace({pathname:'/job/[id]',params:{id:data.id}});}
  }
  return <Page><Text onPress={()=>router.back()} style={{color:colors.violet,fontWeight:'800'}}>← Back</Text>
    <Text style={s.heading}>Post a project.</Text>
    <Text style={s.muted}>Clear scope helps talented freelancers give better proposals. Posting is free in V1.</Text>
    <Field label="Project title" value={title} onChangeText={setTitle} placeholder="Edit 5 social media reels" maxLength={120}/>
    <Text style={s.label}>Category</Text>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:9}}>{categories.map(c=><Pressable key={c} onPress={()=>setCategory(c)} style={{backgroundColor:c===category?colors.violet:'#F0EDFF',paddingVertical:10,paddingHorizontal:13,borderRadius:20}}>
      <Text style={{color:c===category?'white':colors.violet,fontWeight:'700'}}>{c}</Text></Pressable>)}</View>
    <Field label="Fixed budget in INR" value={budget} onChangeText={setBudget} keyboardType="numeric" placeholder="2500"/>
    <Field label="Project requirements (60+ characters)" value={description} onChangeText={setDescription} multiline maxLength={6000}
      placeholder="Explain deliverables, references, timeline, editing style, and what success looks like."/>
    <Button title={busy?'Publishing…':'Publish job'} onPress={publish} disabled={busy||!session}/>
    <Text style={s.muted}>GigBee V1 doesn't process payments or hold escrow. Arrange no paid work through this prototype until approved payment and dispute flows are launched.</Text>
  </Page>;
}
