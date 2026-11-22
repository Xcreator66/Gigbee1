import React,{useCallback,useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {router,useFocusEffect} from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import {type Job,type Profile,colors} from '@gigbee/shared';
import {Brand,Button,Empty,FadeIn,JobCard,Page,s,SectionHeading} from '../../components/ui';
import {supabase} from '../../lib/supabase';
import {useAuth} from '../../context/AuthContext';
export default function Home(){
 const {session}=useAuth();const [profile,setProfile]=useState<Profile|null>(null);const [jobs,setJobs]=useState<Job[]>([]);const [apps,setApps]=useState(0);
 const [projects,setProjects]=useState(0);const [unread,setUnread]=useState(0);
 useFocusEffect(useCallback(()=>{
  if(!supabase||!session)return;let alive=true;
  (async()=>{const [p,j,a,pr,n]=await Promise.all([
   supabase.from('profiles').select('*').eq('id',session.user.id).maybeSingle(),
   supabase.from('jobs').select('*').eq('status','open').order('created_at',{ascending:false}).limit(3),
   supabase.from('applications').select('id',{count:'exact',head:true}).eq('freelancer_id',session.user.id),
   supabase.from('projects').select('id',{count:'exact',head:true}).or(`client_id.eq.${session.user.id},freelancer_id.eq.${session.user.id}`).in('status',['active','delivered','revision_requested','disputed']),
   supabase.from('notifications').select('id',{count:'exact',head:true}).eq('user_id',session.user.id).eq('is_read',false)
  ]);if(alive){setProfile((p.data as Profile|null)??null);setJobs((j.data as Job[])??[]);setApps(a.count??0);setProjects(pr.count??0);setUnread(n.count??0);}})();
  return()=>{alive=false};
 },[session?.user.id]));
 return <Page><View style={s.row}><Brand subtitle="Learn. Work. Grow."/>
 <Pressable accessibilityLabel="Notifications" onPress={()=>router.push('/notifications')} style={{padding:10,backgroundColor:'#EEEAFE',borderRadius:15}}><Ionicons name="notifications-outline" color={colors.violet} size={23}/>{unread>0&&<View style={{position:'absolute',right:7,top:6,width:9,height:9,borderRadius:5,backgroundColor:colors.yellow}}/>}</Pressable></View>
 <FadeIn><View style={{paddingTop:8,gap:6}}><Text style={{color:colors.violet,fontWeight:'900',fontSize:11,letterSpacing:2}}>YOUR SPACE</Text>
 <Text style={s.heading}>Hey, {profile?.display_name?.split(' ')[0]||'creator'} <Text style={{color:colors.violet}}>✦</Text></Text>
 <Text style={s.muted}>Your next opportunity starts here.</Text></View></FadeIn>
 <View style={{backgroundColor:colors.navy,borderRadius:28,padding:24,gap:16,overflow:'hidden'}}>
  <View style={{position:'absolute',height:178,width:178,borderRadius:90,backgroundColor:'#45329A',top:-85,right:-45}}/><View style={{position:'absolute',height:86,width:86,borderRadius:43,backgroundColor:colors.yellow,top:36,right:-42}}/>
  <Text style={{color:colors.yellow,fontWeight:'800',fontSize:11,letterSpacing:1.4}}>CREATE YOUR NEXT CHAPTER</Text>
  <Text style={{color:'#FFFFFF',fontWeight:'900',fontSize:28,letterSpacing:-1.2,lineHeight:33}}>Learn skills.{ '\n'}Land gigs.{ '\n'}Build proof.</Text>
  <Text style={{color:'#D2D2F0',fontSize:13,lineHeight:20,maxWidth:260}}>Apply for free, collaborate with clients, and grow a verified work portfolio.</Text>
  <Button title="Explore opportunities →" onPress={()=>router.push('/(tabs)/explore')}/>
 </View>
 <View style={{flexDirection:'row',gap:10}}>{[{label:'Applications',value:apps,icon:'paper-plane-outline'},{label:'Active projects',value:projects,icon:'briefcase-outline'}].map(item=><View key={item.label} style={[s.card,{flex:1,backgroundColor:colors.soft,borderColor:colors.soft}]}>
 <Ionicons name={item.icon as any} color={colors.violet} size={20}/><Text style={{fontSize:27,fontWeight:'900',color:colors.navy}}>{item.value}</Text><Text style={s.muted}>{item.label}</Text></View>)}</View>
 <SectionHeading title="Just posted" action="See all" onPress={()=>router.push('/(tabs)/explore')}/>
 {jobs.length?jobs.map(j=><JobCard key={j.id} job={j} onPress={()=>router.push({pathname:'/job/[id]',params:{id:j.id}})}/>):<Empty title="No gigs posted yet" detail="Jobs will appear here when clients publish them."/>}
 <SectionHeading title="Keep growing"/>
 <View style={[s.card,{flexDirection:'row',alignItems:'center',backgroundColor:'#FFF6DE'}]}><Ionicons name="school" size={31} color="#B78403"/><View style={{flex:1}}><Text style={s.title}>GigBee Academy</Text><Text style={s.muted}>Learn at your pace. Earn certificates from assessments.</Text></View></View>
 <Button secondary title="Explore courses →" onPress={()=>router.push('/(tabs)/learn')}/>
 <Button secondary title="Hire a freelancer →" onPress={()=>router.push('/post-job')}/>
 <Button secondary title="Browse fixed-price services →" onPress={()=>router.push('/services')}/>
 </Page>;
}
