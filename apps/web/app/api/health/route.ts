import {NextResponse} from 'next/server';
import {getPublicSupabase} from '../../../lib/supabase';

export const dynamic='force-dynamic';
export const runtime='nodejs';

/** Public, read-only uptime check. Never exposes API keys or database errors. */
export async function GET(){
 const headers={'Cache-Control':'no-store, no-cache, must-revalidate'};
 const db=getPublicSupabase();
 if(!db) return NextResponse.json(
  {service:'gigbee-web',status:'unconfigured',database:'not_configured'},
  {status:503,headers}
 );
 try{
  const {error}=await db.from('jobs').select('id').limit(1);
  return NextResponse.json(
   {service:'gigbee-web',status:error?'degraded':'ok',database:error?'unavailable':'reachable'},
   {status:error?503:200,headers}
  );
 }catch{
  return NextResponse.json(
   {service:'gigbee-web',status:'degraded',database:'unavailable'},
   {status:503,headers}
  );
 }
}
