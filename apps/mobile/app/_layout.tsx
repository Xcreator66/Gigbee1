import React,{useEffect} from 'react';
import {Stack,router,useSegments} from 'expo-router';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AuthProvider,useAuth} from '../context/AuthContext';

function AuthRouteGuard(){
 const {session,loading}=useAuth();
 const segments=useSegments();
 const group=segments[0];
 useEffect(()=>{
  if(!loading&&!session&&group!=='(auth)')router.replace('/(auth)/login');
 },[loading,session?.user.id,group]);
 return null;
}

function NotificationNavigation(){
 useEffect(()=>{
  let cleanup:undefined|(()=>void);let mounted=true;
  // Dynamic loading avoids forcing push support in environments such as Expo Go.
  import('expo-notifications').then(Notifications=>{
   if(!mounted)return;
   const sub=Notifications.addNotificationResponseReceivedListener(response=>{
    const href=response.notification.request.content.data?.href;
    if(typeof href!=='string')return;
    const m=/^\/project\/([0-9a-f-]{36})$/i.exec(href);
    if(m)router.push({pathname:'/project/[id]',params:{id:m[1]}});
    else if(href==='/my-services')router.push('/my-services');
    else if(href==='/notifications')router.push('/notifications');
   });
   cleanup=()=>sub.remove();
  }).catch(()=>{/* Push unavailable: in-app notifications remain usable. */});
  return()=>{mounted=false;cleanup?.();};
 },[]);
 return null;
}
export default function Layout(){
 return <SafeAreaProvider><AuthProvider>
  <AuthRouteGuard/>
  <NotificationNavigation/>
  <Stack screenOptions={{headerShown:false}}/>
 </AuthProvider></SafeAreaProvider>;
}
