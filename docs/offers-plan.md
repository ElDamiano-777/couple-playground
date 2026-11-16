# Offers plan (agreed 16.11.2026)

Status: V1 built 16.11.2026 (see "As built" at the end). Terms follow [GLOSSARY.md](../GLOSSARY.md) (Offer, Store, Brochure, Favorite match, Ingredient match, Stock-up hint, Price estimate).

## Product decisions (confirmed by the user)

| # | Decision |
|---|----------|
| 1 | **All six Stores in V1.** Kaufland (Düren), Lidl and ALDI SÜD are read by a weekly routine on its own. REWE, Netto and EDEKA block automated reading, so they come in by **Brochure screenshot**: the user screenshots the Düren Brochure (e.g. on kaufDA), shares it with the app, checks the found Offers and saves them. In parallel Damian **asks kaufDA (Bonial) for written permission**; if granted, these three move to the automatic import and screenshots are no longer needed (user decision 16.11.2026). |
| 2 | Offers live **inside the Shopping tab** (strip at the top → Offers page). A **Home card appears only when a Favorite is on Offer**. No new bottom-navigation entry. |
| 3 | **One push per week** (Monday morning) when new Brochures are in, naming matched Favorites. Each person switches it on/off per device. No push per single Offer. |
| 4 | Order: **V1** = browse Offers, one tap to shopping list, one tap to Favorites, Favorite matches + weekly push. **V2** = recipes that are cheap this week. **V3** = Stock-up hints. Each version is released and tried on its own. |
| 5 | Matching is loose but honest: *sure* matches look normal, *maybe* matches say "might match"; "Doesn't match" hides that pairing for good. |
| 6 | Only food, drugstore, household, pet and baby Offers. Electronics, tools, clothing, garden etc. are filtered out. |

Not wanted: invented savings, Offers from other cities, push for every Offer, bypassing any site's access block.

## Source decision

We never bypass an access block (no browser spoofing, no undocumented store APIs) and only read sources whose terms do not forbid it. Source check of 16.11.2026 (honest User-Agent, `robots.txt` + terms):

| Source | Reachable | Terms / robots | Usable |
|--------|-----------|----------------|--------|
| REWE `rewe.de` | 403 | — | **no** |
| Netto `netto-online.de` | 403 | — | **no** |
| EDEKA `edeka.de` (Vogel 071126) | 403 since 16.11. (was 200 on 14.11.) | — | **no** |
| marktguru.de (all chains) | 200 | AGB 3e: "Untersagt ist insbesondere auch der Einsatz von Computerprogrammen zum automatischen Auslesen von Daten." | **no** |
| kaufda.de / meinprospekt.de (Bonial) | 200 | AGB 3f: every use not expressly allowed needs written consent | **no** without written consent |
| Kaufland `filiale.kaufland.de` (Düren 4183) | 200 | robots allow `/angebote/`; no ban in imprint | **yes** — `/angebote/uebersicht.html` returned 772 product tiles with title, subtitle, unit price, price |
| Lidl `lidl.de` | 200 | robots allow offer pages; terms cover only the online shop | **yes** (extraction to build) |
| ALDI SÜD `aldi-sued.de/angebote` | 200 | robots allow; terms cover only the customer account | **yes** (extraction to build) |

So the automatic weekly import covers **Kaufland, Lidl and ALDI SÜD**. REWE, Netto and EDEKA come in by Brochure screenshot until kaufDA grants permission. kaufDA AGB 3e expressly allows linking, so the Offers page links to each Store's current Düren Brochure there. Kaufland Offers depend on the selected branch; the import must use Düren 4183, not a default store.

Offer images are **not** copied or hot-linked in V1; cards use the app's existing `ProductIllustration`. This avoids image-rights questions.

## Domain model

- A **Favorite** stays store-free. Saving an Offer as Favorite copies name, brand and quantity only (category `Home`).
- Adding an Offer to the list creates a normal **Shopping item** (category `Home`) whose notes say store, price and last valid day, e.g. `Lidl · 1,29 € · until Sat 22.11.` The item stays when the Offer expires.
- An **Offer** is global (same for every household), belongs to one Store and an Offer week, and has a price. The **Regular price** is stored only if the Brochure states it; a saving is shown only as `regular − offer` from those stated numbers.
- A **Brochure screenshot** Offer belongs to one household, is created only after the user checked the candidates, and is otherwise an ordinary Offer (same card, `+ List`, `♡`, Favorite matches). Its validity defaults to the current Offer week and can be changed before saving.
- A **Favorite match** links one Favorite to one Offer with confidence `sure` | `maybe`. Rejections are per household.
- An **Ingredient match** (V2) links a recipe ingredient to an Offer. A recipe is "cheap this week" when at least 2 non-staple ingredients have Offers; the card lists each ingredient → Store → price. The existing Price estimate is never mixed into Offer numbers.
- A **Stock-up hint** (V3) needs: a long-lasting category (pasta, rice, cans, coffee, drugstore, cleaning, pet food, nappies…), bought ≥ 3 times in the last 8 weeks, and on Offer now. It says why: "You bought this 4× in 2 months."

