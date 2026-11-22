import React,{useRef,useEffect} from 'react';
import {Animated,Image,Pressable,ScrollView,StyleSheet,Text,TextInput,View,type ImageSourcePropType} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import {colors,rupees,type Job,shortDate} from '@gigbee/shared';

export const s=StyleSheet.create({
  page:{flex:1,backgroundColor:colors.background},
  body:{paddingHorizontal:20,paddingTop:14,paddingBottom:42,gap:16},
  heading:{fontSize:30,fontWeight:'900',color:colors.ink,letterSpacing:-1.3,lineHeight:37},
  big:{fontSize:36,fontWeight:'900',color:colors.navy,letterSpacing:-1.6,lineHeight:43},
  title:{fontSize:18,fontWeight:'800',color:colors.ink,letterSpacing:-0.45},
  text:{color:colors.ink,fontSize:15,lineHeight:23},
  muted:{color:colors.muted,fontSize:13,lineHeight:21},
  input:{borderWidth:1,borderColor:colors.border,backgroundColor:'#FFFFFF',paddingVertical:14,paddingHorizontal:15,borderRadius:16,fontSize:15,color:colors.ink},
  label:{color:colors.ink,fontWeight:'800',fontSize:13,marginBottom:8},
  card:{borderWidth:1,borderColor:colors.border,borderRadius:22,backgroundColor:'#FFFFFF',padding:18,gap:10},
  button:{backgroundColor:colors.violet,borderRadius:16,minHeight:50,alignItems:'center',justifyContent:'center',padding:12},
  buttonText:{color:'white',fontWeight:'800',fontSize:14},
  ghost:{backgroundColor:'#EFECFF'},
  row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},
  badge:{color:'#4B35C5',backgroundColor:'#F0EDFF',paddingHorizontal:11,paddingVertical:6,borderRadius:20,overflow:'hidden',fontWeight:'800',fontSize:11,alignSelf:'flex-start'},
});
export function Page({children}:{children:React.ReactNode}){
 return <SafeAreaView style={s.page} edges={['top','left','right']}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.body}>{children}</ScrollView></SafeAreaView>;
}
export function FadeIn({children}:{children:React.ReactNode}){
 const opacity=useRef(new Animated.Value(0)).current;const translate=useRef(new Animated.Value(12)).current;
 useEffect(()=>{Animated.parallel([Animated.timing(opacity,{toValue:1,duration:420,useNativeDriver:true}),Animated.timing(translate,{toValue:0,duration:420,useNativeDriver:true})]).start()},[opacity,translate]);
 return <Animated.View style={{opacity,transform:[{translateY:translate}]}}>{children}</Animated.View>;
}
export function Brand({subtitle}:{subtitle?:string}){return <View style={{flexDirection:'row',alignItems:'center',gap:10,marginBottom:6}}>
 <Image source={require('../assets/brand-mark.png')} style={{width:40,height:42}} resizeMode="contain"/>
 <View><Text style={{fontSize:26,color:colors.navy,fontWeight:'900',letterSpacing:-1.2}}>Gig<Text style={{color:colors.violet}}>Bee</Text></Text>{subtitle?<Text style={{color:colors.muted,fontSize:12}}>{subtitle}</Text>:null}</View></View>}
export function Button({title,onPress,secondary=false,disabled=false,danger=false}:{title:string;onPress:()=>void;secondary?:boolean;disabled?:boolean;danger?:boolean}){
 return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{disabled}} onPress={onPress} disabled={disabled} style={({pressed})=>[s.button,secondary&&s.ghost,danger&&{backgroundColor:'#C43E56'},disabled&&{opacity:0.5},pressed&&{opacity:0.8,transform:[{scale:0.985}]}]}>
 <Text style={[s.buttonText,secondary&&{color:colors.violet}]}>{title}</Text></Pressable>;
}
export function Field({label,value,onChangeText,placeholder,multiline=false,secureTextEntry=false,keyboardType,autoCapitalize,maxLength}:{
 label:string;value:string;onChangeText:(v:string)=>void;placeholder?:string;multiline?:boolean;secureTextEntry?:boolean;
 keyboardType?:'email-address'|'numeric'|'default'|'url';autoCapitalize?:'none'|'words'|'sentences';maxLength?:number;
}){return <View><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} style={[s.input,multiline&&{minHeight:118,textAlignVertical:'top'}]} value={value} onChangeText={onChangeText}
 placeholder={placeholder} placeholderTextColor="#A0A6B8" multiline={multiline} secureTextEntry={secureTextEntry}
 keyboardType={keyboardType} autoCapitalize={autoCapitalize} maxLength={maxLength}/></View>}
