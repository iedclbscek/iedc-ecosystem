import { useEffect, useId, useRef, useState } from 'react';
import { Crop, ImagePlus, Loader2, Replace, Trash2, Upload, X } from 'lucide-react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { uploadCloudinaryImage } from '../api/adminService';
import FormAlert from './FormAlert';
import PortalDialog from './PortalDialog';
import './event-poster.css';

const ASPECT = 16 / 9;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function fitCrop(maximum, percent, centerX = 50, centerY = 50) {
  const width = maximum.width * percent / 100;
  const height = maximum.height * percent / 100;
  return {
    unit: '%', width, height,
    x: clamp(centerX - width / 2, 0, 100 - width),
    y: clamp(centerY - height / 2, 0, 100 - height),
  };
}

async function exportCrop(image, crop) {
  const sourceWidth = image.naturalWidth * crop.width / 100;
  const sourceHeight = image.naturalHeight * crop.height / 100;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(Math.min(1600, sourceWidth)));
  canvas.height = Math.max(1, Math.round(canvas.width / ASPECT));

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Your browser could not prepare the crop. Try a different image.');
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, image.naturalWidth * crop.x / 100, image.naturalHeight * crop.y / 100,
    sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.9));
  if (!blob) throw new Error('Could not prepare the crop. Choose a different image.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read the cropped poster. Try again.'));
    reader.readAsDataURL(blob);
  });
}

