import React,{useCallback,useState} from 'react';import {Linking,Text,View} from 'react-native';
import {router,useFocusEffect,useLocalSearchParams} from 'expo-router';
import {type Profile,colors,shortDate} from '@gigbee/shared';
import {Button,Empty,Page,s} from '../../components/ui';import {supabase} from '../../lib/supabase';
type Portfolio={id:string;title:string;description:string;project_url:string|null};
export default function Freelancer(){const {id}=useLocalSearchParams<{id:string}>();const [p,setP]=useState<Profile|null>(null);const [work,setWork]=useState<Portfolio[]>([]);const [review,setReview]=useState<{rating:number;comment:string}[]>([]);
 useFocusEffect(useCallback(()=>{if(!supabase||!id)return;let a=true;(async()=>{const [pr,po,r]=await Promise.all([
 supabase.from('profiles').select('*').eq('id',id).maybeSingle(),supabase.from('portfolio_items').select('id,title,description,project_url').eq('user_id',id),
 supabase.from('reviews').select('rating,comment').eq('reviewee_id',id).limit(10)]);
 if(a){setP((pr.data as Profile|null)||null);setWork((po.data as Portfolio[])||[]);setReview((r.data as any[])||[]);}})();return()=>{a=false};},[id]));
 return <Page><Text onPress={()=>router.back()} style={{color:colors.violet,fontWeight:'800'}}>← Back</Text>
 {!p?<Empty title="Profile not available" detail="This profile may be private or doesn't exist."/>:<>
 <View style={[s.card,{backgroundColor:colors.navy,borderColor:colors.navy}]}><Text style={{fontSize:31,fontWeight:'900',color:'white'}}>{p.display_name}</Text>
 <Text style={{color:colors.yellow,fontWeight:'800'}}>{p.headline||'Freelancer'}</Text><Text style={{color:'#E7E4FC'}}>{p.city||''}</Text>
 <Text style={{color:'#E7E4FC',lineHeight:21}}>{p.bio||'No bio yet.'}</Text></View>
 <Text style={s.title}>Portfolio</Text>{work.length?work.map(w=><View key={w.id} style={s.card}><Text style={s.title}>{w.title}</Text><Text style={s.muted}>{w.description}</Text>
 {w.project_url?<Button secondary title="Open project link" onPress={()=>Linking.openURL(w.project_url!)}/>:null}</View>):<Empty title="No portfolio items" detail="This freelancer hasn't added examples of work yet."/>}
 <Text style={s.title}>Verified project reviews</Text>{review.length?review.map((r,i)=><View key={i} style={s.card}><Text style={{color:colors.violet,fontWeight:'900'}}>{'★'.repeat(r.rating)}</Text><Text style={s.text}>{r.comment||'Rating from a completed project'}</Text></View>):<Text style={s.muted}>No verified reviews yet.</Text>}
 </>}</Page>;
}
