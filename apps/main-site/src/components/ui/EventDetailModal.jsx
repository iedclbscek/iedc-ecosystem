import { createElement, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Building2, CalendarDays, Clock3, Eye, Link2, MapPin, Monitor, Users, X } from 'lucide-react';
import { normalizePublicEvent, publicEventRegistration } from '../../utils/publicEvent';
import '../../../../../shared/event-preview.css';
import './event-detail-modal.css';

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

function EventLink({ label, href }) {
  return <a className="ev-preview-link" href={href} target="_blank" rel="noopener noreferrer">
    <Link2 size={16} aria-hidden="true" />
    <span><strong>{label}</strong><small>{href}</small></span>
    <ArrowUpRight size={16} aria-hidden="true" />
  </a>;
}

function EventDialog({ event: source, onClose }) {
  const ref = useRef(null);
  const [failedImage, setFailedImage] = useState(false);
  const event = normalizePublicEvent(source);
  const { registrationHref, externalHref, isOpen: canRegister, isPast } = publicEventRegistration(event);
  const status = event.status === 'cancelled' ? 'Cancelled' : isPast ? 'Past event' : 'Upcoming';
  const details = [
    [CalendarDays, 'Starts', event.date ? dateFormat.format(event.date) : 'To be announced'],
    [Clock3, 'Ends', event.endDate ? dateFormat.format(event.endDate) : 'To be announced'],
    [MapPin, 'Location', event.location],
  ];
  if (event.time && !event.startAt) details.push([Clock3, 'Time', event.time]);
  if (event.workspaceName || event.club?.name) details.push([Building2, 'Workspace', event.workspaceName || event.club.name]);
  if (event.mode) details.push([Monitor, 'Format', event.mode]);
  if (event.speakers?.length) details.push([Users, 'Speakers', event.speakers.join(', ')]);

  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement;
    const overflow = document.documentElement.style.overflow;
    dialog.showModal();
    document.documentElement.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.documentElement.style.overflow = overflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  function closeBackdrop(click) {
    if (click.target !== ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    if (click.clientX < rect.left || click.clientX > rect.right || click.clientY < rect.top || click.clientY > rect.bottom) onClose();
  }

  return <dialog ref={ref} className="public-event-dialog ev-preview" aria-labelledby="public-event-title"
    onCancel={event => { event.preventDefault(); onClose(); }} onClick={closeBackdrop}>
    <header className="public-event-top">
      <div className="ev-preview-heading"><span><Eye size={17} aria-hidden="true" /></span><strong>Event details</strong></div>
      <button type="button" className="public-event-close" aria-label="Close event details" onClick={onClose}><X size={16} /></button>
    </header>
    <div className="ev-preview-content public-event-scroll">
      {event.image && !failedImage && <div className="ev-preview-banner public-event-poster">
        <img src={event.image} alt={event.title + ' poster'} referrerPolicy="no-referrer" onError={() => setFailedImage(true)} />
      </div>}
      <div className="ev-preview-title-block">
        <div className="ev-preview-badges"><span className="ev-preview-status" data-status={event.status === 'cancelled' ? 'cancelled' : isPast ? 'completed' : event.status}>{status}</span><span>{event.category}</span></div>
        <h2 id="public-event-title">{event.title}</h2>
        {event.shortDescription && <p>{event.shortDescription}</p>}
      </div>
      <dl className="ev-preview-details" aria-label="Event information">
        {details.map(([Icon, label, value]) => <div key={label}>
          <dt>{createElement(Icon, { size: 15, 'aria-hidden': true })}{label}</dt><dd>{value}</dd>
        </div>)}
      </dl>
      {(event.fullDescription || event.description) && <section className="ev-preview-section">
        <h3>About the event</h3><p>{event.fullDescription || event.description}</p>
      </section>}
      {(externalHref || (canRegister && registrationHref)) && <section className="ev-preview-section">
        <h3>Event links</h3>
        <div className="ev-preview-links">
          {canRegister && registrationHref && <EventLink label="Registration" href={registrationHref} />}
          {externalHref && <EventLink label="More information" href={externalHref} />}
        </div>
      </section>}
      {event.date && <p className="public-event-timezone">Times shown in {Intl.DateTimeFormat().resolvedOptions().timeZone.replaceAll('_', ' ')}.</p>}
    </div>
    <footer className="public-event-footer">
      {event.id || event._id ? <Link className="public-event-details-link" to={'/events/' + (event.id || event._id)} onClick={onClose}>Full event details <ArrowUpRight size={15} aria-hidden="true" /></Link> : <span />}
      {canRegister && registrationHref
        ? <a className="public-event-button" href={registrationHref} target="_blank" rel="noopener noreferrer">Register now <ArrowUpRight size={16} aria-hidden="true" /></a>
        : <button type="button" className="public-event-button secondary" onClick={onClose}>Back to events</button>}
    </footer>
  </dialog>;
}

export default function EventDetailModal({ event, isOpen, onClose }) {
  return isOpen && event ? <EventDialog key={event.id || event._id || event.title} event={event} onClose={onClose} /> : null;
}
