import { useEffect, useRef, useState } from 'react';
import { useParams, useBlocker } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, Globe, ExternalLink, Plus, Trash2, X, Layers, Settings2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { normalizePortalRole } from '../utils/authorization';
import { me } from '../api/authService';
import { fetchClubPage, saveClubPage, publishClubPage, unpublishClubPage, bindClubPage } from '../api/adminService';
import { useViewMode } from '../context/ViewModeContext';
import PageSkeleton from '../components/PageSkeleton';
import FormAlert from '../components/FormAlert';
import PortalDialog from '../components/PortalDialog';
import EditorCanvas from '../components/nexus/EditorCanvas';
import WidgetPicker from '../components/nexus/WidgetPicker';
import WidgetInspector, { Field, ImageField } from '../components/nexus/WidgetInspector';
import { legacyPages } from '../../../../shared/legacyClubPages';
import { emptyPage, createContainer, createWidget, moveWidget, WIDGET_LABELS } from '../utils/clubPageEditing';
import './club-nexus.css';

const message = e => e.response?.data?.message||'Changes could not be saved. Check your connection and try again.';
export default function ClubNexusEditor() {
  const {clubId}=useParams();
  const {data:user}=useQuery({queryKey:['me'],queryFn:me});
  const query=useQuery({queryKey:['club-page',clubId],queryFn:()=>fetchClubPage(clubId),retry:false});
  if(query.isPending)return <PageSkeleton/>;
  if(query.isError)return <FormAlert>{query.error?.response?.data?.message||'Could not open this club page.'} <button onClick={()=>query.refetch()}>Try again</button></FormAlert>;
  return <Editor key={clubId} clubId={clubId} initial={query.data.page} access={query.data.access} user={user}/>;
}
function Editor({clubId,initial,access,user}) {
  const client=useQueryClient();
  const {setClubMode}=useViewMode();
  const club=user?.workspaces?.find(c=>c.id===clubId);
  const [record,setRecord]=useState(initial),[draft,setDraft]=useState(initial?.draft||emptyPage(club?.name||'Club page'));
  const [connectionOpen,setConnectionOpen]=useState(false),[selection,setSelection]=useState(null),[adding,setAdding]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[confirm,setConfirm]=useState(null),[slug,setSlug]=useState(initial?.slug||'');
  const [baseline,setBaseline]=useState(()=>JSON.stringify(initial?.draft||draft));
  const dirty=JSON.stringify(draft)!==baseline;
  const canEdit=Boolean(access?.pageEdit),canPublish=Boolean(access?.pagePublish),admin=normalizePortalRole(user?.role)==='super_admin';
  const approvedLeave=useRef(false);
  const blocker=useBlocker(()=>dirty&&!approvedLeave.current);
  const {data:teamData,isError:teamError}=useQuery({queryKey:['club-page-team',clubId],queryFn:async()=>(await api.get(`/admin/clubs/${clubId}/page/team`)).data,enabled:draft.containers.some(c=>c.widgets.some(w=>w.type==='people'&&w.settings.source==='club'))});
  const {data:eventData,isError:eventsError}=useQuery({queryKey:['club-page-events',clubId],queryFn:async()=>(await api.get('/events',{params:{clubId,limit:12}})).data,enabled:draft.containers.some(c=>c.widgets.some(w=>w.type==='events'))});
  useEffect(()=>{setClubMode(clubId);},[clubId,setClubMode]);
  useEffect(()=>{
    if(!dirty)return;
    const before=e=>{e.preventDefault();e.returnValue='';};
    const ask=e=>{e.preventDefault();setConfirm({title:'Leave unsaved changes?',text:'Your latest edits have not been saved.',action:e.detail});};
    window.addEventListener('beforeunload',before);window.addEventListener('iedc:navigate',ask);
    return()=>{window.removeEventListener('beforeunload',before);window.removeEventListener('iedc:navigate',ask);};
  },[dirty]);
  async function perform(action,success){setBusy(true);setError('');try{const result=await action();setRecord(result.page);setDraft(result.page.draft);setBaseline(JSON.stringify(result.page.draft));toast.success(success);client.invalidateQueries({queryKey:['club-page',clubId]});return true;}catch(e){setError(message(e));return false;}finally{setBusy(false);}}
  function edit(fn){if(!canEdit||busy)return;setDraft(previous=>{const next=structuredClone(previous);fn(next);return next;});}
  function select(id){setSelection(id);}
  const section=draft.containers.find(c=>c.id===selection);
  const parent=draft.containers.find(c=>c.widgets.some(w=>w.id===selection));
  const widget=parent?.widgets.find(w=>w.id===selection);
  function remove(){setConfirm({title:`Delete ${widget?'widget':'section'}?`,text:widget?'This widget will be removed from the draft.':'This section and its widgets will be removed from the draft.',action:()=>{edit(p=>{if(widget)p.containers.find(c=>c.id===parent.id).widgets=parent.widgets.filter(w=>w.id!==widget.id);else p.containers=p.containers.filter(c=>c.id!==selection);});setSelection(null);}});}
  async function bind(changing=false){
    const legacy=Object.hasOwn(legacyPages,slug)?legacyPages[slug]:null;
    const connected=await perform(()=>bindClubPage(clubId,{slug,draft:legacy||(changing?emptyPage(club?.name||'Club page'):draft),...(changing?{expectedRevision:record.revision}:{})}),changing?'Page connection changed. Review the draft before publishing.':'Nexus page connected');
    if(connected){setConnectionOpen(false);setSelection(null);client.invalidateQueries({queryKey:['nexus-public-cards']});}
  }
  return <div className="op-page nexus-editor" aria-busy={busy}>
    <header className="nexus-heading"><div><div className="nexus-breadcrumb">{club?.name||'Club workspace'} <span>/</span> Nexus</div><h1>Nexus page</h1><p>Shape your community’s home on the main site.</p></div><div className="nexus-header-actions"><span className={`nexus-save-state ${dirty?'is-dirty':''}`} role="status">{dirty?'Unsaved changes':record?.published?'Published':'Draft'}</span>{record&&canEdit&&<button className="op-secondary" disabled={busy||!dirty} onClick={()=>perform(()=>saveClubPage(clubId,{expectedRevision:record.revision,draft}),'Draft saved')}><Save size={15}/>{busy?'Working…':'Save draft'}</button>}{record&&canPublish&&<button className="op-primary" disabled={busy||dirty} title={dirty?'Save your draft before publishing':undefined} onClick={()=>perform(()=>publishClubPage(clubId,record.revision),'Page published')}><Globe size={15}/>{busy?'Publishing…':'Publish'}</button>}</div></header>
    {error&&<FormAlert>{error}</FormAlert>}
    {!record?<section className="nexus-connect"><div className="nexus-connect-icon"><Layers size={28}/></div><h2>Connect a public page</h2>{admin?<><p>Choose an existing Nexus page to preserve its content, or enter a new unique address for this club.</p><label className="nexus-field"><span>Existing page</span><select aria-label="Existing page" value={Object.hasOwn(legacyPages,slug)?slug:''} onChange={e=>setSlug(e.target.value)}><option value="">Create a new page</option>{Object.entries(legacyPages).map(([id,p])=><option key={id} value={id}>{p.card.title} /nexus/{id}</option>)}</select></label><Field label="Public address" value={slug} onChange={setSlug} placeholder="your-club"/><button className="op-primary" disabled={busy||!slug.trim()} onClick={()=>bind()}>{busy?'Connecting…':'Connect page'}</button></>:<p>An administrator needs to connect this club to a public Nexus address before editing can begin.</p>}</section>:<>
      <div className="nexus-toolbar"><div><span className="nexus-address">/nexus/{record.slug}</span>{admin&&<button className="nexus-text-button" disabled={busy||dirty} title={dirty?'Save or discard your edits before changing the connection':undefined} onClick={()=>{setSlug(record.slug);setError('');setConnectionOpen(true);}}>Change connection</button>}{record.published&&<a href={`${import.meta.env.VITE_MAIN_SITE_URL||'https://iedclbscek.in'}/nexus/${record.slug}`} target="_blank" rel="noreferrer">View live <ExternalLink size={13}/></a>}</div><div>{dirty&&<button className="nexus-text-button" onClick={()=>setConfirm({title:'Discard unsaved changes?',text:'The last saved draft will be restored.',action:()=>{setDraft(structuredClone(record.draft));setError('');}})}>Discard edits</button>}{record.published&&canPublish&&<button className="nexus-text-button" disabled={busy||dirty} onClick={()=>setConfirm({title:'Unpublish this page?',text:'The public page and directory card will be hidden until you publish again.',action:()=>perform(()=>unpublishClubPage(clubId,record.revision),'Page unpublished')})}>Unpublish</button>}</div></div>
      <div className="nexus-simple-actions"><p>Drag a section or widget to rearrange your page. Select Edit to change its content.</p><div><button className="op-secondary" onClick={()=>select('page')}><Settings2 size={15}/>Page settings</button>{canEdit&&<button className="op-secondary" onClick={()=>{const c=createContainer();edit(p=>p.containers.push(c));select(c.id);}}><Plus size={15}/>Add section</button>}</div></div>
      <EditorCanvas page={draft} onChange={setDraft} onEdit={select} onAddWidget={id=>{setSelection(null);setAdding(id);}} disabled={!canEdit||busy} events={eventsError?null:eventData?.events} team={teamError?null:teamData?.people}/>
      {selection&&<PortalDialog label={widget?`Edit ${WIDGET_LABELS[widget.type]}`:section?'Edit section':'Page settings'} onClose={()=>setSelection(null)} busy={busy} className="nexus-content-dialog"><div className="op-dialog-head"><div><h2>{widget?WIDGET_LABELS[widget.type]:section?'Section settings':'Page settings'}</h2><p>Changes appear in your page. Save the draft when you’re ready.</p></div><button className="op-icon" aria-label="Close settings" onClick={()=>setSelection(null)}><X size={18}/></button></div><div className="nexus-edit-fields"><fieldset disabled={!canEdit||busy}>
          {selection==='page'&&<><Field label="Page title" value={draft.hero.title} onChange={v=>edit(p=>{p.hero.title=v;})}/><Field label="Introduction" multiline rows={3} value={draft.hero.subtitle} onChange={v=>edit(p=>{p.hero.subtitle=v;})}/><ImageField label="Hero image" value={draft.hero.image} clubId={clubId} onChange={v=>edit(p=>{p.hero.image=v;})}/><hr/><h3>Directory card</h3><Field label="Club name" value={draft.card.title} onChange={v=>edit(p=>{p.card.title=v;})}/><Field label="Short description" multiline rows={3} value={draft.card.summary} onChange={v=>edit(p=>{p.card.summary=v;})}/><ImageField label="Card cover" value={draft.card.cover} clubId={clubId} onChange={v=>edit(p=>{p.card.cover=v;})}/></>}
          {section&&<><Field label="Section title" value={section.title} onChange={v=>edit(p=>{p.containers.find(c=>c.id===section.id).title=v;})}/><label className="nexus-field"><span>Columns on desktop</span><select aria-label="Columns on desktop" value={section.columns} onChange={e=>edit(p=>{p.containers.find(c=>c.id===section.id).columns=Number(e.target.value);})}>{[1,2,3].map(n=><option key={n} value={n}>{n} {n===1?'column':'columns'}</option>)}</select></label><label className="nexus-check"><input type="checkbox" checked={section.hidden} onChange={e=>edit(p=>{p.containers.find(c=>c.id===section.id).hidden=e.target.checked;})}/>Hide this section</label><button className="op-secondary" onClick={()=>{setSelection(null);setAdding(section.id);}}><Plus size={14}/>Add widget</button></>}
          {widget&&<><WidgetInspector widget={widget} clubId={clubId} team={teamError?null:teamData?.people} onChange={value=>edit(p=>{const c=p.containers.find(c=>c.id===parent.id);c.widgets=c.widgets.map(w=>w.id===widget.id?value:w);})}/><label className="nexus-field"><span>Move to section</span><select aria-label="Move to section" value={parent.id} onChange={e=>setDraft(moveWidget(draft,widget.id,e.target.value, draft.containers.find(c=>c.id===e.target.value).widgets.length))}>{draft.containers.map(c=><option key={c.id} value={c.id}>{c.title||'Untitled section'}</option>)}</select></label></>}
          {(widget||section)&&<button className="nexus-delete" onClick={remove}><Trash2 size={14}/>Delete {widget?'widget':'section'}</button>}
        </fieldset></div><div className="op-dialog-foot"><button className="op-primary" onClick={()=>setSelection(null)}>Done</button></div></PortalDialog>}
    </>}
    {connectionOpen&&<PortalDialog label="Change page connection" onClose={()=>setConnectionOpen(false)} busy={busy} className="nexus-content-dialog"><div className="op-dialog-head"><div><h2>Change page connection</h2><p>{club?.name} is currently connected to /nexus/{record.slug}.</p></div><button className="op-icon" aria-label="Close connection settings" disabled={busy} onClick={()=>setConnectionOpen(false)}><X size={18}/></button></div><div className="nexus-edit-fields"><p className="nexus-note">Choose the correct page. Its original content will load as a saved draft for this club; review it before publishing. The old address will return to its original page, if one exists. A private backup of the previous draft and published content will be kept.</p><label className="nexus-field"><span>Existing page</span><select aria-label="Existing page" disabled={busy} value={Object.hasOwn(legacyPages,slug)?slug:''} onChange={e=>setSlug(e.target.value)}><option value="">Create a new page</option>{Object.entries(legacyPages).map(([id,p])=><option key={id} value={id}>{p.card.title} /nexus/{id}</option>)}</select></label><Field label="Public address" value={slug} onChange={setSlug} disabled={busy} placeholder="your-club"/>{error&&<FormAlert>{error}</FormAlert>}</div><div className="op-dialog-foot"><button className="op-secondary" disabled={busy} onClick={()=>setConnectionOpen(false)}>Cancel</button><button className="op-primary" disabled={busy||!slug.trim()||slug===record.slug} onClick={()=>bind(true)}>{busy?'Changing…':'Change connection'}</button></div></PortalDialog>}
    {adding&&<WidgetPicker onClose={()=>setAdding(null)} onChoose={type=>{const w=createWidget(type);edit(p=>p.containers.find(c=>c.id===adding).widgets.push(w));select(w.id);setAdding(null);}}/>}
    {blocker.state==='blocked'&&<PortalDialog label="Leave unsaved changes?" onClose={()=>blocker.reset()}><div className="op-dialog-head"><h2>Leave unsaved changes?</h2></div><p className="nexus-confirm-copy">Your latest edits have not been saved.</p><div className="op-dialog-foot"><button className="op-secondary" onClick={()=>blocker.reset()}>Keep editing</button><button className="op-primary" onClick={()=>blocker.proceed()}>Leave page</button></div></PortalDialog>}
    {confirm&&<PortalDialog label={confirm.title} onClose={()=>setConfirm(null)} busy={busy}><div className="op-dialog-head"><h2>{confirm.title}</h2><button className="op-icon" aria-label="Close confirmation" onClick={()=>setConfirm(null)}><X size={18}/></button></div><p className="nexus-confirm-copy">{confirm.text}</p><div className="op-dialog-foot"><button className="op-secondary" onClick={()=>setConfirm(null)}>Keep editing</button><button className="op-primary" onClick={()=>{const action=confirm.action;approvedLeave.current=true;setConfirm(null);action();queueMicrotask(()=>{approvedLeave.current=false;});}}>Continue</button></div></PortalDialog>}
  </div>;
}
