import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
export default function Index() {
  const { session, loading } = useAuth();
  if (loading) return <View style={{ flex:1,justifyContent:'center' }}><ActivityIndicator size="large" /></View>;
  return <Redirect href={session ? '/(tabs)' : '/(auth)/login'} />;
}
