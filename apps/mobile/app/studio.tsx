import React,{useCallback,useEffect,useState} from 'react';
import {Alert,Pressable,Text,View} from 'react-native';
import {router,useFocusEffect} from 'expo-router';
import {type Course,colors,categories} from '@gigbee/shared';
import {Button,Empty,Field,Page,s} from '../components/ui';
import {supabase} from '../lib/supabase';
import {useAuth} from '../context/AuthContext';

export default function Studio(){
 const {session}=useAuth();
 const [courses,setCourses]=useState<Course[]>([]);
 const [selected,setSelected]=useState<Course|null>(null);
 const [title,setTitle]=useState('');
 const [description,setDescription]=useState('');
 const [category,setCategory]=useState('Design');
 const [lessonTitle,setLessonTitle]=useState('');
 const [lessonText,setLessonText]=useState('');
 const [video,setVideo]=useState('');
 const [question,setQuestion]=useState('');
 const [options,setOptions]=useState(['','','','']);
 const [correct,setCorrect]=useState(0);
 const [lessonCount,setLessonCount]=useState(0);
 const [questionCount,setQuestionCount]=useState(0);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');

 const refresh=useCallback(async()=>{
  if(!supabase||!session)return;
  const result=await supabase.from('courses').select('*').eq('creator_id',session.user.id)
    .order('created_at',{ascending:false});
  if(result.error)setError(result.error.message);
  else {setCourses((result.data as Course[])||[]);setError('');}
 },[session?.user.id]);
 useFocusEffect(useCallback(()=>{refresh()},[refresh]));

 const selectedId=selected?.id;
 const loadCounts=useCallback(async()=>{
  if(!supabase||!selectedId){setLessonCount(0);setQuestionCount(0);return;}
  const [l,q]=await Promise.all([
   supabase.from('lessons').select('id',{count:'exact',head:true}).eq('course_id',selectedId),
   supabase.from('quiz_questions').select('id',{count:'exact',head:true}).eq('course_id',selectedId),
  ]);
  if(l.error||q.error)setError(l.error?.message||q.error?.message||'Could not inspect course contents');
  else {setLessonCount(l.count??0);setQuestionCount(q.count??0);}
 },[selectedId]);
 useEffect(()=>{loadCounts()},[loadCounts]);
 const editable=selected?.status==='draft';

 async function create(){
  if(!supabase||!session||busy)return;
  if(title.trim().length<5){Alert.alert('Add a title','Use at least five characters.');return;}
  if(description.trim().length<30){Alert.alert('Add a description','Describe the learning outcome in at least 30 characters.');return;}
  setBusy(true);
  try{
   const role=await supabase.from('user_roles').insert({user_id:session.user.id,role:'creator'});
   if(role.error&&role.error.code!=='23505')throw role.error;
   const {data,error}=await supabase.from('courses').insert({
    creator_id:session.user.id,title:title.trim(),description:description.trim(),category,price_inr:0,
   }).select('*').single();
   if(error)throw error;
   setTitle('');setDescription('');setSelected(data as Course);await refresh();
  }catch(e){Alert.alert('Unable to create course',e instanceof Error?e.message:String(e));}
  finally{setBusy(false);}
 }
 async function lesson(){
  if(!supabase||!selected||!editable||busy)return;
  if(lessonTitle.trim().length<3||lessonText.trim().length<20){Alert.alert('Complete the lesson','Enter a title and at least 20 characters of educational content.');return;}
  if(video.trim()&&!/^https:\/\//i.test(video.trim())){Alert.alert('Invalid video link','Only HTTPS video links are supported.');return;}
  setBusy(true);
  try{
   const last=await supabase.from('lessons').select('position').eq('course_id',selected.id).order('position',{ascending:false}).limit(1);
   if(last.error)throw last.error;
   const position=(last.data?.[0]?.position??-1)+1;
   const {error}=await supabase.from('lessons').insert({course_id:selected.id,title:lessonTitle.trim(),
    content:lessonText.trim(),video_url:video.trim()||null,position});
   if(error)throw error;
   setLessonTitle('');setLessonText('');setVideo('');await loadCounts();
   Alert.alert('Saved','The lesson was added to this draft course.');
  }catch(e){Alert.alert('Unable to add lesson',e instanceof Error?e.message:String(e));}
  finally{setBusy(false);}
 }
 async function addQuiz(){
  if(!supabase||!selected||!editable||busy)return;
  if(question.trim().length<8||options.some(x=>!x.trim()||x.trim().length>500)){
   Alert.alert('Complete the assessment','Use a question of 8+ characters and four nonempty options.');return;
  }
  setBusy(true);
  try{
   // A single RPC creates the question and confidential answer key atomically.
   const {error}=await supabase.rpc('add_gigbee_quiz_question',{
    p_course:selected.id,p_question:question.trim(),p_options:options.map(x=>x.trim()),p_correct_index:correct,
   });
   if(error)throw error;
   setQuestion('');setOptions(['','','','']);setCorrect(0);
   await loadCounts();Alert.alert('Question saved','Question and answer key were stored together.');
  }catch(e){Alert.alert('Unable to add question',e instanceof Error?e.message:String(e));}
  finally{setBusy(false);}
 }
 async function publish(){
  if(!supabase||!selected||!editable||busy)return;
  if(lessonCount<1||questionCount<1){Alert.alert('Course not ready','Add at least one lesson and one complete assessment question before publishing.');return;}
  setBusy(true);
  const {data,error}=await supabase.from('courses').update({status:'published'})
    .eq('id',selected.id).eq('creator_id',session?.user.id).select('*').single();
  setBusy(false);
  if(error)Alert.alert('Unable to publish',error.message);
  else{setSelected(data as Course);refresh();Alert.alert('Published','The course is now discoverable. Its learning content is locked to protect learner records.');}
 }

 return <Page>
  <Text onPress={()=>router.back()} style={{color:colors.violet,fontWeight:'800'}}>← Academy</Text>
  <Text style={s.heading}>Creator Studio</Text>
  <Text style={s.muted}>Build free courses with stable lessons and verifiable assessment results.</Text>
  {error?<Text style={{color:'#AE2D4F'}}>{error}</Text>:null}
  <View style={s.card}><Text style={s.title}>Create a new course</Text>
   <Field label="Title" value={title} onChangeText={setTitle} maxLength={140} placeholder="Practical social media design"/>
   <Field label="Description" value={description} onChangeText={setDescription} multiline maxLength={3000} placeholder="What will learners be able to do?"/>
   <Text style={s.label}>Category</Text>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>{categories.map(c=><Pressable
    key={c} onPress={()=>setCategory(c)} style={{paddingHorizontal:11,paddingVertical:9,borderRadius:13,backgroundColor:category===c?colors.violet:colors.soft}}>
    <Text style={{color:category===c?'white':colors.violet,fontWeight:'700'}}>{c}</Text>
   </Pressable>)}</View>
   <Button title={busy?'Creating…':'Create draft course'} disabled={busy} onPress={create}/>
  </View>
  <Text style={s.title}>Your courses</Text>
  {courses.length?courses.map(c=><Pressable key={c.id} onPress={()=>setSelected(c)}
   style={[s.card,{borderColor:selected?.id===c.id?colors.violet:colors.border}]}>
   <Text style={s.title}>{c.title}</Text><Text style={s.muted}>Status: {c.status}</Text>
  </Pressable>):<Empty title="No courses yet" detail="Create a draft course to get started."/>}
  {selected?<View style={s.card}>
    <Text style={s.title}>Manage: {selected.title}</Text>
    <Text style={s.badge}>{selected.status}</Text>
    <Text style={s.muted}>{lessonCount} lessons · {questionCount} quiz questions</Text>
    {editable?<><Text style={s.title}>Add a lesson</Text>
      <Field label="Lesson title" value={lessonTitle} onChangeText={setLessonTitle}/>
      <Field label="Lesson text" value={lessonText} onChangeText={setLessonText} multiline maxLength={20000}/>
      <Field label="HTTPS video link (optional)" value={video} onChangeText={setVideo} autoCapitalize="none"/>
      <Button secondary title="Save lesson" onPress={lesson} disabled={busy}/>
      <Text style={s.title}>Add an assessment question</Text>
      <Field label="Question" value={question} onChangeText={setQuestion} maxLength={2000}/>
      {options.map((x,i)=><Field key={i} label={'Option '+String.fromCharCode(65+i)} value={x}
       maxLength={500} onChangeText={v=>setOptions(previous=>previous.map((o,j)=>i===j?v:o))}/>)}
      <Text style={s.label}>Correct answer</Text>
      <View style={{flexDirection:'row',gap:9}}>{[0,1,2,3].map(i=><Pressable key={i}
       accessibilityRole="button" accessibilityState={{selected:i===correct}} onPress={()=>setCorrect(i)}
       style={{padding:13,borderRadius:12,backgroundColor:i===correct?colors.violet:colors.soft}}>
       <Text style={{color:i===correct?'white':colors.violet,fontWeight:'900'}}>{String.fromCharCode(65+i)}</Text>
      </Pressable>)}</View>
      <Button secondary title="Save quiz question" onPress={addQuiz} disabled={busy}/>
      <Button title="Publish course" onPress={()=>Alert.alert('Publish this course?','The lessons and assessment will be locked after publication.',[
       {text:'Cancel',style:'cancel'},{text:'Publish',onPress:publish}])}
       disabled={busy||lessonCount===0||questionCount===0}/>
    </>:<Text style={s.muted}>Published or archived course content is locked. This protects existing certificates and learner scores.</Text>}
   </View>:null}
 </Page>;
}
