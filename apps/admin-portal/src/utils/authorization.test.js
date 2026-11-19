import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getWorkspaceAccess,
  hasWorkspacePermission,
  normalizePortalRole,
} from './authorization.js';

test('frontend role normalization preserves legacy admin and execom accounts', () => {
  assert.equal(normalizePortalRole('Admin'), 'super_admin');
  assert.equal(normalizePortalRole('execom'), 'iedc_execom');
});

test('workspace permission grants super admin bypass and checks explicit permissions', () => {
  assert.equal(hasWorkspacePermission({ role: 'Admin' }, 'users'), true);
  assert.equal(hasWorkspacePermission({ role: 'club_member', permissions: ['events'] }, 'users'), false);
});

test('club-only roles cannot reuse stale global workspace permissions', () => {
  assert.equal(
    hasWorkspacePermission({ role: 'club_lead', permissions: ['users', 'events'] }, 'users'),
    false,
  );
  assert.equal(
    hasWorkspacePermission({ role: 'club_member', permissions: ['events'] }, 'events'),
    false,
  );
});

test('workspace access is read from the server-provided workspace contract', () => {
  const user = {
    workspaces: [{ id: 'club-1', access: { view: true, edit: true, publish: false, delete: false } }],
  };
  assert.deepEqual(getWorkspaceAccess(user, 'club-1'), {
    view: true,
    edit: true,
    publish: false,
    delete: false,
    managePermissions: false,
    pageEdit: false,
    pagePublish: false,
  });
});

test('page grants are independent from event access', () => {
  const access = getWorkspaceAccess({workspaces:[{id:'c',access:{view:true,pageEdit:true,pagePublish:false}}]}, 'c');
  assert.equal(access.pageEdit,true);assert.equal(access.pagePublish,false);assert.equal(access.edit,false);
});
