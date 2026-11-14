import { useEffect, useState } from 'react';
import FamilyProfiles from './family/FamilyProfiles';
import Pets from './family/Pets';
import type { FamilyProfilesState } from './family/useFamilyProfiles';
import SharedShopping from './shared/SharedShopping';
import QuickAdd from './shared/QuickAdd';
import UsShopping from './shared/UsShopping';
import type { ShoppingItem, SharedShoppingState } from './shared/useSharedShopping';
import FolderPages, { type FolderPage } from './folders/FolderPages';
import { Symbol } from './ui/Symbol';
import FolderEntries from './collections/FolderEntries';
import Recipes from './collections/Recipes';
import type { FolderEntriesState } from './collections/useFolderEntries';
import { publicUrl } from './collections/recipeImport';
import Calendar from './calendar/Calendar';
import MealPlanner from './meals/MealPlanner';
import { activeMealSlots, localDate, monday, type MealPlanItem, type MealPlanState, type MealSlot } from './meals/useMealPlan';
import Tasks from './tasks/Tasks';
import TaskBadges from './tasks/TaskBadges';
import type { HouseholdTask, HouseholdTasksState } from './tasks/useHouseholdTasks';
import Expenses from './expenses/Expenses';
import PartnerNotes from './notes/PartnerNotes';
import { usePartnerNotes } from './notes/usePartnerNotes';
import './notes/partner-notes.css';
import OurTimeTogether from './couple/OurTimeTogether';

export { Symbol } from './ui/Symbol';
export type HouseholdPage = FolderPage | `activity`;

