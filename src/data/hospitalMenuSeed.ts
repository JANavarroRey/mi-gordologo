import type { WeekMenu, DayMenu, Meal, MealItem, MealType } from '@/domain/models/types';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Crea un MealItem con nombre y cantidad exacta.
 */
function item(name: string, quantity: string, notes: string | null = null): MealItem {
  return { name, quantity, notes };
}

export function buildCookidooSearchUrl(query: string): string {
  const baseUrl = 'https://cookidoo.es/search/es-ES';
  const searchParams = new URLSearchParams({
    query: query,
    countries: 'es',
  });
  return `${baseUrl}?${searchParams.toString()}`;
}

// ============================================================================
// LUNCH (COMIDAS) CATALOG - Hospital Morales Meseguer 1500kcal
// ============================================================================

interface MenuDef {
  recipeName: string;
  cookidooQuery: string | null;
  items: MealItem[];
  dessertType?: 'standard' | 'integrated' | 'special';
  specialDessert?: string;
}

const LUNCH_CATALOG: MenuDef[] = [
  {
    recipeName: 'Cocido Murciano',
    cookidooQuery: 'Cocido',
    items: [
      item('Consomé desgrasado', '1 taza'),
      item('Garbanzos', '60g crudo / 9 cdas cocido'),
      item('Patata', '50g'),
      item('Judías verdes', '150g'),
      item('Cardo, apio, ½ zanahoria', 'al gusto'),
      item('Pollo/pavo/ternera sin piel', '100g'),
      item('Pan', '20g'),
      item('Aceite de oliva', '1.5 cdas')
    ]
  },
  {
    recipeName: 'Olla Gitana',
    cookidooQuery: 'Olla Gitana',
    items: [
      item('Alubias', '30g'),
      item('Garbanzos', '30g'),
      item('Patata', '50g'),
      item('Judías verdes', '100g'),
      item('Calabaza', '50g'),
      item('Tomate', '50g'),
      item('Cebolla', '¼ unidad'),
      item('Pescado blanco/sepia/calamar (ó azul 100g)', '150g', 'A la plancha'),
      item('Pan', '20g'),
      item('Aceite de oliva', '1.5 cdas')
    ]
  },
  {
    recipeName: 'Guiso de Pescado',
    cookidooQuery: 'Guiso de Pescado',
    items: [
      item('Ensalada', 'Al gusto', 'Lechuga, tomate, pepino, alcaparras'),
      item('Patatas', '200g', 'Para el guiso'),
      item('Ajo, ½ cebolla, tomate', 'Al gusto', 'Para el guiso'),
      item('Pescado blanco', '150g', 'Para el guiso'),
      item('Pan', '20g'),
      item('Aceite de oliva', '1.5 cdas')
    ]
  },
  {
    recipeName: 'Ensalada de Pasta (Plato único)',
    cookidooQuery: 'Ensalada de Pasta',
    items: [
      item('Pasta', '60g crudo / 200g cocido'),
      item('Atún natural', '1 lata'),
      item('Tomate', '1 grande ó 100g tomate frito'),
      item('Pimiento, ¼ cebolla, pepinillos, alcaparras', 'Al gusto'),
      item('Clara de huevo duro', '1 unidad'),
      item('Pan', '20g'),
      item('Aceite de oliva', '1.5 cdas')
    ]
  },
  {
    recipeName: 'Ensalada de Alubias (Plato único)',
    cookidooQuery: 'Ensalada de Alubias',
    items: [
      item('Alubias', '80g crudo / 12 cdas cocido'),
      item('Cebolla', '¼ unidad'),
      item('Caballa/sardinas escurrida', '1 lata'),
      item('Clara de huevo duro', '1 unidad'),
      item('Tomate, pimiento, pepinillos, alcaparras', 'Al gusto'),
      item('Pan', '20g'),
      item('Aceite de oliva', '1.5 cdas')
    ]
  },
  {
    recipeName: 'Ensalada de Patatas y Merluza (Plato único)',
    cookidooQuery: 'Ensalada de Patatas',
    items: [
      item('Patatas cocidas', '200g'),
      item('Merluza/pescadilla cocida', '150g'),
      item('Tomate, ¼ cebolla, pimiento', 'Al gusto'),
      item('Pan', '20g'),
      item('Aceite de oliva', '1.5 cdas')
    ]
  },
  {
    recipeName: 'Ensalada Murciana (Plato único)',
    cookidooQuery: 'Ensalada Murciana',
    items: [
      item('Patatas cocidas', '200g'),
      item('Tomate natural', '1 bote pequeño'),
      item('Huevo duro entero', '1 unidad'),
      item('Atún natural', '1 lata'),
      item('Cebolla', '¼ unidad'),
      item('Aceitunas', '3 unidades'),
      item('Pan', '20g'),
      item('Aceite de oliva', '1.5 cdas')
    ]
  },
  {
    recipeName: 'Asado de Pescado al Horno',
    cookidooQuery: 'Pescado al Horno',
    items: [
      item('Ensalada de col o lombarda', '200g'),
      item('Pescado azul (100g) ó blanco (150g)', 'Según elección', 'Al horno con limón y vino blanco'),
      item('Patata', '200g'),
      item('Tomate pequeño y ¼ cebolla', 'Al gusto'),
      item('Pan', '20g'),
      item('Aceite de oliva', '1.5 cdas')
    ]
  },
  {
    recipeName: 'Arroz con Champiñones y Pavo (Plato único)',
    cookidooQuery: 'Arroz con Champiñones',
    items: [
      item('Arroz', '60g crudo / 8 cdas cocido'),
      item('Champiñones', '300g'),
      item('Jamón de pavo', '100g'),
      item('Ajo', 'Al gusto'),
      item('Pan', '20g'),
      item('Aceite de oliva', '1.5 cdas')
    ]
  },
  {
    recipeName: 'Arroz a la Cubana',
    cookidooQuery: 'Arroz a la Cubana',
    items: [
      item('Arroz', '60g crudo'),
      item('Huevo a la plancha', '1 unidad'),
      item('Tomate frito', '100g'),
      item('Ensalada variada', 'Al gusto', 'Lechuga, tomate, ½ pepino, ¼ cebolla, alcaparras'),
      item('Pan', '20g'),
      item('Aceite de oliva', '1.5 cdas')
    ]
  },
  {
    recipeName: 'Verduras con Carne',
    cookidooQuery: 'Verduras con Pollo',
    items: [
      item('Verdura cocida/horno/plancha', '500g', 'Si son alcachofas o guisantes: 160g'),
      item('Carne (pollo/pavo/ternera/conejo)', '100g'),
      item('Patata', '100g'),
      item('Pan', '40g'),
      item('Aceite de oliva', '1.5 cdas')
    ]
  },
  {
    recipeName: 'Sopa de Pescado con Fideos',
    cookidooQuery: 'Sopa de Pescado',
    items: [
      item('Sopa (caldo desgrasado + pasta)', '30g crudo (pasta)'),
      item('Pescado blanco (150g) ó azul (100g)', 'Según elección'),
      item('Cogollos de lechuga', '2 unidades'),
      item('Patata', '100g'),
      item('Pan', '20g'),
      item('Aceite de oliva', '1.5 cdas')
    ]
  },
  {
    recipeName: 'Lentejas Estofadas',
    cookidooQuery: 'Lentejas Estofadas',
    items: [
      item('Lentejas', '60g crudo / 9 cdas cocido'),
      item('Patata', '50g'),
      item('Tomate frito', '1 cda'),
      item('Cebolla, zanahoria, ajo', 'Al gusto'),
      item('Ternera', '50g'),
      item('Tortilla francesa', '1 huevo'),
      item('Pan', '20g'),
      item('Aceite de oliva', '1.5 cdas')
    ]
  },
  {
    recipeName: 'Paella / Arroz Marinero',
    cookidooQuery: 'Arroz Marinero',
    items: [
      item('Arroz', '60g crudo / 8 cdas cocido'),
      item('Emperador', '40g'),
      item('Calamar', '40g'),
      item('Gambas', '2 unidades'),
      item('Almejas y mejillones', '3 uds c/u', 'O sustituir por 100g conejo/pollo'),
      item('Ensalada', 'Lechuga 150g, Tomate 150g'),
      item('Pan', '20g'),
      item('Aceite de oliva', '1.5 cdas')
    ]
  },
  {
    recipeName: 'Estofado de Ternera',
    cookidooQuery: 'Estofado de Ternera',
    items: [
      item('Patatas', '200g'),
      item('Ternera magra', '100g'),
      item('Cebolla, ajo, pimiento, laurel', 'Al gusto', 'Con un poco de vino tinto'),
      item('Ensalada', 'Lechuga 150g, Tomate 150g'),
      item('Pan', '20g'),
      item('Aceite de oliva', '1.5 cdas')
    ]
  },
  {
    recipeName: 'Potaje de Legumbres con Verdura',
    cookidooQuery: 'Potaje de Legumbres',
    items: [
      item('Alubias o garbanzos', '60g crudo'),
      item('Arroz', '15g crudo', 'Total = 11 cdas cocido'),
      item('Verdura cocida variada', '300g'),
      item('Tomate mediano', '1 unidad'),
      item('Atún natural', '1 lata'),
      item('Pan', '20g'),
      item('Aceite de oliva', '1.5 cdas')
    ]
  },
  {
    recipeName: 'Asado de Pescado con Patatas',
    cookidooQuery: 'Pescado al Horno',
    items: [
      item('Consomé de ave o pescado desgrasado', '1 porción'),
      item('Patatas', '200g'),
      item('Pescado azul (100g) ó blanco (150g)', 'Al horno con ajo, perejil, tomate, cebolla'),
      item('Pan', '20g'),
      item('Aceite de oliva', '1.5 cdas')
    ]
  },
  {
    recipeName: 'Crema de Calabacín con Lubina',
    cookidooQuery: 'Crema de Calabacín',
    items: [
      item('Crema de calabacín', '300g', 'Con ¼ cebolla y 1 quesito desnatado'),
      item('Patata', '150g', 'Dentro de la crema o aparte'),
      item('Lubina/dorada', '150g', 'A la sal o papillote'),
      item('Ensalada', 'Tomate 150g, lechuga 150g'),
      item('Pan', '10g'),
      item('Aceite de oliva', '1 cda', 'EXCEPCIÓN')
    ]
  },
  {
    recipeName: 'Pasta al Huevo con Queso',
    cookidooQuery: 'Pasta',
    items: [
      item('Pasta', '60g crudo / 200g cocido'),
      item('Huevo crudo cuajado', '1 unidad'),
      item('Queso rallado', '1 cda'),
      item('Ensalada de verdura', '300g'),
      item('Pan', '20g'),
      item('Aceite de oliva', '1.5 cdas total')
    ]
  },
  {
    recipeName: 'Pasta con Pisto',
    cookidooQuery: 'Pisto',
    items: [
      item('Pasta', '60g crudo'),
      item('Pisto', '300g', 'Berenjena, calabacín, pimiento, cebolla, tomate, orégano'),
      item('Pescado blanco (150g) ó azul (100g)', 'A la plancha'),
      item('Pan', '20g'),
      item('Aceite de oliva', '1.5 cdas')
    ]
  },
  {
    recipeName: 'Sopa de Cebolla Gratinada con Salmón',
    cookidooQuery: 'Sopa de Cebolla',
    items: [
      item('Sopa de Cebolla', '200g cebolla', 'Rehogada con vino blanco'),
      item('Pan tostado', '40g', 'Incluido en sopa'),
      item('Queso desnatado gratinado', '1 cda'),
      item('Salmón a la plancha', '100g'),
      item('Guisantes', '80g'),
      item('Aceite de oliva', '1.5 cdas total')
    ]
  },
  // --- Platos enriquecidos de la nutricionista (menús externos) ---
  {
    recipeName: 'Lentejas Estofadas con Ensalada o Gazpacho',
    cookidooQuery: 'Lentejas estofadas',
    items: [
      item('Ensalada variada o gazpacho', '1 plato / 250 ml'),
      item('Lentejas estofadas', '2 cucharones (~60g crudo)'),
      item('Kiwi', '1 unidad', 'Postre'),
      item('Pan integral', '20g'),
      item('Aceite de oliva', '1.5 cdas'),
    ],
    dessertType: 'integrated',
  },
  {
    recipeName: 'Dorada/Lubina con Patata y Ensalada',
    cookidooQuery: 'Dorada al horno',
    items: [
      item('Ensalada variada', '1 plato grande'),
      item('Dorada o lubina', '150g'),
      item('Patata', '150g'),
      item('Fruta', '1 ración (grupo B 200g)'),
      item('Aceite de oliva', '1.5 cdas'),
    ],
    dessertType: 'integrated',
  },
  {
    recipeName: 'Guiso de Pollo con Verduras y Cuscús',
    cookidooQuery: 'Guiso de pollo',
    items: [
      item('Ensalada variada', '1 plato'),
      item('Pollo sin piel', '100g'),
      item('Verduras del guiso', '200g'),
      item('Arroz o cuscús', 'puñado pequeño (~40g crudo)', 'Sustituible por patata'),
      item('Fruta', '1 ración'),
      item('Aceite de oliva', '1.5 cdas'),
    ],
    dessertType: 'integrated',
  },
  {
    recipeName: 'Alubias Estofadas o Ensalada de Alubias',
    cookidooQuery: 'Alubias estofadas',
    items: [
      item('Ensalada o gazpacho', '1 plato'),
      item('Alubias', '2 cucharones (~60g crudo)'),
      item('Fruta', '1 ración'),
      item('Pan', '20g'),
      item('Aceite de oliva', '1.5 cdas'),
    ],
    dessertType: 'integrated',
  },
  {
    recipeName: 'Morcilla de Verano con Sepia',
    cookidooQuery: 'Morcilla de verano',
    items: [
      item('Morcilla de verano', '1 plato', 'Tomate, cebolla, atún al natural, huevo'),
      item('Sepia o calamar', '150g', 'Ajo y perejil'),
      item('Pan', '1 rebanada (20g)'),
      item('Fruta', '1 ración'),
      item('Aceite de oliva', '1.5 cdas'),
    ],
    dessertType: 'integrated',
  },
  {
    recipeName: 'Salmón con Verdura y Pisto',
    cookidooQuery: 'Salmón plancha',
    items: [
      item('Verdura de acompañamiento', '200g'),
      item('Salmón', '100g'),
      item('Fruta', '1 ración'),
      item('Aceite de oliva', '1.5 cdas'),
    ],
    dessertType: 'integrated',
  },
  {
    recipeName: 'Judías Verdes con Tortilla',
    cookidooQuery: 'Judías verdes salteadas',
    items: [
      item('Judías verdes salteadas', '200g', 'Con un poco de jamón serrano magro'),
      item('Tortilla francesa', '1 huevo'),
      item('Pan', '1 rebanada (20g)'),
      item('Fruta', '1 ración'),
      item('Aceite de oliva', '1.5 cdas'),
    ],
    dessertType: 'integrated',
  },
  {
    recipeName: 'Arroz Tres Delicias / Paella Ligera',
    cookidooQuery: 'Arroz tres delicias',
    items: [
      item('Ensalada variada', '1 plato'),
      item('Arroz tres delicias o paella casera', 'plato pequeño (~60g crudo)'),
      item('Fruta', '1 ración'),
      item('Aceite de oliva', '1.5 cdas'),
    ],
    dessertType: 'integrated',
  },
  {
    recipeName: 'Berenjenas Rellenas de Ternera',
    cookidooQuery: 'Berenjenas rellenas',
    items: [
      item('Berenjenas rellenas', '1 unidad', 'Tomate, cebolla y ternera magra 100g'),
      item('Puré de patata', '1 patata pequeña (~100g)'),
      item('Fruta', '1 ración'),
      item('Aceite de oliva', '1.5 cdas'),
    ],
    dessertType: 'integrated',
  },
  {
    recipeName: 'Ensalada Murciana Nutricionista + Tortilla',
    cookidooQuery: 'Ensalada murciana',
    items: [
      item('Ensalada murciana', '1 plato', 'Tomate de pera, cebolla, alcaparras, atún al natural, huevo duro'),
      item('Tortilla de verduras', '1 ración'),
      item('Fruta', '1 ración'),
      item('Aceite de oliva', '1.5 cdas'),
    ],
    dessertType: 'integrated',
  },
];

