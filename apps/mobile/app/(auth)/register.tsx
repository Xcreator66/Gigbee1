import React, { useState } from 'react';
import { Alert, Text } from 'react-native';
import { Link, router, Redirect } from 'expo-router';
import { Brand, Button, Field, Page, s } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { isConfigured, supabase } from '../../lib/supabase';
export default function Register() {
  const { session } = useAuth();
  const [name,setName]=useState(''); const [email,setEmail]=useState('');
  const [password,setPassword]=useState(''); const [confirm,setConfirm]=useState(''); const [busy,setBusy]=useState(false);
  if(session) return <Redirect href="/(tabs)" />;
  async function submit() {
    if(!supabase) return;
    if(name.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(email.trim()) || password.length < 12 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      Alert.alert('Check your details','Provide your name, a valid email, and a password of 12 or more characters with a letter and a number.');return;
    }
    if(password!==confirm){Alert.alert('Passwords do not match','Confirm the password you entered.');return;}
    setBusy(true);
    const { data,error } = await supabase.auth.signUp({email: email.trim().toLowerCase(),password,
      options: { data:{full_name:name.trim()} } });
    setBusy(false);
    if(error) return Alert.alert('Sign up failed',error.message);
    if(!data.session) { Alert.alert('Check your email','Please verify your email address before signing in.'); router.replace('/(auth)/login'); }
  }
  return <Page><Brand subtitle="Free to join. Free to apply."/><Text style={s.heading}>Build your future.</Text>
    <Text style={s.muted}>Create one identity for learning, freelancing, and hiring.</Text>
    <Field label="Full name" value={name} onChangeText={setName} placeholder="Your name" autoCapitalize="words" maxLength={100}/>
    <Field label="Email address" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address"/>
    <Field label="Password" value={password} onChangeText={setPassword} placeholder="12+ characters, letter and number" secureTextEntry/>
    <Field label="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry/>
    <Button title={busy?'Creating account…':'Create account'} onPress={submit} disabled={!isConfigured||busy}/>
    <Text style={s.muted}>Already registered? <Link href="/(auth)/login" style={{color:'#6546F5',fontWeight:'800'}}>Sign in</Link></Text>
  </Page>;
}