export default function HouseholdPreview({ page, navigate, shopping, family, collections, meals, tasks, viewer, shoppingCategory, onShoppingCategory, sharedRecipe, onClearSharedRecipe, onNotesDirty, onBack, backLabel }: {
  onBack: () => void;
  backLabel: string;
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
  onNotesDirty: (dirty: boolean) => void;
}) {
  const loveNotes = usePartnerNotes(shopping.session?.user.id, shopping.household, page === 'folders' || page === 'partner-notes');
  const [dinnerToOpen, setDinnerToOpen] = useState<MealPlanItem | null>(null);
  const [dinnerToPlan, setDinnerToPlan] = useState<MealPlanItem | { day_index: number; meal_slot: MealSlot } | null>(null);
  const [taskToOpen, setTaskToOpen] = useState<HouseholdTask | null>(null);
  const [addTask, setAddTask] = useState(false);
  useEffect(() => { if (page === `home`) { setDinnerToOpen(null); setDinnerToPlan(null); setTaskToOpen(null); setAddTask(false); } }, [page]);
  if (page === `activity`) return <section className="preview-page">
    <button className="text-action" onClick={onBack}>← {backLabel}</button>
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

  if (page === `home`) return <Dashboard key={`${shopping.session?.user.id ?? 'guest'}:${shopping.household ?? ''}`} navigate={navigate} shopping={shopping} meals={meals} tasks={tasks} collections={collections} onShoppingCategory={onShoppingCategory} onDinner={meal => { setDinnerToOpen(meal); navigate('meals'); }} onPlan={meal => { setDinnerToPlan(meal); navigate('meals'); }} onTask={task => { setTaskToOpen(task); navigate('tasks'); }} onAddTask={() => { setAddTask(true); navigate('tasks'); }} />;

  if (page === `folders`) {
    const pets = family.profiles.filter(item => item.kind === 'pet').map(item => item.name);
    return <section className="preview-page couple-page"><p className="eyebrow">A LITTLE SPACE FOR TWO</p><h1>Us<span>.</span></h1><OurTimeTogether key={`${shopping.session?.user.id ?? 'guest'}:${shopping.household ?? ''}`} userId={shopping.session?.user.id} household={shopping.household} onSignIn={() => navigate('shopping')} /><h2 className="couple-spaces-heading">Shared Spaces</h2>
      <div className="couple-grid"><button className="couple-card couple-people" onClick={() => navigate('partner-notes')}><span className="dashboard-icon"><Symbol name="heart" /></span><strong>Love Notes</strong><small>Little notes for each other</small>{loveNotes.unread > 0 && <span className="love-note-count">{loveNotes.unread} new</span>}<span className="couple-link">Open love notes →</span></button>
      <button className="couple-card couple-pets" onClick={() => navigate('pets')}><span className="dashboard-icon"><Symbol name="pet" /></span><strong>Pets</strong><small>{pets.length ? pets.join(' · ') : 'Your pets, together'}</small><span className="couple-link">View pets →</span></button>
      <div className="couple-card couple-memories"><span className="dashboard-icon"><Symbol name="folder" /></span><strong>Shared Memories</strong><small>A little space for memories, coming later.</small></div>
      <button className="couple-card couple-wishlist" onClick={() => navigate('wishlist')}><span className="dashboard-icon"><Symbol name="wishlist" /></span><strong>Wishlist</strong><small>Wishes you save together</small><span className="couple-link">Open wishlist →</span></button></div></section>;
  }

  return <div className="household-preview">
    {[`tasks`, `expenses`, `calendar`, `children`, `wishlist`].includes(page) && <button className="text-action navigation-back" onClick={onBack}>← {backLabel}</button>}
    {page === `shopping` ? <SharedShopping state={shopping} initialCategory={shoppingCategory} />
      : page === `pets` ? <Pets onBack={onBack} backLabel={backLabel} key={`${family.userId}:${family.household}`} state={family} onSignIn={() => navigate(`shopping`)} />
      : page === `children` ? <FamilyProfiles state={family} fixedKind="child" onSignIn={() => navigate(`shopping`)} />
      : page === `recipes` ? <Recipes onBack={onBack} backLabel={backLabel} key={`${collections.userId}:${collections.household}`} state={collections} shopping={shopping} sharedRecipe={sharedRecipe} onClearSharedRecipe={onClearSharedRecipe} onSignIn={() => navigate(`shopping`)} />
      : page === `meals` ? <MealPlanner onBack={onBack} backLabel={backLabel} initialMeal={dinnerToOpen} initialPlan={dinnerToPlan} plan={meals} recipes={collections.entries.filter(entry => entry.kind === `recipe`)} shopping={shopping} />
      : page === `tasks` ? <Tasks state={tasks} viewer={viewer} initialTask={taskToOpen} initialAdd={addTask} />
      : page === `expenses` ? <Expenses userId={shopping.session?.user.id} household={shopping.household} viewer={viewer} />
      : page === `partner-notes` ? <PartnerNotes userId={shopping.session?.user.id} household={shopping.household} viewer={viewer} state={loveNotes} onBack={onBack} backLabel={backLabel} onDirty={onNotesDirty} />
      : page === `calendar` ? <Calendar shopping={shopping} />
      : page === `wishlist` || page === `places` ? <FolderEntries state={collections} onSignIn={() => navigate(`shopping`)} />
      : <FolderPages page={page} navigate={navigate} />}
  </div>;
}