Edge cases decided:
- Same Product on Offer in several Stores → one group, cheapest first, all Stores listed.
- Offer valid from Thursday → shown with "from Thu"; "+ List" still works.
- Favorite matching several Offers → all shown, push names the cheapest.
- Import failed or partial → Offers page says "Lidl offers not updated this week" for that Store; no stale Offers from last week are shown as current.

## Data model (additive migration)

| Table | Scope | Columns (essentials) | Access |
|-------|-------|----------------------|--------|
| `offers` | global or household | `id`, `store` (check: `kaufland`,`lidl`,`aldi_sued`,`rewe`,`netto`,`edeka`), `origin` (`import`/`screenshot`), `household_id` null for `import`, set for `screenshot`, `source_id`, `title`, `brand`, `quantity_text`, `price_cents`, `base_price_text`, `regular_price_cents` null, `category`, `valid_from`, `valid_to`, `source_url`, `imported_at`; unique `(store, source_id, valid_from)` | `select` where `household_id is null` or own household; `import` rows written by service role only; `screenshot` rows inserted/deleted by household members for their own household only |
| `offer_import_runs` | global | `id`, `store`, `started_at`, `finished_at`, `status` (`ok`/`partial`/`failed`), `offer_count`, `error` | authenticated `select` (for the "not updated" note); service role writes |
| `offer_match_rejections` | household | `household_id`, `favorite_id` → `shopping_favorites` on delete cascade, `offer_key` (normalized title+brand), `created_by`, `created_at`; unique `(household_id, favorite_id, offer_key)` | household RLS like `shopping_favorites` |
| `notification_preferences` | existing | add `offers_enabled boolean not null default false` | existing policies |
| `push_deliveries` | existing | extend kind check with `offers_weekly` | existing |

Offers older than 4 weeks are deleted by the import run (both origins). Screenshot Offers are never visible to another household.

Purchase history for V3: `push_events` already records `item_purchased` with name and time since 04.11.2026. V3 first confirms these rows are kept long enough; only if not, an additive purchase log is added then.

## Modules and seams

1. **Offer import** — Supabase Edge Function `offers-import` (Deno), same pattern as `push-delivery`: called by `pg_cron` + `pg_net` with a Vault token, no browser access.
   - Interface: `POST {mode: 'weekly'}` → imports the three Stores, writes `offers` + one `offer_import_runs` row per Store, returns counts.
   - Inside: one source adapter per Store (Kaufland Düren, Lidl, ALDI SÜD; kaufDA only after written permission) that returns normalized Offers; category filter (decision 6); dedupe; cleanup. Adapters stay private to the function.
   - Schedule: Monday 05:00 Europe/Berlin and Thursday 05:00 (mid-week Offers). Cron runs in UTC, so the job checks local time like the existing reminder schedule.
   - Identifies itself honestly (fixed User-Agent with project name), one request at a time, stops on 403/429 and records `failed` instead of retrying aggressively.
2. **Offer matching** — one pure TypeScript module `supabase/functions/_shared/offerMatching.ts`, imported by the Edge Functions and by the app (Vite can import the same file).
   - Interface: `matchFavorites(offers, favorites, rejections) → FavoriteMatch[]` (V1), later `matchRecipes(offers, recipes) → RecipeOfferSummary[]` (V2) and `stockUpHints(offers, purchases) → StockUpHint[]` (V3).
   - Inside: normalization (umlauts, plurals, quantities), word overlap rules for `sure`/`maybe`, reuse of ingredient keys from `src/pricing/productPrices.ts` for V2.
   - This is the deep module of the feature: all "is this the same thing" knowledge lives here and is tested here with real Brochure titles.
3. **Weekly offer push** — new mode `offers` in the existing `push-delivery` function, triggered by the Monday import after success: per member with `offers_enabled`, compute Favorite matches, send at most one push per person per Offer week (dedupe key `offers:{user}:{week}:{subscription}`), only if ≥ 1 match. Text e.g. "New offers: Milch at Lidl 0,99 €, Kaffee at Kaufland + 1 more".
4. **Brochure screenshot import** — in the app, on the device, no new service: reuses `tesseract.js`, which `src/shared/productRecognition.ts` already loads.
   - Interface: `readBrochureScreenshot(image) → OfferCandidate[]`; the text parser `parseBrochureText(text) → OfferCandidate[]` is pure and tested with real screenshot text.
   - Flow: pick Store → share or pick 1–5 screenshots → review sheet lists found title + price pairs with a checkbox each, editable title/price, validity → save checked ones.
   - Only candidates with a recognisable price are offered; nothing is saved without the review step.
   - Screenshot Offers show Favorite matches in the app at once; they do not trigger an extra push (the Monday push covers the automatic Stores).
5. **App** — `src/offers/`:
   - `useOffers.ts`: loads current-week Offers, import status and rejections; exposes `addToList(offer)`, `saveFavorite(offer)`, `rejectMatch(favorite, offer)` using the existing shopping/favorites hooks.
   - `OffersStrip.tsx` (top of Shopping), `Offers.tsx` (page `offers`, parent `shopping`), `OfferCard.tsx`, `HomeOffersCard.tsx` (only rendered with ≥ 1 Favorite match).
   - Settings: one toggle "Weekly offers" next to the existing notification toggles.

