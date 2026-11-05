import { useEffect, useState } from 'react';
import FamilyProfiles from './family/FamilyProfiles';
import Pets from './family/Pets';
import type { FamilyProfilesState } from './family/useFamilyProfiles';
import SharedShopping from './shared/SharedShopping';
import UsShopping from './shared/UsShopping';
import type { ShoppingItem, SharedShoppingState } from './shared/useSharedShopping';
import FolderPages, { HomeNavigation, type FolderPage } from './folders/FolderPages';
import { Symbol } from './ui/Symbol';
import FolderEntries from './collections/FolderEntries';
import Recipes from './collections/Recipes';
import type { FolderEntriesState } from './collections/useFolderEntries';
import Calendar from './calendar/Calendar';
import MealPlanner from './meals/MealPlanner';
import { activeMealSlots, localDate, monday, type MealPlanItem, type MealPlanState } from './meals/useMealPlan';
import Tasks from './tasks/Tasks';
import TaskBadges from './tasks/TaskBadges';
import type { HouseholdTasksState } from './tasks/useHouseholdTasks';
import Expenses from './expenses/Expenses';
import PartnerNotes from './notes/PartnerNotes';

export { Symbol } from './ui/Symbol';
export type HouseholdPage = FolderPage | `activity`;

export default function HouseholdPreview({ page, navigate, shopping, family, collections, meals, tasks, viewer, shoppingCategory, onShoppingCategory, sharedRecipe, onClearSharedRecipe }: {
  page: HouseholdPage;
  navigate: (page: HouseholdPage) => void;
  shopping: SharedShoppingState;
  family: FamilyProfilesState;
  collections: FolderEntriesState;
  meals: MealPlanState;
  tasks: HouseholdTasksState;
  viewer: `masha` | `damian`;
  shoppingCategory: ShoppingItem['category'] | null;
  onShoppingCategory: (category: ShoppingItem['category']) => void;
  sharedRecipe: string | null;
  onClearSharedRecipe: () => void;
}) {
  const [dinnerToOpen, setDinnerToOpen] = useState<MealPlanItem | null>(null);
  useEffect(() => { if (page === `folders`) setDinnerToOpen(null); }, [page]);
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

  if (page === `folders`) return <Dashboard key={`${shopping.session?.user.id ?? 'guest'}:${shopping.household ?? ''}`} navigate={navigate} shopping={shopping} collections={collections} meals={meals} tasks={tasks} onShoppingCategory={onShoppingCategory} onDinner={meal => { setDinnerToOpen(meal); navigate('meals'); }} />;

  return <div className="household-preview">
    {[`home`, `shopping`, `recipes`, `meals`, `tasks`, `expenses`, `partner-notes`, `calendar`, `children`, `pets`].includes(page) && <HomeNavigation page={page} navigate={navigate} />}
    {page === `shopping` ? <SharedShopping state={shopping} hasOtherDraft={family.dirty || collections.dirty} initialCategory={shoppingCategory} />
      : page === `pets` ? <Pets key={`${family.userId}:${family.household}`} state={family} onSignIn={() => navigate(`shopping`)} />
      : page === `children` ? <FamilyProfiles state={family} fixedKind="child" onSignIn={() => navigate(`shopping`)} />
      : page === `recipes` ? <Recipes key={`${collections.userId}:${collections.household}`} state={collections} shopping={shopping} sharedRecipe={sharedRecipe} onClearSharedRecipe={onClearSharedRecipe} onSignIn={() => navigate(`shopping`)} />
      : page === `meals` ? <MealPlanner initialMeal={dinnerToOpen} plan={meals} recipes={collections.entries.filter(entry => entry.kind === `recipe`)} shopping={shopping} />
      : page === `tasks` ? <Tasks state={tasks} viewer={viewer} />
      : page === `expenses` ? <Expenses userId={shopping.session?.user.id} household={shopping.household} viewer={viewer} />
      : page === `partner-notes` ? <PartnerNotes userId={shopping.session?.user.id} household={shopping.household} viewer={viewer} />
      : page === `calendar` ? <Calendar shopping={shopping} />
      : page === `wishlist` || page === `places` ? <FolderEntries state={collections} onSignIn={() => navigate(`shopping`)} />
      : <FolderPages page={page} navigate={navigate} />}
  </div>;
}

