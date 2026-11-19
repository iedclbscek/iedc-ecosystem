export const studentDepartments = [
  'Civil Engineering',
  'Computer Science and Business Systems',
  'Computer Science and Engineering',
  'Computer Science and Engineering(AI & Data Science)',
  'Electrical and Electronics Engineering',
  'Electronics and Communication Engineering',
  'Information Technology',
  'Mechanical Engineering',
];

export function joiningYears(recorded = [], year = new Date().getFullYear()) {
  return [...new Set([...recorded, ...Array.from({ length: 5 }, (_, index) => String(year - index))])]
    .filter(value => /^\d{4}$/.test(value)).sort().reverse();
}
