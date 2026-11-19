export function mergeNexusCatalogue(legacy, {pages = [], withdrawn = [], order = []} = {}) {
 const hidden = new Set(withdrawn);
 const result = new Map(legacy.filter(c=>!hidden.has(c.id)).map(c=>[c.id,c]));
 for(const {slug,card} of pages) if(!hidden.has(slug)) result.set(slug,{...result.get(slug),id:slug,path:`/nexus/${slug}`,name:String(card?.title||slug),description:String(card?.summary||''),cover:String(card?.cover||'')});
 const ranks = new Map(order.map((slug,i)=>[slug,i]));
 return [...result.values()].sort((a,b)=>(ranks.get(a.id)??Number.MAX_SAFE_INTEGER)-(ranks.get(b.id)??Number.MAX_SAFE_INTEGER));
}
