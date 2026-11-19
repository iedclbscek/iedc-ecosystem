export function parseEventDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function eventLink(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text || /[\s\\]/.test(text)) return '';
  try {
    if (/^mailto:/i.test(text)) {
      const url = new URL(text);
      return /^[^@,;]+@[^@,;]+\.[^@,;]+$/.test(url.pathname) ? url.href : '';
    }
    const absolute = /^https?:\/\//i.test(text);
    if (!absolute && !/^[\w.-]+\.[\w-]+(?::\d+)?(?:[/?#]|$)/.test(text)) return '';
    const url = new URL(absolute ? text : `https://${text}`);
    return url.hostname && !url.username && !url.password ? url.href : '';
  } catch {
    return '';
  }
}

function eventPoster(event) {
  for (const value of [event.posterUrl, event.image]) {
    const src = typeof value === 'string' ? value.trim() : '';
    if (/^\/(?!\/)/.test(src)) return src;
    try {
      const url = new URL(src);
      if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password) return src;
    } catch { /* Missing and non-URL placeholders have no poster. */ }
  }
  return null;
}

export function normalizePublicEvent(event) {
  return {
    ...event,
    date: parseEventDate(event.startAt || event.startDate || event.date),
    endDate: parseEventDate(event.endAt || event.endDate),
    category: event.category || event.club?.name || 'IEDC',
    location: event.location || event.venue || 'TBA',
    image: eventPoster(event),
    fullDescription: event.fullDescription || event.description || '',
  };
}

export function publicEventRegistration(event, now = new Date()) {
  const registrationHref = eventLink(event.registrationLink) || eventLink(event.registrationUrl);
  const externalHref = eventLink(event.externalLink);
  const end = event.endDate || event.date;
  const isPast = Boolean(event.isPast || (end && end < now) || ['completed', 'cancelled'].includes(event.status));
  const deadline = parseEventDate(event.registrationDeadline);
  const internalRegistration = event.isRegistrationOpen === true && !event.registrationLink && !event.registrationUrl;
  const isOpen = Boolean((registrationHref || internalRegistration) && event.isRegistrationOpen !== false &&
    !isPast && !event.isFull && !(deadline && deadline < now));
  return { registrationHref, externalHref, isOpen, isPast };
}
