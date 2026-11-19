import { communities, communityData } from './legacyCommunityData.js';
export const legacyCatalogue = communities;
const label = key => key.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase());
const cleanLink = (key, value) => !value ? '' : key === 'instagram' && !value.startsWith('http') ? `https://www.instagram.com/${value.replace(/^@/,'')}` : value.startsWith('http') ? value : `https://${value}`;
export function adaptLegacyClubPage(slug) {
  const data = Object.hasOwn(communityData,slug) ? communityData[slug] : null;
  const card = communities.find(c=>c.id===slug);
  if (!data || !card) return null;
  const containers = [];
  function add(key,type,settings) { containers.push({id:`${slug}-${key}`,title:'',hidden:false,columns:1,widgets:[{id:`${slug}-${key}-widget`,type,settings}]}); }
  const excluded = new Set(['name','description','iconName','execomTeam','contact','socialMedia','galleryImages']);
  for (const [key,value] of Object.entries(data)) {
    if (excluded.has(key) || !value) continue;
    const title = key==='longDescription' ? 'About' : label(key);
    if (typeof value==='string') add(key,'text',{title,body:value});
    else if (Array.isArray(value)) add(key,'list',{title,items:value.map(item=>typeof item==='string'?item:[item.name,item.description].filter(Boolean).join(' — '))});
    else if (value.items) add(key,'list',{title:value.title||title,items:value.items.map(item=>typeof item==='string'?item:[item.name,item.description].filter(Boolean).join(' — '))});
  }
  if (data.galleryImages?.length) add('gallery','gallery',{title:'Gallery',images:data.galleryImages.map((image,i)=>typeof image==='string'?{src:image,alt:`${data.name} gallery ${i+1}`,caption:''}:{src:image.src||image.url,alt:image.alt||`${data.name} gallery ${i+1}`,caption:image.caption||''})});
  if (data.execomTeam?.length) {
    add('team','people',{title:'Our team',people:data.execomTeam.map(p=>({name:p.name,role:p.role,image:p.image||'',url:'',linkedin:p.linkedin||'',github:p.github||'',fossUnited:p.fossUnited||''}))});
  }
  const links = Object.entries(data.socialMedia||{}).filter(([,v])=>v).map(([key,value])=>({label:label(key),url:cleanLink(key,value)}));
  if(data.contact) add('contact','contact',{title:'Get in touch',email:data.contact.email||'',coordinator:data.contact.coordinator||'',links});
  else if(links.length) add('links','links',{title:'Connect',links});
  if(data.contact?.facultyAdvisor) add('advisor','text',{title:'Faculty advisor',body:data.contact.facultyAdvisor});
  return {card:{title:card.name,summary:card.description,cover:''},hero:{title:data.name,subtitle:data.description||card.description,image:''},containers};
}
export const legacyPages = Object.fromEntries(communities.map(c=>[c.id,adaptLegacyClubPage(c.id)]));
