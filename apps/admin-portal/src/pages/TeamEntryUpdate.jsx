import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, UserRound } from 'lucide-react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { fetchWebsiteTeamEntrySelf, updateWebsiteTeamEntrySelf } from '../api/adminService';
import { RowsSkeleton } from '../components/InlineSkeleton';
import PortalDialog from '../components/PortalDialog';
import AccountPage from './AccountPage';
import FormAlert from '../components/FormAlert';

const socialFields = [
  ['linkedin', 'LinkedIn', 'https://linkedin.com/in/'],
  ['github', 'GitHub', 'https://github.com/'],
  ['twitter', 'Twitter / X', 'https://x.com/'],
];

function CropPhoto({ source, onClose, onApply }) {
  const imageRef = useRef(null);
  const [crop, setCrop] = useState();
  const [error, setError] = useState('');

  function applyCrop() {
    const image = imageRef.current;
    if (!image || !crop?.width || !crop?.height) return;
    try {
      const width = image.naturalWidth * crop.width / 100;
      const height = image.naturalHeight * crop.height / 100;
      const side = Math.min(1600, Math.max(1, Math.round(Math.min(width, height))));
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = side;
      const context = canvas.getContext('2d');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, side, side);
      context.drawImage(image, image.naturalWidth * crop.x / 100, image.naturalHeight * crop.y / 100,
        width, height, 0, 0, side, side);
      const encoded = canvas.toDataURL('image/jpeg', 0.75).split(',')[1];
      if (!encoded) throw new Error();
      onApply(encoded);
    } catch {
      setError('This image could not be cropped. Choose another photo.');
    }
  }

  return <PortalDialog labelledBy="crop-title" onClose={onClose}>
    <header className="profile-crop-header"><h2 id="crop-title">Crop your photo</h2><p className="account-help">Adjust the square to frame your profile photo.</p></header>
    <div className="profile-crop-body">
      <ReactCrop crop={crop} aspect={1} onChange={(_, percent) => setCrop(percent)} keepSelection>
        <img src={source} ref={imageRef} alt="Photo to crop" onError={() => setError('This image cannot be opened. Choose another photo.')}
          onLoad={({ currentTarget: image }) => {
            setCrop(centerCrop(makeAspectCrop({ unit: '%', width: 100 }, 1, image.width, image.height), image.width, image.height));
          }} />
      </ReactCrop>
    </div>
    {error && <FormAlert>{error}</FormAlert>}
    <footer className="profile-crop-actions"><button className="op-secondary" onClick={onClose}>Cancel</button>
      <button className="op-primary" disabled={!crop?.width || Boolean(error)} onClick={applyCrop}>Use photo</button></footer>
  </PortalDialog>;
}

