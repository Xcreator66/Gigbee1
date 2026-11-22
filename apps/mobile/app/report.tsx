import React,{useState} from 'react';import {Alert,Text} from 'react-native';import {router,useLocalSearchParams} from 'expo-router';
import {colors} from '@gigbee/shared';import {Button,Field,Page,s} from '../components/ui';import {supabase} from '../lib/supabase';import {useAuth} from '../context/AuthContext';
export default function Report(){const {job_id,subject_id}=useLocalSearchParams<{job_id?:string;subject_id?:string}>();const {session}=useAuth();const [reason,setReason]=useState('');const [busy,setBusy]=useState(false);
 async function submit(){if(!supabase||!session||reason.trim().length<10)return;setBusy(true);const {error}=await supabase.from('reports').insert({reporter_id:session.user.id,job_id:job_id||null,subject_id:subject_id||null,reason:reason.trim()});setBusy(false);
 if(error)Alert.alert('Unable to report',error.message);else{Alert.alert('Report submitted','Our moderators can review this report.');router.back();}}
 return <Page><Text onPress={()=>router.back()} style={{color:colors.violet,fontWeight:'900'}}>← Back</Text><Text style={s.heading}>Report a concern</Text>
 <Text style={s.muted}>Flag suspicious listings, abuse or misleading claims. Reports are sent to restricted moderators.</Text>
 <Field label="What happened?" value={reason} onChangeText={setReason} multiline maxLength={3000} placeholder="Describe the specific issue, including evidence if available…"/>
 <Button title={busy?'Submitting…':'Submit report'} disabled={busy||reason.trim().length<10} onPress={submit}/></Page>
}
