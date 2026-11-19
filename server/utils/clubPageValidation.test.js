import test from 'node:test';
import assert from 'node:assert/strict';
import { validateClubPage } from './clubPageValidation.js';
const page=()=>({card:{title:'GDG',summary:'Learn',cover:''},hero:{title:'GDG',subtitle:'Build',image:''},containers:[{id:'main',title:'About',hidden:false,columns:1,widgets:[{id:'w',type:'text',settings:{title:'Hello',body:'World'}}]}]});
test('validates and preserves serializable page content',()=>assert.deepEqual(validateClubPage(page()),page()));
test('rejects dangerous links and malformed widget settings with field errors',()=>{
 for(const [type,settings] of [['image',{src:'javascript:alert(1)',alt:'hi'}],['embed',{url:'https://evil.test'}],['custom',{height:50000}],['oops',{}]]){
  const p=page(); p.containers[0].widgets[0]={id:'w',type,settings}; assert.throws(()=>validateClubPage(p),/containers/);
 }
});
test('rejects duplicate IDs, oversized pages and invalid columns',()=>{
 const p=page();p.containers.push({...p.containers[0]});assert.throws(()=>validateClubPage(p),/id/);
 const q=page();q.containers[0].columns=5;assert.throws(()=>validateClubPage(q),/columns/);
 const r=page();r.containers[0].widgets[0]={id:'x',type:'custom',settings:{html:'x'.repeat(102401),height:400}};assert.throws(()=>validateClubPage(r),/100 KB/);
});
test('normalizes optional public card and hero text for minimal valid input',()=>{
 const result=validateClubPage({card:{title:'Incomplete'},hero:{},containers:[]});
 assert.deepEqual(result,{card:{title:'Incomplete',summary:'',cover:''},hero:{title:'',subtitle:'',image:''},containers:[]});
});
test('team widgets accept club defaults or custom displays and reject unknown sources',()=>{
 const p=page();p.containers[0].widgets[0]={id:'team',type:'people',settings:{title:'Our team',source:'club'}};
 assert.equal(validateClubPage(p).containers[0].widgets[0].settings.source,'club');
 p.containers[0].widgets[0].settings.source='custom';assert.equal(validateClubPage(p).containers[0].widgets[0].settings.source,'custom');
 p.containers[0].widgets[0].settings.source='private';assert.throws(()=>validateClubPage(p),/source/);
});
test('club social overrides validate URLs and allow only social fields',()=>{
 const p=page();p.containers[0].widgets[0]={id:'team',type:'people',settings:{source:'club',socialOverrides:[{memberKey:'member-a',github:'javascript:alert(1)'}]}};
 assert.throws(()=>validateClubPage(p),/URL/);
 p.containers[0].widgets[0].settings.socialOverrides=[{memberKey:'member-a',github:'',linkedin:'https://linkedin.com/in/example'}];assert.doesNotThrow(()=>validateClubPage(p));
 p.containers[0].widgets[0].settings.socialOverrides[0].role='Club lead';assert.throws(()=>validateClubPage(p),/social/);
});
