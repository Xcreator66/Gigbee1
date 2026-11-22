'use client';

import {useRef,useState,type PointerEvent} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {Icon} from './Icon';

type Persona='freelancer'|'client';

export default function HeroExperience(){
  const [persona,setPersona]=useState<Persona>('freelancer');
  const stage=useRef<HTMLDivElement>(null);
  function handlePointerMove(event:PointerEvent<HTMLDivElement>){
    if(event.pointerType==='touch' || !stage.current) return;
    const rect=event.currentTarget.getBoundingClientRect();
    const x=((event.clientX-rect.left)/rect.width-.5)*2;
    const y=((event.clientY-rect.top)/rect.height-.5)*2;
    stage.current.style.setProperty('--pointer-x',x.toFixed(3));
    stage.current.style.setProperty('--pointer-y',y.toFixed(3));
  }
  function resetPointer(){
    stage.current?.style.setProperty('--pointer-x','0');
    stage.current?.style.setProperty('--pointer-y','0');
  }
  return <div className="experience-stage" ref={stage} onPointerMove={handlePointerMove} onPointerLeave={resetPointer} aria-label="Interactive illustration of a future GigBee mobile interface">
    <div className="stage-glow" aria-hidden="true"/>
    <div className="stage-rings" aria-hidden="true"><span/><span/><span/></div>
    <div className="stage-decoration stage-decoration-cross" aria-hidden="true">✳</div>
    <div className="stage-decoration stage-decoration-square" aria-hidden="true"/>
    <div className="stage-decoration stage-decoration-star" aria-hidden="true">✦</div>
    <div className="stage-float stage-float-top" aria-hidden="true"><span className="float-mark"><Icon name="zap" size={17}/></span><span>MAKE YOUR NEXT MOVE <b>↗</b></span></div>
    <div className="experience-device">
      <div className="device-island" aria-hidden="true"/>
      <div className="device-head"><span className="device-brand"><Image src="/brand-mark.png" alt="" width={26} height={28}/>GigBee<span>.</span></span><span className="device-avatar" aria-hidden="true">G</span></div>
      <div className="device-caption">YOUR SPACE TO GROW <span>✳</span></div>
      <div className="device-toggle" role="group" aria-label="Switch preview perspective">
        <button type="button" aria-pressed={persona==='freelancer'} className={persona==='freelancer'?'selected':''} onClick={()=>setPersona('freelancer')}>Find work</button>
        <button type="button" aria-pressed={persona==='client'} className={persona==='client'?'selected':''} onClick={()=>setPersona('client')}>Hire talent</button>
      </div>
      <div key={persona} className="device-content">
        <div className="device-eyebrow">{persona==='freelancer'?'YOUR NEXT CHAPTER':'MAKE GREAT THINGS'}</div>
        <h3>{persona==='freelancer'?<>Your talent.<br/><em>Your move.</em></>:<>The right skills.<br/><em>Right here.</em></>}</h3>
        <p>{persona==='freelancer'?'Discover projects that fit what you can do.':'Build your team around the work that matters.'}</p>
        <div className="device-search"><Icon name="search" size={17}/><span>{persona==='freelancer'?'Explore projects & skills':'Discover skilled people'}</span><Icon name="filter" size={16}/></div>
        <div className="device-feature">
          <div className="device-feature-head"><span className="device-small-label">{persona==='freelancer'?'EXPLORE A SKILL':'START WITH A BRIEF'}</span><span className="device-feature-spark">✳</span></div>
          <div className="device-feature-title">{persona==='freelancer'?<>Turn what you love<br/>into what you do.</>:<>Your idea deserves<br/>the right talent.</>}</div>
          <div className="device-feature-foot"><span>{persona==='freelancer'?'Design · Video · Tech':'Plan · Post · Connect'}</span><span className="device-feature-arrow"><Icon name="arrow" size={17}/></span></div>
        </div>
        <div className="device-mini-feed"><span className="mini-feed-symbol"><Icon name={persona==='freelancer'?'compass':'users'} size={19}/></span><div><b>{persona==='freelancer'?'Opportunities, without paid bids':'One account, both sides'}</b><small>{persona==='freelancer'?'Browse. Apply. Build momentum.':'Find people ready to collaborate.'}</small></div><Icon name="arrow-right" size={16}/></div>
      </div>
      <div className="device-nav"><div className="active"><Icon name="compass" size={17}/>Explore</div><div><Icon name="briefcase" size={17}/>Work</div><div><Icon name="user" size={17}/>Profile</div></div>
    </div>
    <div className="stage-float stage-float-bottom" aria-hidden="true"><span className="float-mark gold"><Icon name="check" size={17}/></span><div><strong>YOUR SKILLS. YOUR WAY.</strong><small>Built for what comes next</small></div></div>
    <div className="stage-caption">INTERACTIVE PRODUCT CONCEPT <span>·</span> NOT LIVE DATA</div>
    <Link className="stage-quick-link" href={persona==='freelancer'?'/jobs':'/for-clients'} aria-label={persona==='freelancer'?'Explore open jobs':'Explore hiring on GigBee'}><Icon name="arrow" size={18}/></Link>
  </div>;
}
