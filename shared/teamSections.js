export const teamSections = [
  ['nodalOfficers', 'Nodal officers'],
  ['facultyMembers', 'Faculty board'],
  ['coreTeam', 'Executive committee'],
  ['teamMembers', 'Member network'],
];

export function teamSection(role, membershipId = '') {
  const title = String(role || '').toLowerCase();
  const member = String(membershipId || '').toUpperCase();
  if (title.includes('nodal officer') || title.includes('president') || member.includes('ST')) return 'nodalOfficers';
  if (['faculty', 'advisor', 'mentor', 'principal'].some(word => title.includes(word))) return 'facultyMembers';
  if (['ceo', 'cto', 'coo', 'cfo', 'cmo', 'lead', 'head', 'chief', 'chair', 'coordinator'].some(word => title.includes(word))) return 'coreTeam';
  return 'teamMembers';
}
