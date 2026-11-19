import { useEffect } from 'react';

// Keep touch/trackpad momentum native; smooth coarse mouse-wheel steps only.
export default function ScrollFeel() {
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, target = scrollY, previous = 0, touchStart = null, animation;
    const surface = () => document.querySelector('[data-scroll-surface]');
    const stop = () => { cancelAnimationFrame(frame); frame = 0; target = scrollY; };
    const nested = element => {
      if (!(element instanceof Element)) return true;
      if (element.closest('dialog, form, input, textarea, select, [contenteditable="true"], [data-scroll-native]')) return true;
      for (let node = element; node && node !== document.body; node = node.parentElement) {
        if (node.scrollHeight > node.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(node).overflowY)) return true;
      }
      return document.querySelector('dialog[open]') || getComputedStyle(document.body).overflow === 'hidden';
    };
    const maximum = () => Math.max(0, document.documentElement.scrollHeight - innerHeight);
    const spring = offset => {
      const node = surface();
      if (!node || reduced.matches) return;
      animation?.cancel();
      animation = node.animate([{ translate: `0 ${offset}px` }, { translate: '0 0' }], { duration: 320, easing: 'cubic-bezier(.16,1,.3,1)' });
    };
    const tick = time => {
      const dt = previous ? Math.min(64, time - previous) : 16;
      previous = time;
      target = Math.max(0, Math.min(maximum(), target));
      const next = scrollY + (target - scrollY) * (1 - Math.exp(-dt / 42));
      window.scrollTo({ top: Math.abs(target - next) < 1 ? target : next, behavior: 'instant' });
      if (Math.abs(target - scrollY) > 1) frame = requestAnimationFrame(tick);
      else frame = 0;
    };
    const wheel = event => {
      if (event.defaultPrevented || reduced.matches || event.ctrlKey || event.shiftKey || nested(event.target) || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
      if ((scrollY <= 0 && delta < 0) || (scrollY >= maximum() - 1 && delta > 0)) {
        stop(); spring(-Math.sign(delta) * Math.min(18, Math.abs(delta) * .15)); return;
      }
      if (event.deltaMode === 0 && Math.abs(delta) < 60) { stop(); return; }
      event.preventDefault();
      if (!frame) { target = scrollY; previous = 0; }
      target = Math.max(0, Math.min(maximum(), target + delta));
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const touchstart = event => { stop(); touchStart = !reduced.matches && !nested(event.target) && event.touches.length === 1 ? event.touches[0].clientY : null; };
    const touchmove = event => {
      if (touchStart === null || event.touches.length !== 1) return;
      const pull = event.touches[0].clientY - touchStart;
      if ((scrollY <= 0 && pull > 0) || (scrollY >= maximum() - 1 && pull < 0)) {
        const node = surface();
        if (node) { animation?.cancel(); node.style.translate = `0 ${Math.sign(pull) * Math.min(24, Math.abs(pull) * .16)}px`; }
      }
    };
    const touchend = () => { const node = surface(); const offset = Number.parseFloat(node?.style.translate.split(' ')[1]); if (node) node.style.translate = ''; if (offset) spring(offset); touchStart = null; };
    const keydown = event => { if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) stop(); };
    window.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('touchstart', touchstart, { passive: true });
    window.addEventListener('touchmove', touchmove, { passive: true });
    window.addEventListener('touchend', touchend);
    window.addEventListener('touchcancel', touchend);
    window.addEventListener('keydown', keydown);
    window.addEventListener('pointerdown', stop);
    reduced.addEventListener('change', stop);
    return () => {
      stop(); animation?.cancel(); const node = surface(); if (node) node.style.translate = '';
      window.removeEventListener('wheel', wheel); window.removeEventListener('touchstart', touchstart);
      window.removeEventListener('touchmove', touchmove); window.removeEventListener('touchend', touchend);
      window.removeEventListener('touchcancel', touchend); window.removeEventListener('keydown', keydown);
      window.removeEventListener('pointerdown', stop); reduced.removeEventListener('change', stop);
    };
  }, []);
  return null;
}