function Dashboard({ navigate, shopping, collections, meals, tasks, onShoppingCategory, onDinner }: { navigate: (page: HouseholdPage) => void; shopping: SharedShoppingState; collections: FolderEntriesState; meals: MealPlanState; tasks: HouseholdTasksState; onShoppingCategory: (category: ShoppingItem['category']) => void; onDinner: (meal: MealPlanItem) => void }) {
    const now = new Date();
    const today = localDate(now);
    const todayIndex = (now.getDay() + 6) % 7;
    const todayMeals = meals.items.filter(item => item.week_start === monday(now) && item.day_index === todayIndex && activeMealSlots.includes(item.meal_slot));
    const upcoming = new Date(now); upcoming.setDate(upcoming.getDate() + 7);
    const soon = localDate(upcoming);
    const taskRank = (task: (typeof tasks.items)[number]) => task.due_date && task.due_date < today ? 0 : task.priority === 'high' && task.due_date && task.due_date <= soon ? 1 : 2;
    const openTasks = tasks.items.filter(task => !task.completed_at).sort((a, b) => taskRank(a) - taskRank(b) || (a.due_date ?? '9999-99-99').localeCompare(b.due_date ?? '9999-99-99') || a.created_at.localeCompare(b.created_at));
    const nextTask = openTasks[0];
    const overdue = !!nextTask?.due_date && nextTask.due_date < today;
    const saved = { wishes: collections.entries.filter(entry => entry.kind === 'wish').length, places: collections.entries.filter(entry => entry.kind === 'place').length, recipes: collections.entries.filter(entry => entry.kind === 'recipe').length };
    const activeSaved = saved.wishes + saved.places + saved.recipes > 0;
    const cards: Record<string, React.ReactNode> = {
      tasks: <button key="tasks" className={`dashboard-card meal-dashboard task-dashboard${openTasks.length ? ' dashboard-active' : ''}${overdue ? ' dashboard-overdue' : ''}`} onClick={() => navigate(`tasks`)}><h2><span className="dashboard-icon"><Symbol name="plans" /></span>Upcoming tasks</h2>{nextTask ? <><p className="dashboard-count">{openTasks.length} {openTasks.length === 1 ? 'task' : 'tasks'} to do</p><strong className="dashboard-task-title">{nextTask.title}</strong><TaskBadges task={nextTask} /></> : <p>No open tasks.</p>}</button>,
      dinner: <button key="dinner" className={`dashboard-card meal-dashboard dinner-dashboard${todayMeals.length ? ' dashboard-active' : ''}`} onClick={() => todayMeals[0] ? onDinner(todayMeals[0]) : navigate(`meals`)}><h2><span className="dashboard-icon"><Symbol name="utensils" /></span>Today’s dinner</h2>{todayMeals.length ? <><p>{todayMeals.map(item => item.title).join(' · ')}</p>{todayMeals[0].recipe_id && <span className="dashboard-link">View recipe →</span>}</> : <p>No dinner planned for today.</p>}</button>,
      shopping: <UsShopping key="shopping" state={shopping} onCategory={onShoppingCategory} onSignIn={() => navigate(`shopping`)} />,
      saved: <section key="saved" className={`dashboard-card saved-dashboard${activeSaved ? ' dashboard-active' : ''}`}><h2><span className="dashboard-icon"><Symbol name="heart" /></span>Saved together</h2><div className="dashboard-saved-links"><button onClick={() => navigate('wishlist')}>{saved.wishes} {saved.wishes === 1 ? 'wish' : 'wishes'}</button><button onClick={() => navigate('places')}>{saved.places} {saved.places === 1 ? 'place' : 'places'}</button><button onClick={() => navigate('recipes')}>{saved.recipes} {saved.recipes === 1 ? 'recipe' : 'recipes'}</button></div></section>,
    };
    return <section className="preview-page"><h1>Us<span>.</span></h1><p className="page-intro">Your shared space at a glance.</p>{shopping.isPoc && <p className="notice">POC test space. Don’t enter sensitive personal information.</p>}<div className="dashboard-sections">{['tasks', 'shopping', 'dinner', 'saved'].map(id => cards[id])}</div></section>;
  }
