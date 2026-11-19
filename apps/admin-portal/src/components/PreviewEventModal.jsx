import { useState } from 'react';
import {
  ArrowLeft, ArrowUpRight, Building2, CalendarDays, Clock, Eye, Globe2, Image as ImageIcon,
  Link2, LockKeyhole, MapPin, Monitor, UsersRound, X,
} from 'lucide-react';
import PortalDialog from './PortalDialog';
import './event-preview.css';

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

function EventTime({ value }) {
  if (!value) return 'To be announced';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : <time dateTime={date.toISOString()}>{dateFormat.format(date)}</time>;
}

function EventLink({ label, value }) {
  const text = value?.trim();
  if (!text) return null;

  let href;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(text) ? text : `https://${text}`);
    if (['https:', 'http:', 'mailto:'].includes(url.protocol)) href = url.href;
  } catch { /* Incomplete draft links can still be reviewed as text. */ }

  const content = <>
    <Link2 size={16} aria-hidden="true" />
    <span><strong>{label}</strong><small>{text}</small></span>
    {href && <ArrowUpRight size={16} aria-hidden="true" />}
  </>;
  return href
    ? <a className="ev-preview-link" href={href} target="_blank" rel="noopener noreferrer">{content}</a>
    : <div className="ev-preview-link">{content}<small>Invalid link</small></div>;
}

export default function PreviewEventModal({ event, onClose }) {
  const [failedPoster, setFailedPoster] = useState(null);
  const poster = event.posterUrl || event.image;
  const title = event.title?.trim() || 'Untitled event';
  const status = event.status || 'draft';
  const visibility = event.visibility || 'public';
  const venue = [...new Set([event.location?.trim(), event.venue?.trim()].filter(Boolean))].join(' · ');
  const coordinatorCount = event.coordinatorUserIds?.length || 0;
  const coordinatorNames = event.coordinatorNames?.filter(Boolean).join(', ');
  const start = event.startAt || event.startDate;
  const end = event.endAt || event.endDate;
  const registrationLink = event.registrationLink || event.registrationUrl;
  const hasLinks = Boolean(registrationLink?.trim() || event.externalLink?.trim());
  const isEmpty = !event.title?.trim() && !poster && !event.shortDescription?.trim() && !event.description?.trim()
    && !venue && !start && !end && !event.mode && !hasLinks && !coordinatorCount && !coordinatorNames;

  return (
    <PortalDialog labelledBy="event-preview-title" onClose={onClose} className="ev-preview">
      <header className="op-dialog-head">
        <div className="ev-preview-heading"><span><Eye size={17} aria-hidden="true" /></span><h2 id="event-preview-title">Event preview</h2></div>
        <button type="button" className="op-icon" onClick={onClose} aria-label="Close preview"><X size={16} /></button>
      </header>
      <div className="ev-preview-content">
        {poster && failedPoster !== poster ? (
          <div className="ev-preview-banner"><img src={poster} alt={`Banner for ${title}`} referrerPolicy="no-referrer" onError={() => setFailedPoster(poster)} /></div>
        ) : (
          <div className="ev-preview-no-banner"><ImageIcon size={19} aria-hidden="true" /><span>{poster ? 'Banner unavailable' : 'No banner added'}</span></div>
        )}

        <div className="ev-preview-title-block">
          <div className="ev-preview-badges">
            <span className="op-status ev-preview-status" data-status={status}>{status}</span>
            <span className="op-status">
              {visibility === 'private' ? <LockKeyhole size={12} aria-hidden="true" /> : <Globe2 size={12} aria-hidden="true" />}{visibility}
            </span>
          </div>
          <h3>{title}</h3>
          {event.shortDescription?.trim() && <p>{event.shortDescription}</p>}
          {isEmpty && <p>Add your event details in the editor to see them here.</p>}
        </div>

        <dl className="ev-preview-details">
          <div><dt><CalendarDays size={15} aria-hidden="true" />Starts</dt><dd><EventTime value={start} /></dd></div>
          <div><dt><Clock size={15} aria-hidden="true" />Ends</dt><dd><EventTime value={end} /></dd></div>
          <div><dt><MapPin size={15} aria-hidden="true" />Location</dt><dd>{venue || 'To be announced'}</dd></div>
          {event.workspaceName && <div><dt><Building2 size={15} aria-hidden="true" />Workspace</dt><dd>{event.workspaceName}</dd></div>}
          {event.mode && <div><dt><Monitor size={15} aria-hidden="true" />Format</dt><dd>{event.mode}</dd></div>}
          {Boolean(coordinatorNames || coordinatorCount) && (
            <div><dt><UsersRound size={15} aria-hidden="true" />Coordinators</dt><dd>{coordinatorNames || `${coordinatorCount} assigned`}</dd></div>
          )}
        </dl>

        {event.description?.trim() && <section className="ev-preview-section">
          <h4>About the event</h4><p>{event.description}</p>
        </section>}
        {hasLinks && <section className="ev-preview-section">
          <h4>Event links</h4>
          <div className="ev-preview-links">
            <EventLink label="Registration" value={registrationLink} />
            <EventLink label="External link" value={event.externalLink} />
          </div>
        </section>}
      </div>
      <footer className="op-dialog-foot"><button type="button" className="op-secondary" onClick={onClose}>
        <ArrowLeft size={15} aria-hidden="true" />Back to editor
      </button></footer>
    </PortalDialog>
  );
}
