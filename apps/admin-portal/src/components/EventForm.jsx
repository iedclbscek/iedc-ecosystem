import { useId, useState } from 'react';
import { CalendarDays, ChevronDown, Eye, Globe2, Loader2, MapPin, X } from 'lucide-react';
import PortalDialog from './PortalDialog';
import FormAlert from './FormAlert';
import EventBannerUploader from './EventBannerUploader';
import EventDateTimePicker from './EventDateTimePicker';
import { MultiSelectUsers } from './MultiSelectUsers';
import './event-editor.css';

const EVENT_STATUSES = ['draft', 'published', 'completed', 'cancelled'];
const statusLabels = { draft: 'Draft', published: 'Published', completed: 'Completed', cancelled: 'Cancelled' };

function validateEvent({ title, shortDescription, startAt, endAt }) {
  if (!title?.trim()) return { field: 'title', message: 'Enter an event title.' };
  if (shortDescription?.length > 200) return { field: 'shortDescription', message: 'Shorten the summary to 200 characters or fewer.' };
  if (endAt && !startAt) return { field: 'startAt', message: 'Add a start time before setting an end time.' };
  if (endAt && new Date(endAt) <= new Date(startAt)) return { field: 'endAt', message: 'Choose an end time after the start time.' };
  return null;
}