## UI flow (Nocturne dark, `src/nocturne.css`)

- **Shopping tab, top strip**: "This week's offers · 3 stores · 3 favorites on offer" → opens Offers page. Hidden while no Offers exist.
- **Offers page**:
  1. Store chips (All · Kaufland · Lidl · ALDI · REWE · Netto · EDEKA) + search field. A screenshot Store without Offers this week shows "Open Düren brochure" (link to kaufDA) and "Add screenshot".
  2. Section "Your favorites on offer" (sure first, maybe with "might match · Doesn't match").
  3. (V2) Section "Cheap recipes this week".
  4. (V3) Section "Worth stocking up".
  5. All Offers grouped by category.
  - Notes per Store whose import failed.
- **Offer card**: illustration · title · brand + quantity · big price · base price small · Store badge · "until Sat 22.11." · struck regular price only if stated · buttons `+ List` (turns into "On list ✓") and `♡` (turns into "Saved").
- **Home card**: "3 favorites on offer this week" with the top two (product · Store · price) → Offers page.
- **Push**: tap opens the Offers page.

Stitch can draft the Offers page and card in Nocturne before V1 is built; optional.

## Smallest usable version (V1) — done when

- After a Monday run, the Offers page shows current Offers from every Store that the source delivers for Düren, only allowed categories, with valid dates.
- `+ List` adds a Shopping item with store/price/date note; duplicate open items are refused like today.
- `♡` saves a Favorite; Favorite matches appear in their section and on Home; "Doesn't match" removes a maybe for good.
- A person with "Weekly offers" on gets one Monday push listing their matches; nobody else does.
- A failed Store shows its note instead of old Offers.
- For REWE, Netto and EDEKA: "Open Düren brochure" opens the right kaufDA page; screenshots of it produce checkable candidates; saved ones appear as normal Offers for this household only.
- Smoke test: import against one real run, one real Netto screenshot, Offers page, `+ List`, `♡`, push dry run.

## Permission request (Damian)

Damian sends the written request to Bonial (kaufDA) — draft prepared separately, not part of the repo. Until an answer arrives nothing reads kaufDA automatically. If granted: add a kaufDA source adapter for REWE, Netto and EDEKA Düren to `offers-import`, keep the screenshot button as fallback. If refused: screenshots stay.

## Open risks

- **Lidl/ALDI extraction** not yet proven product-by-product; Kaufland is.
- **Screenshot reading quality**: Brochure layouts are busy; on-device text recognition will miss or mis-pair some title/price pairs. The review step is mandatory; tune the parser with real Netto/REWE/EDEKA screenshots.
- **Permission** may take weeks or be refused.
- **Kaufland branch**: Offers must come from Düren 4183.
- **Source changes**: page structure can change any week; the import records `failed` and the app says so instead of breaking.
- **Matching quality**: first weeks will need rule tuning with real titles; "maybe" + "Doesn't match" contain the damage.
- **Deployment**: Edge Functions are deployed manually per `supabase/README.md`; `offers-import` needs the same Vault-token setup as push. Owner task, not the user's.
- **V3 data**: depends on how long `push_events` keeps purchases.

## As built (V1, 16.11.2026)

Differences from the plan above, decided while building:

- **Lidl** shows its food Offers only inside its brochure viewer (no readable offer page on lidl.de), so Lidl joined REWE, Netto and EDEKA as a **screenshot Store**. Automatic: Kaufland Düren (DE4183) and ALDI SÜD.
- **Import runs inside the database**, not in an Edge Function: migration `20261116010000_store_offers.sql` queues requests (`offers_start_import`, pg_cron Mon + Thu 03:30 UTC), and `offers_process_import` (pg_cron every minute) sends one request at a time via pg_net and parses the answer in SQL. No secrets, no deploy step. Kaufland data comes from the page's embedded offer JSON (main categories only); ALDI from the product tiles of the allowed theme pages. User-Agent `CouplePlaygroundBot/0.1 (personal use)`.
- Imported Offers are readable by `anon` (public advertising); screenshot Offers only by their household.
- **Offer setting**: `offer_notifications_enabled()` / `set_offer_notifications(boolean)` RPCs, so the toggle needs no Edge Function change.
- **Weekly push**: `push-delivery` scheduled mode sends Monday 08:00 local time (`offers_weekly`, opens `?offers`). This part needs `push-delivery` redeployed; `supabase/config.toml` now declares it (`verify_jwt = false`) and `GET` returns `{ version: 'offers-1' }` to check which version is live.
- Matching: `supabase/functions/_shared/offerMatching.ts` (used by app and push). Screenshot reading: `src/offers/brochureText.ts` (tesseract.js on the device, mandatory review).
- Tests: `supabase/tests/offers.sql` with saved Kaufland/ALDI pages in a disposable PostgreSQL.
