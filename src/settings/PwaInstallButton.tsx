import { useEffect, useState } from 'react';

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

function standalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export default function PwaInstallButton() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(() => standalone());
  const [message, setMessage] = useState('');
  useEffect(() => {
    const ready = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const complete = () => { setInstalled(true); setPrompt(null); setMessage('Together is installed on this device.'); };
    window.addEventListener('beforeinstallprompt', ready);
    window.addEventListener('appinstalled', complete);
    return () => { window.removeEventListener('beforeinstallprompt', ready); window.removeEventListener('appinstalled', complete); };
  }, []);
  async function install() {
    if (installed) return;
    if (prompt) {
      await prompt.prompt();
      const result = await prompt.userChoice;
      setPrompt(null);
      setMessage(result.outcome === 'accepted' ? 'Together is installing…' : 'Installation was cancelled.');
      return;
    }
    setMessage(/iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'In Safari, tap Share, then Add to Home Screen.' : 'Open your browser menu and choose Install app or Add to Home screen.');
  }
  return <section className="settings-card" aria-labelledby="install-title"><h2 id="install-title">Together on this device</h2><p>Install Together for a full-screen app and notifications.</p><button className="primary" type="button" disabled={installed} onClick={() => { void install(); }}>{installed ? 'Installed' : 'Install PWA'}</button>{message && <p className="feedback" role="status">{message}</p>}</section>;
}
