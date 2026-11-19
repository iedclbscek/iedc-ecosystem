import test from 'node:test';
import assert from 'node:assert/strict';
import {buildOpenApiSpec} from '../config/swagger.js';
test('Swagger describes every club Nexus operation and protected capabilities',()=>{
 const spec=buildOpenApiSpec();
 const operations=[['/api/admin/clubs/{clubId}/page/team','get'],['/api/public/nexus/{slug}/team','get'],['/api/admin/clubs/{clubId}/page','get'],['/api/admin/clubs/{clubId}/page/draft','put'],['/api/admin/clubs/{clubId}/page/publish','post'],['/api/admin/clubs/{clubId}/page/unpublish','post'],['/api/admin/clubs/{clubId}/public-binding','patch'],['/api/admin/nexus/order','get'],['/api/admin/nexus/order','put'],['/api/public/nexus','get'],['/api/public/nexus/{slug}','get']];
 for(const [path,method] of operations){assert.ok(spec.paths[path]?.[method]);if(path.includes('/admin/'))assert.ok(spec.paths[path][method].security.length);}
 assert.equal(spec.components.schemas.ClubPageDraft.properties.containers.maxItems,40);
});
