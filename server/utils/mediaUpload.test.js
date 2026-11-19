import test from 'node:test';
import assert from 'node:assert/strict';
import {cloudinaryUploadOptions} from './mediaUpload.js';
test('event posters and club-page images retain their selected aspect ratio',()=>{
 for(const purpose of ['iedc_event','club_event','club_page']){
  const options=cloudinaryUploadOptions(purpose);
  assert.equal(options.transformation[0].crop,'limit');
  assert.equal(options.folder,purpose==='club_page'?'club-pages':'events');
 }
});
test('profile uploads keep the existing square face crop',()=>{
 assert.deepEqual(cloudinaryUploadOptions('profile').transformation[0],{width:800,height:800,crop:'fill',gravity:'face'});
});
