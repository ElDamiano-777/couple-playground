import { Symbol, type SymbolName } from '../ui/Symbol';
import './folders.css';

export type FolderPage = `folders` | `home` | `shopping` | `recipes` | `pets` | `children` | `wishlist` | `places`;
type Navigate = (page: FolderPage) => void;
type FolderCard = { page: FolderPage; title: string; detail: string; icon: SymbolName; color: `violet` | `peach` | `sage` };

function FolderCards({ cards, navigate, label }: { cards: FolderCard[]; navigate: Navigate; label: string }) {
  return <div className="folder-grid" aria-label={label}>
    {cards.map((card) => <button className={`folder-tile folder-${card.color}`} key={card.page} aria-label={card.title} onClick={() => navigate(card.page)}>
      <span className="folder-tile-top"><span className="folder-tab" aria-hidden="true"><Symbol name="folder" /></span><Symbol name={card.icon} /></span>
      <strong>{card.title}</strong>
      <span className="folder-description">{card.detail}</span>
      <span className="folder-open" aria-hidden="true">Открыть <Symbol name="arrow" /></span>
    </button>)}
  </div>;
}

export function FolderBack({ page, navigate }: { page: FolderPage; navigate: Navigate }) {
  if (page === `folders`) return null;
  const target = page === `home` || page === `wishlist` || page === `places` ? `folders` : `home`;
  return <nav className="folder-breadcrumb" aria-label="Назад к папкам" lang="ru"><button onClick={() => navigate(target)}><span aria-hidden="true">←</span>{target === `folders` ? `Все папки` : `Наш дом`}</button></nav>;
}

export function FolderPages({ page, navigate, shoppingCount = 0, childrenCount = 0, petsCount = 0 }: {
  page: FolderPage;
  navigate: Navigate;
  shoppingCount?: number;
  childrenCount?: number;
  petsCount?: number;
}) {
  if (page === `folders`) return <section className="preview-page folder-page" lang="ru">
    <p className="eyebrow">ВСЁ НА СВОИХ МЕСТАХ</p>
    <h1>Наши папки<span>.</span></h1>
    <p className="page-intro">Для дома, желаний и мест, куда хочется вернуться.</p>
    <FolderCards navigate={navigate} label="Наши папки" cards={[
      { page: `home`, title: `Наш дом`, detail: `Покупки, рецепты, животные и дети`, icon: `home`, color: `violet` },
      { page: `wishlist`, title: `Wishlist`, detail: `Папка для ваших желаний`, icon: `wishlist`, color: `peach` },
      { page: `places`, title: `Места`, detail: `Папка для любимых мест`, icon: `pin`, color: `sage` },
    ]} />
  </section>;
  if (page === `home`) return <section className="preview-page folder-page" lang="ru">
    <p className="eyebrow">НАШЕ ПОВСЕДНЕВНОЕ</p>
    <h1>Наш дом<span>.</span></h1>
    <p className="page-intro">Всё, что нужно вашему дому, в отдельных папках.</p>
    <FolderCards navigate={navigate} label="Папки нашего дома" cards={[
      { page: `shopping`, title: `Покупки`, detail: shoppingCount > 0 ? `В списке: ${shoppingCount}` : `Общий список покупок`, icon: `shopping`, color: `peach` },
      { page: `recipes`, title: `Рецепты`, detail: `Отдельная папка для рецептов`, icon: `recipe`, color: `sage` },
      { page: `pets`, title: `Животные`, detail: petsCount > 0 ? `Карточек: ${petsCount}` : `Ваши домашние любимцы`, icon: `pet`, color: `violet` },
      { page: `children`, title: `Дети`, detail: childrenCount > 0 ? `Карточек: ${childrenCount}` : `Дети вашего дома`, icon: `family`, color: `peach` },
    ]} />
  </section>;
  return null;
}
export default FolderPages;
