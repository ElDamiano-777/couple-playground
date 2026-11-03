import FamilyProfiles from './family/FamilyProfiles';
import Pets from './family/Pets';
import type { FamilyProfilesState } from './family/useFamilyProfiles';
import SharedShopping from './shared/SharedShopping';
import UsShopping from './shared/UsShopping';
import type { ShoppingItem, SharedShoppingState } from './shared/useSharedShopping';
import FolderPages, { HomeNavigation, type FolderPage } from './folders/FolderPages';
import { Symbol } from './ui/Symbol';
import FolderEntries from './collections/FolderEntries';
import type { FolderEntriesState } from './collections/useFolderEntries';

export { Symbol } from './ui/Symbol';
export type HouseholdPage = FolderPage | `activity`;

export default function HouseholdPreview({ page, navigate, shopping, family, collections, shoppingCategory, onShoppingCategory }: {
  page: HouseholdPage;
  navigate: (page: HouseholdPage) => void;
  shopping: SharedShoppingState;
  family: FamilyProfilesState;
  collections: FolderEntriesState;
  shoppingCategory: ShoppingItem['category'] | null;
  onShoppingCategory: (category: ShoppingItem['category']) => void;
}) {
  if (page === `activity`) return <section className="preview-page">
    <button className="text-action" onClick={() => navigate(`folders`)}>← Us</button>
    <p className="eyebrow">KEEPING EACH OTHER IN THE LOOP</p>
    <h1>Little updates<span>.</span></h1>
    <p className="page-intro">This is how your shared activity could look.</p>
    <section className="dashboard-card activity-list">
      {[`Partner B marked berries as bought.`, `Partner A added colouring pencils.`, `Partner B removed a duplicate item.`].map((text, index) => <div className="activity-entry" key={text}>
        <span className={`activity-avatar ${index === 1 ? `peach` : `sage`}`}>{index === 1 ? `A` : `B`}</span>
        <div><p>{text}</p><small>Example activity</small></div>
      </div>)}
    </section>
    <div className="notification-note"><Symbol name="bell" /><p>Phone notifications aren’t connected yet. We’ll set them up after your shared space is ready.</p></div>
  </section>;

  if (page === `folders`) return <section className="preview-page"><h1>Us<span>.</span></h1><p className="page-intro">Your shared space at a glance.</p>{shopping.isPoc && <p className="notice">POC test space. Don’t enter sensitive personal information.</p>}<UsShopping state={shopping} onCategory={onShoppingCategory} onSignIn={() => navigate(`shopping`)} /><div className="dashboard-card"><h2>Saved together</h2><p>{collections.entries.filter(entry => entry.kind === `wish`).length} wishes · {collections.entries.filter(entry => entry.kind === `place`).length} places · {collections.entries.filter(entry => entry.kind === `recipe`).length} recipes</p></div></section>;

  return <div className="household-preview">
    {[`home`, `shopping`, `recipes`, `children`, `pets`].includes(page) && <HomeNavigation page={page} navigate={navigate} />}
    {page === `shopping` ? <SharedShopping state={shopping} hasOtherDraft={family.dirty || collections.dirty} initialCategory={shoppingCategory} />
      : page === `pets` ? <Pets key={`${family.userId}:${family.household}`} state={family} onSignIn={() => navigate(`shopping`)} />
      : page === `children` ? <FamilyProfiles state={family} fixedKind="child" onSignIn={() => navigate(`shopping`)} />
      : page === `recipes` || page === `wishlist` || page === `places` ? <FolderEntries state={collections} onSignIn={() => navigate(`shopping`)} />
      : <FolderPages page={page} navigate={navigate} />}
  </div>;
}
