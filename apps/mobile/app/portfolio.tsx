import React,{useCallback,useState} from 'react';
import {Alert,Text,View} from 'react-native';import {router,useFocusEffect} from 'expo-router';
import {colors} from '@gigbee/shared';import {Button,Empty,Field,Page,s} from '../components/ui';import {supabase} from '../lib/supabase';import {useAuth} from '../context/AuthContext';
type Item={id:string;title:string;description:string;project_url:string|null};
export default function Portfolio(){const {session}=useAuth();const [items,setItems]=useState<Item[]>([]);const [title,setTitle]=useState('');const [description,setDescription]=useState('');const [url,setUrl]=useState('');const [busy,setBusy]=useState(false);
 const refresh=useCallback(()=>{if(!supabase||!session)return;supabase.from('portfolio_items').select('id,title,description,project_url').eq('user_id',session.user.id).order('created_at',{ascending:false}).then(({data})=>setItems((data as Item[])||[]));},[session?.user.id]);
 useFocusEffect(useCallback(()=>{refresh()},[refresh]));
 async function add(){if(!supabase||!session)return;if(title.trim().length<4){Alert.alert('Add a title','Use at least four characters.');return;}
  if(url&&!url.trim().startsWith('https://')){Alert.alert('Link format','Use a full HTTPS URL.');return;}setBusy(true);
  const {error}=await supabase.from('portfolio_items').insert({user_id:session.user.id,title:title.trim(),description:description.trim(),project_url:url||null});setBusy(false);
  if(error)Alert.alert('Unable to save',error.message);else{setTitle('');setDescription('');setUrl('');refresh();}}
 async function remove(id:string){if(!supabase)return;const {error}=await supabase.from('portfolio_items').delete().eq('id',id);if(error)Alert.alert('Unable to delete',error.message);else refresh();}
 return <Page><Text onPress={()=>router.back()} style={{color:colors.violet,fontWeight:'800'}}>← Back</Text><Text style={s.heading}>Your portfolio</Text>
  <Text style={s.muted}>Show actual work. Only share projects you have permission to display.</Text>
  <View style={s.card}><Text style={s.title}>Add portfolio item</Text>
  <Field label="Project title" value={title} onChangeText={setTitle} maxLength={120} placeholder="e.g. Brand identity project"/>
  <Field label="Description" value={description} onChangeText={setDescription} multiline placeholder="What did you create?"/>
  <Field label="Link (optional)" value={url} onChangeText={setUrl} keyboardType="url" autoCapitalize="none" placeholder="https://…"/>
  <Button title={busy?'Saving…':'Add to portfolio'} onPress={add} disabled={busy}/></View>
  <Text style={s.title}>Saved work</Text>{items.length?items.map(i=><View key={i.id} style={s.card}><Text style={s.title}>{i.title}</Text><Text style={s.muted}>{i.description}</Text><Button secondary title="Remove" onPress={()=>Alert.alert('Remove item?','This will remove it from your portfolio.',[{text:'Cancel'},{text:'Remove',style:'destructive',onPress:()=>remove(i.id)}])}/></View>):<Empty title="Your story starts here" detail="Add a real project to give clients more confidence."/>}
 </Page>;
}