// ============================================================================
// DINNER (CENAS) CATALOG - Hospital Morales Meseguer 1500kcal
// ============================================================================

const DINNER_CATALOG: MenuDef[] = [
  {
    recipeName: 'Hervido de Judías Verdes con Pescado',
    cookidooQuery: 'Judías Verdes',
    items: [
      item('Judías verdes', '200g'),
      item('Patata', '100g'),
      item('Cebolla', '¼ unidad', 'Hervido'),
      item('Pescado blanco', '150g', 'Hervido o plancha'),
      item('Pan', '20g'),
      item('Aceite de oliva', '1 cda')
    ]
  },
  {
    recipeName: 'Ensalada Templada de Arroz y Pavo (Plato único)',
    cookidooQuery: 'Ensalada de Arroz',
    items: [
      item('Arroz', '45g crudo / 6 cdas cocido'),
      item('Cebolla, pimiento, tomate, pepinillos, tápenas', 'Al gusto'),
      item('Jamón/pechuga de pavo', '100g'),
      item('Aceite de oliva', '1 cda')
    ]
  },
  {
    recipeName: 'Crema de Calabacín con Huevo',
    cookidooQuery: 'Crema de Calabacín',
    items: [
      item('Calabacín', '250g'),
      item('Patata', '100g'),
      item('Cebolla', 'Al gusto'),
      item('Leche desnatada', '100ml', 'Para la crema'),
      item('Quesito desnatado', '1 unidad'),
      item('Huevo', '1 unidad', 'Cocido o pasado por agua'),
      item('Pan', '10g'),
      item('Aceite de oliva', '1 cda')
    ]
  },
  {
    recipeName: 'Ensalada Especial con Frutas (Plato único)',
    cookidooQuery: 'Ensalada con Frutas',
    dessertType: 'integrated',
    items: [
      item('Lechuga, pepino, pimiento, apio', 'Libres'),
      item('Manzana', '½ unidad', 'Integrada en ensalada'),
      item('Patata cocida', '100g'),
      item('Naranja', '½ unidad', 'Integrada en ensalada'),
      item('Queso fresco desnatado', '30g'),
      item('Mostaza', '1 cda', 'Con hierbas'),
      item('Pan', '20g'),
      item('Aceite de oliva', '1 cda')
    ]
  },
  {
    recipeName: 'Verduras Asadas con Pescado',
    cookidooQuery: 'Verduras Asadas',
    items: [
      item('Verduras asadas', 'Al gusto', '½ cebolla, 1 berenjena, 1 pimiento, 2 tomates pequeños, ajo al horno'),
      item('Pescado blanco/marisco (150g) ó azul (100g)', 'Según elección'),
      item('Patata', '100g'),
      item('Pan', '20g'),
      item('Aceite de oliva', '1 cda')
    ]
  },
  {
    recipeName: 'Hervido de Alcachofas con Pollo',
    cookidooQuery: 'Alcachofas',
    items: [
      item('Alcachofas', '100g', 'Hervidas'),
      item('Patata', '100g', 'Hervida'),
      item('Pollo o pavo plancha', '100g'),
      item('Pan', '20g'),
      item('Aceite de oliva', '1 cda')
    ]
  },
  {
    recipeName: 'Revuelto de Champiñones con Ensalada',
    cookidooQuery: 'Revuelto de Champiñones',
    dessertType: 'special',
    specialDessert: 'Melón (300g)',
    items: [
      item('Champiñones', '200g'),
      item('Ajos tiernos y espárragos', '50g c/u'),
      item('Revuelto', '1 yema + 2 claras'),
      item('Ensalada lechuga', '300g'),
      item('Pan', '40g'),
      item('Aceite de oliva', '1 cda')
    ]
  },
  {
    recipeName: 'Hervido de Acelgas con Pescado',
    cookidooQuery: 'Acelgas',
    items: [
      item('Acelgas o espinacas', '300g', 'Hervidas'),
      item('Patata', '100g', 'Hervida'),
      item('Pescado blanco/marisco (150g) ó azul (100g)', 'Según elección'),
      item('Pan', '20g'),
      item('Aceite de oliva', '1 cda')
    ]
  },
  {
    recipeName: 'Ensalada de Pasta con Trucha (Plato único)',
    cookidooQuery: 'Ensalada de Pasta',
    items: [
      item('Pasta', '45g crudo / 150g cocido'),
      item('Trucha o bacalao ahumado', '50g'),
      item('Cebolla', '¼ unidad'),
      item('Queso fresco', '40g'),
      item('Tomate', 'Al gusto'),
      item('Aceite de oliva', '1 cda')
    ]
  },
  {
    recipeName: 'Sopa de Fideos con Tortilla',
    cookidooQuery: 'Sopa de Fideos',
    items: [
      item('Sopa de fideos', '30g crudo', 'Con caldo desgrasado'),
      item('Tortilla francesa', '2 claras + 1 yema'),
      item('Ensalada', 'Tomate y lechuga'),
      item('Pan', '20g'),
      item('Aceite de oliva', '1 cda')
    ]
  },
  {
    recipeName: 'Espinacas con Conejo al Horno',
    cookidooQuery: 'Conejo al Horno',
    items: [
      item('Patata', '100g'),
      item('Espinacas o acelgas', '300g', 'Hervidas'),
      item('Conejo al horno', '100g', 'Con tomate, ajo, perejil, pimiento'),
      item('Pan', '20g'),
      item('Aceite de oliva', '1 cda')
    ]
  },
  {
    recipeName: 'Puré de Verduras con Salmonetes',
    cookidooQuery: 'Puré de Verduras',
    items: [
      item('Puré de verduras', '100g apio/zanahoria + 100g patata + ¼ cebolla', '1 cda aceite virgen encima'),
      item('Salmonetes plancha', '100g'),
      item('Pan', '20g'),
      item('Aceite de oliva', '1 cda')
    ]
  },
  {
    recipeName: 'Merluza a la Plancha con Patatas (Plato único)',
    cookidooQuery: 'Merluza a la Plancha',
    items: [
      item('Merluza plancha', '150g', 'Con ajo y perejil'),
      item('Patatas cocidas o asadas', '100g'),
      item('Cogollos de lechuga', '2 unidades'),
      item('Pan', '20g'),
      item('Aceite de oliva', '1 cda')
    ]
  },
  {
    recipeName: 'Vichyssoise con Jamón de Pavo',
    cookidooQuery: 'Vichyssoise',
    items: [
      item('Vichyssoise', '150g puerros + 100g patata + ¼ cebolla + 100ml leche desnatada'),
      item('Jamón de pavo', '50g'),
      item('Tomate', '1 unidad'),
      item('Pan', '10g'),
      item('Aceite de oliva', '1 cda')
    ]
  },
  {
    recipeName: 'Ensalada de Col con Trucha',
    cookidooQuery: 'Trucha al Papillote',
    items: [
      item('Ensalada de col o lombarda', '300g'),
      item('Trucha papillote o plancha', '150g'),
      item('Patata', '100g'),
      item('Pan', '20g'),
      item('Aceite de oliva', '1 cda')
    ]
  },
  {
    recipeName: 'Ensalada Templada de Espinacas (Plato único)',
    cookidooQuery: 'Ensalada de Espinacas',
    dessertType: 'special',
    specialDessert: 'Fruta fresca de temporada (2.5 raciones)',
    items: [
      item('Espinacas', '300g'),
      item('Queso fresco desnatado', '40g'),
      item('Jamón serrano sin tocino plancha', '40g'),
      item('Vinagre de Módena', 'Al gusto'),
      item('Pan', '40g'),
      item('Aceite de oliva', '1 cda')
    ]
  },
  {
    recipeName: 'Ensalada de Canónigos (Plato único)',
    cookidooQuery: 'Ensalada de Canónigos',
    dessertType: 'special',
    specialDessert: 'Fruta fresca de temporada (2.5 raciones)',
    items: [
      item('Canónigos', '300g'),
      item('Cecina de ternera o jamón serrano magro', '40g'),
      item('Queso parmesano', '30g'),
      item('Vinagre de Módena', 'Al gusto'),
      item('Pan', '40g'),
      item('Aceite de oliva', '1 cda')
    ]
  },
  {
    recipeName: 'Espinacas a la Crema (Plato único)',
    cookidooQuery: 'Espinacas a la Crema',
    items: [
      item('Espinacas con bechamel', '300g espinacas + 1 cda harina + 100ml leche desnatada + 20g queso rallado'),
      item('Jamón de pavo o serrano magro', '50g'),
      item('Pan', '30g'),
      item('Aceite de oliva', '1 cda', 'Utilizada en la bechamel')
    ]
  },
  {
    recipeName: 'Endivias al Roquefort con Lenguado',
    cookidooQuery: 'Lenguado',
    items: [
      item('Endivias', '300g', 'Con salsa: 20g queso azul + 100ml leche desnatada'),
      item('Lenguado al vapor', '100g'),
      item('Patata', '100g'),
      item('Pan', '10g'),
      item('Aceite de oliva', '1 cda')
    ]
  },
  {
    recipeName: 'Crema de Puerros Gratinada (Plato único)',
    cookidooQuery: 'Crema de Puerros',
    items: [
      item('Puerros', '300g', 'Con bechamel ligera'),
      item('Pan rallado gratinado', '20g'),
      item('Huevo', '1 unidad', 'Escalfado, cocido o en tortilla'),
      item('Pan', '10g'),
      item('Aceite de oliva', '1 cda')
    ]
  },
  {
    recipeName: 'Sopa de Pescado con Rape',
    cookidooQuery: 'Sopa de Pescado',
    items: [
      item('Caldo', 'Puerro, ¼ cebolla, zanahoria, tomate, azafrán'),
      item('Patata', '100g'),
      item('Rape blanco hervido', '150g'),
      item('Pan', '20g'),
      item('Aceite de oliva', '1 cda')
    ]
  },
  // --- Cenas nutricionista ---
  {
    recipeName: 'Espárragos con Jamón York y Kéfir',
    cookidooQuery: 'Espárragos trigueros',
    items: [
      item('Espárragos trigueros y ajos tiernos', '200g', 'Salteados'),
      item('Jamón york magro', '60g'),
      item('Yogur o kéfir desnatado', '1 unidad'),
      item('Aceite de oliva', '1 cda'),
    ],
    dessertType: 'integrated',
  },
  {
    recipeName: 'Huevo Revuelto con Verduras',
    cookidooQuery: 'Revuelto de verduras',
    items: [
      item('Verduras salteadas', '200g'),
      item('Huevo', '1 unidad', 'Revuelto'),
      item('Yogur o kéfir', '1 unidad'),
      item('Aceite de oliva', '1 cda'),
    ],
    dessertType: 'integrated',
  },
  {
    recipeName: 'Ensalada con Atún al Natural',
    cookidooQuery: 'Ensalada atún',
    items: [
      item('Ensalada variada', '1 plato grande'),
      item('Atún al natural', '1 lata escurrida'),
      item('Yogur desnatado', '1 unidad'),
      item('Aceite de oliva', '1 cda'),
    ],
    dessertType: 'integrated',
  },
  {
    recipeName: 'Escalivada con Queso Fresco',
    cookidooQuery: 'Escalivada',
    items: [
      item('Escalivada', '200g', 'Pimiento, berenjena, cebolla'),
      item('Queso fresco aliñado', '60g'),
      item('Yogur desnatado', '1 unidad'),
      item('Aceite de oliva', '1 cda'),
    ],
    dessertType: 'integrated',
  },
  {
    recipeName: 'Coliflor y Pollo a la Plancha',
    cookidooQuery: 'Coliflor plancha',
    items: [
      item('Coliflor a la plancha', '200g'),
      item('Pollo a la plancha', '100g'),
      item('Yogur desnatado', '1 unidad'),
      item('Aceite de oliva', '1 cda'),
    ],
    dessertType: 'integrated',
  },
  {
    recipeName: 'Pisto con Jamón Cocido',
    cookidooQuery: 'Pisto murciano',
    items: [
      item('Pisto', '250g', 'Berenjena, calabacín, pimiento, tomate, cebolla'),
      item('Jamón cocido', '60g'),
      item('Yogur desnatado', '1 unidad'),
      item('Aceite de oliva', '1 cda'),
    ],
    dessertType: 'integrated',
  },
  {
    recipeName: 'Verduras Plancha con Pescado Blanco',
    cookidooQuery: 'Verduras a la plancha',
    items: [
      item('Verduras a la plancha', '200g'),
      item('Pescado blanco', '150g'),
      item('Yogur desnatado', '1 unidad'),
      item('Aceite de oliva', '1 cda'),
    ],
    dessertType: 'integrated',
  },
  {
    recipeName: 'Zarangollo sin Patata',
    cookidooQuery: 'Zarangollo',
    items: [
      item('Tomate partido', '150g'),
      item('Zarangollo sin patata', '200g', 'Calabacín, cebolla, huevo'),
      item('Yogur desnatado', '1 unidad'),
      item('Aceite de oliva', '1 cda'),
    ],
    dessertType: 'integrated',
  },
  {
    recipeName: 'Gambas al Ajillo o Pescado Blanco',
    cookidooQuery: 'Gambas al ajillo',
    items: [
      item('Puré de verduras sin patata', '250g'),
      item('Gambas al ajillo o pescado blanco', '120–150g'),
      item('Yogur desnatado', '1 unidad'),
      item('Aceite de oliva', '1 cda'),
    ],
    dessertType: 'integrated',
  },
  {
    recipeName: 'Champiñones con Jamón Serrano',
    cookidooQuery: 'Champiñones ajo perejil',
    items: [
      item('Champiñones salteados', '200g', 'Ajo y perejil'),
      item('Jamón serrano magro', '2 lonchas (~30g)'),
      item('Yogur desnatado', '1 unidad'),
      item('Aceite de oliva', '1 cda'),
    ],
    dessertType: 'integrated',
  },
];

