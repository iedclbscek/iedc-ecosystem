import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ClubPageRenderer from '../../../../../shared/ClubPageRenderer.jsx';
import { getNexusEvents, getNexusTeam } from '../../services/nexusService.js';
export default function PublishedClubPage({page,clubId,slug}){
 const [events,setEvents]=useState(undefined);
 const [team,setTeam]=useState(undefined);
 const hasClubTeam=page.containers?.some(c=>!c.hidden&&c.widgets?.some(w=>w.type==='people'&&w.settings?.source==='club'));
 const hasEvents=page.containers?.some(c=>!c.hidden&&c.widgets?.some(w=>w.type==='events'));
 useEffect(()=>{if(!hasEvents)return;const controller=new AbortController();let active=true;
  if(!clubId)return;
  getNexusEvents(clubId,controller.signal).then(items=>{if(active)setEvents(items);}).catch(error=>{if(active&&error.name!=='AbortError')setEvents(null);});
  return()=>{active=false;controller.abort();};
 },[clubId,hasEvents]);
 useEffect(()=>{if(!hasClubTeam||!slug||!clubId)return;const controller=new AbortController();let active=true;
  getNexusTeam(slug,controller.signal).then(people=>{if(active)setTeam(people);}).catch(error=>{if(active&&error.name!=='AbortError')setTeam(null);});
  return()=>{active=false;controller.abort();};
 },[slug,clubId,hasClubTeam]);
 return <main className="min-h-screen bg-bg-main pt-24"><div className="container mx-auto px-6 py-6"><Link to="/nexus" className="inline-flex items-center gap-2 text-sm font-semibold text-text-light hover:text-accent"><ArrowLeft size={16}/>Back to Nexus</Link></div><div className="container mx-auto px-2 sm:px-6 pb-16"><ClubPageRenderer page={page} theme="public" executeCustomCode events={clubId?events:[]} team={clubId?team:[]}/></div></main>;
}
