export const WIDGET_LABELS = {text:'Text',image:'Image',gallery:'Gallery',links:'Links & buttons',stats:'Statistics',list:'Achievements & lists',people:'Team members',contact:'Contact & socials',events:'Club events',embed:'Video embed',custom:'Custom code'};
const defaults = {text:{title:'',body:''},image:{src:'',alt:'',caption:''},gallery:{title:'',images:[]},links:{title:'',links:[]},stats:{title:'',items:[]},list:{title:'',items:[]},people:{title:'Our team',source:'club',people:[]},contact:{title:'',email:'',coordinator:'',links:[]},events:{title:'Upcoming events'},embed:{title:'',url:''},custom:{title:'Custom widget',html:'<h2>Hello, community.</h2>',css:'body { font-family: system-ui; padding: 24px; }',javascript:'',height:300}};
export const createWidget = type => ({id:crypto.randomUUID(),type,settings:structuredClone(defaults[type])});
export const createContainer = () => ({id:crypto.randomUUID(),title:'New section',hidden:false,columns:1,widgets:[]});
export const emptyPage = name => ({card:{title:name,summary:'',cover:''},hero:{title:name,subtitle:'',image:''},containers:[]});
export function moveContainer(page,id,offset) {
  const next=structuredClone(page), from=next.containers.findIndex(c=>c.id===id), to=from+offset;
  if(from<0||to<0||to>=next.containers.length)return page;
  const [item]=next.containers.splice(from,1); next.containers.splice(to,0,item); return next;
}
export function moveWidget(page,id,targetId,index) {
  const next=structuredClone(page), source=next.containers.find(c=>c.widgets.some(w=>w.id===id)), target=next.containers.find(c=>c.id===targetId);
  if(!source||!target)return page;
  const [widget]=source.widgets.splice(source.widgets.findIndex(w=>w.id===id),1);
  target.widgets.splice(Math.max(0,Math.min(index,target.widgets.length)),0,widget);return next;
}
