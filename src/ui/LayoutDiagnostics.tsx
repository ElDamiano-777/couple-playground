import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './layout-diagnostics.css';

/** On-device measurements only; no page text, form values, or account data are collected. */
function measureLayout() {
  const viewport = window.visualViewport;
  const scroll = document.querySelector<HTMLElement>('.page-scroll');
  const nav = document.querySelector<HTMLElement>('.bottom-nav');
  const dialog = document.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"], dialog[open], .add-sheet');
  const candidates = [...document.querySelectorAll<HTMLElement>('main button, main a, main input, main select, main textarea')];
  const last = candidates.filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden' && !el.closest('[role="dialog"], .add-sheet')).at(-1);
  const rect = (el: Element | null) => {
    if (!el) return null;
    const box = el.getBoundingClientRect();
    return { top: Math.round(box.top), bottom: Math.round(box.bottom), height: Math.round(box.height) };
  };
  const scrollBox = rect(scroll), navBox = rect(nav), lastBox = rect(last ?? null);
  const navVisible = !!nav && getComputedStyle(nav).visibility !== 'hidden' && getComputedStyle(nav).display !== 'none';
  const visibleBottom = viewport ? viewport.offsetTop + viewport.height : innerHeight;
  const focus = document.activeElement;
  const editableFocused = focus instanceof HTMLElement && (focus.matches('input:not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]'));
  return {
    commit: __APP_COMMIT__,
    window: { width: innerWidth, height: innerHeight },
    visualViewport: viewport ? { width: Math.round(viewport.width), height: Math.round(viewport.height), offsetTop: Math.round(viewport.offsetTop), scale: viewport.scale } : null,
    scroll: scroll && scrollBox ? { ...scrollBox, position: Math.round(scroll.scrollTop), maximum: Math.round(scroll.scrollHeight - scroll.clientHeight), paddingBottom: getComputedStyle(scroll).paddingBottom } : null,
    navigation: navBox ? { ...navBox, visible: navVisible } : null,
    lastControl: lastBox,
    lastControlOutsideView: lastBox ? lastBox.bottom > Math.min(scrollBox?.bottom ?? visibleBottom, visibleBottom) || lastBox.top < (scrollBox?.top ?? 0) : null,
    lastControlObscuredByNavigation: lastBox && navBox && navVisible ? lastBox.bottom > navBox.top && lastBox.top < navBox.bottom : false,
    modalOpen: !!dialog,
    keyboard: { editableFocused, likelyOpen: !!editableFocused && !!viewport && innerHeight - viewport.height - viewport.offsetTop > 100 },
  };
}

export default function LayoutDiagnostics() {
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const refresh = useCallback(() => setReport(JSON.stringify(measureLayout(), null, 2)), []);
  useEffect(() => {
    if (!open) return;
    refresh();
    const timer = window.setInterval(refresh, 500);
    return () => window.clearInterval(timer);
  }, [open, refresh]);
  const copy = async () => {
    const current = JSON.stringify(measureLayout(), null, 2);
    setReport(current);
    try { await navigator.clipboard.writeText(current); setCopyStatus('Copied'); }
    catch {
      const field = document.querySelector<HTMLTextAreaElement>('#layout-debug-panel textarea');
      if (field) { field.value = current; field.focus(); field.select(); }
      let copied = false;
      try { copied = document.execCommand('copy'); } catch { /* Manual selection remains available. */ }
      setCopyStatus(copied ? 'Copied' : 'Select the text below to copy it.');
    }
  };
  return createPortal(<div className="layout-debug">
    <button type="button" className="layout-debug-toggle" aria-expanded={open} aria-controls="layout-debug-panel" onClick={() => setOpen(!open)}>{open ? 'Close diagnostics' : 'Layout diagnostics'}</button>
    {open && <section id="layout-debug-panel" className="layout-debug-panel" aria-label="Layout diagnostics">
      <p>Measurements stay on this device. No personal content is included.</p>
      <button type="button" onClick={() => void copy()}>Copy diagnostics</button> <span role="status">{copyStatus}</span>
      <textarea aria-label="Layout measurements" readOnly value={report} onFocus={event => event.currentTarget.select()} />
    </section>}
  </div>, document.body);
}
