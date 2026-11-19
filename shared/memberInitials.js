export function memberInitials(name) {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const initials = [parts[0], ...(parts.length > 1 ? [parts.at(-1)] : [])];
  return initials.map(part => Array.from(part)[0]).join('').toUpperCase();
}
