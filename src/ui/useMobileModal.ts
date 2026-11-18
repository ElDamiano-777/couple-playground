import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/** Keep a mobile modal inside the visual viewport, including while the keyboard is open. */
export function useMobileModal(open: boolean, panelSelector: string) {
  const [bounds, setBounds] = useState<{ top: number; height: number; bottom: 'auto' } | null>(null);
  const frame = useRef(0);
  const keepFocusedVisible = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const focused = document.activeElement;
      if (!(focused instanceof HTMLElement)) return;
      const panel = focused.closest<HTMLElement>(panelSelector);
      if (!panel) return;
      const box = panel.getBoundingClientRect(), target = focused.getBoundingClientRect();
      const header = panel.querySelector<HTMLElement>('.occasion-panel-header');
      const footer = panel.querySelector<HTMLElement>('.occasion-panel-footer, .task-editor > button.primary:last-child');
      const top = header && !header.contains(focused) ? Math.max(box.top, header.getBoundingClientRect().bottom) : box.top;
      const footerTop = footer?.getBoundingClientRect().top;
      const bottom = footer && !footer.contains(focused) && footerTop !== undefined && footerTop > box.top && footerTop < box.bottom ? footerTop : box.bottom;
      if (target.bottom > bottom - 12) panel.scrollTop += target.bottom - bottom + 12;
      else if (target.top < top + 12) panel.scrollTop -= top + 12 - target.top;
    });
  }, [panelSelector]);

  useEffect(() => {
    if (!open) return;
    const viewport = window.visualViewport;
    const update = () => { if (viewport) setBounds({ top: viewport.offsetTop, height: viewport.height, bottom: 'auto' }); };
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    update();

    const body = document.body, scrollX = window.scrollX, scrollY = window.scrollY;
    const previous = { position: body.style.position, top: body.style.top, left: body.style.left, right: body.style.right, width: body.style.width, overflow: body.style.overflow };
    Object.assign(body.style, { position: 'fixed', top: `${-scrollY}px`, left: '0', right: '0', width: '100%', overflow: 'hidden' });
    return () => {
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      cancelAnimationFrame(frame.current);
      Object.assign(body.style, previous);
      window.scrollTo(scrollX, scrollY);
      setBounds(null);
    };
  }, [open]);
  useLayoutEffect(() => { if (open) keepFocusedVisible(); }, [open, bounds, keepFocusedVisible]);
  return { bounds, keepFocusedVisible };
}
