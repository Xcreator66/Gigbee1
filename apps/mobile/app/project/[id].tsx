import React,{useCallback,useState} from 'react';
import {Alert,Linking,Pressable,Text,View} from 'react-native';
import {Redirect,router,useFocusEffect,useLocalSearchParams} from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import {File} from 'expo-file-system';
import {type Project,type Deliverable,type Job,colors,rupees,shortDate} from '@gigbee/shared';
import {Button,Empty,ErrorText,Field,Page,s,SectionHeading} from '../../components/ui';
import {useAuth} from '../../context/AuthContext';import {supabase} from '../../lib/supabase';
type Review={id:string;reviewer_id:string;rating:number;comment:string};
export default function ProjectWorkspace(){
 const {id}=useLocalSearchParams<{id:string}>();const {session,loading}=useAuth();const [p,setP]=useState<Project|null>(null);const [job,setJob]=useState<Job|null>(null);
 const [deliverables,setDeliverables]=useState<Deliverable[]>([]);const [reviews,setReviews]=useState<Review[]>([]);
 const [note,setNote]=useState('');const [file,setFile]=useState<{uri:string;name:string;type:string}|null>(null);
 const [reviewText,setReviewText]=useState('');const [rating,setRating]=useState(5);const [dispute,setDispute]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const refresh=useCallback(async()=>{if(!supabase||!id)return;
  const [pr,d,r]=await Promise.all([supabase.from('projects').select('*').eq('id',id).maybeSingle(),
   supabase.from('deliverables').select('*').eq('project_id',id).order('created_at',{ascending:false}),
   supabase.from('reviews').select('id,reviewer_id,rating,comment').eq('project_id',id)]);
  setP((pr.data as Project|null)||null);setDeliverables((d.data as Deliverable[])||[]);setReviews((r.data as Review[])||[]);setError(pr.error?.message||d.error?.message||'');
  if(pr.data){const j=await supabase.from('jobs').select('*').eq('id',pr.data.job_id).maybeSingle();setJob((j.data as Job|null)||null);}
 },[id]);useFocusEffect(useCallback(()=>{refresh()},[refresh]));
 if(!loading&&!session)return <Redirect href="/(auth)/login"/>;
 const client=Boolean(p&&session?.user.id===p.client_id);
 async function call(name:string,args:Record<string,unknown>,message:string){if(!supabase)return;setBusy(true);const {error:e}=await supabase.rpc(name,args);setBusy(false);
  if(e)Alert.alert('Unable to continue',e.message);else{Alert.alert('Updated',message);refresh();}}
 async function chooseFile(){const r=await DocumentPicker.getDocumentAsync({copyToCacheDirectory:true});if(r.canceled||!r.assets?.length)return;
  const f=r.assets[0];if((f.size||0)>25*1024*1024){Alert.alert('File too large','Maximum 25 MB.');return;}setFile({uri:f.uri,name:f.name,type:f.mimeType||'application/octet-stream'});}
 async function deliver(){if(!supabase||!session||!p)return;if(note.trim().length<10){Alert.alert('Add delivery notes','Describe the completed work in at least 10 characters.');return;}
  setBusy(true);let path:string|null=null;
  if(file){try{path=session.user.id+'/'+p.id+'/'+Date.now()+'-'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_');const bytes=await new File(file.uri).arrayBuffer();const up=await supabase.storage.from('gigbee-files').upload(path,bytes,{contentType:file.type});if(up.error)throw up.error;}
   catch(e){setBusy(false);Alert.alert('Upload failed',String(e));return;}}
  const {error:e}=await supabase.rpc('submit_deliverable',{p_project:p.id,p_note:note.trim(),p_file:path});
  if(e&&path){await supabase.storage.from('gigbee-files').remove([path]);}
  setBusy(false);
  if(e)Alert.alert('Delivery failed',e.message);else{setNote('');setFile(null);refresh();Alert.alert('Sent','Your client has been notified.');}
 }
 async function getFile(path:string){if(!supabase)return;const {data,error:e}=await supabase.storage.from('gigbee-files').createSignedUrl(path,300);if(e||!data)Alert.alert('File unavailable',e?.message||'Try again');else Linking.openURL(data.signedUrl);}
 async function payment(){if(!supabase||!p)return;setBusy(true);
  const {data,error:e}=await supabase.functions.invoke('create-payment-link',{body:{project_id:p.id}});setBusy(false);
  if(e||!data?.url){Alert.alert('Payment unavailable',data?.error||e?.message||'Merchant integration not enabled');return;}
  Linking.openURL(data.url);
 }
 return <Page><Text onPress={()=>router.back()} style={{color:colors.violet,fontWeight:'800'}}>← My work</Text>
  <Text style={s.heading}>Project workspace</Text><ErrorText message={error}/>
  {!p?<Empty title="Project unavailable" detail="Only hired participants can access a private workspace."/>:<>
  <View style={[s.card,{backgroundColor:colors.navy,borderColor:colors.navy}]}><Text style={{color:colors.yellow,fontWeight:'900',fontSize:11,letterSpacing:1}}>ACTIVE COLLABORATION</Text>
   <Text style={{color:'white',fontSize:23,fontWeight:'900'}}>{job?.title||'Project'}</Text>
   <Text style={{color:'#D8D6EF'}}>{rupees(p.agreed_budget_inr)} · Started {shortDate(p.created_at)}</Text>
   <View style={s.row}><Text style={{color:'white'}}>Status: {p.status.replace('_',' ')}</Text><Text style={{color:colors.yellow}}>Payment: {p.payment_status}</Text></View>
   <Button title="Open project conversation →" onPress={()=>router.push({pathname:'/chat/[id]',params:{id:p.id}})}/>
  </View>
  <View style={s.card}><Text style={s.title}>Payment status</Text><Text style={s.muted}>GigBee does not hold escrow. If enabled, payment is collected by an approved merchant provider. Freelancer settlement is arranged under the provider's terms.</Text>
   {client&&p.payment_status==='unpaid'?<Button secondary title={busy?'Please wait…':'Request secure payment link'} disabled={busy} onPress={payment}/>:null}
   <Text style={s.badge}>{p.payment_status}</Text>
  </View>
  <SectionHeading title="Deliverables"/>
  {deliverables.length===0?<Empty title="No submissions yet" detail="The freelancer can submit work here for client approval."/>:
    deliverables.map(d=><View key={d.id} style={s.card}><View style={s.row}><Text style={s.badge}>{d.status.replace('_',' ')}</Text><Text style={s.muted}>{shortDate(d.created_at)}</Text></View>
     <Text style={s.text}>{d.note}</Text>{d.file_path?<Button secondary title="View attached file" onPress={()=>getFile(d.file_path!)}/>:null}
     {client&&p.status==='delivered'&&d.status==='submitted'?<View style={{gap:8}}><Button title={busy?'Please wait…':'Approve delivery'} disabled={busy}
      onPress={()=>Alert.alert('Approve work?','This completes the project and issues a client-approved work record. Payment status remains separately recorded.',[{text:'Cancel'},{text:'Approve',onPress:()=>call('review_deliverable',{p_deliverable:d.id,p_accept:true},'Project completed.')}])}/>
      <Button secondary title="Request revision" disabled={busy} onPress={()=>call('review_deliverable',{p_deliverable:d.id,p_accept:false},'Freelancer can resubmit.')} /></View>:null}</View>)}
  {!client&&['active','revision_requested'].includes(p.status)?<View style={s.card}><Text style={s.title}>Submit finished work</Text>
    <Field label="Delivery note" value={note} onChangeText={setNote} multiline placeholder="What did you complete? What should the client review?" maxLength={5000}/>
    <Button secondary title={file?'Attached: '+file.name:'Attach a file (optional, max 25 MB)'} onPress={chooseFile}/>
    <Button title={busy?'Submitting…':'Submit for approval'} disabled={busy} onPress={deliver}/></View>:null}
  {p.status==='completed'?<View style={s.card}><Text style={s.title}>Review your collaborator</Text>
   {reviews.some(r=>r.reviewer_id===session?.user.id)?<Text style={s.muted}>You already reviewed this project.</Text>:<>
    <View style={{flexDirection:'row',gap:8}}>{[1,2,3,4,5].map(v=><Pressable key={v} onPress={()=>setRating(v)} style={{backgroundColor:v<=rating?colors.yellow:colors.soft,padding:10,borderRadius:10}}><Text style={{fontWeight:'900'}}>{v}★</Text></Pressable>)}</View>
    <Field label="Review (optional)" value={reviewText} onChangeText={setReviewText} multiline maxLength={1000}/>
    <Button title="Publish verified project review" disabled={busy} onPress={()=>call('leave_review',{p_project:p.id,p_rating:rating,p_comment:reviewText.trim()},'Review published.')}/></>}
   </View>:null}
  {!['completed','disputed','cancelled'].includes(p.status)?<View style={s.card}><Text style={s.title}>Need help?</Text><Text style={s.muted}>Open a dispute if the terms or delivery have a serious issue.</Text>
    <Field label="Explain the issue" value={dispute} onChangeText={setDispute} multiline maxLength={3000}/>
    <Button secondary title="Open dispute" disabled={busy||dispute.trim().length<15} onPress={()=>Alert.alert('Open dispute?','This flags the project for moderation.',[{text:'Cancel'},{text:'Submit',onPress:()=>call('open_dispute',{p_project:p.id,p_reason:dispute.trim()},'Dispute recorded.')}])}/></View>:null}
  </>}
 </Page>;
}
