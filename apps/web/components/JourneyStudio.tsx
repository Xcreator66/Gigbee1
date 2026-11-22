'use client';

import {useState} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {Icon} from './Icon';

const chapters=[
  {id:'discover',number:'01',eyebrow:'DISCOVER',headline:'Find work that',accent:'feels like you.',body:'Explore project categories and uncover opportunities that match the skills you already have—or want to build.',label:'EXPLORE YOUR CREATIVE SIDE',tag:'Discover skills',image:'/skills/design.png',detail:'Design · Video · Writing · Development',href:'/jobs',button:'Explore open projects',tone:'violet'},
  {id:'connect',number:'02',eyebrow:'CONNECT',headline:'Make your move.',accent:'No bidding tokens.',body:'Choose a brief that fits, send a thoughtful application from the mobile app, and introduce yourself on your own terms.',label:'A BETTER START',tag:'Free applications',image:'/skills/video-editing.png',detail:'Find a brief · Share your work · Apply',href:'/how-it-works',button:'See how it works',tone:'gold'},
  {id:'grow',number:'03',eyebrow:'GROW',headline:'More than a gig.',accent:'A growing story.',body:'Give your projects and skills a place to live. Reviews, assessments, and verified work records are planned for later releases.',label:'BUILT FOR YOUR NEXT CHAPTER',tag:'Your career, your pace',image:'/skills/data.png',detail:'Profile · Projects · Future credentials',href:'/about',button:'Explore our roadmap',tone:'pink'}
] as const;

export default function JourneyStudio(){
  const [active,setActive]=useState(0);
  const item=chapters[active];
  return <section className="journey-section" aria-labelledby="journey-title">
    <div className="shell journey-shell">
      <div className="journey-topline"><span className="eyebrow-light journey-overline"><span/> YOUR JOURNEY, REIMAGINED</span><span className="journey-counter">{item.number} <small>/ 03</small></span></div>
      <div className="journey-tabs" role="tablist" aria-label="Explore your GigBee journey">
        {chapters.map((step,index)=><button key={step.id} type="button" role="tab" id={`journey-tab-${step.id}`} aria-controls="journey-panel" aria-selected={active===index} onClick={()=>setActive(index)} className={`journey-tab ${active===index?'is-active':''}`}><span>{step.number}</span>{step.eyebrow}<Icon name="arrow-right" size={16}/></button>)}
      </div>
      <div className={`journey-panel journey-tone-${item.tone}`} role="tabpanel" id="journey-panel" aria-labelledby={`journey-tab-${item.id}`}>
        <div key={item.id} className="journey-information">
          <span className="journey-tag"><span className="journey-tag-dot"/> {item.eyebrow} / {item.number}</span>
          <h2 id="journey-title">{item.headline}<br/><em>{item.accent}</em></h2>
          <p>{item.body}</p>
          <Link href={item.href} className="journey-cta">{item.button}<Icon name="arrow" size={19}/></Link>
        </div>
        <div className="journey-canvas" aria-label={`Illustrated GigBee preview: ${item.tag}`}>
          <div className="journey-orbit journey-orbit-a" aria-hidden="true"/><div className="journey-orbit journey-orbit-b" aria-hidden="true"/>
          <span className="journey-floating-label" aria-hidden="true">YOUR NEXT MOVE <span>✳</span></span>
          <div key={`card-${item.id}`} className="journey-visual-card">
            <div className="journey-visual-heading"><span className="journey-visual-brand">Gig<span>Bee</span><i>.</i></span><span className="journey-visual-dots"><b/><b/><b/></span></div>
            <div className="journey-visual-image"><Image src={item.image} width={142} height={140} alt=""/></div>
            <span className="journey-visual-caption">{item.label}</span>
            <strong>{item.tag}</strong>
            <span className="journey-visual-detail">{item.detail}</span>
            <div className="journey-visual-bottom"><span>MAKE IT HAPPEN</span><span aria-hidden="true">↗</span></div>
          </div>
          <span className="journey-stamp" aria-hidden="true">LEARN <span>✳</span> WORK <span>✳</span> GROW</span>
        </div>
      </div>
    </div>
  </section>;
}
