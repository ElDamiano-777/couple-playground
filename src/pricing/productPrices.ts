// Rough German supermarket prices (Rewe/Lidl level) in euro. They are estimates, not live prices,
// and are only meant to show what a dish will roughly cost.
export type BaseUnit = 'g' | 'ml' | 'pc';
export type Product = {
  name: string;
  /** Lower-case words that start an ingredient name, e.g. "hähnchenbrust". */
  keys: string[];
  /** One pack contains this many base units. */
  pack: number;
  unit: BaseUnit;
  /** Estimated price of one pack. */
  price: number;
  /** Home staples (salt, spices, stock powder) are not counted in a dish's cost. */
  staple?: boolean;
  /** Weight in g/ml of one piece, for products measured in g/ml but listed as "2 Stück". */
  pieceG?: number;
  /** Base units per named recipe unit that deviates from the default, e.g. { zehe: 0.1 } for garlic. */
  use?: Record<string, number>;
};

const p = (name: string, keys: string[], pack: number, unit: BaseUnit, price: number, extra: Partial<Product> = {}): Product => ({ name, keys, pack, unit, price, ...extra });
const staple = (name: string, keys: string[]): Product => ({ name, keys, pack: 1, unit: 'pc', price: 0, staple: true });

export const products: Product[] = [
  // Pasta, rice, baking
  p('Pasta', ['nudeln', 'penne', 'rigatoni', 'spaghetti', 'fusilli', 'farfalle', 'tagliatelle', 'reisnudeln'], 500, 'g', 1.29),
  p('Ramen noodles', ['ramen-nudeln', 'ramen'], 200, 'g', 1.99),
  p('Lasagne sheets', ['lasagneplatte', 'lasagneplatten'], 500, 'g', 1.79, { pieceG: 25 }),
  p('Gnocchi', ['gnocchi'], 500, 'g', 1.99),
  p('Schupfnudeln', ['schupfnudeln'], 500, 'g', 2.29),
  p('Basmati rice', ['basmati'], 1000, 'g', 2.49),
  p('Rice', ['reis'], 1000, 'g', 1.99),
  p('Red lentils', ['linsen'], 500, 'g', 1.99),
  p('Flour', ['mehl', 'weizenmehl'], 1000, 'g', 1.09),
  p('Cornstarch', ['speisestärke'], 400, 'g', 1.49),
  p('Sugar', ['zucker'], 1000, 'g', 1.29),
  p('Fresh yeast', ['frischhefe', 'hefe'], 42, 'g', 0.39, { use: { würfel: 42 } }),
  p('Nutritional yeast', ['hefeflocken'], 100, 'g', 3.49),
  p('Naan bread', ['naanbrot'], 2, 'pc', 1.99),
  // Meat, fish, protein
  p('Chicken breast', ['hähnchenbrustfilet', 'hähnchenbrust', 'hühnerbrustfilet', 'hühnerbrust', 'hühnerfleisch', 'hähnchen', 'hühnchen'], 1000, 'g', 9.99, { pieceG: 150 }),
  p('Turkey meat', ['putenfleisch', 'putenbrust'], 1000, 'g', 9.99, { pieceG: 150 }),
  p('Minced beef', ['rinderhackfleisch'], 500, 'g', 4.99),
  p('Minced meat', ['hackfleisch'], 500, 'g', 3.99),
  p('Cooked ham', ['kochschinken'], 200, 'g', 2.29),
  p('Sausages', ['würstchen'], 4, 'pc', 2.49, { pieceG: 50 }),
  p('Salmon fillet', ['lachsfilet', 'lachs'], 250, 'g', 5.49),
  p('Tuna (can)', ['thunfisch'], 150, 'g', 1.69, { use: { dose: 150 } }),
  p('Prawns', ['garnele', 'garnelen'], 250, 'g', 5.99),
  p('Soy mince', ['sojaschnetzel'], 200, 'g', 2.49),
  p('Smoked tofu', ['räuchertofu'], 200, 'g', 2.29),
  p('Eggs', ['ei', 'eier'], 10, 'pc', 3.49),
  // Dairy
  p('Cream', ['süße sahne', 'sahne'], 200, 'ml', 0.99, { use: { becher: 200 } }),
  p('Sour cream', ['saure sahne'], 200, 'g', 0.89),
  p('Schmand', ['schmand'], 200, 'g', 0.89, { use: { becher: 200 } }),
  p('Crème fraîche', ['crème fraîche', 'creme fraiche'], 150, 'g', 1.09, { use: { becher: 150 } }),
  p('Soy cream', ['sojasahne'], 250, 'ml', 1.39, { use: { becher: 250 } }),
  p('Cream cheese', ['frischkäse'], 200, 'g', 1.29),
  p('Processed cheese', ['sahneschmelzkäse', 'schmelzkäse'], 200, 'g', 1.19),
  p('Mozzarella', ['mozzarella'], 125, 'g', 0.89),
  p('Grated cheese', ['gouda', 'käse'], 200, 'g', 1.99),
  p('Parmesan', ['parmesan'], 100, 'g', 2.49),
  p('Feta', ['feta', 'schafskäse'], 200, 'g', 1.99),
  p('Yoghurt', ['joghurt', 'naturjoghurt'], 500, 'g', 0.89),
  p('Quark', ['magerquark', 'quark'], 500, 'g', 0.99),
  p('Milk', ['milch'], 1000, 'ml', 1.19),
  p('Soy milk', ['sojamilch'], 1000, 'ml', 1.49),
  p('Butter', ['butter', 'butterflöckchen'], 250, 'g', 2.29),
  p('Herb butter', ['kräuterbutter'], 125, 'g', 1.29),
  p('Margarine', ['margarine'], 250, 'g', 1.29),
  // Vegetables and fruit
  p('Onion', ['zwiebel'], 1, 'pc', 0.25, { pieceG: 90 }),
  p('Shallot', ['schalotte'], 1, 'pc', 0.3, { pieceG: 30 }),
  p('Garlic', ['knoblauch', 'knoblauchzehe'], 1, 'pc', 0.69, { pieceG: 50, use: { zehe: 0.1, zehen: 0.1, knolle: 1 } }),
  p('Spring onions', ['frühlingszwiebel'], 1, 'pc', 0.99, { use: { bund: 1 } }),
  p('Carrot', ['möhre', 'karotte'], 1000, 'g', 1.29, { pieceG: 80 }),
  p('Potatoes', ['kartoffel'], 1000, 'g', 1.79, { pieceG: 100 }),
  p('Tomato', ['tomate'], 500, 'g', 2.49, { pieceG: 100 }),
  p('Cherry tomatoes', ['cherrytomate', 'cocktailtomaten'], 250, 'g', 1.99, { pieceG: 15 }),
  p('Bell pepper', ['paprika'], 1, 'pc', 0.89, { pieceG: 180 }),
  p('Zucchini', ['zucchini'], 1, 'pc', 0.89, { pieceG: 300 }),
  p('Aubergine', ['aubergine'], 1, 'pc', 1.09, { pieceG: 300 }),
  p('Cucumber', ['gurke'], 1, 'pc', 0.89, { pieceG: 400 }),
  p('Broccoli', ['brokkoli'], 500, 'g', 1.79, { use: { kopf: 500 } }),
  p('Cauliflower', ['blumenkohl'], 1, 'pc', 1.69, { pieceG: 900 }),
  p('Leek', ['lauch'], 1, 'pc', 0.99, { pieceG: 250 }),
  p('Savoy cabbage', ['wirsing'], 1, 'pc', 1.79, { pieceG: 800 }),
  p('Cabbage', ['kohl'], 1, 'pc', 1.49, { pieceG: 1000 }),
  p('Fennel', ['fenchel'], 1, 'pc', 1.49, { pieceG: 300 }),
  p('Celery', ['staudensellerie'], 1, 'pc', 1.49, { use: { stange: 0.1 } }),
  p('Hokkaido pumpkin', ['hokkaidokürbis', 'kürbis'], 1, 'pc', 2.49, { pieceG: 1000 }),
  p('Frozen spinach', ['blattspinat', 'rahmspinat', 'spinat'], 450, 'g', 1.89),
  p('Mushrooms', ['champignons', 'champignon'], 250, 'g', 1.79, { pieceG: 20, use: { dose: 230 } }),
  p('Shiitake', ['shiitake-pilz', 'shiitake'], 100, 'g', 2.49),
  p('Mu-err mushrooms', ['mu-err-pilze'], 50, 'g', 2.49),
  p('Sweetcorn (can)', ['mais'], 285, 'g', 0.89),
  p('Pineapple (can)', ['ananas'], 340, 'g', 1.29),
  p('Chickpeas (can)', ['kichererbsen'], 400, 'g', 0.99),
  p('Peas (frozen)', ['erbsen'], 450, 'g', 1.49),
  p('Green beans', ['bohnen'], 500, 'g', 1.79),
  p('Frozen vegetables', ['gemüse'], 600, 'g', 2.29),
  p('Ginger', ['ingwer'], 100, 'g', 0.99, { pieceG: 30 }),
  p('Chili pepper', ['chilischote', 'chili', 'peperoncini'], 1, 'pc', 0.29),
  p('Lemon', ['zitrone'], 1, 'pc', 0.39),
  p('Lemon juice', ['zitronensaft'], 200, 'ml', 1.19),
  p('Lime', ['limette'], 1, 'pc', 0.39),
  p('Bean sprouts', ['sojasprossen', 'mungobohnenkeimlinge'], 250, 'g', 1.29),
  p('Bamboo shoots', ['bambussprosse', 'bambussprossen'], 220, 'g', 1.49),
  p('Seaweed sheets', ['seetangblatt', 'seetang'], 5, 'pc', 1.99),
  // Fresh herbs
  p('Basil', ['basilikum'], 1, 'pc', 1.29, { use: { bund: 1, topf: 1 } }),
  p('Parsley', ['petersilie'], 1, 'pc', 0.99, { use: { bund: 1 } }),
  p('Coriander', ['koriandergrün', 'koriander'], 1, 'pc', 1.29, { use: { bund: 1, stiel: 0.1 } }),
  p('Sage', ['salbei'], 1, 'pc', 1.29, { use: { blatt: 0.03, blätter: 0.03 } }),
  // Nuts, seeds, spreads
  p('Almond flakes', ['mandelblättchen'], 100, 'g', 1.69),
  p('Almond butter', ['mandelmus'], 250, 'g', 5.99),
  p('Cashew butter', ['cashewmus'], 250, 'g', 6.99),
  p('Cashews', ['cashewkerne', 'cashewnüsse', 'cashew'], 200, 'g', 3.49),
  p('Sesame', ['sesam'], 100, 'g', 1.29),
  // Tins, sauces, oils
  p('Coconut milk', ['kokosmilch'], 400, 'ml', 1.49, { use: { dose: 400 } }),
  p('Canned tomatoes', ['tomaten, geschälte', 'tomaten, stückige', 'tomaten, passierte', 'pizzatomaten', 'passierte tomaten'], 400, 'g', 0.89, { use: { dose: 400, pkt: 400, pck: 400 } }),
  p('Tomato paste', ['tomatenmark'], 200, 'g', 1.29, { use: { tube: 200 } }),
  p('Soy sauce', ['sojasauce', 'woksauce'], 250, 'ml', 1.99),
  p('Sambal oelek', ['sambal'], 200, 'g', 1.49),
  p('Mirin', ['mirin'], 150, 'ml', 2.99),
  p('Sake', ['sake'], 500, 'ml', 5.99),
  p('Sherry', ['sherry'], 500, 'ml', 4.99),
  p('Plum wine', ['pflaumenwein'], 720, 'ml', 5.99),
  p('Red wine', ['rotwein'], 750, 'ml', 3.99),
  p('White wine', ['weißwein'], 750, 'ml', 3.99),
  p('Miso paste', ['misopaste'], 300, 'g', 3.99),
  p('Mango chutney', ['mangochutney'], 350, 'g', 2.49),
  p('Curry paste', ['currypaste'], 200, 'g', 2.49),
  p('Mustard', ['senf'], 200, 'ml', 0.85),
  p('Olive oil', ['olivenöl'], 500, 'ml', 5.99),
  p('Sunflower oil', ['sonnenblumenöl', 'rapsöl', 'öl'], 1000, 'ml', 2.49),
  p('Sesame oil', ['sesamöl'], 250, 'ml', 3.49),
  p('Peanut oil', ['erdnussöl'], 500, 'ml', 3.49),
  // Home staples: never counted in a dish's cost
  staple('Salt and pepper', ['salz', 'pfeffer', 'meersalz', 'knoblauchsalz', 'zwiebelsalz', 'cayennepfeffer']),
  staple('Spices', ['chilipulver', 'paprikapulver', 'curry', 'currypulver', 'garam masala', 'kurkuma', 'kurkumapulver', 'kreuzkümmel', 'kreuzkümmelpulver', 'zimtpulver', 'muskat', 'nelke', 'lorbeerblatt', 'knoblauchpulver', 'zwiebelpulver', 'safranfäden', 'gewürzmischung']),
  staple('Dried herbs', ['oregano', 'majoran', 'kräuter', 'estragon']),
  staple('Stock and water', ['brühe', 'gemüsebrühe', 'gemüsebrühepulver', 'hühnerbrühe', 'wasser', 'saucenbinder', 'fett für die form']),
];
