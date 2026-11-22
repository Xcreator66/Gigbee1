import Link from 'next/link';
import Image from 'next/image';
import {rupees,type Job} from '@gigbee/shared';
import {Icon} from './Icon';

const skillImages:Record<string,string>={
  'Design':'design','Video Editing':'video-editing','Writing':'writing',
  'Development':'development','Marketing':'marketing','Data':'data','Other':'other'
};

export default function JobCard({job}:{job:Job}){
  const image=skillImages[job.category]??'other';
  return <Link href={`/jobs/${job.id}`} className="job-tile job-tile-v05">
    <div className="job-tile-top">
      <span className="job-card-identity"><Image src={`/skills/${image}.png`} width={53} height={53} alt=""/><span className="pill pill-lilac">{job.category}</span></span>
      <span className="job-price">{rupees(job.budget_inr)}</span>
    </div>
    <h3>{job.title}</h3><p>{job.description}</p>
    <div className="job-tile-foot"><span><Icon name="clock" size={15}/> {new Date(job.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span><span className="job-arrow"><Icon name="arrow" size={18}/></span></div>
  </Link>;
}