function ProfileForm({ entry, token }) {
  const queryClient = useQueryClient();
  const [changes, setChanges] = useState({});
  const [source, setSource] = useState('');
  const sourceRef = useRef('');
  useEffect(() => () => { if (sourceRef.current) URL.revokeObjectURL(sourceRef.current); }, []);
  function closeCrop() {
    if (sourceRef.current) URL.revokeObjectURL(sourceRef.current);
    sourceRef.current = '';
    setSource('');
  }
  const [photoError, setPhotoError] = useState('');
  const saved = useMutation({
    mutationFn: updateWebsiteTeamEntrySelf,
    onSuccess: data => {
      queryClient.setQueryData(['teamEntrySelf', token], data);
      setChanges({});
    },
  });
  function edit(patch) {
    setChanges(previous => ({ ...previous, ...patch }));
    saved.reset();
  }
  function selectPhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 1.5 * 1024 * 1024) {
      setPhotoError('Choose an image of 1.5 MB or less.');
      return;
    }
    setPhotoError('');
    sourceRef.current = URL.createObjectURL(file);
    setSource(sourceRef.current);
  }
  const form = { ...entry, ...changes };
  const photo = form.imageBase64 ? `data:image/jpeg;base64,${form.imageBase64}` : form.imageUrl;
  return <>
    <form className="account-form" aria-busy={saved.isPending} onSubmit={event => {
      event.preventDefault();
      if (!saved.isPending && Object.keys(changes).length) saved.mutate({ token, ...changes });
    }}>
      <div className="profile-identity">
        {photo ? <img src={photo} alt="Your profile" className="profile-avatar" /> : <span className="profile-avatar"><UserRound size={24} /></span>}
        <div><strong>{entry.name || 'Your profile'}</strong><p>{[entry.roleTitle || 'Member', entry.year].filter(Boolean).join(' · ')}</p>{entry.email && <p>{entry.email}</p>}</div>
      </div>
      <fieldset className="profile-fields" disabled={saved.isPending}>
        <legend>Social links</legend>
        {socialFields.map(([key, label, placeholder]) => <label key={key}>{label}
          <input value={form[key] || ''} inputMode="url" placeholder={placeholder} onChange={event => edit({ [key]: event.target.value })} />
        </label>)}
      </fieldset>
      <fieldset className="profile-fields" disabled={saved.isPending}>
        <legend>Profile photo</legend>
        <label>Image URL<input value={form.imageUrl || ''} inputMode="url" placeholder="https://" onChange={event => edit({ imageUrl: event.target.value, imageBase64: '' })} /></label>
        <label className="profile-upload">Upload a photo
          <input type="file" accept="image/*" onChange={selectPhoto} aria-describedby="photo-help" />
        </label>
        <p className="account-help" id="photo-help">Choose an image up to 1.5 MB and crop it to a square.</p>
        {photo && <button type="button" className="op-secondary justify-self-start" onClick={() => edit({ imageUrl: '', imageBase64: '' })}>Remove photo</button>}
        {photoError && <FormAlert>{photoError}</FormAlert>}
      </fieldset>
      {saved.isError && <FormAlert>{saved.error?.response?.data?.message || 'Could not save your profile. Check your connection and try again.'}</FormAlert>}
      {saved.isSuccess && <p role="status" className="account-ok">Your profile has been updated.</p>}
      <div className="op-actions justify-end"><Link to="/" className="op-secondary">Cancel</Link>
        <button className="op-primary" disabled={saved.isPending || !Object.keys(changes).length}>
          {saved.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}{saved.isPending ? 'Saving…' : 'Save changes'}
        </button></div>
    </form>
    {source && <CropPhoto source={source} onClose={closeCrop} onApply={imageBase64 => {
      edit({ imageBase64, imageUrl: '' });
      closeCrop();
    }} />}
  </>;
}

export default function TeamEntryUpdate() {
  const [params] = useSearchParams();
  const token = (params.get('token') || '').trim();
  const query = useQuery({
    queryKey: ['teamEntrySelf', token],
    enabled: Boolean(token),
    queryFn: () => fetchWebsiteTeamEntrySelf({ token }),
    retry: false,
  });

  if (!token || (query.isError && [400, 401, 403, 404].includes(query.error?.response?.status))) {
    return <AccountPage title={token ? 'Profile link unavailable' : 'Profile link incomplete'} description="Open the full link in your latest IEDC profile email, or ask the team for a new one.">
      <div className="account-form"><Link to="/" className="op-secondary">Go to workspace</Link></div>
    </AccountPage>;
  }

  return <AccountPage wide title="Update your profile" description="Manage the photo and social links on your IEDC team profile.">
    {query.isLoading ? <div className="account-form"><RowsSkeleton rows={6} columns={2} label="Loading your profile" /></div>
      : query.data?.entry ? <ProfileForm key={token} entry={query.data.entry} token={token} />
      : <div className="account-form"><FormAlert>Could not load this profile. Reopen the link from your IEDC email and try again.</FormAlert>
        <button className="op-secondary" disabled={query.isFetching} onClick={() => query.refetch()}>Try again</button></div>}
  </AccountPage>;
}
