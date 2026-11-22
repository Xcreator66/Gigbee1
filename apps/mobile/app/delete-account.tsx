import React,{useCallback,useState} from 'react';
import {Alert,Text,View} from 'react-native';
import {router,useFocusEffect} from 'expo-router';
import {colors,shortDate} from '@gigbee/shared';
import {Button,Field,Page,s} from '../components/ui';
import {supabase} from '../lib/supabase';
import {useAuth} from '../context/AuthContext';
type Request={status:string;created_at:string};
export default function DeleteAccount(){
 const {session}=useAuth();const [note,setNote]=useState('');const [request,setRequest]=useState<Request|null>(null);const [busy,setBusy]=useState(false);
 useFocusEffect(useCallback(()=>{if(!supabase||!session)return;
  supabase.from('account_deletion_requests').select('status,created_at').eq('user_id',session.user.id).maybeSingle()
   .then(({data})=>setRequest((data as Request|null)||null));
 },[session?.user.id]));
 async function submit(){if(!supabase||!session||busy)return;setBusy(true);
  const {error}=await supabase.from('account_deletion_requests').insert({user_id:session.user.id,note:note.trim()});setBusy(false);
  if(error){Alert.alert('Could not submit request',error.message);return;}
  setRequest({status:'requested',created_at:new Date().toISOString()});setNote('');
  Alert.alert('Request submitted','GigBee support will review the request and applicable data-retention obligations. Your account has not been deleted.');
 }
 return <Page>
  <Text onPress={()=>router.back()} style={{color:colors.violet,fontWeight:'800'}}>← Profile</Text>
  <Text style={s.heading}>Account deletion<Text style={{color:colors.violet}}>.</Text></Text>
  <View style={s.card}><Text style={s.title}>Your account and information</Text>
   <Text style={s.muted}>You can request deletion of your GigBee account. The request is reviewed before deletion, including open contracts, financial record retention, disputes and legally required information.</Text>
   <Text style={s.muted}>This form submits a deletion request; it does not immediately delete your account or data.</Text>
  </View>
  {request?<View style={[s.card,{backgroundColor:colors.soft}]}><Text style={s.title}>Request: {request.status}</Text>
   <Text style={s.muted}>Submitted {shortDate(request.created_at)}. For further assistance, contact GigBee support through the official website.</Text></View>:
   <View style={s.card}><Field label="Optional explanation" value={note} onChangeText={setNote} multiline maxLength={1000}
    placeholder="Anything you want support to know?"/>
    <Button danger title={busy?'Submitting…':'Request account deletion'} disabled={busy}
      onPress={()=>Alert.alert('Submit deletion request?','This starts a review process; it does not delete your account instantly.',[
       {text:'Cancel',style:'cancel'},{text:'Request deletion',style:'destructive',onPress:submit}])}/></View>}
 </Page>;
}
