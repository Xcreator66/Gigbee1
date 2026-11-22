'use client';
import React, {useEffect, useState} from 'react';
import Link from 'next/link';
import {AppShell, Notice} from '../../components/AppShell';
import {useGigBeeAuth} from '../../lib/auth';

type Privacy = {username: string | null; is_public: boolean};
type Preferences = {email_enabled: boolean; push_enabled: boolean};
const validEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
const validPassword = (password: string) => password.length >= 12 && /[A-Za-z]/.test(password) && /\d/.test(password);

export default function AccountSettingsPage() {
  const {user, supabase} = useGigBeeAuth();
  const [privacy, setPrivacy] = useState<Privacy | null>(null);
  const [prefs, setPrefs] = useState<Preferences>({email_enabled: false, push_enabled: false});
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState('');
  const [feedback, setFeedback] = useState<{error: boolean; message: string} | null>(null);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);

  useEffect(() => {
    setEmail(user?.email || '');
    if (!user || !supabase) {setReady(false); return;}
    let active = true;
    Promise.all([
      supabase.from('profiles').select('username,is_public').eq('id', user.id).maybeSingle(),
      supabase.from('notification_preferences').select('email_enabled,push_enabled').eq('user_id', user.id).maybeSingle(),
    ]).then(([profileResult, prefResult]) => {
      if (!active) return;
      setPrivacy((profileResult.data as Privacy | null) || null);
      if (prefResult.data) setPrefs(prefResult.data as Preferences);
      setNotificationsLoaded(!prefResult.error);
      const error = profileResult.error || prefResult.error;
      if (error) setFeedback({error: true, message: error.message});
      setReady(true);
    }).catch(() => {if (active) {setFeedback({error: true, message: 'Unable to load account settings. Please retry.'}); setReady(true);}});
    return () => {active = false;};
  }, [supabase, user?.id, user?.email]);

  async function changeEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !user || busy) return;
    const next = email.trim().toLowerCase();
    if (!validEmail(next)) {setFeedback({error: true, message: 'Please enter a valid email address.'}); return;}
    if (next === user.email?.toLowerCase()) {setFeedback({error: true, message: 'This is already your account email.'}); return;}
    setBusy('email'); setFeedback(null);
    try {
      const {error} = await supabase.auth.updateUser({email: next});
      if (error) throw error;
      setFeedback({error: false, message: 'Email change requested. Complete the verification steps sent to the addresses required by your email provider. The current address stays active until the change is confirmed.'});
    } catch (error) {setFeedback({error: true, message: error instanceof Error ? error.message : String(error)});}
    finally {setBusy('');}
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || busy) return;
    if (!validPassword(password)) {setFeedback({error: true, message: 'Use at least 12 characters, including a letter and a number.'}); return;}
    if (password !== confirmation) {setFeedback({error: true, message: 'The passwords do not match.'}); return;}
    setBusy('password'); setFeedback(null);
    try {
      const {error} = await supabase.auth.updateUser({password});
      if (error) throw error;
      setPassword(''); setConfirmation('');
      setFeedback({error: false, message: 'Password updated. Review other devices if you changed it for security.'});
    } catch (error) {setFeedback({error: true, message: error instanceof Error ? error.message : String(error)});}
    finally {setBusy('');}
  }

  async function changeVisibility(next: boolean) {
    if (!supabase || !user || !privacy || busy) return;
    if (next && !privacy.username) {setFeedback({error: true, message: 'Set a public username in your workspace profile first.'}); return;}
    setBusy('privacy'); setFeedback(null);
    try {
      const {error} = await supabase.from('profiles').update({is_public: next}).eq('id', user.id);
      if (error) throw error;
      setPrivacy({...privacy, is_public: next});
      setFeedback({error: false, message: next ? 'Your profile is publicly discoverable.' : 'Your profile is hidden from public discovery. Existing work records remain available to authorized participants.'});
    } catch (error) {setFeedback({error: true, message: error instanceof Error ? error.message : String(error)});}
    finally {setBusy('');}
  }

  async function changeEmailNotifications(next: boolean) {
    if (!supabase || !user || busy || !notificationsLoaded) return;
    setBusy('notifications'); setFeedback(null);
    try {
      // Update only the email flag: never overwrite the user's push consent from another device.
      const result = await supabase.from('notification_preferences')
        .update({email_enabled: next, updated_at: new Date().toISOString()})
        .eq('user_id', user.id).select('user_id');
      if (result.error) throw result.error;
      if (!result.data?.length) {
        const created = await supabase.from('notification_preferences').insert({user_id: user.id, email_enabled: next});
        if (created.error) {
          if (created.error.code !== '23505') throw created.error;
          const retry = await supabase.from('notification_preferences')
            .update({email_enabled: next, updated_at: new Date().toISOString()}).eq('user_id', user.id);
          if (retry.error) throw retry.error;
        }
      }
      setPrefs(previous => ({...previous, email_enabled: next}));
      setFeedback({error: false, message: next ? 'Email alerts enabled. Delivery requires the configured server dispatcher and verified email service.' : 'Email alerts disabled. In-app notifications remain available.'});
    } catch (error) {setFeedback({error: true, message: error instanceof Error ? error.message : String(error)});}
    finally {setBusy('');}
  }

  async function signOutAll() {
    if (!supabase || !user || busy) return;
    if (!window.confirm('Sign out from all devices? Refresh sessions will be revoked, but already-issued access tokens may remain valid until expiry.')) return;
    setBusy('signout'); setFeedback(null);
    try {
      const devices = await supabase.from('push_devices').update({enabled: false}).eq('user_id', user.id);
      if (devices.error) throw devices.error;
      const {error} = await supabase.auth.signOut({scope: 'global'});
      if (error) throw error;
      window.location.assign('/sign-in');
    } catch (error) {setFeedback({error: true, message: error instanceof Error ? error.message : String(error)}); setBusy('');}
  }

  return <AppShell title="Account settings." subtitle="Security, privacy and notifications for your GigBee identity.">
    <div className="settings-intro"><div><strong>{user?.email || 'Your account'}</strong><span>{user?.email_confirmed_at ? 'Email verified' : 'Email verification pending'}</span></div>
      <Link className="app-action-secondary" href="/dashboard">Manage profile →</Link></div>
    {feedback ? <div role={feedback.error ? "alert" : "status"} className={feedback.error ? 'app-error' : 'app-success'}>{feedback.message}</div> : null}
    {!ready ? <Notice>Loading account preferences…</Notice> : <div className="settings-grid">
      <section className="app-card settings-panel" aria-labelledby="setting-email"><span className="app-eyebrow">ACCOUNT</span><h2 id="setting-email">Email & identity</h2>
        <p>Change your sign-in email. Depending on your email configuration, confirmation may be required at the old and new addresses.</p>
        <form onSubmit={changeEmail}><label htmlFor="settings-email">Email address<input id="settings-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)}/></label>
          <button type="submit" className="app-action" disabled={!!busy}>{busy === 'email' ? 'Requesting…' : 'Request email change'}</button></form>
        {user?.last_sign_in_at ? <p className="settings-footnote">Last sign-in: {new Date(user.last_sign_in_at).toLocaleString('en-IN')}</p> : null}
      </section>
      <section className="app-card settings-panel" aria-labelledby="setting-security"><span className="app-eyebrow">SECURITY</span><h2 id="setting-security">Password & sessions</h2>
        <p>Choose 12 or more characters, including a letter and a number. Your provider may require reauthentication.</p>
        <form onSubmit={changePassword}>
          <label htmlFor="settings-password">New password<input id="settings-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={e => setPassword(e.target.value)}/></label>
          <label htmlFor="settings-confirm">Confirm new password<input id="settings-confirm" type="password" autoComplete="new-password" minLength={12} maxLength={128} value={confirmation} onChange={e => setConfirmation(e.target.value)}/></label>
          <button type="submit" className="app-action" disabled={!!busy}>{busy === 'password' ? 'Saving…' : 'Update password'}</button>
        </form><div className="app-divider"/>
        <button type="button" className="app-action-secondary" disabled={!!busy} onClick={signOutAll}>Sign out on all devices</button>
        <p className="settings-footnote">Revokes refresh sessions; existing access tokens may work until they expire.</p>
      </section>
      <section className="app-card settings-panel" aria-labelledby="setting-privacy"><span className="app-eyebrow">PRIVACY</span><h2 id="setting-privacy">Profile visibility</h2>
        <label className="settings-toggle" htmlFor="settings-public"><span><strong>Public profile</strong><small>{privacy?.username ? '@' + privacy.username : 'Choose a username in your profile'}</small></span>
          <input id="settings-public" type="checkbox" disabled={!!busy || !privacy} checked={privacy?.is_public || false} onChange={e => changeVisibility(e.target.checked)}/></label>
        <p>Turning this off hides public discovery but does not erase existing contracts, applications or verified work records.</p>
        <div className="app-inline-actions"><Link className="app-action-secondary" href="/dashboard">Edit profile</Link>
          {privacy?.is_public && privacy.username ? <Link className="app-action-secondary" href={'/u/' + privacy.username}>View public profile</Link> : null}</div>
      </section>
      <section className="app-card settings-panel" aria-labelledby="setting-notifications"><span className="app-eyebrow">PREFERENCES</span><h2 id="setting-notifications">Notifications</h2>
        <label className="settings-toggle" htmlFor="settings-email-alerts"><span><strong>Email updates</strong><small>Opt in to messages and job activity</small></span>
          <input id="settings-email-alerts" type="checkbox" checked={prefs.email_enabled} disabled={!!busy || !notificationsLoaded} onChange={e => changeEmailNotifications(e.target.checked)}/></label>
        <div className="settings-toggle"><span><strong>Device push notifications</strong><small>{prefs.push_enabled ? 'Enabled on your account' : 'Disabled'} · Manage device permissions from the Android/iOS app</small></span></div>
        <p>Email and push delivery depend on external credentials and an active notification dispatcher. In-app notifications still work without them.</p>
      </section>
      <section className="app-card settings-panel settings-wide" aria-labelledby="setting-data"><span className="app-eyebrow">DATA & CONTROL</span><h2 id="setting-data">Your records</h2>
        <p>Review recorded payment status, manage your personal work, or request deletion. Deletion requests are reviewed; they do not automatically erase records.</p>
        <div className="app-inline-actions"><Link href="/billing" className="app-action-secondary">Payment activity</Link>
          <Link href="/dashboard" className="app-action-secondary">Projects & portfolio</Link>
          <Link href="/delete-account" className="app-action-secondary settings-danger">Request account deletion</Link></div>
      </section>
    </div>}
  </AppShell>;
}
