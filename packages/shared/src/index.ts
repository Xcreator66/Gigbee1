export const BRAND = {name:'GigBee',tagline:'Learn. Work. Grow.'} as const;
export const colors = {
  navy:'#0B0F2D',violet:'#6546F5',yellow:'#FFC72C',white:'#F3F1FF',
  ink:'#17203B',muted:'#718096',border:'#E7E9F3',background:'#F8F9FD',
  soft:'#F1EDFF',mint:'#C7F4EA',peach:'#FFE8D5',blue:'#DAF0FF',
} as const;
export type GigBeeRole='freelancer'|'client'|'learner'|'creator';
export type Job={id:string;client_id:string;title:string;description:string;category:string;budget_inr:number;status:'open'|'closed';created_at:string};
export type Profile={id:string;display_name:string;username:string|null;headline:string;bio:string;is_public:boolean;avatar_path?:string|null;city?:string|null;website?:string|null;availability?:string;created_at:string};
export type Application={id:string;job_id:string;freelancer_id:string;proposal:string;status:'submitted'|'withdrawn'|'accepted'|'declined';created_at:string};
export type Project={id:string;job_id:string;application_id:string;client_id:string;freelancer_id:string;status:'active'|'delivered'|'revision_requested'|'completed'|'disputed'|'cancelled';agreed_budget_inr:number;payment_status:'unpaid'|'link_created'|'captured'|'refunded'|'failed';created_at:string;completed_at:string|null};
export type Deliverable={id:string;project_id:string;freelancer_id:string;note:string;file_path:string|null;status:'submitted'|'revision_requested'|'accepted';created_at:string};
export type Message={id:string;project_id:string;sender_id:string;body:string;created_at:string;read_at:string|null};
export type Certificate={id:string;code:string;owner_id:string;kind:'work'|'course';title:string;project_id:string|null;course_id:string|null;issued_at:string;revoked_at:string|null};
export type Course={id:string;creator_id:string;title:string;description:string;category:string;cover_path:string|null;price_inr:number;status:'draft'|'published'|'archived';created_at:string};
export type Lesson={id:string;course_id:string;title:string;content:string;video_url:string|null;position:number};
export type Notification={id:string;user_id:string;title:string;body:string;href:string|null;is_read:boolean;created_at:string};
export const categories=['Design','Video Editing','Writing','Development','Marketing','Data','Other'] as const;
export const rupees=(n:number)=>`₹${Number(n).toLocaleString('en-IN')}`;
export const shortDate=(s:string)=>new Date(s).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
export const PROJECT_STEPS=['active','delivered','revision_requested','completed','disputed','cancelled'] as const;
export const isUuid=(s:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
export const publicProfileLink=(username:string)=>`/u/${encodeURIComponent(username)}`;
export const publicCertificateLink=(code:string)=>`/verify/${encodeURIComponent(code)}`;
