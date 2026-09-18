import { useEffect, useId, useRef, type ReactNode } from 'react';

export function Dialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panel.current?.querySelector<HTMLElement>('input,button')?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') closeRef.current(); };
    window.addEventListener('keydown', close);
    return () => {
      window.removeEventListener('keydown', close);
      previousFocus?.focus();
    };
  }, []);

  return <div className="dialog-backdrop" role="presentation">
    <div className="dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={panel}>
      <header><h2 id={titleId}>{title}</h2><button aria-label="Luk dialog" onClick={onClose}>×</button></header>
      {children}
    </div>
  </div>;
}
