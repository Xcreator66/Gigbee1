import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import {Icon} from '../components/Icon';
import './globals.css';
import './gigbee-motion.css';
import './gigbee-layout-v04.css';
import './gigbee-visual-v05.css';
import './gigbee-redesign-v06.css';
import './gigbee-app-v10.css';
import './settings/settings.css';
import MotionEffects from '../components/MotionEffects';
export const metadata: Metadata={title:{default:'GigBee — Learn. Work. Grow.',template:'%s | GigBee'},
  description:'Discover freelance opportunities, apply for free and build your professional identity. GigBee connects emerging talent with independent clients.',
  openGraph:{title:'GigBee — Learn. Work. Grow.',description:'A better way to find your next opportunity.'}};
export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="en"><body><MotionEffects/><div className="scroll-progress" aria-hidden="true"/><a className="skip-link" href="#main-content">Skip to main content</a>
   <div className="announcement"><span className="live-dot"/> <strong>We’re building GigBee.</strong> The marketplace is in early development. <Link href="/about">See what’s coming <span aria-hidden="true">→</span></Link></div>
   <header className="site-header"><div className="shell nav-inner"><Link className="brand" href="/" aria-label="GigBee homepage"><Image src="/brand-mark.png" alt="" width={39} height={43} priority/><span>Gig<span>Bee</span><i>.</i></span></Link>
     <nav className="desktop-nav" aria-label="Main navigation"><Link href="/jobs">Find work</Link><Link href="/freelancers">Explore talent</Link><Link href="/for-clients">For clients</Link><Link href="/how-it-works">How it works</Link><Link href="/learn">Academy</Link><Link href="/services">Services</Link></nav>
     <div className="nav-account-links"><Link href="/sign-in">Log in</Link><Link className="header-action" href="/dashboard">My workspace <Icon name="arrow" size={17}/></Link></div>
     <details className="mobile-nav"><summary aria-label="Open navigation"><Icon name="menu" size={24}/></summary><nav aria-label="Mobile navigation"><Link href="/jobs">Find work</Link><Link href="/freelancers">Explore talent</Link><Link href="/for-clients">For clients</Link><Link href="/how-it-works">How it works</Link><Link href="/verify">Work verification</Link><Link href="/about">About GigBee</Link><Link href="/learn">Academy</Link><Link href="/services">Services</Link><Link href="/rankings">Rankings</Link><Link href="/sign-in">Sign in</Link><Link href="/dashboard">Dashboard</Link><Link href="/settings">Account settings</Link></nav></details>
   </div></header>
   <main id="main-content">{children}</main>
   <footer className="site-footer"><div className="shell"><div className="footer-top"><div className="footer-about"><Link href="/" className="brand brand-footer"><Image src="/brand-mark.png" alt="" width={36} height={40}/><span>Gig<span>Bee</span><i>.</i></span></Link><p>Learn. Work. Grow.</p><p>A community-first place for people building careers through real freelance work.</p></div>
      <div className="footer-links"><div><h3>Explore</h3><Link href="/jobs">Find opportunities</Link><Link href="/freelancers">Public talent</Link><Link href="/how-it-works">How it works</Link><Link href="/learn">GigBee Academy</Link><Link href="/services">Services</Link><Link href="/rankings">Rankings</Link></div><div><h3>GigBee</h3><Link href="/for-clients">For clients</Link><Link href="/about">About the platform</Link><Link href="/verify">Verification</Link><Link href="/billing">Payment activity</Link><Link href="/settings">Account settings</Link><Link href="/delete-account">Account deletion</Link></div></div></div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} GigBee. Built for what’s next.</span><span>Live data only · No fabricated jobs, earnings or credentials</span></div>
   </div></footer>
 </body></html>;
}