// ============================================================================
// BREAKFAST & SNACKS VARIANTS
// ============================================================================

const BREAKFAST_VARIANTS: MealItem[][] = [
  [
    item('Leche desnatada', '200ml'),
    item('Fruta fresca', '150g'),
    item('Pan integral tostado', '20g')
  ],
  [
    item('Yogur desnatado sin azúcar', '2 unidades'),
    item('Fruta fresca', '150g'),
    item('Pan integral', '20g')
  ],
  [
    item('Café/infusión con leche desnatada', '200ml'),
    item('Tostada integral', '20g', 'Con ½ cda de aceite de oliva (5g)'),
    item('Fruta fresca', '150g')
  ],
  [
    item('Queso fresco Burgos desnatado', '35g'),
    item('Pan integral', '20g'),
    item('Fruta fresca', '150g')
  ],
  [
    item('Leche desnatada', '200ml'),
    item('Fruta (kiwi o naranja)', '150g'),
    item('Biscotes integrales', '2 unidades', 'Con 1 cda mermelada sin azúcar')
  ],
  [
    item('Yogur desnatado sin azúcar', '2 unidades'),
    item('Fruta fresca', '150g'),
    item('Pan integral', '20g')
  ],
  [
    item('Leche desnatada con canela', '200ml'),
    item('Tostada integral', '20g', 'Con tomate y ½ cda de aceite de oliva'),
    item('Fruta fresca', '150g')
  ]
];

