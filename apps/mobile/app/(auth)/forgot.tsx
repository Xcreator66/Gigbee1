import React,{useState} from 'react';import {Alert,Text} from 'react-native';import {router} from 'expo-router';
import {colors} from '@gigbee/shared';import {Brand,Button,Field,Page,s} from '../../components/ui';import {supabase} from '../../lib/supabase';
export default function Forgot(){const [email,setEmail]=useState('');const [busy,setBusy]=useState(false);
 async function reset(){if(!supabase||!email.trim())return;setBusy(true);const website=process.env.EXPO_PUBLIC_SITE_URL?.trim().replace(/\/$/,'');const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),website?{redirectTo:website+'/reset-password'}:undefined);setBusy(false);
 if(error)Alert.alert('Unable to send reset',error.message);else Alert.alert('Check your inbox','If this address has an account, a password reset email will arrive.');}
 return <Page><Text onPress={()=>router.back()} style={{color:colors.violet,fontWeight:'800'}}>← Back</Text><Brand/>
 <Text style={s.heading}>Reset password</Text><Text style={s.muted}>Enter the email address for your account. Follow the secure link to update your password.</Text>
 <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none"/>
 <Button title={busy?'Sending…':'Send reset email'} disabled={busy} onPress={reset}/></Page>}
