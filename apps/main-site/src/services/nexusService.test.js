import test from 'node:test';
import assert from 'node:assert/strict';
import { getNexusPage } from './nexusService.js';
test('a detail withdrawal after catalogue load never restores a legacy page',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async url=>String(url).endsWith('/nexus')?{ok:true,json:async()=>({pages:[],withdrawn:[]})}:{ok:false,status:404,json:async()=>({withdrawn:true,message:'Withdrawn'})};
 try {await assert.rejects(getNexusPage('gdg'),error=>error.status===404&&error.withdrawn===true);}finally{globalThis.fetch=original;}
});
test('only an explicit legacy detail response permits static fallback',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async url=>String(url).endsWith('/nexus')?{ok:true,json:async()=>({pages:[],withdrawn:[]})}:{ok:false,status:404,json:async()=>({legacy:true})};
 try {const data=await getNexusPage('gdg');assert.equal(data.slug,'gdg');assert.equal(data.clubId,null);}finally{globalThis.fetch=original;}
});
test('prototype names are not legacy pages',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async url=>String(url).endsWith('/nexus')?{ok:true,json:async()=>({pages:[],withdrawn:[]})}:{ok:false,status:404,json:async()=>({legacy:true})};
 try {await assert.rejects(getNexusPage('constructor'),error=>error.status===404);}finally{globalThis.fetch=original;}
});
test('live team uses the published slug endpoint and propagates its safe people response',async()=>{
 const {getNexusTeam}=await import('./nexusService.js');
 const original=globalThis.fetch;let requested;
 const people=[{name:'Club lead',role:'Lead',image:'',url:''}];
 globalThis.fetch=async url=>{requested=url;return {ok:true,json:async()=>({people})};};
 try {assert.deepEqual(await getNexusTeam('example-club'),people);assert.match(requested,/\/api\/public\/nexus\/example-club\/team$/);}finally{globalThis.fetch=original;}
});
