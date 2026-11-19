import test from 'node:test';
import assert from 'node:assert/strict';
import { memberInitials } from './memberInitials.js';
test('member initials use the first and last names',()=>{
 assert.equal(memberInitials('Neeraj Rajeev'),'NR');
 assert.equal(memberInitials('  Muhammed P P  '),'MP');
 assert.equal(memberInitials('neeraj'),'N');
 assert.equal(memberInitials(''),'?');
 assert.equal(memberInitials(null),'?');
});
