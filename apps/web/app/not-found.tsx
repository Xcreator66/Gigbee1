import Link from 'next/link';
import {Icon} from '../components/Icon';
export default function NotFound(){return <div className="shell section-block empty"><div className="jobs-empty-icon"><Icon name="compass" size={33}/></div><h1>Looks like this page flew away.</h1><p>The link may be outdated, or this profile or listing is no longer public.</p><Link className="btn btn-dark" href="/">Back to GigBee <Icon name="arrow-right" size={18}/></Link></div>}
