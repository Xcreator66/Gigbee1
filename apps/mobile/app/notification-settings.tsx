import React,{useCallback,useState} from 'react';
import {Alert,Platform,Switch,Text,View} from 'react-native';
import {router,useFocusEffect} from 'expo-router';
import Constants from 'expo-constants';
import {colors} from '@gigbee/shared';
import {Button,Page,s} from '../components/ui';
import {supabase} from '../lib/supabase';
import {useAuth} from '../context/AuthContext';

/** Push/email notifications are OPT-IN. In-app notifications remain available regardless. */
export default function NotificationSettings(){
 const {session}=useAuth();
 const [push,setPush]=useState(false);const [email,setEmail]=useState(false);
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 useFocusEffect(useCallback(()=>{
   if(!supabase||!session)return;
   let active=true;
   supabase.from('notification_preferences').select('push_enabled,email_enabled').eq('user_id',session.user.id)
     .maybeSingle().then(({data,error})=>{if(!active)return;if(error)setMessage(error.message);
       else {setPush(Boolean(data?.push_enabled));setEmail(Boolean(data?.email_enabled));}});
   return ()=>{active=false};
 },[session?.user.id]));
 /** Update only the preference being changed: never reset consent from another device. */
 async function save(patch:{push_enabled?:boolean;email_enabled?:boolean}){
  if(!supabase||!session)return false;
  const updated_at=new Date().toISOString();
  const existing=await supabase.from('notification_preferences').update({...patch,updated_at})
    .eq('user_id',session.user.id).select('user_id');
  let error=existing.error;
  if(!error&&!existing.data?.length){
   const insert=await supabase.from('notification_preferences').insert({user_id:session.user.id,...patch});
   error=insert.error;
   if(error?.code==='23505'){
    const retry=await supabase.from('notification_preferences').update({...patch,updated_at}).eq('user_id',session.user.id);
    error=retry.error;
   }
  }
  if(error){Alert.alert('Unable to save',error.message);return false;}
  if(patch.push_enabled!==undefined)setPush(patch.push_enabled);
  if(patch.email_enabled!==undefined)setEmail(patch.email_enabled);
  return true;
 }
 async function updateEmail(next:boolean){if(busy)return;setBusy(true);setMessage('');
  try{
   const saved=await save({email_enabled:next});
   if(saved)setMessage(next?'Email preferences saved. Delivery requires an active configured sender.':'Email alerts disabled. In-app updates remain available.');
  }catch(e){Alert.alert('Unable to save preferences',e instanceof Error?e.message:String(e));}
  finally{setBusy(false);}
 }
 async function updatePush(next:boolean){
  if(!supabase||!session||busy)return;
  setBusy(true);setMessage('');
  try{
   if(!next){
    const saved=await save({push_enabled:false});
    if(!saved)return; // Stop dispatch before unregistering any device.
    const r=await supabase.from('push_devices').update({enabled:false}).eq('user_id',session.user.id);
    if(r.error)throw r.error;
    localStorage.removeItem('gigbee.pushToken.'+session.user.id);
    setMessage('Device alerts disabled. In-app notifications still work.');return;
   }
   const Device=await import('expo-device');
   if(!Device.isDevice)throw new Error('Push notifications require a physical device and a configured development or production build.');
   const Notifications=await import('expo-notifications');
   if(Platform.OS==='android'){
    await Notifications.setNotificationChannelAsync('gigbee-updates',{
      name:'GigBee updates',importance:Notifications.AndroidImportance.DEFAULT,
    });
   }
   let {status}=await Notifications.getPermissionsAsync();
   if(status!=='granted')({status}=await Notifications.requestPermissionsAsync());
   if(status!=='granted')throw new Error('Notification permission was not granted.');
   const projectId=(Constants.easConfig?.projectId||Constants.expoConfig?.extra?.eas?.projectId) as string|undefined;
   if(!projectId)throw new Error('Push requires an EAS project ID. Run eas init and create a development build first.');
   const token=(await Notifications.getExpoPushTokenAsync({projectId})).data;
   const r=await supabase.from('push_devices').upsert({
    user_id:session.user.id,expo_push_token:token,platform:Platform.OS,enabled:true,
    updated_at:new Date().toISOString(),
   },{onConflict:'user_id,expo_push_token'});
   if(r.error)throw r.error;
   localStorage.setItem('gigbee.pushToken.'+session.user.id,token);
   const saved=await save({push_enabled:true});
   if(saved)setMessage('Device registered. Push delivery requires the server dispatcher and platform credentials.');
  }catch(e){Alert.alert('Push notifications unavailable',e instanceof Error?e.message:String(e));}
  finally{setBusy(false);}
 }
 return <Page>
  <Text onPress={()=>router.back()} style={{color:colors.violet,fontWeight:'800'}}>← Profile</Text>
  <Text style={s.heading}>Notification settings<Text style={{color:colors.violet}}>.</Text></Text>
  <Text style={s.muted}>Choose how GigBee contacts you. Your private project updates always appear in the app.</Text>
  <View style={[s.card,s.row]}>
    <View style={{flex:1,gap:5}}><Text style={s.title}>Device push alerts</Text><Text style={s.muted}>Hiring, messages, delivery and account updates.</Text></View>
    <Switch disabled={busy} value={push} onValueChange={updatePush} trackColor={{true:colors.violet}}/>
  </View>
  <View style={[s.card,s.row]}>
    <View style={{flex:1,gap:5}}><Text style={s.title}>Email notifications</Text><Text style={s.muted}>Receive selected updates at your registered email address.</Text></View>
    <Switch disabled={busy} value={email} onValueChange={updateEmail} trackColor={{true:colors.violet}}/>
  </View>
  {message?<View style={s.card}><Text style={s.muted}>{message}</Text></View>:null}
  <Text style={s.muted}>Push requires an Expo development/production build with valid EAS project and FCM/APNs credentials. Email requires an approved sender and a configured delivery worker. Notifications are never used to claim that money has been paid out.</Text>
  <Button secondary title="Open in-app notifications" onPress={()=>router.push('/notifications')}/>
 </Page>;
}
