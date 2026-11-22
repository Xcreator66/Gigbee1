'use client';

import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

/** Progressive enhancement: all content stays visible when JavaScript is disabled. */
export default function MotionEffects(){
  const pathname=usePathname();
  useEffect(()=>{
    const root=document.documentElement;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    if(reduced.matches) return;
    const targets=[...document.querySelectorAll<HTMLElement>('.section-heading,.category-card,.step-card,.job-tile,.duo-panel,.values-grid > article,.roadmap-list > div,.faq-item,.copy-card,.talent-card,.detail-steps > article,.feature-panel,.cta-content,.mini-stats-inner > div,.jobs-empty-promo,.journey-shell,.journey-topline')];
    targets.forEach((element,i)=>{
      element.classList.add('motion-observed');
      if(element.classList.contains('category-card'))element.style.setProperty('--reveal-delay',`${(i%7)*55}ms`);
    });
    // Apply only after targets have been registered; no hidden content without JS.
    root.classList.add('motion-enhanced');
    let observer:IntersectionObserver|undefined;
    if('IntersectionObserver' in window){
      observer=new IntersectionObserver(entries=>{
        for(const entry of entries){
          if(entry.isIntersecting){
            entry.target.classList.add('is-revealed');
            observer?.unobserve(entry.target);
          }
        }
      },{threshold:0.08,rootMargin:'0px 0px -20px 0px'});
      targets.forEach(el=>observer!.observe(el));
    }else targets.forEach(el=>el.classList.add('is-revealed'));
    const updateProgress=()=>{
      const max=document.documentElement.scrollHeight-window.innerHeight;
      root.style.setProperty('--scroll-progress',String(max>0?Math.min(1,window.scrollY/max):0));
      document.body.classList.toggle('scrolled-past-top',window.scrollY>28);
    };
    updateProgress();
    window.addEventListener('scroll',updateProgress,{passive:true});
    window.addEventListener('resize',updateProgress,{passive:true});
    return ()=>{
      observer?.disconnect();
      targets.forEach(el=>{el.classList.remove('motion-observed','is-revealed');el.style.removeProperty('--reveal-delay');});
      root.classList.remove('motion-enhanced');
      root.style.removeProperty('--scroll-progress');
      window.removeEventListener('scroll',updateProgress);
      window.removeEventListener('resize',updateProgress);
    };
  },[pathname]);
  return null;
}
