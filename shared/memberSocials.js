import {safeWidgetUrl} from './customWidgetDocument.js';
export function memberSocials(person) {
 const candidates=[person.url,...['github','linkedin','instagram','fossUnited','website'].map(key=>person[key]),...(person.socials||[]).map(link=>link.url)];
 const seen=new Set();
 return candidates.flatMap(value=>{
  const url=safeWidgetUrl(value);if(!url||url.startsWith('/')||seen.has(url))return [];seen.add(url);
  let provider='website';
  try{const host=new URL(url).hostname.toLowerCase().replace(/^www\./,'');if(['github.com','linkedin.com','instagram.com'].includes(host))provider=host.split('.')[0];if(url.startsWith('mailto:'))provider='email';}catch{return [];}
  if(['github','linkedin','instagram'].includes(provider)&&Object.hasOwn(person,provider)&&url!==person[provider])return [];
  return [{url,provider,label:{github:'GitHub',linkedin:'LinkedIn',instagram:'Instagram',email:'Email',website:'Website'}[provider]}];
 });
}
export function inlineTeamLinks(page) {
 const next=structuredClone(page);
 const people=next.containers.filter(c=>!c.hidden).flatMap(c=>c.widgets.filter(w=>w.type==='people'&&w.settings.source!=='club').flatMap(w=>w.settings.people||[]));
 next.containers=next.containers.flatMap(container=>{
  if(container.hidden)return [container];
  let removed=false;
  container.widgets=container.widgets.filter(widget=>{
   if(widget.type!=='links'||widget.settings.title!=='Connect with our team')return true;
   widget.settings.links=(widget.settings.links||[]).filter(link=>{
    const matches=people.filter(person=>link.label?.startsWith(`${person.name} · `));
    if(matches.length!==1)return true;
    const person=matches[0];person.socials=[...(person.socials||[]),{label:link.label.split(' · ').at(-1),url:link.url}];return false;
   });
   if(widget.settings.links.length)return true;removed=true;return false;
  });
  return removed&&!container.widgets.length?[]:[container];
 });
 return next;
}
