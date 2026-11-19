import { legacyCatalogue, legacyPages } from '../../../../shared/legacyClubPages.js';
import { mergeNexusCatalogue } from '../../../../shared/nexusCatalogue.js';
const API_BASE = import.meta.env?.VITE_API_URL || (import.meta.env?.DEV ? 'http://localhost:5000' : '');
async function read(path,signal) {
 const response=await fetch(`${API_BASE}${path}`,{signal,cache:'no-store'});
 if(!response.ok){const body=await response.json().catch(()=>({}));const error=new Error(response.status===404?'This club page is currently unavailable.':'We could not load Nexus. Please try again.');error.status=response.status;error.legacy=body.legacy===true;error.withdrawn=body.withdrawn===true;throw error;}
 return response.json();
}
export async function getNexusCatalogue(signal) {
 const data=await read('/api/public/nexus',signal);
 return {communities:mergeNexusCatalogue(legacyCatalogue,data),withdrawn:data.withdrawn||[]};
}
export async function getNexusPage(slug,signal) {
 try {return await read(`/api/public/nexus/${encodeURIComponent(slug)}`,signal);}
 catch(error){if(error.status===404&&error.legacy===true&&Object.hasOwn(legacyPages,slug))return {slug,page:legacyPages[slug],clubId:null};throw error;}
}
export async function getNexusEvents(clubId,signal) {
 const data=await read(`/api/events?clubId=${encodeURIComponent(clubId)}&limit=12`,signal);
 return data.events||data.data||[];
}

export async function getNexusTeam(slug,signal) {
 const data=await read(`/api/public/nexus/${encodeURIComponent(slug)}/team`,signal);
 return data.people||[];
}
