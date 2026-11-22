import React,{useCallback,useState} from 'react';
import {Alert,Linking,Pressable,Text,View} from 'react-native';import {router,useFocusEffect,useLocalSearchParams} from 'expo-router';
import {type Course,type Lesson,colors} from '@gigbee/shared';import {Button,Empty,Page,s} from '../../components/ui';
import {supabase} from '../../lib/supabase';import {useAuth} from '../../context/AuthContext';
type Question={id:string;question:string;options:string[];position:number};
export default function CourseScreen(){const {id}=useLocalSearchParams<{id:string}>();const {session}=useAuth();const [course,setCourse]=useState<Course|null>(null);
 const [lessons,setLessons]=useState<Lesson[]>([]);const [done,setDone]=useState<string[]>([]);const [enrolled,setEnrolled]=useState(false);
 const [questions,setQuestions]=useState<Question[]>([]);const [answers,setAnswers]=useState<Record<string,number>>({});const [result,setResult]=useState<{score:number;passed:boolean}|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const refresh=useCallback(async()=>{if(!supabase||!id)return;const [c,l,q]=await Promise.all([
  supabase.from('courses').select('*').eq('id',id).maybeSingle(),supabase.from('lessons').select('*').eq('course_id',id).order('position'),
  supabase.from('quiz_questions').select('id,question,options,position').eq('course_id',id).order('position')]);
  setCourse((c.data as Course|null)||null);setLessons((l.data as Lesson[])||[]);setQuestions((q.data as Question[])||[]);setError(c.error?.message||'');
  if(session){const [e,d]=await Promise.all([
   supabase.from('enrollments').select('course_id').eq('course_id',id).eq('user_id',session.user.id).maybeSingle(),
   supabase.from('lesson_progress').select('lesson_id').eq('user_id',session.user.id)]);
   setEnrolled(Boolean(e.data));setDone((d.data||[]).map(x=>x.lesson_id));}
 },[id,session?.user.id]);useFocusEffect(useCallback(()=>{refresh()},[refresh]));
 async function enroll(){if(!supabase||!session||!course)return;setBusy(true);const {error:e}=await supabase.from('enrollments').insert({user_id:session.user.id,course_id:course.id});setBusy(false);
  if(e&&e.code!=='23505')Alert.alert('Enrollment failed',e.message);else refresh();}
 async function complete(lesson:Lesson){if(!supabase)return;const {error:e}=await supabase.rpc('complete_course_lesson',{p_lesson:lesson.id});if(e)Alert.alert('Could not complete lesson',e.message);else refresh();}
 async function submitQuiz(){if(!supabase||!course)return;if(Object.keys(answers).length!==questions.length){Alert.alert('Finish the quiz','Select one answer for each question.');return;}
 setBusy(true);const {data,error:e}=await supabase.rpc('submit_course_quiz',{p_course:course.id,p_answers:answers});setBusy(false);
 if(e)Alert.alert('Quiz unavailable',e.message);else{setResult(data as {score:number;passed:boolean});refresh();}}
 return <Page><Text onPress={()=>router.back()} style={{color:colors.violet,fontWeight:'800'}}>← Academy</Text>
 {!course?<Empty title="Course unavailable" detail="This course is not published or not accessible."/>:<>
 <View style={{backgroundColor:colors.navy,borderRadius:25,padding:24,gap:12}}><Text style={{color:colors.yellow,fontSize:11,fontWeight:'900',letterSpacing:1.6}}>{course.category.toUpperCase()} · FREE COURSE</Text>
 <Text style={{color:'white',fontSize:28,fontWeight:'900'}}>{course.title}</Text><Text style={{color:'#E3E4F8',lineHeight:21}}>{course.description}</Text></View>
 {error?<Text style={{color:'#B42345'}}>{error}</Text>:null}
 {!enrolled?<Button title={busy?'Enrolling…':'Enroll for free'} disabled={busy} onPress={enroll}/>:<Text style={s.badge}>Enrolled · {done.filter(x=>lessons.some(l=>l.id===x)).length}/{lessons.length} lessons</Text>}
 <Text style={s.title}>Course lessons</Text>{lessons.length?lessons.map((l,index)=><View key={l.id} style={s.card}>
  <View style={s.row}><Text style={s.title}>{index+1}. {l.title}</Text><Text style={s.badge}>{done.includes(l.id)?'Completed':'Lesson'}</Text></View>
  <Text style={s.text}>{l.content}</Text>{l.video_url?.startsWith('https://')?<Button secondary title="Watch linked video" onPress={()=>Linking.openURL(l.video_url!)}/>:null}
  {enrolled&&!done.includes(l.id)?<Button title="Mark lesson complete" onPress={()=>complete(l)}/>:null}
 </View>):<Empty title="No lessons yet" detail="The creator has not published lessons for this course."/>}
 {enrolled&&questions.length>0?<View style={[s.card,{gap:16}]}><Text style={s.title}>Final assessment</Text><Text style={s.muted}>Finish every lesson, then score at least 70% to earn a course certificate.</Text>
  {questions.map((q,i)=><View key={q.id} style={{gap:9}}><Text style={[s.text,{fontWeight:'800'}]}>{i+1}. {q.question}</Text>
   {q.options.map((o,idx)=><Pressable key={idx} onPress={()=>setAnswers(old=>({...old,[q.id]:idx}))} style={{padding:12,borderWidth:1,borderColor:answers[q.id]===idx?colors.violet:colors.border,borderRadius:12,backgroundColor:answers[q.id]===idx?colors.soft:'white'}}>
    <Text style={s.text}>{String.fromCharCode(65+idx)}. {o}</Text></Pressable>)}</View>)}
  {result?<View style={{backgroundColor:result.passed?'#E1FAEF':'#FFEDEF',padding:16,borderRadius:16}}><Text style={s.title}>{result.passed?'Assessment passed':'Try again'} · {result.score}%</Text>
   <Text style={s.muted}>{result.passed?'A course certificate is now visible in your profile.':'Review your lessons and retry.'}</Text></View>:null}
  <Button title={busy?'Submitting…':'Submit final assessment'} disabled={busy||done.filter(x=>lessons.some(l=>l.id===x)).length!==lessons.length} onPress={submitQuiz}/>
 </View>:null}
 </>}</Page>;
}