const MID_MORNING_VARIANTS: MealItem[][] = [
  [item('Yogur desnatado sin azúcar', '1 unidad')],
  [item('Fruta fresca', '150g')],
  [item('Yogur desnatado', '1 unidad'), item('Nueces', '2 unidades')],
  [item('Leche desnatada', '200ml')],
  [item('Fruta fresca', '150g')],
  [item('Yogur desnatado sin azúcar', '1 unidad')],
  [item('Fruta fresca (kiwi o mandarina)', '150g')]
];

const SNACK_VARIANTS: MealItem[][] = [
  [item('Fruta fresca', '150g')],
  [item('Yogur desnatado sin azúcar', '1 unidad')],
  [item('Infusión (manzanilla/poleo)', '1 taza'), item('Fruta fresca', '150g')],
  [item('Yogur desnatado sin azúcar', '1 unidad')],
  [item('Fruta (melón o sandía)', '300g')],
  [item('Yogur desnatado o kéfir 0%', '1 unidad')],
  [item('Fruta fresca (150g) ó Almendras naturales (6 uds)', '1 porción')]
];

const RECENA_ITEMS: MealItem[] = [
  item('Yogur desnatado sin azúcar ó Leche desnatada (100ml)', '1 ración')
];

// ============================================================================
// ROTATION GENERATION
// ============================================================================

