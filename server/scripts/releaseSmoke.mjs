import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
const serverDirectory=fileURLToPath(new URL('..',import.meta.url));
assert.ok(/^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/.test(process.env.TEST_MONGO_URI||''),'Set TEST_MONGO_URI to a local test MongoDB endpoint.');
const testMongo=new URL(process.env.TEST_MONGO_URI);
const dbName='iedc_release_smoke_'+randomUUID().replaceAll('-','');testMongo.pathname=`/${dbName}`;const mongoUri=testMongo.href;const password=randomUUID();const port=Number(process.env.RELEASE_TEST_PORT||5307);
const env={PATH:process.env.PATH,NODE_ENV:'production',PORT:String(port),MONGO_URI:mongoUri,JWT_SECRET:randomUUID(),ADMIN_MEMBERSHIP_ID:'release-admin',ADMIN_PASSWORD:password,ADMIN_EMAIL:'release@example.invalid',COOKIE_DOMAIN:'.iedclbscek.in',ADMIN_PORTAL_URL:'https://admin.iedclbscek.in',SWAGGER_SERVER_URL:'https://api.iedclbscek.in'};
const child=spawn(process.execPath,['server.js'],{cwd:serverDirectory,env,stdio:['ignore','pipe','pipe']});let logs='';child.stdout.on('data',v=>logs+=v);child.stderr.on('data',v=>logs+=v);let assertions=0;const check=(value,message)=>{assert.ok(value,message);assertions++;};
async function request(path,opts={}){return fetch(`http://127.0.0.1:${port}${path}`,opts);}
try{
 let ready=false;for(let i=0;i<160;i++){if(child.exitCode!==null)throw new Error(`Server stopped: ${logs}`);try{const r=await request('/api/ready');if(r.status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,50));}check(ready,'production startup/readiness');
 check((await request('/api/health')).status===200,'health');const docs=await request('/docs');check(docs.status===200&&(await docs.text()).includes('SwaggerUIBundle'),'docs HTML');
 const spec=await (await request('/api-docs.json')).json();check(spec.servers.some(s=>s.url==='https://api.iedclbscek.in'),'production OpenAPI origin');check(Boolean(spec.paths['/api/admin/clubs/{clubId}/page/draft']),'Nexus Swagger routes');
 check((await request('/api/admin/auth/me')).status===401,'anonymous admin denied');
 const login=await request('/api/admin/auth/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://admin.iedclbscek.in'},body:JSON.stringify({membershipId:'release-admin',password})});check(login.status===200,'production login');const cookie=login.headers.get('set-cookie');check(cookie?.includes('HttpOnly')&&cookie.includes('Secure')&&cookie.includes('SameSite=Lax'),'production secure session cookie');check(login.headers.get('access-control-allow-origin')==='https://admin.iedclbscek.in','trusted admin CORS');
 const sessionCookie=cookie.split(';')[0];const me=await request('/api/admin/auth/me',{headers:{Cookie:sessionCookie}});check(me.status===200&&(await me.json()).canUseIedc,'session works');check(me.headers.get('cache-control')?.includes('no-store'),'private session cache');
 const denied=await request('/api/public/nexus',{headers:{Origin:'https://untrusted.invalid'}});check(denied.status===403,'untrusted CORS denied');const opaque=await request('/api/public/nexus',{headers:{Origin:'null'}});check(opaque.status===403,'opaque custom-widget origin denied');
 const publicData=await request('/api/public/nexus');check(publicData.status===200,'public catalogue');check(publicData.headers.get('x-frame-options')==='DENY','frame protection');check(publicData.headers.get('x-content-type-options')==='nosniff','content-type protection');
 const created=await request('/api/admin/events',{method:'POST',headers:{Cookie:sessionCookie,'Content-Type':'application/json'},body:JSON.stringify({scope:'iedc',title:'Release fixture event',status:'published',visibility:'public'})});check(created.status===201,'organisation event create');check((await request('/api/events')).status===200,'public events');
 const duplicate=await request('/api/admin/clubs',{method:'POST',headers:{Cookie:sessionCookie,'Content-Type':'application/json'},body:JSON.stringify({name:'IEDC'})});check(duplicate.status===409,'duplicate organisation prevented');
 const logout=await request('/api/admin/auth/logout',{method:'POST',headers:{Cookie:sessionCookie}});check(logout.status===200,'logout');
 console.log(JSON.stringify({result:'PASS',node:process.version,assertions,checks:'actual production server.js startup, docs, auth, secure cookies, CORS, public API, event create, reserved organisation',externalServices:'no email or Cloudinary upload sent'}));
}finally{
 child.kill('SIGTERM');await new Promise(resolve=>{if(child.exitCode!==null)resolve();else child.once('exit',resolve);});await mongoose.connect(mongoUri);await mongoose.connection.dropDatabase();await mongoose.disconnect();console.log(JSON.stringify({cleanup:'verified',database:dbName}));
}