export function SectionHeading({title,action,onPress}:{title:string;action?:string;onPress?:()=>void}){
 return <View style={s.row}><Text style={s.title}>{title}</Text>{action&&onPress?<Pressable onPress={onPress}><Text style={{color:colors.violet,fontWeight:'800',fontSize:13}}>{action} →</Text></Pressable>:null}</View>
}
export function MiniIcon({name,color=colors.violet,size=22}:{name:React.ComponentProps<typeof Ionicons>['name'];color?:string;size?:number}){
 return <View style={{height:43,width:43,borderRadius:14,backgroundColor:'#F0EDFF',alignItems:'center',justifyContent:'center'}}><Ionicons name={name} size={size} color={color}/></View>
}
const skillArtwork:Record<string,ImageSourcePropType>={
 Design:require('../assets/skills/design.png'),
 'Video Editing':require('../assets/skills/video-editing.png'),
 Writing:require('../assets/skills/writing.png'),
 Development:require('../assets/skills/development.png'),
 Marketing:require('../assets/skills/marketing.png'),
 Data:require('../assets/skills/data.png'),
 Other:require('../assets/skills/other.png'),
};
export function JobCard({job,onPress}:{job:Job;onPress:()=>void}){
 const tints:Record<string,string>={Design:'#F4ECFF','Video Editing':'#FFEAF1',Writing:'#EAF5FF',Development:'#E5FBF0',Marketing:'#FFF2E3',Data:'#EDEBFF',Other:'#F8F1FD'};
 return <Pressable onPress={onPress} style={({pressed})=>[s.card,{padding:0,overflow:'hidden',borderRadius:24},pressed&&{opacity:.9,transform:[{scale:.993}]}]} accessibilityRole="button" accessibilityLabel={`View ${job.title}`}>
  <View style={{flexDirection:'row',minHeight:132}}>
   <View style={{flex:1,padding:16,gap:7,justifyContent:'center'}}>
    <Text style={[s.badge,{backgroundColor:'#F0EDFF'}]}>{job.category}</Text>
    <Text style={{fontSize:17,fontWeight:'900',lineHeight:22,color:colors.ink}} numberOfLines={2}>{job.title}</Text>
    <Text style={{fontSize:18,fontWeight:'900',color:colors.violet}}>{rupees(job.budget_inr)}</Text>
   </View>
   <View style={{width:125,alignItems:'center',justifyContent:'center',backgroundColor:tints[job.category]||'#F1EDFF'}}>
    <Image source={skillArtwork[job.category]||skillArtwork.Other} style={{width:106,height:106}} resizeMode="contain" accessibilityLabel={`${job.category} illustration`}/>
   </View>
  </View>
  <View style={{paddingHorizontal:16,paddingBottom:16,gap:8}}>
   <Text numberOfLines={2} style={s.muted}>{job.description}</Text>
   <View style={s.row}><Text style={s.muted}>{shortDate(job.created_at)}</Text><Text style={{color:colors.violet,fontWeight:'900',fontSize:13}}>See details →</Text></View>
  </View>
 </Pressable>;
}
export function Empty({title,detail}:{title:string;detail:string}){
 return <View style={[s.card,{alignItems:'center',paddingVertical:36}]}><MiniIcon name="sparkles" size={24}/><Text style={s.title}>{title}</Text><Text style={[s.muted,{textAlign:'center'}]}>{detail}</Text></View>
}
export function ErrorText({message}:{message?:string}){return message?<Text style={{color:'#B42345',backgroundColor:'#FFF0F3',padding:12,borderRadius:12}}>{message}</Text>:null}
export function Tag({label}:{label:string}){return <Text style={s.badge}>{label}</Text>}