// Array of 8 weeks. Each week is 7 days. Each day is [lunchIndex, dinnerIndex]
// Índices 0-based: comida_01=0 … comida_21=20 | cena_01=0 … cena_21=20
// Semanas 1-3 = rotación OFICIAL Hospital Morales Meseguer
// Semanas 1-3 = rotación OFICIAL Hospital. Semanas 4-8 mezclan hospital + nutricionista.
// Índices comida 0-30, cena 0-30. Día 5 = Sábado (siempre con menú real).
const ROTATION_TABLE: [number, number][][] = [
  // Sem 1 hospital
  [[0, 10], [1, 11], [2, 12], [3, 13], [4, 14], [5, 15], [6, 16]],
  // Sem 2 hospital
  [[7, 17], [8, 18], [9, 19], [2, 20], [5, 12], [7, 15], [8, 17]],
  // Sem 3 hospital
  [[0, 19], [4, 14], [6, 11], [3, 18], [9, 16], [1, 13], [5, 10]],
  // Sem 4 — nutricionista (incl. sábado lentejas + espárragos)
  [[21, 21], [22, 22], [23, 23], [24, 24], [25, 25], [26, 26], [27, 27]],
  // Sem 5 — mezcla
  [[28, 28], [29, 29], [21, 22], [10, 21], [12, 24], [30, 25], [14, 26]],
  // Sem 6
  [[22, 27], [24, 28], [26, 29], [28, 21], [30, 23], [23, 25], [25, 27]],
  // Sem 7
  [[27, 24], [29, 26], [21, 28], [23, 29], [25, 22], [22, 30], [24, 21]],
  // Sem 8
  [[26, 23], [28, 25], [30, 27], [21, 29], [23, 21], [29, 24], [27, 26]],
];

