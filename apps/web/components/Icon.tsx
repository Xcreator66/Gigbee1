import React from 'react';
export type IconName = 'arrow'|'arrow-right'|'check'|'sparkles'|'search'|'briefcase'|'shield'|'book'|'user'|'users'|'zap'|'wallet'|'globe'|'menu'|'chevron'|'clock'|'target'|'heart'|'layers'|'video'|'code'|'pen'|'palette'|'chart'|'file'|'lock'|'message'|'award'|'filter'|'graduation'|'star'|'compass';
export function Icon({name,size=20,className=''}:{name:IconName,size?:number,className?:string}){
  const path:Record<IconName,React.ReactNode>={
    arrow:<><path d="M7 17 17 7M7 7h10v10"/></>,
    'arrow-right':<><path d="M5 12h14m-7-7 7 7-7 7"/></>,
    check:<path d="m5 12 4 4L19 6"/>,
    sparkles:<><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3ZM19 17l.7 2.3L22 20l-2.3.7L19 23l-.7-2.3L16 20l2.3-.7L19 17Z"/></>,
    search:<><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    briefcase:<><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12c4 2 14 2 18 0"/></>,
    shield:<><path d="m12 2 9 4v6c0 5-4 8-9 10-5-2-9-5-9-10V6l9-4Z"/><path d="m8 12 3 3 5-6"/></>,
    book:<><path d="M12 6c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V5c-4-1-7-1-10 1Zm0 0v15"/></>,
    user:<><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    users:<><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M17 5a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 5"/></>,
    zap:<path d="m13 2-9 12h8l-1 8 9-12h-8l1-8Z"/>,
    wallet:<><rect x="3" y="6" width="18" height="15" rx="3"/><path d="M3 9V5a2 2 0 0 1 2-2h12m2 10h2"/><circle cx="16" cy="14" r="1"/></>,
    globe:<><circle cx="12" cy="12" r="10"/><path d="M2 12h20m-10-10c-5 5-5 15 0 20m0-20c5 5 5 15 0 20"/></>,
    menu:<path d="M4 7h16M4 12h16M4 17h16"/>,
    chevron:<path d="m9 18 6-6-6-6"/>,
    clock:<><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>,
    target:<><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
    heart:<path d="M20.5 4.5a5.5 5.5 0 0 0-7.8 0L12 5.2l-.7-.7a5.5 5.5 0 0 0-7.8 7.8L12 21l8.5-8.7a5.5 5.5 0 0 0 0-7.8Z"/>,
    layers:<><path d="m12 2 9 5-9 5-9-5 9-5Zm-9 10 9 5 9-5m-18 5 9 5 9-5"/></>,
    video:<><rect x="3" y="5" width="14" height="14" rx="2"/><path d="m17 10 4-3v10l-4-3"/></>,
    code:<path d="m8 7-5 5 5 5m8-10 5 5-5 5M14 4l-4 16"/>,
    pen:<><path d="m4 20 4-.9L20 7a2 2 0 0 0-3-3L5 16l-1 4Z"/><path d="m15 6 3 3"/></>,
    palette:<><path d="M12 3a9 9 0 1 0 0 18h1.5a2 2 0 0 0 1.5-3.5 2 2 0 0 1 1.5-3.5h1.3A4.2 4.2 0 0 0 22 9.8 9.2 9.2 0 0 0 12 3Z"/><circle cx="7" cy="11" r="1"/><circle cx="11" cy="7" r="1"/><circle cx="16" cy="9" r="1"/></>,
    chart:<path d="M4 20V11m5 9V7m5 13V4m5 16v-7"/>,
    file:<><path d="M6 2h9l5 5v15H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"/><path d="M14 2v6h6M8 13h8m-8 4h8"/></>,
    lock:<><rect x="4" y="10" width="16" height="12" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v3"/></>,
    message:<path d="M20 11a8 8 0 0 1-8 8 9 9 0 0 1-4-.9L3 20l2-5a8 8 0 1 1 15-4Z"/>,
    award:<><circle cx="12" cy="8" r="5"/><path d="m9 12-2 9 5-3 5 3-2-9"/></>,
    filter:<><path d="M4 7h16m-13 5h10m-7 5h4"/></>,
    graduation:<><path d="m2 10 10-6 10 6-10 6-10-6Zm4 3v5c4 3 8 3 12 0v-5m4-3v7"/></>,
    star:<path d="m12 2 3 6.5 7 .9-5 5 .9 7L12 18l-5.9 3.4.9-7-5-5 7-.9L12 2Z"/>,
    compass:<><circle cx="12" cy="12" r="10"/><path d="m15 9-2 4-4 2 2-4 4-2Z"/></>,
  };
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{path[name]}</svg>;
}
