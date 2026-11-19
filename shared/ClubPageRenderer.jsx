import MemberSocialLinks from './MemberSocialLinks.jsx';
import { inlineTeamLinks } from './memberSocials.js';
import { memberInitials } from './memberInitials.js';
import { Fragment, useState } from 'react';
import { resolveWidgetPeople } from './widgetPeople.js';
import { buildCustomWidgetDocument, safeWidgetUrl, embedWidgetUrl } from './customWidgetDocument.js';
import './club-page.css';
import { widgetTextRuns } from './widgetText.js';
const safeImage = value => safeWidgetUrl(value,{image:true});
function ContentImage({ src, alt = '', className }) {
 const [failed, setFailed] = useState(false);
 const url = safeImage(src);
 if (!url) return null;
 return failed
  ? <div className={`nexus-image-unavailable ${className || ''}`} role="img" aria-label={alt ? `${alt} (image unavailable)` : 'Image unavailable'}>Image unavailable</div>
  : <img loading="lazy" src={url} alt={alt} className={className} onError={() => setFailed(true)}/>;
}
function MemberPhoto({ person }) {
 const [failed, setFailed] = useState(false);
 const src = safeImage(person.image);
 return src && !failed
  ? <img loading="lazy" src={src} alt={person.name} onError={() => setFailed(true)}/>
  : <span className="nexus-person-initial" aria-hidden="true">{memberInitials(person.name)}</span>;
}
function WidgetLink({url,children}) { const href=safeWidgetUrl(url); return href ? <a href={href} target={href.startsWith('http')?'_blank':undefined} rel="noopener noreferrer">{children}</a> : <span>{children}</span>; }
function CustomWidget({settings,executeCustomCode}) {
 const [running,setRunning]=useState(false);
 const active=executeCustomCode||running;
 return <div className="nexus-custom"><div className="nexus-custom-bar"><span>{settings.title||'Custom widget'}</span>{!executeCustomCode&&<button type="button" onClick={()=>setRunning(!running)}>{running?'Stop preview':'Run widget'}</button>}</div>{active?<iframe title={settings.title||'Custom widget'} sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={buildCustomWidgetDocument(settings)} style={{height:Math.max(100,Math.min(1600,Number(settings.height)||320))}}/>:<div className="nexus-code-paused">Custom code is paused. Select Run widget to preview it.</div>}</div>;
}
function Widget({widget,executeCustomCode,events,team}) {
 const s=widget.settings||{};
 let content;
 switch(widget.type) {
  case 'text': content=<p className="nexus-body">{widgetTextRuns(s.body).map((run,i)=>run.format==='bold'?<strong key={i}>{run.text}</strong>:run.format==='italic'?<em key={i}>{run.text}</em>:run.text)}</p>; break;
  case 'image': content=<figure><ContentImage key={s.src} src={s.src} alt={s.alt}/> {s.caption&&<figcaption>{s.caption}</figcaption>}</figure>; break;
  case 'gallery': content=<div className="nexus-gallery">{(s.images||[]).map((image,i)=><figure key={i}><ContentImage key={image.src} src={image.src} alt={image.alt}/> {image.caption&&<figcaption>{image.caption}</figcaption>}</figure>)}</div>; break;
  case 'links': content=<div className="nexus-links">{(s.links||[]).map((link,i)=><WidgetLink key={i} url={link.url}>{link.label}</WidgetLink>)}</div>; break;
  case 'stats': content=<dl className="nexus-stats">{(s.items||[]).map((item,i)=><div key={i}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>; break;
  case 'list': content=<ul className="nexus-list">{(s.items||[]).map((item,i)=><li key={i}>{item}</li>)}</ul>; break;
  case 'people': {const people=resolveWidgetPeople(s,team);content=people===undefined?<p className="nexus-empty" role="status">Loading club team…</p>:people===null?<p className="nexus-empty">The club team could not be loaded. Please refresh to try again.</p>:!people.length?<p className="nexus-empty">Public club team profiles will appear here.</p>:<div className="nexus-people">{people.map((person,i)=><article key={i}><MemberPhoto key={person.image || ''} person={person}/><div><strong>{person.url?.startsWith('/')?<WidgetLink url={person.url}>{person.name}</WidgetLink>:person.name}</strong><p>{person.role}</p><MemberSocialLinks person={person}/></div></article>)}</div>; break;}
  case 'contact': content=<div className="nexus-contact">{s.coordinator&&<p>{s.coordinator}</p>}{s.email&&<WidgetLink url={`mailto:${s.email}`}>{s.email}</WidgetLink>}<div className="nexus-links">{(s.links||[]).map((link,i)=><WidgetLink key={i} url={link.url}>{link.label}</WidgetLink>)}</div></div>; break;
  case 'events': content=events===null?<p className="nexus-empty">Events could not be loaded. Please refresh to try again.</p>:events===undefined?<p className="nexus-empty" role="status">Loading club events…</p>:events.length?<div className="nexus-event-grid">{events.map(event=><article key={event._id||event.id}><WidgetLink url={`/events/${event._id||event.id}`}>{event.title}</WidgetLink><p>{event.startAt||event.startDate?new Date(event.startAt||event.startDate).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}):'Date to be announced'}</p><p>{event.location||event.venue}</p></article>)}</div>:<p className="nexus-empty">New club events will appear here.</p>; break;
  case 'embed': {const url=embedWidgetUrl(s.url);content=url?<iframe className="nexus-embed" src={url} title={s.title||'Embedded video'} loading="lazy" sandbox="allow-scripts allow-same-origin allow-presentation" referrerPolicy="no-referrer" allow="fullscreen"/>:<p className="nexus-empty">Add a YouTube or Vimeo video URL to display an embed.</p>;break;}
  case 'custom': return <CustomWidget settings={s} executeCustomCode={executeCustomCode}/>;
  default: return null;
 }
 return <article className={`nexus-widget nexus-widget-${widget.type}`}>{s.title&&<h3>{s.title}</h3>}{content}</article>;
}
export default function ClubPageRenderer({page,theme='public',executeCustomCode=false,events,team,showHero=true,showHidden=false,renderContainer,renderWidget}) {
 if(!page)return null;
 const containers=(inlineTeamLinks(page).containers||[]).filter(container=>showHidden||!container.hidden);
 return <div className={`nexus-page nexus-theme-${theme}`}>
  {showHero&&<header className="nexus-page-hero"><div className="nexus-page-eyebrow">IEDC · NEXUS COMMUNITY</div><h1>{page.hero?.title||page.card?.title}</h1>{page.hero?.subtitle&&<p>{page.hero.subtitle}</p>}<ContentImage key={page.hero?.image} className="nexus-hero-image" src={page.hero?.image}/></header>}
  <div className="nexus-page-sections">{containers.map(container=>{
   const content=<section className="nexus-container">{container.title&&<h2>{container.title}</h2>}<div className={`nexus-widget-grid nexus-columns-${container.columns||1}`}>{(container.widgets||[]).map(widget=>{
    const widgetContent=<Widget widget={widget} executeCustomCode={executeCustomCode} events={events} team={team}/>;
    return <Fragment key={widget.id}>{renderWidget?renderWidget(widget,widgetContent,container):widgetContent}</Fragment>;
   })}</div></section>;
   return <Fragment key={container.id}>{renderContainer?renderContainer(container,content):content}</Fragment>;
  })}</div>
 </div>;
}