const STANDARD_DESSERT = 'Fruta fresca (Grupo A 300g / B 200g / C 160g / D 100g) ó 2 yogures desnatados sin azúcar';

function buildMealFromCatalog(type: MealType, def: MenuDef, oilLabel: string, menuId: string): Meal {
  const finalItems = [...def.items];

  // Evitar aceite duplicado si ya viene en el catálogo
  const hasOil = finalItems.some((i) => /aceite/i.test(i.name));
  if (!hasOil) {
    finalItems.push(item('Aceite de oliva virgen extra', oilLabel));
  }

  // Añadir postre si no está integrado en el plato
  if (def.dessertType !== 'integrated') {
    if (def.dessertType === 'special' && def.specialDessert) {
      finalItems.push(item('Postre', def.specialDessert));
    } else {
      finalItems.push(item('Postre', STANDARD_DESSERT));
    }
  }

  return {
    type,
    menuId,
    recipeName: def.recipeName,
    recipeUrl: def.cookidooQuery ? buildCookidooSearchUrl(def.cookidooQuery) : null,
    items: finalItems,
    totalCalories: type === 'lunch' ? 550 : 450,
  };
}

function buildSimpleMeal(type: MealType, items: readonly MealItem[], calories: number, menuId?: string): Meal {
  return {
    type,
    menuId: menuId ?? null,
    recipeName: null,
    recipeUrl: null,
    items,
    totalCalories: calories,
  };
}

