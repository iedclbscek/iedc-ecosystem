export const MEMBER_SOCIAL_FIELDS = ['github','linkedin','instagram','website','fossUnited'];
export const memberKey = person => person.key || person.url || person.name;
export function resolveWidgetPeople(settings, team) {
 if(settings.source!=='club')return settings.people||[];
 if(!team||!settings.socialOverrides?.length)return team;
 const overrides=new Map(settings.socialOverrides.map(value=>[value.memberKey,value]));
 return team.map(person=>{
  const override=overrides.get(memberKey(person));
  return override?{...person,...Object.fromEntries(MEMBER_SOCIAL_FIELDS.filter(field=>Object.hasOwn(override,field)).map(field=>[field,override[field]]))}:person;
 });
}
