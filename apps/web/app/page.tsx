import Link from 'next/link';
import Image from 'next/image';
import {type Job,categories} from '@gigbee/shared';
import {getPublicSupabase} from '../lib/supabase';
import {Icon} from '../components/Icon';
import JobCard from '../components/JobCard';
import HeroExperience from '../components/HeroExperience';
import JourneyStudio from '../components/JourneyStudio';

export const dynamic='force-dynamic';

const categoriesVisual:Record<string,{slug:string,description:string,tag:string}>={
  'Design':{slug:'design',description:'Identity, UI & visual storytelling',tag:'CREATE'},
  'Video Editing':{slug:'video-editing',description:'Make stories move',tag:'MOTION'},
  'Writing':{slug:'writing',description:'Ideas worth reading',tag:'WORDS'},
  'Development':{slug:'development',description:'Build what’s next',tag:'BUILD'},
  'Marketing':{slug:'marketing',description:'Get ideas noticed',tag:'REACH'},
  'Data':{slug:'data',description:'Make sense of the numbers',tag:'INSIGHT'},
  'Other':{slug:'other',description:'Your skill, your way',tag:'EXPLORE'},
};
const questions=[
  ['Is it free to apply?','Yes. The current GigBee foundation does not charge freelancers credits or tokens to submit applications. Fair-use and anti-spam controls still apply.'],
  ['Can beginners join?','Yes. You can build a profile and apply for suitable published projects. You can also explore free courses and practice assessments inside GigBee.'],
  ['Can I hire and freelance with one account?','Yes. Your GigBee identity supports both freelancer and client roles without creating another account.'],
  ['What does a verified record mean?','Work records are generated after client-approved delivery, and course certificates after passing creator assessments. They are not independent accreditation or proof of payment. Payment collection is disabled until provider onboarding.'],
];