export default function EventBannerUploader({
  currentImageUrl, onUploadSuccess, onRemove, disabled = false, isUploading = false,
  setIsUploading = () => {}, clubId, eventType = 'club',
}) {
  const input = useRef(null);
  const image = useRef(null);
  const pendingUpload = useRef(false);
  const rangeId = useId();
  const [file, setFile] = useState(null);
  const [crop, setCrop] = useState(null);
  const [maximum, setMaximum] = useState(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [previewFailedFor, setPreviewFailedFor] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const locked = disabled || isUploading;

  useEffect(() => () => {
    if (file) URL.revokeObjectURL(file.url);
  }, [file]);

  function chooseFile(candidate) {
    if (!candidate || locked) return;
    if (!TYPES.includes(candidate.type)) {
      setError('Choose a JPEG, PNG or WebP poster.');
      return;
    }
    if (candidate.size > 5 * 1024 * 1024) {
      setError('Choose a poster of 5 MB or less.');
      return;
    }
    setError('');
    setCrop(null);
    setMaximum(null);
    setFile({ name: candidate.name, url: URL.createObjectURL(candidate) });
  }

  function closeCrop() {
    setFile(null);
    setCrop(null);
    setMaximum(null);
    setError('');
  }

  function initializeCrop(event) {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    const ratio = naturalWidth / naturalHeight;
    const bounds = { width: Math.min(100, 100 * ASPECT / ratio), height: Math.min(100, 100 * ratio / ASPECT) };
    setMaximum(bounds);
    setCrop(fitCrop(bounds, 100));
  }

  function resize(percent, previous) {
    if (!maximum || !previous) return;
    setCrop(fitCrop(maximum, clamp(percent, 1, 100), previous.x + previous.width / 2, previous.y + previous.height / 2));
  }

  async function upload() {
    if (locked || pendingUpload.current || !image.current || !crop) return;
    pendingUpload.current = true;
    setError('');
    setIsUploading(true);
    try {
      const source = await exportCrop(image.current, crop);
      const result = await uploadCloudinaryImage({ source, purpose: eventType === 'iedc' ? 'iedc_event' : 'club_event', clubId });
      if (!result?.url) throw new Error('No image URL was returned. Try uploading the crop again.');
      onUploadSuccess?.({ url: result.url, publicId: result.publicId || result.public_id });
      setSelectedName(file.name);
      setPreviewFailedFor('');
      closeCrop();
    } catch (failure) {
      setError(failure.response?.data?.message || (failure.isAxiosError ? 'Could not upload this poster. Try again.' : failure.message));
    } finally {
      pendingUpload.current = false;
      setIsUploading(false);
    }
  }

  const size = crop && maximum ? Math.round(crop.width / maximum.width * 100) : 100;
  const previewWorks = currentImageUrl && previewFailedFor !== currentImageUrl;
  return (
    <div className="poster-picker">
      <input ref={input} className="poster-picker__input" type="file" aria-label="Poster image"
        accept={TYPES.join(',')} disabled={locked} onChange={event => {
          const candidate = event.target.files?.[0];
          event.target.value = '';
          chooseFile(candidate);
        }} />
      {!file && error && <FormAlert>{error}</FormAlert>}
      {currentImageUrl ? (
        <div className="poster-picker__attached">
          {previewWorks ? (
            <img src={currentImageUrl} alt="Event poster" onError={() => setPreviewFailedFor(currentImageUrl)} />
          ) : <span className="poster-picker__fallback"><ImagePlus size={22} aria-hidden="true" /></span>}
          <div className="poster-picker__details">
            <strong>{selectedName || 'Event poster'}</strong>
            <span>{previewWorks ? '16:9 poster attached' : 'Preview unavailable'}</span>
          </div>
          <div className="poster-picker__actions">
            <button type="button" className="op-secondary" aria-label="Replace poster" disabled={locked} onClick={() => input.current?.click()}><Replace size={15} /> Replace</button>
            {onRemove && <button type="button" className="op-icon danger" aria-label="Remove poster" disabled={locked}
              onClick={() => { onRemove(); setError(''); setSelectedName(''); }}><Trash2 size={15} /></button>}
          </div>
        </div>
      ) : (
        <button type="button" className="poster-picker__drop" data-dragging={dragging} disabled={locked} aria-label="Choose poster"
          onClick={() => input.current?.click()}
          onDragOver={event => { event.preventDefault(); if (!locked) setDragging(true); }}
          onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
          onDrop={event => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files?.[0]); }}>
          <span className="poster-picker__icon"><ImagePlus size={22} strokeWidth={1.7} /></span>
          <span className="poster-picker__details">
            <strong>{dragging ? 'Drop to crop your poster' : 'Choose a poster'}</strong>
            <span>JPEG, PNG or WebP · Up to 5 MB</span>
          </span>
          <Upload className="poster-picker__upload" size={17} aria-hidden="true" />
        </button>
      )}
      {file && (
        <PortalDialog label="Crop poster" onClose={closeCrop} busy={isUploading} className="poster-crop">
          <header className="poster-crop__header">
            <span className="poster-picker__icon"><Crop size={19} /></span>
            <div className="poster-picker__details"><h2>Crop poster</h2><span title={file.name}>{file.name}</span></div>
            <button type="button" className="op-icon" aria-label="Close crop editor" disabled={isUploading} onClick={closeCrop}><X size={16} /></button>
          </header>
          <div className="poster-crop__body">
            <div className="poster-crop__stage">
              <ReactCrop crop={crop || undefined} aspect={ASPECT} keepSelection ruleOfThirds disabled={isUploading || !maximum}
                onChange={(_, next) => resize(next.width / maximum.width * 100, next)}>
                <img ref={image} src={file.url} alt="Poster to crop" draggable="false" onLoad={initializeCrop}
                  onError={() => { setCrop(null); setMaximum(null); setError('This image could not be opened. Cancel and choose another poster.'); }} />
              </ReactCrop>
            </div>
            <p className="poster-crop__help">Move the frame to choose the 16:9 area for your event.</p>
            <div className="poster-crop__size">
              <label htmlFor={rangeId}>Crop size</label><output htmlFor={rangeId}>{size}%</output>
              <input id={rangeId} type="range" min="1" max="100" step="1" value={size} aria-valuetext={`${size} percent`}
                style={{ '--poster-progress': `${(size - 1) / 99 * 100}%` }} disabled={!crop || isUploading}
                onChange={event => resize(Number(event.target.value), crop)} />
            </div>
            {error && <FormAlert>{error}</FormAlert>}
          </div>
          <footer className="poster-crop__footer">
            <button type="button" className="op-secondary" onClick={closeCrop} disabled={isUploading}>Cancel</button>
            <button type="button" className="op-primary" disabled={!crop || isUploading} onClick={upload}>
              {isUploading ? <Loader2 className="animate-spin" size={15} /> : <Upload size={15} />}
              {isUploading ? 'Uploading…' : 'Upload poster'}
            </button>
          </footer>
        </PortalDialog>
      )}
    </div>
  );
}
