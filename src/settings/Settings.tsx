import NotificationSettings from '../shared/NotificationSettings';
import PwaInstallButton from './PwaInstallButton';

export default function Settings({ name, notificationsActive, poc, busy, onChangeName, onDeleteAccount }: { name: string; notificationsActive: boolean; poc: boolean; busy: boolean; onChangeName: () => void; onDeleteAccount: () => void }) {
  return <section className="inner-page settings-page"><p className="eyebrow">YOUR SPACE</p><h1>Settings<span>.</span></h1><p className="intro">Your device, notifications and account.</p><PwaInstallButton /><NotificationSettings active={notificationsActive} /><section className="settings-card"><h2>Your name</h2><p>Currently: {name}</p><button className="primary" type="button" onClick={onChangeName}>Change name</button></section>{!poc && <section className="settings-card account-options"><h2>Account</h2><p>Deleting your account removes your sign-in and membership. Shared items remain for your partner; if you are the last person, shared content is removed too.</p><button className="text-action" disabled={busy} onClick={onDeleteAccount}>Delete my account</button></section>}</section>;
}
