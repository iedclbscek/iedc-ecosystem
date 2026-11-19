import { useEffect, useRef } from 'react';

export default function PortalDialog({ children, onClose, labelledBy, label, className = '', busy = false }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  function handleBackdrop(event) {
    if (busy || event.target !== ref.current) return;
    const { left, right, top, bottom } = ref.current.getBoundingClientRect();
    if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) onClose();
  }

  function handleCancel(event) {
    if (event.target !== event.currentTarget) return;
    event.stopPropagation();
    event.preventDefault();
    if (!busy) onClose();
  }

  return <dialog ref={ref} className={`op-dialog ${className}`} aria-labelledby={labelledBy} aria-label={label}
    onClick={handleBackdrop} onCancel={handleCancel}>
    {children}
  </dialog>;
}
