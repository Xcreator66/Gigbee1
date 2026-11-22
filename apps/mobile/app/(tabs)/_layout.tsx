import React from 'react';
import {Tabs,Redirect} from 'expo-router';
import {ActivityIndicator,View} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {colors} from '@gigbee/shared';
import {useAuth} from '../../context/AuthContext';
const icons:Record<string,{active:React.ComponentProps<typeof Ionicons>['name'];inactive:React.ComponentProps<typeof Ionicons>['name']}>= {
 index:{active:'home',inactive:'home-outline'},explore:{active:'compass',inactive:'compass-outline'},
 work:{active:'briefcase',inactive:'briefcase-outline'},learn:{active:'school',inactive:'school-outline'},profile:{active:'person-circle',inactive:'person-circle-outline'}
};
export default function TabsLayout(){
 const {loading,session}=useAuth();
 if(loading)return <View style={{flex:1,justifyContent:'center'}}><ActivityIndicator/></View>;
 if(!session)return <Redirect href="/(auth)/login"/>;
 return <Tabs screenOptions={({route})=>({
  headerShown:false,tabBarActiveTintColor:colors.violet,tabBarInactiveTintColor:'#8490A9',
  tabBarStyle:{backgroundColor:'#FFFFFF',height:68,paddingTop:7,paddingBottom:8,borderTopColor:colors.border},
  tabBarLabelStyle:{fontSize:11,fontWeight:'700'},
  tabBarIcon:({color,focused})=><Ionicons name={focused?(icons[route.name]?.active||'ellipse'):(icons[route.name]?.inactive||'ellipse-outline')} color={typeof color === 'string' ? color : '#6B4CE6'} size={23}/>
 })}>
  <Tabs.Screen name="index" options={{title:'Home'}}/><Tabs.Screen name="explore" options={{title:'Explore'}}/>
  <Tabs.Screen name="work" options={{title:'My Work'}}/><Tabs.Screen name="learn" options={{title:'Learn'}}/>
  <Tabs.Screen name="profile" options={{title:'Profile'}}/>
 </Tabs>;
}
