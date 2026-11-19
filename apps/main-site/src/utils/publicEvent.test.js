import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizePublicEvent, publicEventRegistration } from './publicEvent.js';

const now = new Date('2026-11-19T10:00:00Z');
const published = {
  title: 'Workshop',
  club: { name: 'Innovation Club' },
  status: 'published',
  startAt: '2026-11-20T08:30:00Z',
  registrationLink: 'forms.gle/fixture',
  posterUrl: '/poster.webp',
};
const registration = fields => publicEventRegistration(normalizePublicEvent({ ...published, ...fields }), now);

test('modern public events use the club, poster and actual schedule', () => {
  const event = normalizePublicEvent(published);
  assert.equal(event.category, 'Innovation Club');
  assert.equal(event.image, '/poster.webp');
  assert.equal(event.date.toISOString(), '2026-11-20T08:30:00.000Z');
  assert.equal(event.endDate, null);
  assert.equal(normalizePublicEvent({ createdAt: published.startAt }).date, null);
});

test('a future admin-authored event with a registration URL accepts registration', () => {
  assert.equal(registration({}).registrationHref, 'https://forms.gle/fixture');
  assert.equal(registration({}).isOpen, true);
  assert.equal(registration({ registrationLink: '', registrationUrl: 'https://example.org/apply' }).isOpen, true);
});

test('closed, full, past, cancelled and invalid-link events do not offer registration', () => {
  for (const fields of [
    { isRegistrationOpen: false }, { isFull: true }, { isPast: true }, { status: 'cancelled' },
    { endAt: '2026-11-18T10:00:00Z' }, { registrationDeadline: '2026-11-18T10:00:00Z' },
    { registrationLink: 'broken link' }, { registrationLink: 'data:text/plain,test' },
  ]) assert.equal(registration(fields).isOpen, false, JSON.stringify(fields));
});

test('legacy event dates, images, links and explicit internal registration remain supported', () => {
  const event = normalizePublicEvent({
    date: '2026-11-20', time: 'Afternoon', image: '/legacy.jpg', venue: 'Hall', isRegistrationOpen: true,
  });
  assert.equal(event.time, 'Afternoon');
  assert.equal(event.image, '/legacy.jpg');
  assert.equal(event.location, 'Hall');
  assert.equal(publicEventRegistration(event, now).isOpen, true);
  assert.equal(registration({ registrationLink: 'mailto:events@example.org' }).registrationHref, 'mailto:events@example.org');
});
