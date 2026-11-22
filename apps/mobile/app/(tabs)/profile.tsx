import React,{useCallback,useState} from 'react';import {Alert,Image,Linking,Pressable,Switch,Text,View} from 'react-native';
import {router,useFocusEffect} from 'expo-router';import * as ImagePicker from 'expo-image-picker';import {File} from 'expo-file-system';
import Ionicons from '@expo/vector-icons/Ionicons';import {type Profile,colors} from '@gigbee/shared';
import {Brand,Button,Field,Page,s} from '../../components/ui';import {useAuth} from '../../context/AuthContext';import {supabase} from '../../lib/supabase';
export default function ProfileScreen(){
 const {session}=useAuth();const [profile,setProfile]=useState<Profile|null>(null);const [name,setName]=useState('');const [username,setUsername]=useState('');
 const [headline,setHeadline]=useState('');const [bio,setBio]=useState('');const [city,setCity]=useState('');const [website,setWebsite]=useState('');
 const [isPublic,setPublic]=useState(false);const [roles,setRoles]=useState<string[]>([]);const [busy,setBusy]=useState(false);
 useFocusEffect(useCallback(()=>{if(!supabase||!session)return;let active=true;Promise.all([
   supabase.from('profiles').select('*').eq('id',session.user.id).maybeSingle(),supabase.from('user_roles').select('role').eq('user_id',session.user.id)
 ]).then(([p,r])=>{if(!active)return;const v=(p.data as Profile|null)||null;setProfile(v);setName(v?.display_name||'');setUsername(v?.username||'');
 setHeadline(v?.headline||'');setBio(v?.bio||'');setCity(v?.city||'');setWebsite(v?.website||'');setPublic(v?.is_public||false);setRoles((r.data||[]).map(x=>x.role));});return()=>{active=false};},[session?.user.id]));
 async function save(){if(!supabase||!session)return;const handle=username.trim().toLowerCase();
  if(name.trim().length<2||handle&&!/^[a-z0-9_]{3,24}$/.test(handle)){Alert.alert('Check your profile','Name needs at least 2 characters; username must be 3–24 lowercase letters, numbers or underscores.');return;}
  if(isPublic&&!handle){Alert.alert('Public username needed','Choose a username first.');return;}
  if(website&&!website.trim().startsWith('https://')){Alert.alert('Website','Use a full HTTPS URL.');return;}
  setBusy(true);const {error}=await supabase.from('profiles').update({display_name:name.trim(),username:handle||null,headline:headline.trim(),bio:bio.trim(),
   city:city.trim(),website:website.trim(),is_public:isPublic}).eq('id',session.user.id);setBusy(false);
  if(error)Alert.alert('Save failed',error.message);else Alert.alert('Saved','Your public identity is updated.');
 }
 async function activate(role:string){if(!supabase||!session||roles.includes(role))return;const {error}=await supabase.from('user_roles').insert({user_id:session.user.id,role});
  if(error&&error.code!=='23505')Alert.alert('Unable to activate',error.message);else setRoles(r=>[...r,role]);}
 async function avatar(){if(!supabase||!session)return;const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:.75});
  if(result.canceled||!result.assets?.length)return;const asset=result.assets[0];const path=session.user.id+'/'+Date.now()+'.jpg';
  try{const bytes=await new File(asset.uri).arrayBuffer();const r=await supabase.storage.from('gigbee-avatars').upload(path,bytes,{contentType:'image/jpeg'});
   if(r.error)throw r.error;const p=await supabase.from('profiles').update({avatar_path:path}).eq('id',session.user.id);if(p.error)throw p.error;setProfile(prev=>prev?{...prev,avatar_path:path}:prev);
   if(profile?.avatar_path&&profile.avatar_path!==path){await supabase.storage.from('gigbee-avatars').remove([profile.avatar_path]);}
   Alert.alert('Photo updated','Your new photo is saved.');}
  catch(e){Alert.alert('Upload failed',String(e));}}
 const actions=[{icon:'images-outline',title:'My portfolio',path:'/portfolio'},
 {icon:'ribbon-outline',title:'Verified certificates',path:'/certificates'},
 {icon:'chatbubbles-outline',title:'Messages',path:'/inbox'},
 {icon:'notifications-outline',title:'Notifications',path:'/notifications'},
 {icon:'settings-outline',title:'Account settings & security',path:'/account-settings'},
 {icon:'options-outline',title:'Notification preferences',path:'/notification-settings'},
 {icon:'card-outline',title:'Payment activity',path:'/payment-activity'},
 {icon:'shield-outline',title:'Account & deletion request',path:'/delete-account'},
 {icon:'book-outline',title:'Creator Studio',path:'/studio'},
 {icon:'storefront-outline',title:'My freelance services',path:'/my-services'},
 {icon:'trophy-outline',title:'Rankings',path:'/rankings'},
 {icon:'bookmark-outline',title:'Saved jobs',path:'/saved'}];
 return <Page><Brand/><View style={{gap:4}}><Text style={s.heading}>Your identity<Text style={{color:colors.violet}}>.</Text></Text><Text style={s.muted}>{session?.user.email}</Text></View>
 <View style={[s.card,{backgroundColor:colors.navy,borderColor:colors.navy}]}><View style={{flexDirection:'row',alignItems:'center',gap:14}}>
  <View style={{backgroundColor:colors.yellow,height:56,width:56,borderRadius:18,alignItems:'center',justifyContent:'center',overflow:'hidden'}}>{profile?.avatar_path&&supabase?<Image source={{uri:supabase.storage.from('gigbee-avatars').getPublicUrl(profile.avatar_path).data.publicUrl}} style={{height:56,width:56}} accessibilityLabel="Your profile photo"/>:<Ionicons name="person" color={colors.navy} size={28}/>}</View>
  <View style={{flex:1}}><Text style={{color:'white',fontWeight:'900',fontSize:21}}>{name||'GigBee member'}</Text><Text style={{color:'#CBC7EB'}}>{headline||'Build your profile to stand out'}</Text></View></View>
  <Button title="Upload profile photo" onPress={avatar}/>
 </View>
 <Text style={s.title}>Your space</Text>{actions.map(x=><Pressable key={x.path} onPress={()=>router.push(x.path as any)} style={[s.card,s.row,{paddingVertical:14}]}>
  <View style={{flexDirection:'row',alignItems:'center',gap:14}}><Ionicons name={x.icon as any} color={colors.violet} size={22}/><Text style={{fontWeight:'800',color:colors.ink}}>{x.title}</Text></View>
  <Ionicons name="chevron-forward" size={20} color={colors.muted}/></Pressable>)}
 <Text style={s.title}>Account roles</Text><View style={s.card}><Text style={s.muted}>Your one account can work, learn, hire, and teach.</Text>
 {['freelancer','client','learner','creator'].map(role=><View style={s.row} key={role}><Text style={s.text}>{role.charAt(0).toUpperCase()+role.slice(1)}</Text>
  {roles.includes(role)?<Text style={s.badge}>Active</Text>:<Pressable onPress={()=>activate(role)}><Text style={{color:colors.violet,fontWeight:'900'}}>Enable →</Text></Pressable>}</View>)}</View>
 <Text style={s.title}>Public identity</Text>
 <Field label="Full name" value={name} onChangeText={setName} maxLength={100}/>
 <Field label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" maxLength={24} placeholder="your_name"/>
 <Field label="Headline" value={headline} onChangeText={setHeadline} maxLength={140} placeholder="Creative freelancer · Developer"/>
 <Field label="City" value={city} onChangeText={setCity} placeholder="Your city"/>
 <Field label="Website" value={website} onChangeText={setWebsite} keyboardType="url" autoCapitalize="none" placeholder="https://…"/>
 <Field label="About you" value={bio} onChangeText={setBio} multiline maxLength={2000}/>
 <View style={[s.card,s.row]}><View style={{flex:1}}><Text style={s.title}>Public profile</Text><Text style={s.muted}>Allow GigBee visitors to discover your identity and portfolio.</Text></View>
 <Switch value={isPublic} onValueChange={setPublic} trackColor={{true:colors.violet}}/></View>
 <Button title={busy?'Saving…':'Save profile'} onPress={save} disabled={!profile||busy}/>
 <Button title="Sign out this device" secondary onPress={async()=>{
   if(!supabase||!session||busy)return;
   setBusy(true);
   try{
    const key='gigbee.pushToken.'+session.user.id;
    const token=localStorage.getItem(key);
    if(token){
     const disabled=await supabase.from('push_devices').update({enabled:false}).eq('user_id',session.user.id).eq('expo_push_token',token);
     if(disabled.error)throw disabled.error;
    }
    const {error}=await supabase.auth.signOut({scope:'local'});
    if(error)throw error;
    localStorage.removeItem(key);
   }catch(error){Alert.alert('Unable to sign out',error instanceof Error?error.message:String(error));}
   finally{setBusy(false);}
  }}/>
 </Page>;
}
