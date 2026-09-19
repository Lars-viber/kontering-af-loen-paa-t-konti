import { Dialog } from '../../ui/Dialog';

export function VideoDialog({ onClose }: { readonly onClose: () => void }) {
  return <Dialog title="Videogennemgang" onClose={onClose}>
    <div className="l2-video-warning" role="note">
      <strong>Bemærk</strong>
      <p>Videoen gennemgår den grundlæggende lønkontering fra Niveau 1. Den kan bruges som repetition, men dækker ikke hele Niveau 2.</p>
    </div>
    <div className="video-frame l2-video-frame">
      <iframe src="https://www.youtube.com/embed/A6XmMtNr5mM" title="Videogennemgang af lønbogføring" allowFullScreen />
    </div>
  </Dialog>;
}
