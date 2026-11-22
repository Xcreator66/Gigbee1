import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, Pressable, Text, TextInput, View} from 'react-native';
import {router, useFocusEffect} from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import {type Job, colors, categories} from '@gigbee/shared';
import {Button, Empty, JobCard, Page, s} from '../../components/ui';
import {supabase} from '../../lib/supabase';

const PAGE_SIZE = 20;
const cleanSearch = (value:string) => value.trim().slice(0,64)
  .replace(/[^a-zA-Z0-9\u0900-\u097F\u0A00-\u0A7F\s-]/g,' ').trim();

export default function Explore() {
 const [items,setItems]=useState<Job[]>([]);
 const [query,setQuery]=useState('');
 const [debounced,setDebounced]=useState('');
 const [category,setCategory]=useState('All');
 const [pages,setPages]=useState(1);
 const [total,setTotal]=useState(0);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [revision,setRevision]=useState(0);

 useEffect(()=>{const timer=setTimeout(()=>setDebounced(cleanSearch(query)),300);return()=>clearTimeout(timer);},[query]);
 function changeCategory(next:string){setCategory(next);setPages(1);}
 function changeQuery(next:string){setQuery(next);setPages(1);}

 useFocusEffect(useCallback(()=>{
  let active=true;
  if(!supabase){setLoading(false);setError('Connect the dedicated GigBee database to load live opportunities.');setItems([]);return()=>{active=false};}
  setLoading(true);setError('');
  (async()=>{
   let request=supabase.from('jobs').select('*',{count:'exact'}).eq('status','open');
   if(category!=='All')request=request.eq('category',category);
   if(debounced)request=request.or('title.ilike.%'+debounced+'%,description.ilike.%'+debounced+'%');
   const {data,count,error:e}=await request.order('created_at',{ascending:false}).order('id',{ascending:false}).range(0,pages*PAGE_SIZE-1);
   if(!active)return;
   setLoading(false);
   if(e){setError('Could not load opportunities: '+e.message);setItems([]);setTotal(0);}
   else {setItems((data as Job[])||[]);setTotal(count??0);}
  })().catch(e=>{if(active){setLoading(false);setItems([]);setTotal(0);setError('Connection failed. '+String(e));}});
  return()=>{active=false};
 },[category,debounced,pages,revision]));

 return <Page>
  <View style={s.row}><View style={{flex:1}}><Text style={s.heading}>Explore gigs<Text style={{color:colors.violet}}>.</Text></Text>
   <Text style={s.muted}>Real opportunities. Applications are free.</Text></View>
   <Pressable accessibilityRole="button" accessibilityLabel="Saved opportunities" onPress={()=>router.push('/saved')} style={{padding:10,borderRadius:14,backgroundColor:colors.soft}}>
    <Ionicons name="bookmark-outline" color={colors.violet} size={23}/>
   </Pressable></View>
  <TextInput style={s.input} accessibilityLabel="Search jobs" placeholder="Search project titles or descriptions…" placeholderTextColor="#9CA2B7"
   value={query} onChangeText={changeQuery} autoCapitalize="none" returnKeyType="search"/>
  <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
   {['All',...categories].map(c=><Pressable accessibilityRole="button" accessibilityState={{selected:category===c}} onPress={()=>changeCategory(c)} key={c}
    style={{backgroundColor:category===c?colors.violet:'white',borderWidth:1,borderColor:category===c?colors.violet:colors.border,paddingVertical:9,paddingHorizontal:12,borderRadius:12}}>
    <Text style={{color:category===c?'white':colors.ink,fontWeight:'800',fontSize:12}}>{c}</Text>
   </Pressable>)}
  </View>
  <View style={s.row}><Text style={s.title}>Available opportunities</Text>
   <Text style={s.muted}>{loading?'Searching…':total+' available'}</Text></View>
  {loading&&<View style={{paddingVertical:12}}><ActivityIndicator color={colors.violet}/></View>}
  {error?<View style={s.card}><Text style={{color:'#AE2D45'}}>{error}</Text>
    <Button secondary title="Try loading again" onPress={()=>setRevision(n=>n+1)}/></View>:null}
  {!loading&&!error&&items.length===0?<Empty title="No matching projects" detail="Try another search or category. GigBee only shows genuine published jobs."/>:null}
  {items.map(j=><JobCard key={j.id} job={j} onPress={()=>router.push({pathname:'/job/[id]',params:{id:j.id}})}/>)}
  {items.length<total&&!error?<Button secondary title={loading?'Loading…':'Load more jobs ('+items.length+' of '+total+')'} disabled={loading} onPress={()=>setPages(n=>n+1)}/>:null}
  <Button secondary title="Need a freelancer? Post a project" onPress={()=>router.push('/post-job')}/>
 </Page>;
}
