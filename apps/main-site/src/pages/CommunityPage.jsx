import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getNexusPage } from '../services/nexusService.js';
import PublishedClubPage from '../components/community/PublishedClubPage.jsx';
import { RouteSkeleton, PublicErrorState } from '../components/ui/PublicPageState.jsx';
export default function CommunityPage(){
 const {id}=useParams();
 const [state,setState]=useState({data:null,error:null});
 const [version,setVersion]=useState(0);
 useEffect(()=>{const controller=new AbortController();let current=true;
  getNexusPage(id,controller.signal).then(data=>{if(current)setState({data,error:null});}).catch(error=>{if(current&&error.name!=='AbortError')setState({data:null,error});});
  return()=>{current=false;controller.abort();};
 },[id,version]);
 if(state.error?.status===404)return <main className="min-h-screen pt-40 px-6 text-center"><h1 className="text-4xl font-bold mb-4">Page unavailable</h1><p className="text-text-light mb-7">This club page is not currently published.</p><Link to="/nexus" className="text-accent font-semibold">Explore Nexus</Link></main>;
 if(state.error)return <div className="pt-24"><PublicErrorState title="Nexus could not load" message={state.error.message} onRetry={()=>{setState({data:null,error:null});setVersion(v=>v+1);}}/></div>;
 if(!state.data||state.data.slug!==id)return <RouteSkeleton/>;
 return <PublishedClubPage key={id} {...state.data}/>;
}
