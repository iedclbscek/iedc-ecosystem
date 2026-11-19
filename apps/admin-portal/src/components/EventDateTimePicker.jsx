import { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import PortalDialog from './PortalDialog';
import './event-date-picker.css';

const pad = value => String(value).padStart(2, '0');
const dateKey = date => [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join('-');
const format = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export default function EventDateTimePicker({ id, value, onChange, label, disabled, ...accessibility }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [hour, setHour] = useState('09');
  const [minute, setMinute] = useState('00');
  const [month, setMonth] = useState(() => new Date());
  const parsed = value ? new Date(value) : null;
  const valid = parsed && Number.isFinite(parsed.getTime());
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: Math.ceil((start.getDay() + count) / 7) * 7 }, (_, index) =>
    new Date(month.getFullYear(), month.getMonth(), index - start.getDay() + 1));

  function show() {
    const selected = valid ? parsed : new Date();
    setDraft(value ? value.slice(0, 10) : '');
    setHour(valid ? pad(parsed.getHours()) : '09');
    setMinute(valid ? pad(parsed.getMinutes()) : '00');
    setMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
    setOpen(true);
  }

  function moveFocus(event, date) {
    const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -date.getDay(), End: 6 - date.getDay() };
    if (!(event.key in moves)) return;
    event.preventDefault();
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + moves[event.key]);
    setMonth(new Date(next.getFullYear(), next.getMonth(), 1));
    requestAnimationFrame(() => document.getElementById(id + '-' + dateKey(next))?.focus());
  }

  return <>
    <button type="button" id={id} className="event-date-trigger" disabled={disabled} aria-haspopup="dialog"
      aria-expanded={open} {...accessibility} onClick={show}>
      <span>{valid ? format.format(parsed) : 'Choose date and time'}</span><CalendarDays size={16} aria-hidden="true" />
    </button>
    {open && <PortalDialog labelledBy={id + '-picker-title'} onClose={() => setOpen(false)} className="event-date-dialog">
      <header className="op-dialog-head"><h2 id={id + '-picker-title'}>{label}</h2></header>
      <div className="event-date-content">
        <div className="event-calendar-heading">
          <button type="button" className="op-icon" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={16} /></button>
          <p aria-live="polite">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>
          <button type="button" className="op-icon" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={16} /></button>
        </div>
        <div className="event-calendar-week" aria-hidden="true">{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => <span key={day}>{day}</span>)}</div>
        <div className="event-calendar-days" role="group" aria-label="Choose a date">
          {days.map(date => {
            const key = dateKey(date);
            return <button key={key} type="button" id={id + '-' + key}
              className={date.getMonth() !== month.getMonth() ? 'outside-month' : ''}
              aria-label={date.toLocaleDateString(undefined, { dateStyle: 'full' })}
              aria-pressed={draft === key} aria-current={key === dateKey(new Date()) ? 'date' : undefined}
              onKeyDown={event => moveFocus(event, date)} onClick={() => setDraft(key)}>{date.getDate()}</button>;
          })}
        </div>
        <div className="event-picker-time">
          <div className="op-field"><label htmlFor={id + '-hour'}>Hour</label>
            <select id={id + '-hour'} value={hour} onChange={event => setHour(event.target.value)}>
              {Array.from({ length: 24 }, (_, number) => <option key={number} value={pad(number)}>{pad(number)}</option>)}
            </select>
          </div>
          <div className="op-field"><label htmlFor={id + '-minute'}>Minute</label>
            <select id={id + '-minute'} value={minute} onChange={event => setMinute(event.target.value)}>
              {Array.from({ length: 60 }, (_, number) => <option key={number} value={pad(number)}>{pad(number)}</option>)}
            </select>
          </div>
        </div>
        <p className="op-caption">24-hour time · {Intl.DateTimeFormat().resolvedOptions().timeZone.replaceAll('_', ' ')}</p>
      </div>
      <footer className="op-dialog-foot">
        <button type="button" className="event-date-clear" onClick={() => { onChange(''); setOpen(false); }}>Clear</button>
        <button type="button" className="op-secondary" onClick={() => setOpen(false)}>Cancel</button>
        <button type="button" className="op-primary" disabled={!draft} onClick={() => { onChange(draft + 'T' + hour + ':' + minute); setOpen(false); }}>Apply</button>
      </footer>
    </PortalDialog>}
  </>;
}
