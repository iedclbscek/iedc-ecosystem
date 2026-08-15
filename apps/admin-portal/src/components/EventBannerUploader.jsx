import React, { useRef, useState } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Loader2, UploadCloud, X, Image as ImageIcon, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadCloudinaryImage } from '../api/adminService';

// STATUS ENUM
export const UPLOAD_STATUS = {
  IDLE: 'IDLE',
  SELECTING: 'SELECTING',
  CROPPING: 'CROPPING',
  UPLOADING: 'UPLOADING',
  ERROR: 'ERROR',
};

export default function EventBannerUploader({
  currentImageUrl,
  onUploadSuccess,
  onRemove,
  disabled = false,
  isUploading = false,
  setIsUploading = () => {},
}) {
  const [status, setStatus] = useState(UPLOAD_STATUS.IDLE);
  
  // Crop state
  const [cropperFile, setCropperFile] = useState(null);
  const [cropSrc, setCropSrc] = useState(null);
  // Free aspect ratio
  const [cropState, setCropState] = useState({ unit: '%', x: 0, y: 0, width: 100, height: 100 });
  const [cropImageEl, setCropImageEl] = useState(null);

  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (JPEG, PNG, WebP)');
      return;
    }
    
    // Validate size (e.g. max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image is too large. Maximum size is 5MB.');
      return;
    }

    setStatus(UPLOAD_STATUS.CROPPING);
    setCropperFile(file);

    const reader = new FileReader();
    reader.addEventListener('load', () => setCropSrc(reader.result));
    reader.readAsDataURL(file);
    
    // reset input
    e.target.value = '';
  };

  const onCropImageLoaded = (img) => {
    setCropImageEl(img);
  };

  const applyCropAndUpload = async () => {
    if (!cropImageEl) return;
    
    setStatus(UPLOAD_STATUS.UPLOADING);
    setIsUploading(true);
    
    try {
      const { x = 0, y = 0, width = 0, height = 0 } = cropState;
      const canvas = document.createElement('canvas');
      const scaleX = cropImageEl.naturalWidth / cropImageEl.width;
      const scaleY = cropImageEl.naturalHeight / cropImageEl.height;
      const pixelRatio = window.devicePixelRatio || 1;

      // Desired output dimensions (e.g. max 1600 width)
      const croppedWidth = width * scaleX;
      const croppedHeight = height * scaleY;
      const targetWidth = Math.min(croppedWidth, 1600);
      const scaleFactor = targetWidth / croppedWidth;
      const targetHeight = croppedHeight * scaleFactor;

      canvas.width = targetWidth * pixelRatio;
      canvas.height = targetHeight * pixelRatio;

      const ctx = canvas.getContext('2d');
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(
        cropImageEl,
        x * scaleX,
        y * scaleY,
        width * scaleX,
        height * scaleY,
        0,
        0,
        targetWidth,
        targetHeight
      );

      const base64Image = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => {
          if (!b) return reject(new Error('Failed to crop image'));
          const reader = new FileReader();
          reader.readAsDataURL(b);
          reader.onloadend = () => resolve(reader.result);
        }, 'image/webp', 0.9); // WebP format for optimization
      });

      // Upload to cloudinary
      const result = await uploadCloudinaryImage({ source: base64Image });
      
      if (result?.url) {
        toast.success('Banner uploaded successfully!');
        setStatus(UPLOAD_STATUS.IDLE);
        setCropSrc(null);
        setCropperFile(null);
        if (onUploadSuccess) {
          onUploadSuccess({ url: result.url, publicId: result.public_id || result.publicId });
        }
      } else {
        throw new Error('No URL returned from server');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || 'Failed to upload image');
      setStatus(UPLOAD_STATUS.ERROR);
    } finally {
      setIsUploading(false);
    }
  };

  const cancelCrop = () => {
    setStatus(UPLOAD_STATUS.IDLE);
    setCropSrc(null);
    setCropperFile(null);
    setCropImageEl(null);
  };

  return (
    <div className="space-y-4">
      {/* ── Hidden file input ── */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/jpeg, image/png, image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ── Banner Preview Area ── */}
      <div className="relative w-full rounded-xl overflow-hidden border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center transition-all group">
        
        {currentImageUrl && status !== UPLOAD_STATUS.CROPPING && status !== UPLOAD_STATUS.UPLOADING ? (
          <>
            <img src={currentImageUrl} alt="Event Banner" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={disabled || isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-white text-slate-900 rounded-lg text-sm font-bold hover:bg-slate-100 transition-colors shadow-lg"
              >
                Replace
              </button>
              {onRemove && (
                <button
                  type="button"
                  disabled={disabled || isUploading}
                  onClick={onRemove}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-bold hover:bg-red-600 transition-colors shadow-lg"
                >
                  Remove
                </button>
              )}
            </div>
          </>
        ) : (
          /* Empty State or Uploading State */
          <div className="text-center p-6 flex flex-col items-center w-full h-full justify-center">
            {status === UPLOAD_STATUS.UPLOADING ? (
              <>
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-700">Uploading banner...</p>
                <p className="text-xs text-slate-500 mt-1">Please wait, optimizing image...</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <ImageIcon className="w-8 h-8 text-blue-500" />
                </div>
                <h4 className="text-base font-semibold text-slate-700 mb-1">Event Banner</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mb-4">
                  Upload your event poster. Jpeg, Png or WebP up to 5MB.
                </p>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:border-blue-500 hover:text-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <UploadCloud size={16} /> Select Image
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Cropper Modal ── */}
      {status === UPLOAD_STATUS.CROPPING && cropSrc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Crop Banner</h3>
                <p className="text-sm text-slate-500">Position your image (16:9 aspect ratio)</p>
              </div>
              <button onClick={cancelCrop} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 bg-slate-50 flex-1 overflow-y-auto flex items-center justify-center">
              <ReactCrop
                crop={cropState}
                onChange={(c) => setCropState(c)}
                className="max-h-[60vh]"
              >
                <img
                  src={cropSrc}
                  alt="Crop preview"
                  onLoad={(e) => onCropImageLoaded(e.currentTarget)}
                  className="max-h-[60vh] object-contain"
                />
              </ReactCrop>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelCrop}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyCropAndUpload}
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <UploadCloud size={18} />
                Upload Banner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
