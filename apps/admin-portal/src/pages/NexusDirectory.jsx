import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUp, ArrowDown, PanelsTopLeft, Save } from 'lucide-react';
import api from '../api/axios';
import { me } from '../api/authService';
import { fetchNexusOrder, saveNexusOrder } from '../api/adminService';
import { legacyCatalogue } from '../../../../shared/legacyClubPages';
import FormAlert from '../components/FormAlert';
import PageSkeleton from '../components/PageSkeleton';
import './club-nexus.css';
export default function NexusDirectory(){
  const {data:user}=useQuery({queryKey:['me'],queryFn:me});
  const query=useQuery({queryKey:['nexus-order'],queryFn:fetchNexusOrder,retry:false});
  const catalogue=useQuery({queryKey:['nexus-public-cards'],queryFn:async()=>(await api.get('/public/nexus')).data,retry:false});
  if(query.isPending||catalogue.isPending)return <PageSkeleton/>;
  if(query.isError||catalogue.isError)return <FormAlert>Could not load the Nexus directory. <button onClick={()=>Promise.all([query.refetch(),catalogue.refetch()])}>Try again</button></FormAlert>;
  return <Directory initial={query.data.order} pages={catalogue.data.pages} clubs={user?.workspaces||[]}/>;
}
function Directory({initial,pages,clubs}){
  const client=useQueryClient();
  const [order,setOrder]=useState(()=>[...new Set([...initial,...legacyCatalogue.map(c=>c.id||c.slug),...pages.map(p=>p.slug)])]);
  const [saved,setSaved]=useState(JSON.stringify(order)),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function save(){setBusy(true);setError('');try{await saveNexusOrder(order);setSaved(JSON.stringify(order));client.invalidateQueries({queryKey:['nexus-order']});}catch(e){setError(e.response?.data?.message||'Directory order could not be saved. Try again.');}finally{setBusy(false);}}
  function move(i,offset){const next=[...order];[next[i],next[i+offset]]=[next[i+offset],next[i]];setOrder(next);}
  return <div className="op-page"><header className="op-header"><div><h1>Nexus directory</h1><p>Connect clubs to their public pages and arrange the community directory.</p></div><button className="op-primary" onClick={save} disabled={busy||saved===JSON.stringify(order)}><Save size={15}/>{busy?'Saving…':'Save order'}</button></header>{error&&<FormAlert>{error}</FormAlert>}<div className="nexus-directory-grid"><section className="op-card"><div className="op-card-head"><h2>Club pages</h2></div>{clubs.map(c=><Link className="nexus-directory-club" key={c.id} to={`/clubs/${c.id}/nexus`}><PanelsTopLeft size={17}/><span>{c.name}</span><span>Manage page</span></Link>)}{!clubs.length&&<p className="nexus-confirm-copy">Create a club in Events → Clubs to connect its public page.</p>}</section><section className="op-card"><div className="op-card-head"><h2>Directory order</h2></div><p className="nexus-directory-hint">Unpublished communities stay hidden. New pages appear after this list until arranged.</p>{order.map((slug,i)=><div className="nexus-directory-row" key={slug}><span>{legacyCatalogue.find(c=>(c.id||c.slug)===slug)?.name||slug}</span><small>/nexus/{slug}</small><button className="nexus-mini" aria-label={`Move ${slug} up`} disabled={busy||i===0} onClick={()=>move(i,-1)}><ArrowUp size={15}/></button><button className="nexus-mini" aria-label={`Move ${slug} down`} disabled={busy||i===order.length-1} onClick={()=>move(i,1)}><ArrowDown size={15}/></button></div>)}</section></div></div>;
}
