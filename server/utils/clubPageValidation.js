import {MEMBER_SOCIAL_FIELDS} from '../../shared/widgetPeople.js';
import { embedWidgetUrl } from "../../shared/customWidgetDocument.js";
import { WIDGET_TYPES } from '../../shared/clubPageSchema.js';
const fail = (field, message) => { const error = new Error(`${field}: ${message}`); error.status = 400; error.field = field; throw error; };
const object = (value, field) => { if (!value || typeof value !== 'object' || Array.isArray(value)) fail(field,'must be an object'); return value; };
const text = (value, field, max = 10000) => { if (value !== undefined && typeof value !== 'string') fail(field,'must be text'); if ((value || '').length > max) fail(field,`maximum ${max} characters`); return value || ''; };
const url = (value, field, mail = false) => {
 const input = text(value,field,2048); if (!input) return;
 if (/[\u0000-\u0020\\]/.test(input)) fail(field,"remove spaces and unsupported characters from the URL");
 if (/^\/(?!\/)/.test(input) && !input.includes('\\')) return;
 try { const parsed = new URL(input); if (['http:','https:',...(mail?['mailto:','tel:']:[])].includes(parsed.protocol) && !parsed.username && !parsed.password) return; } catch { /* invalid URL */ }
 fail(field,'use an http or https URL');
};
const array = (value,field,limit=100) => { if (!Array.isArray(value) || value.length>limit) fail(field,`must be an array with at most ${limit} items`); return value; };
const image = (item,field) => {object(item,field);url(item.src,`${field}.src`);if(!text(item.alt,`${field}.alt`,500).trim())fail(`${field}.alt`,'describe the image');text(item.caption,`${field}.caption`,2000);};
const links = (items,field) => array(items||[],field).forEach((item,i)=>{object(item,`${field}.${i}`);text(item.label,`${field}.${i}.label`,200);url(item.url,`${field}.${i}.url`,true);});
export function validateClubPage(input) {
 let serialized; try { serialized=JSON.stringify(input); } catch { fail('page','must be serializable'); }
 if (!serialized || Buffer.byteLength(serialized)>1048576) fail('page','maximum 1 MB');
 const page=JSON.parse(serialized);object(page,'page');
 for (const [key,fields] of [['card',['title','summary','cover']],['hero',['title','subtitle','image']]]) {
  object(page[key],key);for(const field of fields){ if(['cover','image'].includes(field)){url(page[key][field],`${key}.${field}`);page[key][field]=page[key][field]||'';}else page[key][field]=text(page[key][field],`${key}.${field}`,field==='title'?200:5000); }
 }
 if(!text(page.card.title,'card.title',200).trim()) fail('card.title','enter a page title');
 const ids=new Set();const id=(value,field)=>{if(typeof value!=='string'||!value||value.length>100||ids.has(value))fail(field,'use a unique id');ids.add(value);};
 let count=0;
 array(page.containers,'containers',40).forEach((container,index)=>{
  const field=`containers.${index}`;object(container,field);id(container.id,`${field}.id`);text(container.title,`${field}.title`,200);
  if(![1,2,3].includes(container.columns))fail(`${field}.columns`,'choose 1, 2 or 3');
  if(typeof container.hidden!=='boolean')fail(`${field}.hidden`,'must be true or false');
  array(container.widgets,`${field}.widgets`).forEach((widget,i)=>{
   const path=`${field}.widgets.${i}`;object(widget,path);id(widget.id,`${path}.id`);
   if(++count>100)fail('containers','maximum 100 widgets');
   if(!WIDGET_TYPES.includes(widget.type))fail(`${path}.type`,'unknown widget type');
   const s=object(widget.settings,`${path}.settings`);text(s.title,`${path}.title`,200);
   switch(widget.type){
    case 'text':text(s.body,`${path}.body`,50000);break;
    case 'image':image(s,path);break;
    case 'gallery':array(s.images||[],`${path}.images`,50).forEach((v,j)=>image(v,`${path}.images.${j}`));break;
    case 'links':links(s.links,`${path}.links`);break;
    case 'contact':text(s.coordinator,`${path}.coordinator`,300);if(s.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email))fail(`${path}.email`,'enter a valid email');links(s.links,`${path}.links`);break;
    case 'stats':array(s.items||[],`${path}.items`).forEach((v,j)=>{object(v,`${path}.items.${j}`);text(v.label,path,300);text(v.value,path,500);});break;
    case 'list':array(s.items||[],`${path}.items`).forEach(v=>text(v,path,3000));break;
    case 'people':
     if(s.socialOverrides!==undefined){
      const keys=new Set();array(s.socialOverrides,`${path}.socialOverrides`).forEach(value=>{
       object(value,path);const key=text(value.memberKey,path,300);if(!key||keys.has(key))fail(path,'each social override needs a unique member key');keys.add(key);
       if(Object.keys(value).some(field=>!['memberKey',...MEMBER_SOCIAL_FIELDS].includes(field)))fail(path,'only social link fields can be overridden');
       for(const field of MEMBER_SOCIAL_FIELDS)url(value[field],`${path}.${field}`);
      });
     }
     if(s.source!==undefined&&!['club','custom'].includes(s.source))fail(`${path}.source`,'choose club or custom team data');array(s.people||[],`${path}.people`).forEach(v=>{object(v,path);text(v.name,path,300);text(v.role,path,300);url(v.image,path);url(v.url,path);for(const key of ['linkedin','github','instagram','fossUnited','website'])url(v[key],path);if(v.socials!==undefined)links(v.socials,path);});break;
    case 'embed':url(s.url,`${path}.url`);if(!embedWidgetUrl(s.url))fail(path,'enter a valid YouTube video or Vimeo video URL');break;
    case 'custom':
     for(const k of ['html','css','javascript'])text(s[k],`${path}.${k}`,1048576);
     if(Buffer.byteLength((s.html||'')+(s.css||'')+(s.javascript||''))>102400)fail(path,'maximum 100 KB of custom code');
     if(!Number.isInteger(s.height)||s.height<100||s.height>1600)fail(`${path}.height`,'choose a height from 100 to 1600');break;
   }
  });
 });
 return page;
}
