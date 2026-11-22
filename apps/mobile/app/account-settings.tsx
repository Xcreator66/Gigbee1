import React, {useCallback, useState} from 'react';
import {Alert, Pressable, Switch, Text, View} from 'react-native';
import {router, useFocusEffect} from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import {colors} from '@gigbee/shared';
import {Button, Field, Page, s} from '../components/ui';
import {useAuth} from '../context/AuthContext';
import {supabase} from '../lib/supabase';

type PrivacyProfile = {username: string | null; is_public: boolean};
const validEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
const validPassword = (password: string) => password.length >= 12 && /[A-Za-z]/.test(password) && /\d/.test(password);

export default function AccountSettings() {
  const {session} = useAuth();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profile, setProfile] = useState<PrivacyProfile | null>(null);
  const [busy, setBusy] = useState<'email' | 'password' | 'privacy' | 'signout' | null>(null);
  const [message, setMessage] = useState('');

  useFocusEffect(useCallback(() => {
    setEmail(session?.user.email || '');
    if (!supabase || !session) return;
    let active = true;
    supabase.from('profiles').select('username,is_public').eq('id', session.user.id).maybeSingle()
      .then(({data, error}) => {
        if (!active) return;
        if (error) setMessage(error.message);
        else setProfile(data as PrivacyProfile | null);
      });
    return () => {active = false;};
  }, [session?.user.id, session?.user.email]));

  async function updateEmail() {
    if (!supabase || !session || busy) return;
    const next = email.trim().toLowerCase();
    if (!validEmail(next)) {Alert.alert('Invalid email', 'Enter a valid email address.'); return;}
    if (next === session.user.email?.toLowerCase()) {Alert.alert('No change', 'This is already your account email.'); return;}
    setBusy('email'); setMessage('');
    try {
      const {error} = await supabase.auth.updateUser({email: next});
      if (error) throw error;
      setMessage('Email change requested. Confirm the verification links sent by your authentication provider before the new address becomes active.');
    } catch (error) {Alert.alert('Email change failed', error instanceof Error ? error.message : String(error));}
    finally {setBusy(null);}
  }

  async function updatePassword() {
    if (!supabase || !session || busy) return;
    if (!validPassword(newPassword)) {Alert.alert('Choose a stronger password', 'Use at least 12 characters, including a letter and a number.'); return;}
    if (newPassword !== confirmPassword) {Alert.alert('Passwords do not match', 'Confirm your new password.'); return;}
    setBusy('password'); setMessage('');
    try {
      const {error} = await supabase.auth.updateUser({password: newPassword});
      if (error) throw error;
      setNewPassword(''); setConfirmPassword('');
      setMessage('Password updated. Review other signed-in devices if this change was for security.');
    } catch (error) {Alert.alert('Password change failed', error instanceof Error ? error.message : String(error));}
    finally {setBusy(null);}
  }

  async function setVisibility(next: boolean) {
    if (!supabase || !session || !profile || busy) return;
    if (next && !profile.username) {Alert.alert('Username required', 'Add a username in your profile before making it public.'); return;}
    setBusy('privacy'); setMessage('');
    try {
      const {error} = await supabase.from('profiles').update({is_public: next}).eq('id', session.user.id);
      if (error) throw error;
      setProfile({...profile, is_public: next});
      setMessage(next ? 'Your profile is now publicly discoverable.' : 'Your public listing is hidden. Existing project participants can still access required work information.');
    } catch (error) {Alert.alert('Privacy update failed', error instanceof Error ? error.message : String(error));}
    finally {setBusy(null);}
  }

  function signOutEverywhere() {
    if (!supabase || !session || busy) return;
    Alert.alert('Sign out on all devices?', 'GigBee will revoke your refresh sessions. Already-issued access tokens may remain valid until they expire.', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Sign out all', style: 'destructive', onPress: async () => {
        if (!supabase || !session) return;
        setBusy('signout');
        try {
          const devices = await supabase.from('push_devices').update({enabled: false}).eq('user_id', session.user.id);
          if (devices.error) throw devices.error;
          const {error} = await supabase.auth.signOut({scope: 'global'});
          if (error) throw error;
          localStorage.removeItem('gigbee.pushToken.' + session.user.id);
          router.replace('/(auth)/login');
        } catch (error) {Alert.alert('Sign out failed', error instanceof Error ? error.message : String(error));}
        finally {setBusy(null);}
      }},
    ]);
  }

  return <Page>
    <Pressable onPress={() => router.back()} accessibilityRole="button"><Text style={{color: colors.violet, fontWeight: '800'}}>← Back to profile</Text></Pressable>
    <Text style={s.heading}>Account settings<Text style={{color: colors.violet}}>.</Text></Text>
    <Text style={s.muted}>Manage sign-in security, account visibility, notifications and your information.</Text>
    {message ? <View style={[s.card, {backgroundColor: colors.soft}]}><Text style={s.text}>{message}</Text></View> : null}

    <View style={s.card}>
      <View style={[s.row, {justifyContent: 'flex-start'}]}><Ionicons name="mail-outline" size={22} color={colors.violet}/><Text style={s.title}>Email address</Text></View>
      <Text style={s.muted}>Current: {session?.user.email || 'Not available'} · {session?.user.email_confirmed_at ? 'Verified' : 'Verification pending'}</Text>
      <Field label="New email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" maxLength={254}/>
      <Text style={s.muted}>Your provider may require confirmation at the current and new addresses. The old address remains active until verification finishes.</Text>
      <Button title={busy === 'email' ? 'Requesting…' : 'Change email'} disabled={!!busy} onPress={updateEmail}/>
    </View>

    <View style={s.card}>
      <View style={[s.row, {justifyContent: 'flex-start'}]}><Ionicons name="lock-closed-outline" size={22} color={colors.violet}/><Text style={s.title}>Password & security</Text></View>
      <Text style={s.muted}>Use at least 12 characters, with a letter and a number. Security-sensitive changes may require reauthentication.</Text>
      <Field label="New password" value={newPassword} onChangeText={setNewPassword} secureTextEntry maxLength={128}/>
      <Field label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry maxLength={128}/>
      <Button title={busy === 'password' ? 'Updating…' : 'Update password'} disabled={!!busy} onPress={updatePassword}/>
      <Button title={busy === 'signout' ? 'Signing out…' : 'Sign out on all devices'} secondary disabled={!!busy} onPress={signOutEverywhere}/>
    </View>

    <View style={s.card}>
      <View style={[s.row, {justifyContent: 'flex-start'}]}><Ionicons name="eye-outline" size={22} color={colors.violet}/><Text style={s.title}>Profile privacy</Text></View>
      <View style={s.row}><View style={{flex: 1}}><Text style={s.text}>Discoverable public profile</Text><Text style={s.muted}>{profile?.username ? '@' + profile.username : 'Add a username in your profile first'} </Text></View>
        <Switch accessibilityLabel="Public profile" value={profile?.is_public || false} disabled={!!busy || !profile} onValueChange={setVisibility} trackColor={{true: colors.violet}}/></View>
      <Text style={s.muted}>Hiding your profile does not erase your existing proposals, reviews or contractual records.</Text>
      <Button secondary title="Edit public profile" onPress={() => router.push('/(tabs)/profile')}/>
    </View>

    <View style={s.card}>
      <Text style={s.title}>Notifications & data</Text>
      <Pressable accessibilityRole="button" style={s.row} onPress={() => router.push('/notification-settings')}><Text style={s.text}>Notification preferences</Text><Ionicons name="chevron-forward" size={20} color={colors.violet}/></Pressable>
      <Pressable accessibilityRole="button" style={s.row} onPress={() => router.push('/payment-activity')}><Text style={s.text}>Payment activity (read-only)</Text><Ionicons name="chevron-forward" size={20} color={colors.violet}/></Pressable>
      <Pressable accessibilityRole="button" style={s.row} onPress={() => router.push('/delete-account')}><Text style={[s.text, {color: '#AE3651'}]}>Request account deletion</Text><Ionicons name="chevron-forward" size={20} color="#AE3651"/></Pressable>
      <Text style={s.muted}>Account deletion is a reviewed request, not immediate deletion. No live payments or payouts are enabled in this release.</Text>
    </View>
  </Page>;
}
