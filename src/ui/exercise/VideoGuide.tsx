import { useId, useState } from 'react';

export function VideoGuide() {
  const [open, setOpen] = useState(false);
  const contentId = useId();
  return <section className="video-guide">
    <button type="button" aria-expanded={open} aria-controls={contentId} onClick={() => setOpen(value => !value)}>
      <span><strong>Videogennemgang</strong><small>Se en gennemgang af lønbogføring, inden du løser opgaven.</small></span>
      <span>{open ? 'Skjul video' : 'Vis video'} <span aria-hidden="true">{open ? '▴' : '▾'}</span></span>
    </button>
    {open && <div id={contentId} className="video-content">
      <div className="video-frame"><iframe src="https://www.youtube.com/embed/A6XmMtNr5mM" title="Videogennemgang af lønbogføring" allowFullScreen /></div>
      <aside><strong>Bemærk</strong><p>Videoen bruger forældede ATP-satser og en anden kontoplan end den, der anvendes i denne øvelse. Følg altid de satser og konti, der er angivet her på siden.</p></aside>
    </div>}
  </section>;
}
