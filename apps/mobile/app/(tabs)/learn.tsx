import React,{useCallback,useEffect,useState} from 'react';
import {ActivityIndicator,Pressable,Text,TextInput,View} from 'react-native';
import {router,useFocusEffect} from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import {type Course,colors,categories} from '@gigbee/shared';
import {Button,Empty,Page,s} from '../../components/ui';
import {supabase} from '../../lib/supabase';

const PAGE_SIZE=20;
const clean=(value:string)=>value.trim().slice(0,64).replace(/[^a-zA-Z0-9\u0900-\u097F\u0A00-\u0A7F\s-]/g,' ').trim();
export default function Learn(){
 const [items,setItems]=useState<Course[]>([]);
 const [query,setQuery]=useState('');
 const [search,setSearch]=useState('');
 const [category,setCategory]=useState('All');
 const [page,setPage]=useState(1);
 const [total,setTotal]=useState(0);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [revision,setRevision]=useState(0);
 useEffect(()=>{const timer=setTimeout(()=>setSearch(clean(query)),300);return()=>clearTimeout(timer);},[query]);
 useFocusEffect(useCallback(()=>{
  let active=true;
  if(!supabase){setLoading(false);setItems([]);setError('GigBee database is not configured.');return()=>{active=false};}
  setLoading(true);setError('');
  (async()=>{
   let q=supabase.from('courses').select('*',{count:'exact'}).eq('status','published');
   if(category!=='All')q=q.eq('category',category);
   if(search)q=q.or('title.ilike.%'+search+'%,description.ilike.%'+search+'%');
   const r=await q.order('created_at',{ascending:false}).order('id',{ascending:false}).range(0,page*PAGE_SIZE-1);
   if(!active)return;
   setLoading(false);
   if(r.error){setError('Unable to load courses: '+r.error.message);setItems([]);setTotal(0);}
   else{setItems((r.data as Course[])||[]);setTotal(r.count??0);}
  })().catch(e=>{if(active){setLoading(false);setError('Connection failed: '+String(e));setItems([]);}});
  return()=>{active=false};
 },[category,search,page,revision]));
 const changeQuery=(v:string)=>{setQuery(v);setPage(1);};
 return <Page>
  <Text style={s.heading}>Learn & grow<Text style={{color:colors.violet}}>.</Text></Text>
  <Text style={s.muted}>Real free courses, lessons and scored assessments.</Text>
  <View style={{backgroundColor:colors.navy,borderRadius:25,padding:22,gap:12}}>
   <Ionicons name="school" size={34} color={colors.yellow}/>
   <Text style={{color:'white',fontWeight:'900',fontSize:22}}>Your career, your pace.</Text>
   <Text style={{color:'#D5D7F1'}}>Learn at your pace and earn an assessment-based record when you pass.</Text>
   <Button title="Create or manage courses →" onPress={()=>router.push('/studio')}/>
  </View>
  <TextInput accessibilityLabel="Search courses" style={s.input} value={query}
   onChangeText={changeQuery} autoCapitalize="none" placeholder="Search courses and skills…"
   placeholderTextColor="#A2A8B8"/>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
   {['All',...categories].map(c=><Pressable key={c} accessibilityRole="button"
    accessibilityState={{selected:c===category}} onPress={()=>{setCategory(c);setPage(1);}}
    style={{padding:9,borderRadius:13,backgroundColor:category===c?colors.violet:colors.soft}}>
    <Text style={{color:category===c?'white':colors.violet,fontSize:12,fontWeight:'800'}}>{c}</Text>
   </Pressable>)}
  </View>
  <View style={s.row}><Text style={s.title}>Available courses</Text>
   <Text style={s.muted}>{loading?'Searching…':total+' found'}</Text></View>
  {loading?<ActivityIndicator color={colors.violet}/>:null}
  {error?<View style={s.card}><Text style={{color:'#AE2D4F'}}>{error}</Text>
   <Button title="Retry loading" secondary onPress={()=>setRevision(x=>x+1)}/></View>:null}
  {!loading&&!error&&!items.length?<Empty title="No matching courses" detail="Try another topic or category. Creator-published courses appear here."/>:null}
  {items.map(c=><Pressable key={c.id} accessibilityRole="button"
   onPress={()=>router.push({pathname:'/course/[id]',params:{id:c.id}})} style={s.card}>
   <View style={[s.row,{justifyContent:'flex-start'}]}>
    <View style={{width:51,height:51,backgroundColor:colors.soft,borderRadius:17,alignItems:'center',justifyContent:'center'}}>
     <Ionicons name="book" color={colors.violet} size={24}/>
    </View><Text style={s.badge}>{c.category}</Text>
   </View>
   <Text style={s.title}>{c.title}</Text>
   <Text style={s.muted} numberOfLines={2}>{c.description}</Text>
   <View style={s.row}><Text style={{color:colors.violet,fontWeight:'900'}}>FREE</Text>
    <Text style={{color:colors.violet,fontWeight:'800'}}>Start learning →</Text></View>
  </Pressable>)}
  {!error&&items.length<total?<Button title={loading?'Loading…':'Load more courses ('+items.length+'/'+total+')'}
   secondary disabled={loading} onPress={()=>setPage(n=>n+1)}/>:null}
 </Page>;
}
