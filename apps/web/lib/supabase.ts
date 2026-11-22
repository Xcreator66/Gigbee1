import { createClient } from '@supabase/supabase-js';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
// Public site only needs the publishable key, never a service role key.
export function getPublicSupabase(){
  if(!url||!key||url.includes('YOUR-GIGBEE'))return null;
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}
