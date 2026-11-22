import React,{useCallback,useState} from 'react';import {Pressable,Text,View} from 'react-native';
import {router,useFocusEffect} from 'expo-router';import Ionicons from '@expo/vector-icons/Ionicons';
import {type Notification,colors,shortDate} from '@gigbee/shared';import {Empty,Page,s} from '../components/ui';
import {supabase} from '../lib/supabase';import {useAuth} from '../context/AuthContext';
export default function Notifications(){const {session}=useAuth();const [items,setItems]=useState<Notification[]>([]);
 const refresh=useCallback(()=>{if(!supabase||!session)return;supabase.from('notifications').select('*').eq('user_id',session.user.id).order('created_at',{ascending:false}).limit(100).then(({data})=>setItems((data as Notification[])||[]));},[session?.user.id]);
 useFocusEffect(useCallback(()=>{refresh()},[refresh]));
 async function open(n:Notification){if(!supabase)return;await supabase.from('notifications').update({is_read:true}).eq('id',n.id);refresh();
  if(n.href?.startsWith('/project/'))router.push({pathname:'/project/[id]',params:{id:n.href.split('/').pop()!}});else if(n.href==='/my-services')router.push('/my-services');}
 return <Page><Text onPress={()=>router.back()} style={{color:colors.violet,fontWeight:'800'}}>← Back</Text><Text style={s.heading}>Notifications</Text>
 {items.length?items.map(n=><Pressable key={n.id} onPress={()=>open(n)} style={[s.card,{backgroundColor:n.is_read?'#FFFFFF':'#F2EDFF'}]}>
  <View style={s.row}><Text style={[s.title,{flex:1}]}>{n.title}</Text>{!n.is_read?<Ionicons name="ellipse" color={colors.violet} size={10}/>:null}</View>
  <Text style={s.muted}>{n.body}</Text><Text style={s.muted}>{shortDate(n.created_at)}</Text></Pressable>):<Empty title="You're up to date" detail="Important project and account updates appear here."/>}
 </Page>;
}
