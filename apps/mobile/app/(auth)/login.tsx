import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Link, Redirect } from 'expo-router';
import { Brand, Button, Field, Page, s } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { isConfigured, supabase } from '../../lib/supabase';
export default function Login() {
  const { session } = useAuth();
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [busy,setBusy]=useState(false);
  if(session) return <Redirect href="/(tabs)" />;
  async function submit() {
    if (!supabase) return;
    if (!email.trim() || !password) { Alert.alert('Missing details','Enter your email and password.'); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email:email.trim(),password });
    setBusy(false);
    if(error) Alert.alert('Unable to sign in', error.message);
  }
  return <Page><View style={{marginTop:36}}><Brand subtitle="Learn. Work. Grow."/></View>
    <Text style={s.heading}>Welcome back.</Text><Text style={s.muted}>Your next opportunity starts here.</Text>
    {!isConfigured && <View style={s.card}><Text style={s.title}>Connect Supabase</Text>
      <Text style={s.muted}>Add your dedicated GigBee project URL and publishable key in apps/mobile/.env before signing in.</Text></View>}
    <Field label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com"/>
    <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Your password"/>
    <Button title={busy ? 'Signing in…' : 'Sign in'} onPress={submit} disabled={!isConfigured||busy}/>
    <Link href="/(auth)/forgot" style={{color:'#6546F5',fontWeight:'800',textAlign:'right'}}>Forgot password?</Link>
    <Text style={s.muted}>New to GigBee? <Link href="/(auth)/register" style={{color:'#6546F5',fontWeight:'800'}}>Create a free account</Link></Text>
  </Page>;
}
