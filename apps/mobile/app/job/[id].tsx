import React,{useCallback,useState} from 'react';
import {Alert,Pressable,Text,View} from 'react-native';
import {Redirect,router,useFocusEffect,useLocalSearchParams} from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import {type Job,type Profile,colors,rupees,shortDate} from '@gigbee/shared';
import {Button,Empty,ErrorText,Field,Page,s} from '../../components/ui';
import {useAuth} from '../../context/AuthContext';
import {supabase} from '../../lib/supabase';
type Applicant={id:string;freelancer_id:string;proposal:string;status:string;created_at:string};
export default function JobDetail(){
 const {id}=useLocalSearchParams<{id:string}>();const {session,loading}=useAuth();
 const [job,setJob]=useState<Job|null>(null);const [isLoading,setLoading]=useState(true);const [proposal,setProposal]=useState('');
 const [applications,setApplications]=useState<Applicant[]>([]);const [applicantProfiles,setApplicantProfiles]=useState<Record<string,Profile>>({});
 const [myApplication,setMyApplication]=useState(false);const [saved,setSaved]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const refresh=useCallback(async()=>{
  if(!supabase||!session||!id)return;
  setLoading(true);const j=await supabase.from('jobs').select('*').eq('id',id).maybeSingle();
  setJob((j.data as Job|null)??null);setError(j.error?.message??'');
  const sv=await supabase.from('saved_jobs').select('job_id').eq('job_id',id).eq('user_id',session.user.id).maybeSingle();setSaved(Boolean(sv.data));
  if(j.data?.client_id===session.user.id){
   const a=await supabase.from('applications').select('id,freelancer_id,proposal,status,created_at').eq('job_id',id).order('created_at',{ascending:false});
   const list=(a.data||[]) as Applicant[];setApplications(list);
   if(list.length){const p=await supabase.from('profiles').select('*').in('id',list.map(x=>x.freelancer_id));setApplicantProfiles(Object.fromEntries(((p.data||[]) as Profile[]).map(x=>[x.id,x])));}
  } else {const a=await supabase.from('applications').select('id').eq('job_id',id).eq('freelancer_id',session.user.id).limit(1);setMyApplication(Boolean(a.data?.length));}
  setLoading(false);
 },[id,session?.user.id]);
 useFocusEffect(useCallback(()=>{refresh()},[refresh]));
 if(!loading&&!session)return <Redirect href="/(auth)/login"/>;
 const owner=Boolean(job&&session&&job.client_id===session.user.id);
 async function apply(){
  if(!supabase||!job||!session)return;
  if(proposal.trim().length<30){Alert.alert('Complete your proposal','Write at least 30 characters describing your approach.');return;}
  setBusy(true);const {error:e}=await supabase.from('applications').insert({job_id:job.id,freelancer_id:session.user.id,proposal:proposal.trim()});setBusy(false);
  if(e)Alert.alert('Could not apply',e.code==='23505'?'You already applied.':e.message);else{setMyApplication(true);setProposal('');Alert.alert('Applied','Your application has been sent.');}
 }
 async function hire(a:Applicant){
  if(!supabase)return;setBusy(true);const {data,error:e}=await supabase.rpc('hire_applicant',{p_application:a.id});setBusy(false);
  if(e)Alert.alert('Unable to hire',e.message);else{Alert.alert('Freelancer hired','A secure project workspace was created.');router.replace({pathname:'/project/[id]',params:{id:String(data)}});}
 }
 async function closeJob(){if(!supabase||!job)return;const {error:e}=await supabase.from('jobs').update({status:'closed'}).eq('id',job.id);
  if(e)Alert.alert('Unable to close',e.message);else refresh();}
 async function toggleSave(){if(!supabase||!session||!job)return;const q=saved?await supabase.from('saved_jobs').delete().eq('job_id',job.id).eq('user_id',session.user.id):
  await supabase.from('saved_jobs').insert({job_id:job.id,user_id:session.user.id});if(q.error)Alert.alert('Save failed',q.error.message);else setSaved(!saved);}
 return <Page><Text onPress={()=>router.back()} style={{color:colors.violet,fontWeight:'800'}}>← Back</Text>
  <ErrorText message={error}/>{isLoading?<Text style={s.muted}>Loading project…</Text>:!job?<Empty title="Project unavailable" detail="This listing may be closed or unavailable."/>:<>
  <View style={s.row}><Text style={s.badge}>{job.category} · {job.status}</Text><Pressable onPress={toggleSave} accessibilityLabel="Save job"><Ionicons name={saved?'bookmark':'bookmark-outline'} color={colors.violet} size={25}/></Pressable></View>
  <Text style={s.heading}>{job.title}</Text><Text style={{fontSize:30,fontWeight:'900',color:colors.violet}}>{rupees(job.budget_inr)}</Text>
  <Text style={s.muted}>Fixed-price project · Posted {shortDate(job.created_at)}</Text>
  <View style={s.card}><Text style={s.title}>The project</Text><Text style={s.text}>{job.description}</Text></View>
  {owner?<><Text style={s.title}>Applications ({applications.length})</Text>
   {applications.length===0?<Empty title="No applications yet" detail="You'll see real proposals here as freelancers apply."/>:applications.map(a=>{
    const p=applicantProfiles[a.freelancer_id];return <View key={a.id} style={s.card}><View style={s.row}><Text style={s.title}>{p?.display_name||'GigBee freelancer'}</Text><Text style={s.badge}>{a.status}</Text></View>
     <Text style={s.muted}>{p?.headline||'No headline added'} · {shortDate(a.created_at)}</Text><Text style={s.text}>{a.proposal}</Text>
     <Button secondary title="View freelancer profile →" onPress={()=>router.push({pathname:'/freelancer/[id]',params:{id:a.freelancer_id}})}/>
     {job.status==='open'&&a.status==='submitted'?<Button title={busy?'Hiring…':'Hire this freelancer'} disabled={busy} onPress={()=>Alert.alert('Hire freelancer?','This will close the job and open a project workspace.',[
      {text:'Cancel',style:'cancel'},{text:'Hire',onPress:()=>hire(a)}])}/>:null}</View>;
   })}
   {job.status==='open'?<Button secondary title="Close applications" onPress={()=>Alert.alert('Close job?','No further applications will be accepted.',[{text:'Cancel'},{text:'Close',onPress:closeJob}])}/>:null}
  </>:job.status!=='open'?<Empty title="Applications closed" detail="This project is no longer accepting applications."/>:
    myApplication?<Empty title="Application sent" detail="The client has your proposal. Your application status appears in My Work."/>:
    <View style={s.card}><Text style={s.title}>Apply for free</Text><Text style={s.muted}>No paid bids, credits, or tokens.</Text>
     <Field label="Your proposal" value={proposal} onChangeText={setProposal} multiline maxLength={2000} placeholder="Introduce yourself, relevant skills, deliverables and timeline…"/>
     <Button title={busy?'Sending…':'Send application'} onPress={apply} disabled={busy}/></View>}
  <Button secondary title="Report this listing" onPress={()=>router.push({pathname:'/report',params:{job_id:job.id}})}/>
  </>}
 </Page>;
}
