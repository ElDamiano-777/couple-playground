import { Symbol, type SymbolName } from '../ui/Symbol';
import './folders.css';

export type FolderPage = `folders` | `home` | `shopping` | `recipes` | `meals` | `calendar` | `pets` | `children` | `wishlist` | `places`;
type Navigate = (page: FolderPage) => void;

export function HomeNavigation({ page, navigate }: { page: FolderPage; navigate: Navigate }) {
  return <header className="home-navigation">
    <p className="home-title">Home</p>
    <nav className="home-sections" aria-label="Home sections">
      {([
        { page: `shopping`, title: `Shopping`, icon: `shopping` },
        { page: `recipes`, title: `Recipes`, icon: `recipe` },
        { page: `meals`, title: `Meals`, icon: `plans` },
        { page: `calendar`, title: `Calendar`, icon: `calendar` },
        { page: `children`, title: `Children`, icon: `family` },
        { page: `pets`, title: `Pets`, icon: `pet` },
      ] as const).map(item => <button key={item.page} aria-current={page === item.page ? `page` : undefined} onClick={() => navigate(item.page)}><Symbol name={item.icon} /><span>{item.title}</span></button>)}
    </nav>
  </header>;
}

export function FolderPages({ page, navigate }: { page: FolderPage; navigate: Navigate }) {
  if (page !== `folders`) return null;
  const cards: { page: FolderPage; title: string; detail: string; icon: SymbolName; color: string }[] = [
    { page: `home`, title: `Home`, detail: `Shopping, recipes, children and pets`, icon: `home`, color: `violet` },
    { page: `calendar`, title: `Calendar`, detail: `Google calendars you choose to share`, icon: `calendar`, color: `sage` },
    { page: `meals`, title: `Meals`, detail: `Plan the week and shop from recipes`, icon: `plans`, color: `peach` },
    { page: `wishlist`, title: `Wishlist`, detail: `Your wishes, in one place`, icon: `wishlist`, color: `peach` },
    { page: `places`, title: `Places`, detail: `Places to remember together`, icon: `pin`, color: `sage` },
  ];
  return <section className="preview-page folder-page">
    <p className="eyebrow">A PLACE FOR TWO</p>
    <h1>Us<span>.</span></h1>
    <p className="page-intro">Your shared home, wishes and places.</p>
    <div className="folder-grid" aria-label="Our sections">
      {cards.map(card => <button className={`folder-tile folder-${card.color}`} key={card.page} aria-label={card.title} onClick={() => navigate(card.page)}>
        <Symbol name={card.icon} /><strong>{card.title}</strong><span className="folder-description">{card.detail}</span><span className="folder-open" aria-hidden="true">Open <Symbol name="arrow" /></span>
      </button>)}
    </div>
  </section>;
}
export default FolderPages;
