import { memberSocials } from './memberSocials.js';
function Icon({provider}) {
 return <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  {provider==='github'?<><path d="M9 19c-4.3 1.3-4.3-2.5-6-3m12 6v-3.9a3.4 3.4 0 0 0-.9-2.7c3-.3 6.2-1.5 6.2-6.9A5.4 5.4 0 0 0 18.8 4.8 5 5 0 0 0 18.7 1S17.5.7 15 2.5a13.4 13.4 0 0 0-7 0C5.5.7 4.3 1 4.3 1a5 5 0 0 0-.1 3.8 5.4 5.4 0 0 0-1.5 3.7c0 5.4 3.2 6.6 6.2 6.9A3.4 3.4 0 0 0 8 18.1V22"/></>:provider==='linkedin'?<><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 10v7m0-10v.01M11 17v-7m0 3a3 3 0 0 1 6 0v4"/></>:provider==='instagram'?<><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/></>:provider==='email'?<><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/></>:<><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a18 18 0 0 1 0 18 18 18 0 0 1 0-18"/></>}
 </svg>;
}
export default function MemberSocialLinks({person}) {
 const links=memberSocials(person);
 return links.length>0&&<nav className="nexus-member-socials" aria-label={`${person.name} social profiles`}>{links.map(link=><a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" aria-label={`${person.name} on ${link.label}`} title={link.label}><Icon provider={link.provider}/></a>)}</nav>;
}