function Dashboard({ navigate, shopping, meals, tasks, collections, onShoppingCategory, onDinner, onPlan, onTask, onAddTask }: { onShoppingCategory: (category: ShoppingItem['category']) => void; navigate: (page: HouseholdPage) => void; shopping: SharedShoppingState; meals: MealPlanState; tasks: HouseholdTasksState; collections: FolderEntriesState; onDinner: (meal: MealPlanItem) => void; onPlan: (meal: MealPlanItem | { day_index: number; meal_slot: MealSlot }) => void; onTask: (task: HouseholdTask) => void; onAddTask: () => void }) {
  const [addingShopping, setAddingShopping] = useState(false);
  const now = new Date(); const today = localDate(now); const todayIndex = (now.getDay() + 6) % 7;
  const dinner = meals.items.find(item => item.week_start === monday(now) && item.day_index === todayIndex && activeMealSlots.includes(item.meal_slot));
  const dinnerRecipe = dinner?.recipe_id ? collections.entries.find(entry => entry.kind === 'recipe' && entry.id === dinner.recipe_id) : null;
  const dinnerPhoto = dinnerRecipe?.recipe_photo || (dinnerRecipe?.recipe_image_url ? publicUrl(dinnerRecipe.recipe_image_url) : null);
  const priorityRank = { high: 0, normal: 1, low: 2 };
  const openTasks = tasks.items.filter(task => !task.completed_at).sort((a, b) => {
    const overdueA = !!a.due_date && a.due_date < today; const overdueB = !!b.due_date && b.due_date < today;
    return Number(overdueB) - Number(overdueA) || (a.due_date ?? '9999-99-99').localeCompare(b.due_date ?? '9999-99-99') || priorityRank[a.priority] - priorityRank[b.priority] || a.created_at.localeCompare(b.created_at);
  });
  const active = shopping.items.filter(item => !item.bought);
  const openShopping = () => { if (!shopping.session || !shopping.household) navigate('shopping'); else setAddingShopping(true); };
  const dinnerReady = !!shopping.household && !shopping.loading && !meals.loading && !meals.error && meals.weekStart === monday(now);
  const planDinner = () => { if (dinnerReady) onPlan(dinner ?? { day_index: todayIndex, meal_slot: 'Dinner' }); };
  return <section className="preview-page home-dashboard"><h1>Home<span>.</span></h1><p className="page-intro">Everything important, all in one place.</p>{shopping.isPoc && <p className="notice">POC test space. Don’t enter sensitive personal information.</p>}
    <div className="dashboard-sections">
      <section className={`dashboard-card task-dashboard${openTasks.length ? ' dashboard-active' : ' task-dashboard-empty'}${openTasks[0]?.due_date && openTasks[0].due_date < today ? ' dashboard-overdue' : ''}`} aria-labelledby="dashboard-tasks-title">
        <div className="home-card-header"><h2 id="dashboard-tasks-title"><span className="dashboard-icon"><Symbol name="plans" /></span>Upcoming tasks</h2><button className="home-view-all" onClick={() => navigate('tasks')}>View all</button></div>
        {openTasks.length ? <div className="home-task-list">{openTasks.slice(0, 2).map(task => <button className="home-task" key={task.id} onClick={() => onTask(task)}><strong>{task.title}</strong><TaskBadges task={task} /></button>)}</div> : <p className="home-empty">No open tasks.</p>}
      </section>
      <section className={`shopping-dashboard${active.length ? ' dashboard-active' : ''}`}><UsShopping state={shopping} onCategory={onShoppingCategory} onSignIn={() => navigate('shopping')} onAdd={openShopping} /></section>
      <section className="home-quick-actions" aria-labelledby="home-actions-title"><h2 id="home-actions-title">Quick actions</h2><div><button onClick={() => navigate('partner-notes')}><Symbol name="heart" />Love Note</button><button onClick={onAddTask}><Symbol name="plans" />Add task</button><button onClick={openShopping}><Symbol name="shopping" />Add shopping item</button><button disabled={!dinnerReady} onClick={planDinner}><Symbol name="utensils" />Plan dinner</button></div></section>
      <button className={`dashboard-card home-shortcut dinner-dashboard${dinner ? ' dashboard-active' : ''}`} disabled={!dinnerReady} onClick={() => dinner ? onDinner(dinner) : planDinner()}><span className="dashboard-icon"><Symbol name="utensils" /></span>{dinnerPhoto && <img className="home-dinner-photo" src={dinnerPhoto} alt="" referrerPolicy="no-referrer" />}<span className="home-shortcut-copy"><strong>Tonight’s dinner</strong><small>{dinner ? dinner.title : 'Plan dinner'}</small></span><span className="home-arrow" aria-hidden="true">›</span></button>
    </div>
    {addingShopping && <div className="shared-shopping"><QuickAdd category="Home" state={shopping} onClose={() => setAddingShopping(false)} dashboard /></div>}
  </section>;
}