const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const;

export function getHospitalMenuSeed(): WeekMenu[] {
  return ROTATION_TABLE.map((weekConfig, weekIndex) => {
    const days: DayMenu[] = weekConfig.map(([lunchIdx, dinnerIdx], dayIndex) => {
      const breakfastItems = BREAKFAST_VARIANTS[dayIndex % 7];
      const midMorningItems = MID_MORNING_VARIANTS[dayIndex % 7];
      const snackItems = SNACK_VARIANTS[dayIndex % 7];

      const lunchId = `comida_${String(lunchIdx + 1).padStart(2, '0')}`;
      const dinnerId = `cena_${String(dinnerIdx + 1).padStart(2, '0')}`;

      const meals: Record<MealType, Meal> = {
        breakfast: buildSimpleMeal('breakfast', breakfastItems, 250, `desayuno_d${dayIndex + 1}`),
        midMorning: buildSimpleMeal('midMorning', midMorningItems, 75, `media_d${dayIndex + 1}`),
        lunch: buildMealFromCatalog('lunch', LUNCH_CATALOG[lunchIdx], '1,5 cucharadas soperas (15g)', lunchId),
        snack: buildSimpleMeal('snack', snackItems, 75, `merienda_d${dayIndex + 1}`),
        dinner: buildMealFromCatalog('dinner', DINNER_CATALOG[dinnerIdx], '1 cucharada sopera (10g)', dinnerId),
        recena: buildSimpleMeal('recena', RECENA_ITEMS, 50, 'recena_01'),
      };

      return {
        dayOfWeek: dayIndex,
        dayLabel: DAY_NAMES[dayIndex],
        isFreeDay: false, // storageService.applyFreeDay() lo marca en runtime
        meals,
      };
    });

    return {
      weekNumber: weekIndex + 1,
      days,
    };
  });
}
