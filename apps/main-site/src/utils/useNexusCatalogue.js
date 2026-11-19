import { useEffect, useState, useCallback } from 'react';
import { getNexusCatalogue } from '../services/nexusService.js';
export default function useNexusCatalogue(){
 const [state,setState]=useState({communities:[],loading:true,error:''});
 const [version,setVersion]=useState(0);
 const retry=useCallback(()=>setVersion(v=>v+1),[]);
 useEffect(()=>{const controller=new AbortController();let current=true;
  getNexusCatalogue(controller.signal).then(({communities})=>{if(current)setState({communities,loading:false,error:''});}).catch(error=>{if(current&&error.name!=='AbortError')setState({communities:[],loading:false,error:error.message});});
  return()=>{current=false;controller.abort();};
 },[version]);
 return {...state,retry};
}
