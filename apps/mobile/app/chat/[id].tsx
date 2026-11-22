import React,{useCallback,useEffect,useRef,useState} from 'react';
import {FlatList,KeyboardAvoidingView,Platform,Pressable,Text,TextInput,View} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import {type Message,colors} from '@gigbee/shared';
import {useAuth} from '../../context/AuthContext';
import {supabase} from '../../lib/supabase';
import {s} from '../../components/ui';

const PAGE_SIZE=100;
export default function Chat(){
 const {id}=useLocalSearchParams<{id:string}>();
 const {session}=useAuth();
 const [messages,setMessages]=useState<Message[]>([]);
 const [total,setTotal]=useState(0);
 const [limit,setLimit]=useState(PAGE_SIZE);
 const [text,setText]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const list=useRef<FlatList<Message>>(null);
 const preserveScroll=useRef(false);
 const refresh=useCallback(async()=>{
  if(!supabase||!id)return;
  const result=await supabase.from('messages')
   .select('*',{count:'exact'}).eq('project_id',id)
   .order('created_at',{ascending:false}).order('id',{ascending:false}).limit(limit);
  if(result.error){setError(result.error.message);return;}
  setMessages(((result.data as Message[])||[]).slice().reverse());
  setTotal(result.count??0);setError('');
 },[id,limit]);

 useEffect(()=>{
  refresh();
  if(!supabase||!id)return;
  const ch=supabase.channel('project-chat:'+id)
   .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'project_id=eq.'+id},()=>refresh())
   .subscribe();
  return()=>{supabase?.removeChannel(ch)};
 },[id,refresh]);
 useEffect(()=>{setLimit(PAGE_SIZE);setMessages([]);setTotal(0);},[id]);
 async function send(){
  if(!supabase||!session||!id||!text.trim()||busy)return;
  setBusy(true);
  const {error:e}=await supabase.from('messages').insert({project_id:id,sender_id:session.user.id,body:text.trim()});
  setBusy(false);
  if(e)setError(e.message);
  else{setText('');await refresh();}
 }
 const hasMore=messages.length<total;
 return <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={{flex:1,backgroundColor:colors.background}}>
  <View style={{backgroundColor:colors.navy,paddingTop:58,paddingBottom:17,paddingHorizontal:20,
   flexDirection:'row',alignItems:'center',gap:12}}>
   <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={()=>router.back()}>
    <Ionicons name="arrow-back" color="white" size={24}/></Pressable>
   <View><Text style={{color:'white',fontWeight:'900',fontSize:18}}>Project conversation</Text>
    <Text style={{color:'#CED0ED',fontSize:12}}>Private to hired participants</Text></View>
  </View>
  {error?<Text accessibilityRole="alert" style={{color:'#B42345',padding:12}}>{error}</Text>:null}
  <FlatList ref={list} style={{flex:1}} data={messages} keyExtractor={x=>x.id}
   contentContainerStyle={{padding:16,gap:10}}
   onContentSizeChange={()=>{if(preserveScroll.current){preserveScroll.current=false;return;}list.current?.scrollToEnd({animated:true})}}
   ListHeaderComponent={hasMore?<Pressable accessibilityRole="button" onPress={()=>{
    preserveScroll.current=true;setLimit(n=>n+PAGE_SIZE);
   }} style={{padding:14,alignItems:'center',backgroundColor:colors.soft,borderRadius:15}}>
    <Text style={{color:colors.violet,fontWeight:'800'}}>Load earlier messages ({messages.length} of {total})</Text>
   </Pressable>:undefined}
   ListEmptyComponent={<View style={[s.card,{marginTop:24}]}><Text style={s.title}>Start the conversation</Text>
    <Text style={s.muted}>Discuss the project, share questions and review updates here.</Text></View>}
   renderItem={({item})=>{
    const mine=item.sender_id===session?.user.id;
    return <View style={{alignSelf:mine?'flex-end':'flex-start',backgroundColor:mine?colors.violet:'white',
     maxWidth:'83%',padding:13,borderRadius:17,borderBottomRightRadius:mine?4:17,borderBottomLeftRadius:mine?17:4}}>
     <Text style={{color:mine?'white':colors.ink,fontSize:14,lineHeight:20}}>{item.body}</Text>
     <Text style={{color:mine?'#DCD5FF':colors.muted,fontSize:10,marginTop:5,textAlign:'right'}}>
      {new Date(item.created_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
     </Text>
    </View>;
   }}/>
  <View style={{flexDirection:'row',alignItems:'center',gap:10,padding:12,backgroundColor:'white'}}>
   <TextInput accessibilityLabel="Project message" style={[s.input,{flex:1,maxHeight:125}]} multiline
    maxLength={3000} value={text} onChangeText={setText} placeholder="Write about the project…"
    placeholderTextColor="#9BA1B2"/>
   <Pressable accessibilityRole="button" accessibilityLabel="Send message" accessibilityState={{disabled:!text.trim()||busy}}
    onPress={send} disabled={!text.trim()||busy} style={{width:47,height:47,borderRadius:16,
     alignItems:'center',justifyContent:'center',backgroundColor:colors.violet,opacity:busy?.5:1}}>
    <Ionicons name="send" size={22} color="white"/></Pressable>
  </View>
 </KeyboardAvoidingView>;
}
