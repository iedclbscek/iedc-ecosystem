import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import {
  fetchWebsiteTeamEntrySelf,
  updateWebsiteTeamEntrySelf,
  uploadFreeImage,
} from '../api/adminService';

const normalize = (v) => String(v ?? '').trim();

export default function TeamEntryUpdate() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => normalize(searchParams.get('token')), [searchParams]);

  const [form, setForm] = useState({
    linkedin: '',
    github: '',
    twitter: '',
    imageUrl: '',
    imageBase64: '',
  });

  const [isUploading, setIsUploading] = useState(false);
  const [cropper, setCropper] = useState(null);
  const [cropSrc, setCropSrc] = useState(null);
  const [cropState, setCropState] = useState(undefined);

  const entryQuery = useQuery({
    queryKey: ['teamEntrySelf', token],
    enabled: Boolean(token),
    queryFn: () => fetchWebsiteTeamEntrySelf({ token }),
    onError: (e) => {
      toast.error(e?.response?.data?.message || 'Invalid or expired link');
    },
  });

  useEffect(() => {
    if (entryQuery.data?.entry) {
      const { entry } = entryQuery.data;
      setForm((prev) => ({
        ...prev,
        linkedin: entry.linkedin || '',
        github: entry.github || '',
        twitter: entry.twitter || '',
        imageUrl: entry.imageUrl || '',
        imageBase64: '',
      }));
    }
  }, [entryQuery.data]);

  const updateMutation = useMutation({
    mutationFn: (payload) => updateWebsiteTeamEntrySelf(payload),
    onSuccess: (data) => {
      toast.success('Profile updated');
      if (data?.entry) {
        setForm((prev) => ({
          ...prev,
          linkedin: data.entry.linkedin || '',
          github: data.entry.github || '',
          twitter: data.entry.twitter || '',
          imageUrl: data.entry.imageUrl || '',
          imageBase64: '',
        }));
      }
    },
    onError: (e) => {
      toast.error(e?.response?.data?.message || 'Failed to update');
    },
  });

  const handleFile = async (file) => {
    if (!file) return;
    const maxBytes = 3 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error('File too large (max 3MB)');
      return;
    }
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        setCropSrc(dataUrl);
        setCropper({ file });
      };
      reader.onerror = () => toast.error('Could not read file');
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error(err?.message || 'Failed to read file');
    }
  };

  const onCropImageLoaded = (e) => {
    const { width, height } = e.currentTarget;
    const size = Math.min(width, height);
    const x = (width - size) / 2;
    const y = (height - size) / 2;
    setCropState({
      unit: 'px',
      x,
      y,
      width: size,
      height: size,
      aspect: 1,
    });
  };

  const applyCropAndUpload = async () => {
    if (!cropper || !cropSrc || !cropState) return;
    try {
      setIsUploading(true);

      // Create a fresh image element and load from data URL
      const freshImage = new Image();
      freshImage.onload = async () => {
        try {
          const { x, y, width, height } = cropState;
          
          // Get the scale between the displayed image and natural image
          const displayedImg = document.querySelector('.ReactCrop img');
          if (!displayedImg) throw new Error('Could not find image element');
          
          const scaleX = freshImage.naturalWidth / displayedImg.width;
          const scaleY = freshImage.naturalHeight / displayedImg.height;
          
          // Scale crop coordinates to natural image size
          const pixelX = x * scaleX;
          const pixelY = y * scaleY;
          const pixelWidth = width * scaleX;
          const pixelHeight = height * scaleY;

          // Ensure we have valid dimensions
          if (pixelWidth <= 0 || pixelHeight <= 0) {
            throw new Error('Invalid crop dimensions');
          }

          const targetSize = Math.min(Math.max(Math.round(Math.min(pixelWidth, pixelHeight)), 800), 1600);

          const canvas = document.createElement('canvas');
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Failed to get canvas context');

          ctx.drawImage(
            freshImage,
            pixelX,
            pixelY,
            pixelWidth,
            pixelHeight,
            0,
            0,
            targetSize,
            targetSize,
          );

          const blob = await new Promise((resolve, reject) => {
            canvas.toBlob(
              (b) => {
                if (!b) return reject(new Error('Failed to crop image'));
                resolve(b);
              },
              cropper.file?.type || 'image/jpeg',
              0.96,
            );
          });

          const reader = new FileReader();
          reader.onload = async () => {
            const base64 = typeof reader.result === 'string' ? reader.result.split(',')[1] : '';
            if (!base64) {
              toast.error('Failed to process image');
              setIsUploading(false);
              return;
            }

            try {
              const { url } = await uploadFreeImage({ source: base64 });
              setForm((prev) => ({ ...prev, imageUrl: url }));
              toast.success('Photo uploaded');
              setCropper(null);
              setCropSrc(null);
            } catch (err) {
              toast.error(err?.response?.data?.message || err?.message || 'Upload failed');
            } finally {
              setIsUploading(false);
            }
          };
          reader.onerror = () => {
            toast.error('Failed to read image');
            setIsUploading(false);
          };
          reader.readAsDataURL(blob);
        } catch (err) {
          toast.error(err?.message || 'Failed to crop image');
          setIsUploading(false);
        }
      };
      freshImage.onerror = () => {
        toast.error('Failed to load image');
        setIsUploading(false);
      };
      freshImage.src = cropSrc;
    } catch (err) {
      toast.error(err?.message || 'Failed to crop/upload');
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    if (!token) {
      toast.error('Missing token');
      return;
    }
    const payload = { 
      token, 
      linkedin: form.linkedin,
      github: form.github,
      twitter: form.twitter,
    };
    
    // Only include imageUrl if it has a value
    if (form.imageUrl) {
      payload.imageUrl = form.imageUrl;
    }
    
    updateMutation.mutate(payload);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-sm text-center">
          <div className="text-lg font-semibold text-slate-900">Link is missing</div>
          <div className="text-slate-600 mt-2">The update link is invalid. Please use the latest email you received.</div>
          <button
            type="button"
            className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold"
            onClick={() => navigate('/')}
          >
            Go home
          </button>
        </div>
      </div>
    );
  }

  const entry = entryQuery.data?.entry;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 max-w-2xl w-full shadow-sm">
        <div className="mb-4">
          <div className="text-xs font-bold text-blue-600 uppercase tracking-wide">IEDC Website</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">Update your profile</div>
          <div className="text-slate-600 mt-1">Upload a square photo and refresh your social links.</div>
        </div>

        {entryQuery.isLoading ? (
          <div className="text-slate-600">Loading entry...</div>
        ) : entry ? (
          <>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 mb-4">
              <div className="text-sm text-slate-700 font-semibold">{entry.name || 'Your profile'}</div>
              <div className="text-xs text-slate-500">{entry.email || 'No email'}{entry.year ? ` • ${entry.year}` : ''}</div>
              <div className="text-xs text-slate-500">Role: {entry.roleTitle || 'Member'}</div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-sm font-semibold text-slate-700 mb-1">LinkedIn</div>
                <input
                  value={form.linkedin}
                  onChange={(e) => setForm((p) => ({ ...p, linkedin: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-700 mb-1">GitHub</div>
                <input
                  value={form.github}
                  onChange={(e) => setForm((p) => ({ ...p, github: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  placeholder="https://github.com/..."
                />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-700 mb-1">Twitter / X</div>
                <input
                  value={form.twitter}
                  onChange={(e) => setForm((p) => ({ ...p, twitter: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  placeholder="https://twitter.com/..."
                />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-semibold text-slate-700 mb-1">Photo</div>
                <input
                  value={form.imageUrl}
                  onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  placeholder="Image URL (optional)"
                />
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold cursor-pointer hover:bg-slate-50 disabled:opacity-50">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFile(file);
                      e.target.value = '';
                    }}
                  />
                  {isUploading ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Uploading...
                    </>
                  ) : (
                    'Upload photo'
                  )}
                </label>
                <div className="text-xs text-slate-500">Square photo recommended. Max 3MB.</div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold"
                onClick={() => navigate('/')}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50"
                onClick={handleSave}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </>
        ) : (
          <div className="text-slate-600">Entry not found or link expired.</div>
        )}
      </div>

      {cropper && cropSrc ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="font-bold text-slate-900">Crop photo</div>
              <button
                type="button"
                className="text-slate-500 hover:text-slate-800"
                onClick={() => {
                  setCropper(null);
                  setCropSrc(null);
                }}
              >
                ✕
              </button>
            </div>
            <div className="p-5">
              <ReactCrop
                crop={cropState}
                onChange={setCropState}
                aspect={1}
                circularCrop={false}
              >
                <img
                  src={cropSrc}
                  onLoad={onCropImageLoaded}
                  style={{ maxWidth: '100%', maxHeight: '400px' }}
                />
              </ReactCrop>
            </div>
            <div className="p-5 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold"
                onClick={() => {
                  setCropper(null);
                  setCropSrc(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUploading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50"
                onClick={applyCropAndUpload}
              >
                {isUploading ? <Loader2 className="animate-spin" size={16} /> : null}
                {isUploading ? 'Uploading...' : 'Use photo'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}   
