'use client';
import React,{useCallback,useEffect,useState} from 'react';import {useParams} from 'next/navigation';import Link from 'next/link';
import {type Course,type Lesson} from '@gigbee/shared';import {useGigBeeAuth} from '../../../lib/auth';
import {Status,Notice} from '../../../components/AppShell';
type Question={id:string;question:string;options:string[]};
export default function CourseDetail(){const {id}=useParams<{id:string}>();const {user,supabase,loading}=useGigBeeAuth();const [course,setCourse]=useState<Course|null>(null);const [lessons,setLessons]=useState<Lesson[]>([]);const [done,setDone]=useState<string[]>([]);
 const [enrolled,setEnrolled]=useState(false);const [questions,setQuestions]=useState<Question[]>([]);const [answers,setAnswers]=useState<Record<string,number>>({});const [result,setResult]=useState<{score:number;passed:boolean}|null>(null);const [busy,setBusy]=useState(false);const [notice,setNotice]=useState('');
 const refresh=useCallback(async()=>{if(!supabase||!id)return;const [c,l,q]=await Promise.all([supabase.from('courses').select('*').eq('id',id).maybeSingle(),
  supabase.from('lessons').select('*').eq('course_id',id).order('position'),supabase.from('quiz_questions').select('id,question,options').eq('course_id',id).order('position')]);
  setCourse((c.data as Course|null)||null);setLessons((l.data as Lesson[])||[]);setQuestions((q.data as Question[])||[]);
  if(user){const [en,lp]=await Promise.all([supabase.from('enrollments').select('course_id').eq('course_id',id).eq('user_id',user.id).maybeSingle(),
   supabase.from('lesson_progress').select('lesson_id').eq('user_id',user.id)]);setEnrolled(Boolean(en.data));setDone((lp.data||[]).map(x=>x.lesson_id));}
 },[supabase,id,user?.id]);useEffect(()=>{refresh()},[refresh]);
 async function enroll(){if(!supabase||!user)return;setBusy(true);const {error}=await supabase.from('enrollments').insert({course_id:id,user_id:user.id});setBusy(false);setNotice(error?.message||'Enrolled successfully.');if(!error)refresh();}
 async function mark(lessonId:string){if(!supabase)return;const {error}=await supabase.rpc('complete_course_lesson',{p_lesson:lessonId});setNotice(error?.message||'Lesson complete!');if(!error)refresh();}
 async function quiz(){if(!supabase)return;if(Object.keys(answers).length!==questions.length){setNotice('Answer every question before submitting.');return;}
  setBusy(true);const {data,error}=await supabase.rpc('submit_course_quiz',{p_course:id,p_answers:answers});setBusy(false);if(error)setNotice(error.message);else{setResult(data as {score:number;passed:boolean});refresh();}}
 return <div className="app-backdrop"><div className="shell app-shell"><Link href="/learn" className="back-link">← All courses</Link>
 {!course?<div className="app-empty" style={{marginTop:25}}><h2>Course unavailable</h2><p>It may be private, unpublished, or unavailable.</p></div>:<>
 <div className="app-banner"><div><span className="app-eyebrow">{course.category.toUpperCase()} · FREE COURSE</span><h2>{course.title}</h2><p>{course.description}</p></div><Status value={course.status}/></div>
 {notice?<Notice>{notice}</Notice>:null}
 {loading?<p>Checking account…</p>:!user?<div className="app-alert">Sign in to enrol and track your progress. <Link className="app-link" href="/sign-in">Sign in →</Link></div>:
 !enrolled?<button className="app-action" disabled={busy} onClick={enroll}>Enroll for free →</button>:<span className="app-tag good">Enrolled · {done.filter(x=>lessons.some(l=>l.id===x)).length}/{lessons.length} lessons finished</span>}
 <h2 className="app-subtitle">Lessons</h2><div className="app-list">{lessons.length?lessons.map((l,i)=><div key={l.id} className="app-card">
 <div className="app-inline-actions"><h2>{i+1}. {l.title}</h2>{done.includes(l.id)?<Status value="complete"/>:null}</div>
 <p style={{whiteSpace:'pre-wrap',color:'#323046'}}>{l.content}</p>{l.video_url?.startsWith('https://')?<a target="_blank" rel="noopener noreferrer" className="app-link" href={l.video_url}>Watch video ↗</a>:null}
 {enrolled&&!done.includes(l.id)?<div><button onClick={()=>mark(l.id)} className="app-action-secondary">Mark lesson complete ✓</button></div>:null}</div>):<div className="app-empty">This course has no lessons yet.</div>}</div>
 {enrolled&&questions.length>0?<div className="app-card" style={{marginTop:25}}><h2>Final assessment</h2><p>Complete all lessons and score 70% or higher to receive a course assessment certificate.</p>
 {questions.map((q,i)=><div key={q.id} style={{marginBottom:22}}><h3>{i+1}. {q.question}</h3>
  <div style={{display:'grid',gap:9}}>{q.options.map((option,index)=><label key={index} className="app-check-row" style={{padding:11,border:'1px solid #E6DFF3',borderRadius:12}}>
   <input type="radio" checked={answers[q.id]===index} onChange={()=>setAnswers(o=>({...o,[q.id]:index}))}/>{option}</label>)}</div></div>)}
 <button className="app-action" disabled={busy||done.filter(x=>lessons.some(l=>l.id===x)).length!==lessons.length} onClick={quiz}>Submit assessment →</button>
 {result?<div className={result.passed?'app-success':'app-alert'} style={{marginTop:12}}>Score: {result.score}% · {result.passed?'Passed! Your certificate is in your account.':'Try again after reviewing the lessons.'}</div>:null}
 </div>:null}
 </>}</div></div>;
}