export default function EventForm({
  mode = 'create',
  eventType = 'club',
  workspaceName = eventType === 'club' ? 'Club events' : 'Organization events',
  initialData,
  coordinators = [],
  onSubmit,
  onCancel,
  onPreview,
  isSubmitting = false,
  saveError,
  clubId,
  canPublish = true,
}) {
  const id = useId();
  const [formData, setFormData] = useState(initialData);
  const [isUploading, setIsUploading] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const error = attempted ? validateEvent(formData) : null;
  const dirty = JSON.stringify(formData) !== JSON.stringify(initialData);
  const busy = isSubmitting || isUploading;
  const selectedIds = formData.coordinatorUserIds ?? [];
  const coordinatorName = coordinatorId => {
    const user = coordinators.find(item => String(item._id ?? item.id) === String(coordinatorId));
    return user?.name || user?.membershipId || 'Selected coordinator';
  };

  const initialStatus = initialData.status || 'draft';
  const status = formData.status || 'draft';
  const visibility = formData.visibility || 'public';
  const availableStatuses = !canPublish && initialStatus === 'published'
    ? ['published']
    : EVENT_STATUSES.filter(value => canPublish || value !== 'published');
  const canChangeVisibility = eventType !== 'club' || canPublish || initialStatus !== 'published';
  const isPublic = status === 'published' && visibility === 'public';
  const submitLabel = mode === 'edit' ? 'Save changes'
    : status === 'draft' ? 'Save draft' : status === 'published' ? 'Publish event' : 'Create event';
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  function requestClose() {
    if (busy) return;
    if (dirty) setConfirmDiscard(true);
    else onCancel();
  }

  function save(event) {
    event.preventDefault();
    if (busy || confirmDiscard) return;
    setAttempted(true);
    const validationError = validateEvent(formData);
    if (validationError) {
      document.getElementById(id + '-' + validationError.field)?.focus();
      return;
    }
    onSubmit(formData);
  }

  function change(field, value) {
    setFormData(previous => ({ ...previous, [field]: value }));
  }

  function fieldState(field, descriptionId) {
    const invalid = error?.field === field;
    return {
      id: id + '-' + field,
      'aria-invalid': invalid || undefined,
      'aria-describedby': invalid ? id + '-error' : descriptionId,
    };
  }

  function renderFieldError(field) {
    return error?.field === field && <p id={id + '-error'} className="event-field-error" role="alert">{error.message}</p>;
  }

  function toggleCoordinator(coordinatorId) {
    setFormData(previous => {
      const ids = previous.coordinatorUserIds ?? [];
      return {
        ...previous,
        coordinatorUserIds: ids.includes(coordinatorId)
          ? ids.filter(value => value !== coordinatorId)
          : [...ids, coordinatorId],
      };
    });
  }

  return (
    <PortalDialog labelledBy={id + '-heading'} onClose={requestClose} busy={busy} className="event-editor">
      <form className="event-editor-form" noValidate onSubmit={save}>
        <header className="op-dialog-head event-editor-head">
          <div>
            <h2 id={id + '-heading'}>{mode === 'create' ? 'Create event' : 'Edit event'}</h2>
            <p className="op-caption">{workspaceName}</p>
          </div>
          <button type="button" className="op-icon" aria-label="Close event editor" disabled={busy} onClick={requestClose}><X size={17} /></button>
        </header>

        <div className="event-editor-scroll">
          <fieldset className="event-editor-sections" disabled={isSubmitting}>
            <legend className="sr-only">Event information</legend>
            <section className="event-editor-main" aria-labelledby={id + '-details'}>
              <h3 className="op-section-title" id={id + '-details'}>Event details</h3>
              <div className="op-field">
                <label htmlFor={id + '-title'}>Title</label>
                <input {...fieldState('title')} required value={formData.title}
                  onChange={event => change('title', event.target.value)} placeholder="e.g. Build an app in a day" />
                {renderFieldError('title')}
              </div>

              <div className="op-field">
                <div className="event-field-heading">
                  <label htmlFor={id + '-shortDescription'}>Summary</label>
                  <span id={id + '-summary-count'} className="op-caption">{formData.shortDescription?.length ?? 0}/200</span>
                </div>
                <textarea {...fieldState('shortDescription', id + '-summary-count')} rows={2} value={formData.shortDescription ?? ''}
                  onChange={event => change('shortDescription', event.target.value)} placeholder="A short summary for the event listing" />
                {renderFieldError('shortDescription')}
              </div>

              <label className="op-field">
                Description
                <textarea rows={4} value={formData.description ?? ''} onChange={event => change('description', event.target.value)}
                  placeholder="Agenda, what to bring, or any other useful details" />
              </label>

              <section className="event-editor-poster" aria-labelledby={id + '-poster'}>
                <h4 id={id + '-poster'} className="op-section-title">Poster</h4>
                <EventBannerUploader
                  clubId={clubId}
                  eventType={eventType}
                  currentImageUrl={formData.posterUrl}
                  isUploading={isUploading}
                  setIsUploading={setIsUploading}
                  disabled={isSubmitting}
                  onUploadSuccess={({ url, publicId }) => setFormData(previous => ({ ...previous, posterUrl: url, posterPublicId: publicId }))}
                  onRemove={() => setFormData(previous => ({ ...previous, posterUrl: '', posterPublicId: '' }))}
                />
              </section>
            </section>

            <div className="event-editor-sidebar">
              <section className="event-editor-panel" aria-labelledby={id + '-schedule'}>
                <h3 id={id + '-schedule'} className="op-section-title"><CalendarDays size={16} aria-hidden="true" /> Schedule</h3>
                <div className="op-field">
                  <label htmlFor={id + '-startAt'}>Starts</label>
                  <EventDateTimePicker {...fieldState('startAt', id + '-timezone')} label="Start date and time" value={formData.startAt ?? ''} disabled={isSubmitting}
                    onChange={value => change('startAt', value)} />
                  {renderFieldError('startAt')}
                </div>
                <div className="op-field">
                  <label htmlFor={id + '-endAt'}>Ends <span className="event-optional">(optional)</span></label>
                  <EventDateTimePicker {...fieldState('endAt', id + '-timezone')} label="End date and time" value={formData.endAt ?? ''} disabled={isSubmitting}
                    onChange={value => change('endAt', value)} />
                  {renderFieldError('endAt')}
                </div>
                <p className="op-caption" id={id + '-timezone'}>Times use {timeZone.replaceAll('_', ' ')}.</p>
                <label className="op-field">
                  Location
                  <span className="event-input-with-icon">
                    <MapPin size={15} aria-hidden="true" />
                    <input value={formData.location || formData.venue || ''} placeholder="e.g. Main auditorium or online"
                      onChange={event => setFormData(previous => ({ ...previous, location: event.target.value, venue: event.target.value }))} />
                  </span>
                </label>
              </section>

              <section className="event-editor-panel" aria-labelledby={id + '-publishing'}>
                <h3 id={id + '-publishing'} className="op-section-title"><Globe2 size={16} aria-hidden="true" /> Publishing</h3>
                <div className="event-publishing-fields">
                  <div className="op-field">
                    <label htmlFor={id + '-status'}>Status</label>
                    <select id={id + '-status'} value={status} onChange={event => change('status', event.target.value)}>
                      {availableStatuses.map(value => <option key={value} value={value}>{statusLabels[value]}</option>)}
                    </select>
                  </div>
                  <div className="op-field">
                    <label htmlFor={id + '-visibility'}>Visibility</label>
                    <select id={id + '-visibility'} value={visibility} disabled={!canChangeVisibility} onChange={event => change('visibility', event.target.value)}>
                      <option value="public">Public</option><option value="private">Private</option>
                    </select>
                  </div>
                </div>
                <p className="op-caption">{status === 'draft' ? 'Drafts stay in the workspace until published.'
                  : isPublic && !formData.startAt ? 'Add a start time to include this event in the public schedule.'
                    : visibility === 'private' ? 'Private events stay in the workspace.'
                      : isPublic ? 'Published events appear on the public site.' : 'This status keeps the event off the public listing.'}</p>
              </section>
            </div>

            <details className="event-editor-extras">
              <summary>
                <div><h3 className="op-section-title">Links and coordinators</h3>
                  <p className="op-caption">{selectedIds.length ? selectedIds.length + (selectedIds.length === 1 ? ' coordinator selected' : ' coordinators selected') : 'Optional'}</p>
                </div><ChevronDown size={17} aria-hidden="true" />
              </summary>
              <div className="event-editor-extra-fields">
                <label className="op-field">Registration link
                  <input inputMode="url" value={formData.registrationLink ?? ''} onChange={event => change('registrationLink', event.target.value)}
                    placeholder="https://forms.gle/…" />
                </label>
                <label className="op-field">External link
                  <input inputMode="url" value={formData.externalLink ?? ''} onChange={event => change('externalLink', event.target.value)}
                    placeholder="Website or event information" />
                </label>
                <section className="event-editor-coordinators" aria-labelledby={id + '-coordinators'}>
                  <h4 id={id + '-coordinators'} className="op-section-title">Coordinators</h4>
                  {selectedIds.length > 0 && <ul className="event-coordinator-chips">
                    {selectedIds.map(coordinatorId => (
                      <li key={coordinatorId}>{coordinatorName(coordinatorId)}
                        <button type="button" aria-label={'Remove ' + coordinatorName(coordinatorId)} onClick={() => toggleCoordinator(coordinatorId)}>
                          <X size={13} aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>}
                  <MultiSelectUsers users={coordinators} selectedIds={selectedIds} onToggle={toggleCoordinator}
                    searchEnabled searchPlaceholder="Search coordinators" emptyMessage="No coordinators match your search." />
                </section>
              </div>
            </details>
          </fieldset>
        </div>

        {saveError && !error && <FormAlert className="event-editor-alert">
          {saveError.response?.data?.message || 'Could not save this event. Your changes are still here. Try again.'}
        </FormAlert>}
        <footer className="op-dialog-foot event-editor-actions">
          {onPreview && <button type="button" className="op-secondary" disabled={busy}
            onClick={() => onPreview({ ...formData, workspaceName, coordinatorNames: selectedIds.map(coordinatorName) })}>
            <Eye size={16} aria-hidden="true" /> Preview
          </button>}
          <div>
            <button type="button" className="op-secondary" disabled={busy} onClick={requestClose}>Cancel</button>
            <button type="submit" className="op-primary" disabled={busy}>
              {busy && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
              {isUploading ? 'Uploading poster…' : isSubmitting ? 'Saving…' : submitLabel}
            </button>
          </div>
        </footer>
      </form>
      {confirmDiscard && <PortalDialog labelledBy={id + '-discard-title'} onClose={() => setConfirmDiscard(false)}>
        <header className="op-dialog-head"><h2 id={id + '-discard-title'}>Discard event changes?</h2></header>
        <p className="op-caption p-5">Your unsaved changes will be lost.</p>
        <footer className="op-dialog-foot">
          <button type="button" className="op-secondary" onClick={() => setConfirmDiscard(false)}>Keep editing</button>
          <button type="button" className="op-danger" onClick={onCancel}>Discard changes</button>
        </footer>
      </PortalDialog>}
    </PortalDialog>
  );
}
