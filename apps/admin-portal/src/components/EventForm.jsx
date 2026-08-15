import React, { useState, useEffect } from 'react';
import { Loader2, X, CalendarDays, MapPin, Eye, Settings, Clock, Users, Link as LinkIcon, FileText, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import EventBannerUploader from './EventBannerUploader';
import { MultiSelectUsers } from './MultiSelectUsers';

const EVENT_STATUSES = ["draft", "published", "completed", "cancelled"];
const EVENT_VISIBILITIES = ["public", "private"];

const toIsoOrEmpty = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
};

export default function EventForm({
  mode = 'create', // 'create' | 'edit'
  eventType = 'club', // 'club' | 'iedc'
  initialData,
  coordinators = [],
  onSubmit,
  onCancel,
  onPreview,
  isSubmitting = false
}) {
  const [formData, setFormData] = useState(initialData);
  const [isUploading, setIsUploading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Form structure
  // title, shortDescription, description, registrationLink, externalLink,
  // scope, status, visibility, location, venue, mode, startAt, endAt
  // coordinatorUserIds (array) or coordinatorUserId (string) depending on eventType
  // posterUrl, posterPublicId

  useEffect(() => {
    // Basic dirty check
    const isChanged = JSON.stringify(formData) !== JSON.stringify(initialData);
    setIsDirty(isChanged);
  }, [formData, initialData]);

  const handleCancel = () => {
    if (isDirty) {
      if (window.confirm("Discard unsaved changes?")) {
        onCancel();
      }
    } else {
      onCancel();
    }
  };


  const validateSchedule = () => {
    if (!formData.startAt && formData.endAt) {
      toast.error('Please enter a start date/time.');
      return false;
    }
    if (formData.startAt && !formData.endAt) {
      toast.error('Please enter an end date/time.');
      return false;
    }
    if (formData.startAt && formData.endAt) {
      const start = new Date(formData.startAt).getTime();
      const end = new Date(formData.endAt).getTime();
      if (end <= start) {
        toast.error('End date/time must be strictly after start date/time.');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = () => {
    if (!formData.title?.trim()) {
      toast.error('Title is required.');
      return;
    }
    if (!validateSchedule()) return;
    onSubmit(formData);
  };

  const handlePreview = () => {
    if (onPreview) {
      onPreview(formData);
    }
  };

  // Coordinator handlers
  const handleToggleCoordinatorId = (id) => {
    if (eventType === 'club') {
      const list = Array.isArray(formData.coordinatorUserIds) ? formData.coordinatorUserIds : [];
      if (list.includes(id)) {
        setFormData(p => ({ ...p, coordinatorUserIds: list.filter(v => v !== id) }));
      } else {
        setFormData(p => ({ ...p, coordinatorUserIds: [...list, id] }));
      }
    } else {
      // IEDC legacy
      setFormData(p => ({ ...p, coordinatorUserId: p.coordinatorUserId === id ? '' : id }));
    }
  };

  const renderCoordinatorChips = () => {
    const selectedIds = eventType === 'club' 
      ? (formData.coordinatorUserIds || [])
      : (formData.coordinatorUserId ? [formData.coordinatorUserId] : []);

    if (selectedIds.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-2 mt-3">
        {selectedIds.map(id => {
          const user = coordinators.find(c => String(c._id ?? c.id) === String(id));
          return (
            <div key={id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-700">
              {user ? user.name : 'Unknown'}
              <button 
                onClick={() => handleToggleCoordinatorId(id)}
                className="hover:text-red-500 transition-colors"
                title="Remove"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  const selectedCoordinatorIds = eventType === 'club' 
    ? (formData.coordinatorUserIds || [])
    : (formData.coordinatorUserId ? [formData.coordinatorUserId] : []);

  const titleLength = formData.shortDescription?.length || 0;

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-h-[90vh]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
        <h2 className="font-bold text-lg text-slate-900">
          {mode === 'create' ? 'Create Event' : 'Edit Event'}
        </h2>
        <button
          onClick={handleCancel}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
        >
          <X size={20} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-10">

        {/* 01 // EVENT IDENTITY */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            <span className="text-blue-500">01 //</span> Event Identity
          </div>
          
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">Title <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
              placeholder="E.g. Hackathon 2026"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-lg font-semibold placeholder:font-normal"
            />
          </div>

          <div className="pt-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Event Banner</label>
            <p className="text-xs text-slate-500 mb-3">Upload a 16:9 event banner · JPG, PNG or WebP · Max 5 MB</p>
            <EventBannerUploader
              currentImageUrl={formData.posterUrl}
              isUploading={isUploading}
              setIsUploading={setIsUploading}
              onUploadSuccess={({ url, publicId }) => {
                setFormData(p => ({ ...p, posterUrl: url, posterPublicId: publicId }));
              }}
              onRemove={() => {
                setFormData(p => ({ ...p, posterUrl: '', posterPublicId: '' }));
              }}
            />
          </div>
        </section>

        {/* 02 // EVENT DETAILS */}
        <section className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            <span className="text-blue-500">02 //</span> Event Details
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-slate-400" size={16} />
                <input
                  type="text"
                  value={formData.location || formData.venue || ''}
                  onChange={e => setFormData(p => ({ ...p, location: e.target.value, venue: e.target.value }))}
                  placeholder="E.g. Main Auditorium"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Status</label>
              <div className="relative">
                <Settings className="absolute left-3 top-3 text-slate-400" size={16} />
                <select
                  value={formData.status || 'draft'}
                  onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 appearance-none"
                >
                  {EVENT_STATUSES.map(status => (
                    <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Visibility</label>
              <div className="relative">
                <Eye className="absolute left-3 top-3 text-slate-400" size={16} />
                <select
                  value={formData.visibility || 'public'}
                  onChange={e => setFormData(p => ({ ...p, visibility: e.target.value }))}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 appearance-none"
                >
                  {EVENT_VISIBILITIES.map(vis => (
                    <option key={vis} value={vis}>{vis.charAt(0).toUpperCase() + vis.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* 03 // SCHEDULE */}
        <section className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            <span className="text-blue-500">03 //</span> Schedule
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Start Date & Time</label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 text-slate-400" size={16} />
                <input
                  type="datetime-local"
                  value={formData.startAt || ''}
                  onChange={e => setFormData(p => ({ ...p, startAt: e.target.value }))}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">End Date & Time</label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 text-slate-400" size={16} />
                <input
                  type="datetime-local"
                  value={formData.endAt || ''}
                  onChange={e => setFormData(p => ({ ...p, endAt: e.target.value }))}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 04 // COORDINATION */}
        <section className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            <span className="text-blue-500">04 //</span> Coordination
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">Select Coordinators</label>
            <MultiSelectUsers
              users={coordinators}
              selectedIds={selectedCoordinatorIds}
              onToggle={handleToggleCoordinatorId}
              searchEnabled
              searchPlaceholder="Search coordinators..."
            />
            {renderCoordinatorChips()}
          </div>
        </section>

        {/* 05 // INFORMATION */}
        <section className="space-y-4 pt-4 border-t border-slate-100 pb-8">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            <span className="text-blue-500">05 //</span> Information
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">Short Description</label>
              <span className={`text-xs font-semibold ${titleLength > 200 ? 'text-red-500' : 'text-slate-400'}`}>
                {titleLength} / 200
              </span>
            </div>
            <textarea
              value={formData.shortDescription || ''}
              onChange={e => setFormData(p => ({ ...p, shortDescription: e.target.value }))}
              placeholder="A brief summary of the event (shown on cards)..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 min-h-20"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Registration Link</label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-3 text-slate-400" size={16} />
                <input
                  type="text"
                  value={formData.registrationLink || ''}
                  onChange={e => setFormData(p => ({ ...p, registrationLink: e.target.value }))}
                  placeholder="https://forms.gle/..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">External Link</label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-3 text-slate-400" size={16} />
                <input
                  type="text"
                  value={formData.externalLink || ''}
                  onChange={e => setFormData(p => ({ ...p, externalLink: e.target.value }))}
                  placeholder="Optional website or brochure"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1 pt-2">
            <label className="text-sm font-semibold text-slate-700">Full Description</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 text-slate-400" size={16} />
              <textarea
                value={formData.description || ''}
                onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                placeholder="Detailed event description, rules, agenda..."
                className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 min-h-32"
              />
            </div>
          </div>
        </section>
      </div>

      {/* Footer / Actions */}
      <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
        <button
          type="button"
          onClick={handlePreview}
          className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-colors inline-flex items-center gap-2"
        >
          <Eye size={18} />
          <span className="hidden sm:inline">Preview Event</span>
        </button>
        
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isUploading || isSubmitting}
            className="px-4 py-2.5 rounded-xl border border-transparent text-slate-600 font-semibold hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isUploading || isSubmitting || !formData.title?.trim() || titleLength > 200}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-all disabled:opacity-50 disabled:bg-slate-400"
          >
            {(isUploading || isSubmitting) && <Loader2 className="animate-spin" size={18} />}
            {isUploading ? 'Uploading Banner...' : (isSubmitting ? (mode === 'create' ? 'Creating...' : 'Saving...') : (mode === 'create' ? 'Create Event' : 'Save Changes'))}
          </button>
        </div>
      </div>
    </div>
  );
}
