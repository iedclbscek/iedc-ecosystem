import { createElement, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, Clock3, MapPin, Users, X } from 'lucide-react';
import { normalizePublicEvent, publicEventRegistration } from '../../utils/publicEvent';
import './event-detail-modal.css';

function EventDialog({ event: source, onClose }) {
  const ref = useRef(null);
  const [failedImage, setFailedImage] = useState(false);
  const event = normalizePublicEvent(source);
  const { registrationHref, externalHref, isOpen: canRegister, isPast } = publicEventRegistration(event);
  const date = event.date;
  const end = event.endDate;
  const dateLabel = date?.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) || 'To be announced';
  const timeLabel = event.time || date?.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) || 'To be announced';
  const status = event.status === 'cancelled' ? 'Cancelled' : isPast ? 'Past event' : 'Upcoming';
  const details = [
    [CalendarDays, 'Date', dateLabel],
    [Clock3, 'Time', timeLabel],
    [MapPin, 'Location', event.location],
  ];
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

  return <dialog ref={ref} className="public-event-dialog" aria-labelledby="public-event-title"
    onCancel={event => { event.preventDefault(); onClose(); }} onClick={closeBackdrop}>
    <header className="public-event-top">
      <span>IEDC LBSCEK <span aria-hidden="true">/</span> Events</span>
      <button type="button" className="public-event-close" aria-label="Close event details" onClick={onClose}><X size={19} /></button>
    </header>
    <div className="public-event-scroll">
      <div className="public-event-layout">
        <div className="public-event-main">
          <div className="public-event-meta"><span>{event.category}</span><span className="public-event-status" data-past={isPast}>{status}</span></div>
          <h2 id="public-event-title">{event.title}</h2>
          {event.shortDescription && <p className="public-event-summary">{event.shortDescription}</p>}
          {event.image && !failedImage && <div className="public-event-poster">
            <img src={event.image} alt={event.title + ' poster'} onError={() => setFailedImage(true)} />
          </div>}
          {(event.fullDescription || event.description) && <section className="public-event-about">
            <h3>About the event</h3>
            <p>{event.fullDescription || event.description}</p>
          </section>}
        </div>
        <aside className="public-event-facts" aria-label="Event information">
          <dl>{details.map(([Icon, label, value]) => <div key={label}>
            <dt>{createElement(Icon, {size:16, "aria-hidden":true})}{label}</dt><dd>{value}</dd>
          </div>)}
          {end && <div><dt>Ends</dt><dd>{end.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</dd></div>}
          </dl>
          {date && <p className="public-event-timezone">Times shown in {Intl.DateTimeFormat().resolvedOptions().timeZone.replaceAll('_', ' ')}.</p>}
        </aside>
      </div>
    </div>
    <footer className="public-event-footer">
      {event.id || event._id ? <Link className="public-event-details-link" to={'/events/' + (event.id || event._id)} onClick={onClose}>Full event details <ArrowUpRight size={15} aria-hidden="true" /></Link> : <span />}
      <div>
        {externalHref && <a className="public-event-button secondary" href={externalHref} target="_blank" rel="noopener noreferrer">More information <ArrowUpRight size={15} aria-hidden="true" /></a>}
        {canRegister && registrationHref && <a className="public-event-button" href={registrationHref} target="_blank" rel="noopener noreferrer">Register now <ArrowUpRight size={16} aria-hidden="true" /></a>}
        {!(canRegister && registrationHref) && <button type="button" className="public-event-button secondary" onClick={onClose}>Back to events</button>}
      </div>
    </footer>
  </dialog>;
}

export default function EventDetailModal({ event, isOpen, onClose }) {
  return isOpen && event ? <EventDialog key={event.id || event._id || event.title} event={event} onClose={onClose} /> : null;
}
