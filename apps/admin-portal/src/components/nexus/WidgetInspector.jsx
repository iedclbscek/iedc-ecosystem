import {resolveWidgetPeople, memberKey, MEMBER_SOCIAL_FIELDS} from '../../../../../shared/widgetPeople';
import { useId, useState } from 'react';
import { Upload, Plus, Trash2 } from 'lucide-react';
import { uploadCloudinaryImage } from '../../api/adminService';
import FormAlert from '../FormAlert';

export function Field({label,value,onChange,multiline=false,...props}) {
  const id=useId();
  const Control=multiline?'textarea':'input';
  return <div className="nexus-field"><label htmlFor={id}>{label}</label><Control id={id} value={value??''} onChange={e=>onChange(e.target.value)} {...props}/></div>;
}
export function ImageField({label,value,onChange,clubId}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  async function upload(file){
    if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){setError('Choose a JPG, PNG or WebP image under 5 MB.');return;}
    setBusy(true);setError('');
    try{const source=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});const result=await uploadCloudinaryImage({source,purpose:'club_page',clubId});if(result.url?.startsWith('data:'))throw new Error('Image uploads are simulated locally. Enter an image URL to test saved pages.');onChange(result.url);}catch(e){setError(e.response?.data?.message||e.message||'Image could not be uploaded. Try again.');}finally{setBusy(false);}
  }
  return <div className="nexus-image-field"><Field label={label} value={value} onChange={onChange} placeholder="https://…"/><label className="nexus-upload op-secondary"><Upload size={14}/>{busy?'Uploading…':'Upload image'}<input aria-label={`Upload ${label.toLowerCase()}`} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>upload(e.target.files?.[0])}/></label>{error&&<FormAlert>{error}</FormAlert>}</div>;
}
function Rows({label,rows,onChange,keys,clubId}) {
  return <div className="nexus-rows"><h4>{label}</h4>{rows.map((row,index)=><fieldset key={index}><legend>{label} {index+1}</legend>{keys.map(([key,title])=>key==='src'||key==='image'?<ImageField key={key} label={title} value={row[key]} clubId={clubId} onChange={value=>onChange(rows.map((r,i)=>i===index?{...r,[key]:value}:r))}/>:<Field key={key} label={title} value={row[key]} onChange={value=>onChange(rows.map((r,i)=>i===index?{...r,[key]:value}:r))}/>)}<button type="button" className="nexus-text-button" onClick={()=>onChange(rows.filter((_,i)=>i!==index))}><Trash2 size={14}/>Remove item</button></fieldset>)}<button type="button" className="op-secondary" onClick={()=>onChange([...rows,Object.fromEntries(keys.map(([k])=>[k,'']))])}><Plus size={14}/>Add item</button></div>;
}
function ClubMemberLinks({settings,team,onChange}) {
 const people=resolveWidgetPeople(settings,team);
 const labels={github:'GitHub URL',linkedin:'LinkedIn URL',instagram:'Instagram URL',website:'Website URL',fossUnited:'FOSS United URL'};
 function update(person,field,value){
  const key=memberKey(person),overrides=settings.socialOverrides||[];
  const old=overrides.find(item=>item.memberKey===key)||{memberKey:key};
  onChange({...settings,socialOverrides:[...overrides.filter(item=>item.memberKey!==key),{...old,[field]:value}]});
 }
 return <div className="nexus-member-link-editor"><p className="nexus-note">Edit each member’s social links for this club page. Members and photos will continue updating from the database.</p>{people===undefined?<p role="status">Loading team members…</p>:people===null?<p role="alert">Team members could not load. Close and reopen this widget to try again.</p>:!people.length?<p className="nexus-note">Public club team profiles will appear here.</p>:people.map(person=><details key={memberKey(person)}><summary>{person.name}<span>{person.role}</span></summary><div>{MEMBER_SOCIAL_FIELDS.map(field=><Field key={field} label={labels[field]} value={person[field]} onChange={value=>update(person,field,value)} placeholder="https://…"/>)}{settings.socialOverrides?.some(item=>item.memberKey===memberKey(person))&&<button type="button" className="nexus-text-button" onClick={()=>onChange({...settings,socialOverrides:settings.socialOverrides.filter(item=>item.memberKey!==memberKey(person))})}>Use saved profile links</button>}</div></details>)}</div>;
}
export default function WidgetInspector({widget,onChange,clubId,team}) {
  const s=widget.settings, set=(key,value)=>onChange({...widget,settings:{...s,[key]:value}});
  return <div className="nexus-widget-fields">
    <Field label={widget.type==='custom'?'Accessible title':'Title'} value={s.title} onChange={v=>set('title',v)}/>
    {widget.type==='text'&&<><Field label="Content" multiline rows={9} value={s.body} onChange={v=>set('body',v)}/><small>Use **bold** and *italic* to emphasize text.</small></>}
    {widget.type==='image'&&<><ImageField label="Image URL" value={s.src} clubId={clubId} onChange={v=>set('src',v)}/><Field label="Image description" value={s.alt} onChange={v=>set('alt',v)}/><Field label="Caption" value={s.caption} onChange={v=>set('caption',v)}/></>}
    {widget.type==='gallery'&&<Rows label="Images" rows={s.images||[]} onChange={v=>set('images',v)} keys={[["src","Image URL"],["alt","Image description"],["caption","Caption"]]} clubId={clubId}/>}
    {['links','contact'].includes(widget.type)&&<Rows label="Links" rows={s.links||[]} onChange={v=>set('links',v)} keys={[["label","Label"],["url","URL"]]}/>}
    {widget.type==='stats'&&<Rows label="Statistics" rows={s.items||[]} onChange={v=>set('items',v)} keys={[["label","Label"],["value","Value"]]}/>}
    {widget.type==='list'&&<Field label="Items, one per line" multiline rows={8} value={(s.items||[]).join('\n')} onChange={v=>set('items',v.split('\n'))}/>}
    {widget.type==='people'&&<><label className="nexus-field"><span>Team members</span><select aria-label="Team members source" value={s.source||'custom'} onChange={e=>onChange({...widget,settings:{...s,source:e.target.value,people:e.target.value==='custom'&&s.source==='club'?structuredClone(resolveWidgetPeople(s,team)||[]):s.people}})}><option value="club">Use club team from database</option><option value="custom">Customize this widget</option></select></label>{s.source==='club'?<ClubMemberLinks settings={s} team={team} onChange={settings=>onChange({...widget,settings})}/>:<Rows label="People" rows={s.people||[]} onChange={v=>set('people',v)} keys={[["name","Name"],["role","Role"],["image","Photo URL"],["url","Profile URL"],["github","GitHub URL"],["linkedin","LinkedIn URL"],["instagram","Instagram URL"],["website","Website URL"]]} clubId={clubId}/>}</>}
    {widget.type==='contact'&&<><Field label="Email" type="email" value={s.email} onChange={v=>set('email',v)}/><Field label="Coordinator" value={s.coordinator} onChange={v=>set('coordinator',v)}/></>}
    {widget.type==='embed'&&<><Field label="YouTube or Vimeo URL" value={s.url} onChange={v=>set('url',v)}/><small>Only approved video providers can be embedded.</small></>}
    {widget.type==='events'&&<p className="nexus-note">Shows this club’s published events automatically.</p>}
    {widget.type==='custom'&&<><p className="nexus-note">Code runs inside an isolated frame. Use Run in the preview to test changes.</p>{[['html','HTML'],['css','CSS'],['javascript','JavaScript']].map(([key,label])=><Field key={key} label={label} multiline rows={7} spellCheck={false} className="nexus-code" value={s[key]} onChange={v=>set(key,v)}/>)}<Field label="Frame height (100–1600 px)" type="number" min={100} max={1600} value={s.height} onChange={v=>set('height',Number(v))}/></>}
  </div>;
}