export default async function HomePage(){
  const db=getPublicSupabase();
  const [countRes,jobsRes]=db?await Promise.all([
    db.from('jobs').select('id',{count:'exact',head:true}).eq('status','open'),
    db.from('jobs').select('*').eq('status','open').order('created_at',{ascending:false}).limit(3)
  ]):([{count:null},{data:[]}] as const);
  const jobs=(jobsRes.data??[]) as Job[];
  return <>
    <section className="hero-modern hero-v3 v6-hero" aria-labelledby="hero-heading">
      <div className="hero-grain" aria-hidden="true"/><div className="hero-ambient hero-ambient-a" aria-hidden="true"/><div className="hero-ambient hero-ambient-b" aria-hidden="true"/><div className="v6-hero-grid" aria-hidden="true"/>
      <div className="shell hero-columns">
        <div className="hero-copy">
          <div className="v6-kicker v6-kicker-light"><span className="v6-kicker-dot"/> THE NEXT GENERATION OF WORK <span aria-hidden="true">✳</span></div>
          <h1 id="hero-heading">Big ideas.<br/><span className="v6-hero-outline">Real skills.</span><br/><span className="hero-highlight">New moves<span className="headline-spark" aria-hidden="true">✳</span></span></h1>
          <p>Find freelance opportunities, put your skills to work, and grow at your own pace. <strong>Less gatekeeping. More getting started.</strong></p>
          <div className="hero-actions"><Link className="btn btn-yellow hero-main-cta" href="/jobs">Explore opportunities <Icon name="arrow" size={18}/></Link><Link className="btn btn-glass" href="/for-clients">I’m hiring talent <Icon name="arrow-right" size={18}/></Link></div>
          <div className="v6-hero-signals"><span><Icon name="check" size={16}/> Free applications</span><span><Icon name="check" size={16}/> One shared identity</span><span><Icon name="check" size={16}/> India-first</span></div>
        </div>
        <HeroExperience/>
      </div>
      <div className="v6-marquee" aria-label="Learn. Work. Grow."><div className="v6-marquee-track" aria-hidden="true">{Array.from({length:4}).map((_,i)=><span key={i}>FIND YOUR THING <i>✳</i> MAKE YOUR MOVE <i>✳</i> GROW YOUR WAY <i>✳</i></span>)}</div></div>
    </section>

    <section className="v6-facts" aria-label="GigBee platform highlights"><div className="shell v6-facts-inner">
      <div><span className="v6-fact-icon"><Icon name="wallet" size={22}/></span><div><strong>₹0 to apply</strong><small>No paid proposal tokens</small></div></div>
      <div><span className="v6-fact-icon"><Icon name="users" size={22}/></span><div><strong>One account</strong><small>Freelance and hire</small></div></div>
      <div><span className="v6-fact-icon"><Icon name="globe" size={22}/></span><div><strong>Open possibilities</strong><small>Explore skills and gigs</small></div></div>
      <div className="v6-fact-link"><Link href="/how-it-works">How GigBee works <Icon name="arrow" size={19}/></Link></div>
    </div></section>

    <section className="v6-section v6-category-section" id="opportunities"><div className="shell">
      <div className="v6-section-head"><div><span className="v6-kicker"><span className="v6-kicker-dot"/> DISCOVER YOUR LANE</span><h2>Do what you love.<br/><em>Find what’s next.</em></h2></div><div className="v6-heading-side"><p>From your first creative project to a new technical challenge, there’s space for every kind of skill.</p><Link href="/jobs" className="v6-text-link">Explore all categories <Icon name="arrow" size={18}/></Link></div></div>
      <div className="v6-skill-grid">{categories.map((category,i)=>{const meta=categoriesVisual[category]??categoriesVisual['Other'];return <Link key={category} href={`/jobs?category=${encodeURIComponent(category)}`} className={`v6-skill-card v6-skill-${i}`}>
        <span className="v6-skill-meta">{meta.tag}<span>{String(i+1).padStart(2,'0')}</span></span>
        <span className="v6-skill-image"><Image src={`/skills/${meta.slug}.png`} width={160} height={160} alt=""/></span>
        <span className="v6-skill-footer"><span><strong>{category}</strong><small>{meta.description}</small></span><span className="v6-round-arrow"><Icon name="arrow" size={19}/></span></span>
        <span className="v6-skill-orbit" aria-hidden="true"/>
      </Link>})}<Link href="/jobs" className="v6-skill-card v6-skill-all">
        <span className="v6-skill-meta">THE WHOLE WORLD <span>08</span></span><span className="v6-skill-image"><Image src="/skills/all.png" width={160} height={160} alt=""/></span>
        <span className="v6-skill-footer"><span><strong>All opportunities</strong><small>Find your next direction</small></span><span className="v6-round-arrow"><Icon name="arrow" size={19}/></span></span><span className="v6-skill-orbit" aria-hidden="true"/>
      </Link></div>
    </div></section>

    <section className="v6-discover-band"><div className="shell v6-discover-inner"><span className="v6-small-spark" aria-hidden="true">✳</span><p>GOOD WORK DOESN’T NEED A PERFECT START. <strong>IT NEEDS A CHANCE.</strong></p><span className="v6-small-spark" aria-hidden="true">↗</span></div></section>

    <section className="v6-section v6-process-section" id="how"><div className="shell">
      <div className="v6-section-head"><div><span className="v6-kicker"><span className="v6-kicker-dot"/> FROM DAY ONE</span><h2>Less figuring out.<br/><em>More moving forward.</em></h2></div><div className="v6-heading-side"><p>A straightforward path from discovering a project to applying with confidence. No pointless extra steps.</p><Link href="/how-it-works" className="v6-text-link">Explore the full journey <Icon name="arrow" size={18}/></Link></div></div>
      <div className="v6-process-layout">
        <div className="v6-process-list">
          <article className="v6-process-item"><span className="v6-process-number">01</span><div><span className="v6-step-tag">DISCOVER</span><h3>Find your thing.</h3><p>Filter genuine published projects by category, budget and what you’re good at.</p></div><span className="v6-process-icon"><Icon name="search" size={23}/></span></article>
          <article className="v6-process-item"><span className="v6-process-number">02</span><div><span className="v6-step-tag">CONNECT</span><h3>Make your move.</h3><p>Send a thoughtful application on GigBee web or mobile without paying for bids.</p></div><span className="v6-process-icon"><Icon name="arrow" size={23}/></span></article>
          <article className="v6-process-item"><span className="v6-process-number">03</span><div><span className="v6-step-tag">GROW</span><h3>Build your story.</h3><p>Build a portfolio, take free courses, and earn a verifiable record after client-approved work.</p></div><span className="v6-process-icon"><Icon name="chart" size={23}/></span></article>
        </div>
        <div className="v6-process-graphic" aria-label="Illustrated GigBee opportunity journey">
          <span className="v6-graphic-deco v6-graphic-deco-a" aria-hidden="true">✷</span><span className="v6-graphic-deco v6-graphic-deco-b" aria-hidden="true">✦</span>
          <div className="v6-profile-float"><span className="v6-avatar-square">G</span><span><strong>YOUR NEXT CHAPTER</strong><small>Discover · Apply · Grow</small></span><Icon name="check" size={19}/></div>
          <div className="v6-graphic-card"><div className="v6-graphic-card-top"><span>GIGBEE / YOUR JOURNEY</span><span>↗</span></div><div className="v6-graphic-orb"><Image src="/skills/design.png" width={170} height={170} alt=""/></div><div className="v6-graphic-card-bottom"><span>One step at a time</span><strong>Make it happen.</strong><small>Every great story starts somewhere.</small></div></div>
          <div className="v6-graphic-sticker">SKILLS <span>✳</span> OPPORTUNITY</div>
        </div>
      </div>
    </div></section>

    <JourneyStudio/>

    <section className="v6-section v6-live-section" id="jobs"><div className="shell"><div className="v6-section-head"><div><span className="v6-kicker"><span className="v6-kicker-dot"/> REAL OPPORTUNITIES ONLY</span><h2>The right gig.<br/><em>Your next move.</em></h2></div><div className="v6-heading-side"><p>Open projects come from GigBee’s shared Supabase database. We don’t fill this space with fictional jobs.</p><Link href="/jobs" className="v6-text-link">View all gigs <Icon name="arrow" size={18}/></Link></div></div>
       {jobs.length?<div className="job-grid v6-jobs-grid">{jobs.map(job=><JobCard key={job.id} job={job}/>)}</div>:<div className="v6-jobs-waiting">
         <div className="v6-waiting-art"><div className="v6-waiting-orbit"><Image src="/skills/all.png" width={175} height={175} alt=""/></div><span className="v6-waiting-star" aria-hidden="true">✳</span></div>
         <div className="v6-waiting-content"><span className="v6-availability">{db?'NO OPEN PROJECTS RIGHT NOW':'MARKETPLACE IN DEVELOPMENT'}</span><h3>{db?'Good things are worth looking for.':'The next opportunity starts here.'}</h3><p>{db?'No projects are currently open. Check the public job board for new listings.':'Connect a dedicated GigBee Supabase project to publish real opportunities. The design is ready, but no sample jobs are presented as real.'}</p><div className="v6-waiting-actions"><Link href="/jobs" className="btn btn-yellow">Explore the job board <Icon name="arrow" size={18}/></Link><Link href="/how-it-works" className="v6-waiting-secondary">How it works <Icon name="arrow-right" size={18}/></Link></div></div>
         <span className="v6-waiting-count">{countRes.count===null?'—':countRes.count} <small>OPEN GIGS</small></span>
       </div>}
    </div></section>

    <section className="v6-section v6-sides-section"><div className="shell"><div className="v6-section-head v6-light-head"><div><span className="v6-kicker v6-kicker-light"><span className="v6-kicker-dot"/> TWO SIDES. ONE COMMUNITY.</span><h2>Good work happens<br/><em>together.</em></h2></div><p>Whether you’re offering your skills or building a team, there’s a place for you at GigBee.</p></div>
    <div className="v6-sides-grid">
      <article className="v6-side-card v6-side-maker"><div className="v6-side-top"><span>01 / FOR FREELANCERS</span><span className="v6-side-symbol"><Icon name="sparkles" size={22}/></span></div><h3>Make your talent<br/>your next move.</h3><p>Explore projects that fit your skills. Apply for free. Build something you’re proud of.</p><div className="v6-side-visual"><span className="v6-side-caption">YOUR SPACE TO CREATE</span><div className="v6-side-visual-inside"><Image src="/skills/design.png" width={115} height={115} alt=""/><span><b>Find a skill.<br/>Find a fit.</b><small>Design · Writing · Code</small></span></div></div><Link href="/jobs" className="v6-side-button">Explore opportunities <Icon name="arrow" size={19}/></Link></article>
      <article className="v6-side-card v6-side-hirer"><div className="v6-side-top"><span>02 / FOR CLIENTS</span><span className="v6-side-symbol"><Icon name="users" size={22}/></span></div><h3>Big ideas need<br/>great collaborators.</h3><p>Turn your next project into a clear brief and connect with people ready to bring it to life.</p><div className="v6-side-visual"><span className="v6-side-caption">YOUR SPACE TO BUILD</span><div className="v6-side-visual-inside"><Image src="/skills/development.png" width={115} height={115} alt=""/><span><b>Your next project<br/>starts here.</b><small>Brief · Connect · Build</small></span></div></div><Link href="/for-clients" className="v6-side-button">Discover how to hire <Icon name="arrow" size={19}/></Link></article>
    </div></div></section>

    <section className="v6-section v6-difference-section"><div className="shell"><div className="v6-section-head"><div><span className="v6-kicker"><span className="v6-kicker-dot"/> WHY GIGBEE</span><h2>Built different.<br/><em>For good reason.</em></h2></div><p>Not a wall of badges or buzzwords. Just a platform designed around giving people a real way in.</p></div>
       <div className="v6-bento">
         <article className="v6-bento-card v6-bento-primary"><span className="v6-bento-overline">01 / FAIR ACCESS</span><span className="v6-bento-art" aria-hidden="true">₹<span>0</span></span><div><span className="v6-bento-chip"><Icon name="check" size={15}/> CURRENT FOUNDATION</span><h3>No paid bids.<br/>No unnecessary barriers.</h3><p>Applying to relevant jobs should not cost you a stack of credits. Free applications are core to GigBee.</p></div></article>
         <article className="v6-bento-card v6-bento-profile"><span className="v6-bento-overline">02 / ONE IDENTITY</span><div className="v6-bento-account"><span className="v6-bento-avatar">G</span><div><b>Your GigBee account</b><small>Work mode <span>↔</span> Hire mode</small></div><span className="v6-bento-ok"><Icon name="check" size={17}/></span></div><div><h3>One account.<br/>Both sides of the table.</h3><p>Your freelancer and client experiences stay connected.</p></div></article>
         <article className="v6-bento-card v6-bento-proof"><span className="v6-bento-overline">03 / TRUST, EARNED</span><div className="v6-bento-badge"><Icon name="shield" size={58}/><span>PROOF<br/>MATTERS</span></div><div><span className="v6-planned-pill">ON OUR ROADMAP</span><h3>Proof over promises.</h3><p>Client-approved projects can generate public verification codes, and completed work supports reviews. No fabricated testimonials or fake employment records.</p></div></article>
       </div>
    </div></section>

    <section className="v6-section v6-roadmap-section"><div className="shell v6-roadmap-layout"><div><span className="v6-kicker"><span className="v6-kicker-dot"/> THE ROAD AHEAD</span><h2>Start simple.<br/><em>Build something big.</em></h2><p>GigBee is being developed in deliberate stages. Here’s what’s available in source and what still needs to be brought to life.</p><Link href="/about" className="v6-text-link">See our complete roadmap <Icon name="arrow" size={18}/></Link></div><div className="v6-roadmap-timeline">
      <article><span className="v6-roadmap-node"/><div className="v6-roadmap-item-heading"><span>01 / FOUNDATION</span><span className="v6-roadmap-state-now">IN SOURCE</span></div><h3>Profiles. Jobs. Free applications.</h3><p>Core flows developed. A dedicated backend, deployment, and end-to-end validation are still required.</p></article>
      <article><span className="v6-roadmap-node"/><div className="v6-roadmap-item-heading"><span>02 / TRUST</span><span className="v6-roadmap-state-next">IN SOURCE</span></div><h3>Real work history and payment integration.</h3><p>Provider integration is coded but remains disabled until merchant verification. Approved work, ratings and credentials are implemented in source.</p></article>
      <article><span className="v6-roadmap-node"/><div className="v6-roadmap-item-heading"><span>03 / GROWTH</span><span className="v6-roadmap-state-next">IN SOURCE</span></div><h3>Learning and experience connected.</h3><p>Courses, creator tools and skill assessments are implemented in source; live validation and creator payouts remain outstanding.</p></article>
    </div></div></section>

    <section className="v6-section v6-faq-section" id="faq"><div className="shell v6-faq-layout"><div><span className="v6-kicker"><span className="v6-kicker-dot"/> GOOD QUESTIONS</span><h2>Wondering<br/><em>about something?</em></h2><p>Here’s what GigBee does today, and what we’re building for tomorrow.</p><div className="v6-faq-doodle" aria-hidden="true">?</div></div><div className="v6-faq-list">{questions.map(([q,a],i)=><details key={q} className="v6-faq-item"><summary><span>{String(i+1).padStart(2,'0')}</span><strong>{q}</strong><span className="v6-faq-toggle" aria-hidden="true">+</span></summary><p>{a}</p></details>)}</div></div></section>

    <section className="shell v6-bottom-wrap"><div className="v6-bottom-cta"><div className="v6-bottom-spark" aria-hidden="true">✳</div><div><span className="v6-kicker v6-kicker-light"><span className="v6-kicker-dot"/> YOUR NEXT CHAPTER</span><h2>Don’t wait for<br/><em>your big break.</em></h2><p>Start exploring the possibilities. Your skills have somewhere to go.</p><div className="v6-bottom-actions"><Link href="/jobs" className="btn btn-yellow">Find your next gig <Icon name="arrow" size={18}/></Link><Link href="/for-clients" className="btn btn-glass">Explore hiring <Icon name="arrow-right" size={18}/></Link></div></div><div className="v6-bottom-art" aria-hidden="true"><div className="v6-bottom-ring"/><Image src="/brand-mark.png" width={220} height={220} alt=""/></div></div></section>
  </>;
}
