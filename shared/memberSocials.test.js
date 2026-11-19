import test from 'node:test';
import assert from 'node:assert/strict';
import {memberSocials,inlineTeamLinks} from './memberSocials.js';
test('member URLs become matching icons, deduplicated with unsafe links excluded',()=>{
 assert.deepEqual(memberSocials({url:'https://github.com/neeraj',github:'https://github.com/neeraj',linkedin:'https://linkedin.com/in/neeraj'}).map(l=>l.provider),['github','linkedin']);
 assert.deepEqual(memberSocials({github:'javascript:alert(1)',url:'/team/123'}),[]);
});
test('saved legacy team links move into their member cards without mutating saved content',()=>{
 const page={containers:[{id:'team',widgets:[{id:'p',type:'people',settings:{people:[{name:'Neeraj Rajeev'}]}}]},{id:'links',widgets:[{id:'l',type:'links',settings:{title:'Connect with our team',links:[{label:'Neeraj Rajeev · Github',url:'https://github.com/neeraj'}]}}]}]};
 const result=inlineTeamLinks(page);assert.equal(result.containers.length,1);assert.equal(result.containers[0].widgets[0].settings.people[0].socials[0].url,'https://github.com/neeraj');assert.equal(page.containers.length,2);
});
test('edited social fields replace old profile or migrated social links, including clearing a link',()=>{
 const person={url:'https://github.com/old',socials:[{url:'https://linkedin.com/in/old'}],github:'https://github.com/new',linkedin:''};
 assert.deepEqual(memberSocials(person).map(link=>link.url),['https://github.com/new']);
});
