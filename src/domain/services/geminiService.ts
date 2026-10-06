import { buildCookidooSearchUrl } from '@/data/hospitalMenuSeed';
import type { Meal, MealItem, MealType } from '../models/types';
import { backendService } from './backendService';

export interface AISwapResponse {
  readonly message: string;
  readonly updatedMeal?: Meal;
  readonly suggestedItems?: MealItem[];
  readonly recipeUrl?: string | null;
}

export const geminiService = {
  /**
   * Modifica un plato o plato del menú según la petición del usuario.
   */
  async requestMealAdjustment(
    mealType: MealType,
    currentMeal: Meal,
    userPrompt: string
  ): Promise<AISwapResponse> {
    if (backendService.isConfigured()) {
      try {
        const res = await backendService.call({
          action: 'adjustMeal',
          mealType,
          userPrompt,
          currentMeal,
        });
        if (res.ok && (res.items || res.recipeName || res.message)) {
          return {
            message: res.message || '¡Cambio realizado con éxito por El Gordólogo!',
            updatedMeal: {
              ...currentMeal,
              recipeName: res.recipeName || currentMeal.recipeName,
              recipeUrl: res.recipeUrl || currentMeal.recipeUrl,
              items: res.items && Array.isArray(res.items) ? (res.items as MealItem[]) : currentMeal.items,
            },
          };
        }
        if (res.error && res.error !== 'NO_GEMINI_KEY') {
          const offline = this.fallbackAdjustment(mealType, currentMeal, userPrompt);
          return {
            ...offline,
            message: `⚠️ Gemini no respondió (${String(res.error).slice(0, 80)}). Usé el motor del hospital: ${offline.message}`,
          };
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const offline = this.fallbackAdjustment(mealType, currentMeal, userPrompt);
        return {
          ...offline,
          message: `⚠️ Gemini no respondió (${msg.slice(0, 80)}). Usé el motor del hospital: ${offline.message}`,
        };
      }
    }

    return this.fallbackAdjustment(mealType, currentMeal, userPrompt);
  },

  /**
   * Responde preguntas generales de nutrición (chat del Gordólogo).
   */
  async askNutritionQuestion(question: string): Promise<string> {
    if (backendService.isConfigured()) {
      try {
        const res = await backendService.call({ action: 'ask', question });
        if (res.ok && res.text) return res.text;
        if (res.error && res.error !== 'NO_GEMINI_KEY') {
          return `⚠️ No pude hablar con Gemini (${String(res.error).slice(0, 100)}).\n\n${this.fallbackNutritionAnswer(question)}`;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return `⚠️ No pude hablar con Gemini (${msg.slice(0, 100)}).\n\n${this.fallbackNutritionAnswer(question)}`;
      }
    }
    return this.fallbackNutritionAnswer(question);
  },

  fallbackNutritionAnswer(question: string): string {
    const q = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (/whisky|whiskey|ron|ginebra|vodka|copa|combinado|cuba libre|calimocho|cerveza|alcohol|vino|licor|chupito/.test(q)) {
      return 'En esta pauta el alcohol no entra: ni whisky, ni vino, ni cerveza (tampoco la 0,0). Un whisky-cola son unas 200 kcal vacías. Mejor agua con gas y limón, o una infusión.';
    }
    if (/caloria|kcal|cuantas|cuantos/.test(q) && /coca|refresco|boll|pan|chocolate|helado/.test(q)) {
      return '📊 Orientativo: refresco de cola ~140 kcal/lata; croissant ~230; onza de chocolate ~70. Evita calorías vacías y céntrate en el menú. Antojo → yogur 0% o fruta del grupo correcto.';
    }
    if (/fruta|racion/.test(q)) {
      return '🍎 Ración de fruta: A=300g (melón/sandía), B=200g (naranja/manzana), C=160g (plátano/uvas), D=100g (higos). Comida/cena: 1 fruta o 2 yogures 0%.';
    }
    if (/antojo|dulce|chocolate|azucar|miel|fructosa/.test(q)) {
      return '🍫 Azúcar, fructosa y miel fuera. Antojo: yogur desnatado, fruta del grupo correcto o infusión. La recena ayuda a no picotear de noche.';
    }
    if (/agua|beber|hidrat/.test(q)) {
      return '💧 Al menos 1,5 L de agua al día. Lleva botella y bebe entre tomas.';
    }
    if (/aceite|oliva/.test(q)) {
      return '🫒 AOVE: 1,5 cdas en comida y 1 cda en cena. Aliña o plancha/horno; evita freír.';
    }
    if (/pan|biscote/.test(q)) {
      return '🍞 Pan integral: ~20 g (o 2 biscotes) en la mayoría de tomas.';
    }
    if (/peso|bajar|adelgaz|estanc/.test(q)) {
      return '⚖️ Pésate el mismo día en ayunas. Si hay estancamiento: revisa aceite, pan, día libre y agua. En Seguimiento tienes el parte semanal del Gordólogo.';
    }
    return '📋 Puedo hablar de calorías, fruta, antojos, agua, aceite o peso. Para cambiar un plato usa “Ajustar” en el menú.';
  },

  /**
   * Motor de sustitución y ajuste nutricional local basado en las reglas del Morales Meseguer.
   */
  fallbackAdjustment(
    mealType: MealType,
    currentMeal: Meal,
    userPrompt: string
  ): AISwapResponse {
    const prompt = userPrompt.toLowerCase().trim();

    // === 1. DESAYUNOS ===
    if (mealType === 'breakfast') {
      if (prompt.includes('yogur') || prompt.includes('lacteo') || prompt.includes('lácteo')) {
        return {
          message: '¡Marchando! Desayuno cambiado a yogures desnatados con fruta y tostada integral según el Morales Meseguer. 🥣',
          updatedMeal: {
            ...currentMeal,
            recipeName: null,
            recipeUrl: null,
            items: [
              { name: 'Yogur desnatado natural sin azúcar', quantity: '2 unidades (250g)', notes: null },
              { name: 'Fruta fresca de temporada (kiwi, naranja o fresas)', quantity: '150 g', notes: null },
              { name: 'Pan integral tostado', quantity: '20 g', notes: null },
            ],
            totalCalories: 250,
          },
        };
      }
      if (prompt.includes('queso') || prompt.includes('burgos')) {
        return {
          message: '¡Listo! Desayuno con queso fresco de Burgos desnatado, fruta y pan integral. 🧀',
          updatedMeal: {
            ...currentMeal,
            recipeName: null,
            recipeUrl: null,
            items: [
              { name: 'Queso fresco de Burgos desnatado (0% m.g.)', quantity: '35 g', notes: null },
              { name: 'Pan integral tostado', quantity: '20 g', notes: null },
              { name: 'Fruta fresca de temporada', quantity: '150 g', notes: null },
              { name: 'Café o infusión sin azúcar', quantity: '1 taza', notes: null },
            ],
            totalCalories: 230,
          },
        };
      }
      // Por defecto desayuno con tostada, aceite y café con leche
      return {
        message: '¡Ajustado! Desayuno clásico hospitalario: leche desnatada, tostada con aceite de oliva virgen y fruta fresca. 🌅',
        updatedMeal: {
          ...currentMeal,
          recipeName: null,
          recipeUrl: null,
          items: [
            { name: 'Leche desnatada (con café o infusión sin azúcar)', quantity: '200 ml', notes: null },
            { name: 'Pan integral tostado con ½ cda de aceite de oliva (5g)', quantity: '20 g pan + 5g aceite', notes: null },
            { name: 'Fruta fresca de temporada', quantity: '150 g', notes: null },
          ],
          totalCalories: 260,
        },
      };
    }

    // === 2. MEDIA MAÑANA / MERIENDA ===
    if (mealType === 'midMorning' || mealType === 'snack') {
      const isMerienda = mealType === 'snack';
      const label = isMerienda ? 'merienda' : 'media mañana';

      if (prompt.includes('yogur') || prompt.includes('kefir') || prompt.includes('kéfir')) {
        return {
          message: `¡Listo! Tu ${label} consistirá en un yogur desnatado sin azúcar saciante. 🥣`,
          updatedMeal: {
            ...currentMeal,
            recipeName: null,
            recipeUrl: null,
            items: [{ name: 'Yogur desnatado natural sin azúcar (o kéfir 0%)', quantity: '1 unidad (125g)', notes: null }],
            totalCalories: 55,
          },
        };
      }
      if (prompt.includes('nuez') || prompt.includes('nueces') || prompt.includes('frutos secos')) {
        return {
          message: `¡Perfecto! Hemos añadido frutos secos crudos con infusión para tu ${label}. 🥜`,
          updatedMeal: {
            ...currentMeal,
            recipeName: null,
            recipeUrl: null,
            items: [
              { name: 'Nueces peladas naturales (sin sal)', quantity: '2 unidades (10-15g)', notes: null },
              { name: 'Infusión o té sin azúcar', quantity: '1 taza', notes: null },
            ],
            totalCalories: 85,
          },
        };
      }
      // Fruta por defecto
      return {
        message: `¡Marchando! Pieza de fruta fresca de temporada para tu ${label}. 🍎`,
        updatedMeal: {
          ...currentMeal,
          recipeName: null,
          recipeUrl: null,
          items: [{ name: 'Fruta fresca de temporada (manzana, pera, naranja o mandarina)', quantity: '150 g', notes: null }],
          totalCalories: 75,
        },
      };
    }

    // === 3. RECENA (ANTES DE DORMIR) ===
    if (mealType === 'recena') {
      if (prompt.includes('leche')) {
        return {
          message: '¡Anotado! Medio vaso de leche desnatada tibia antes de dormir. 🥛',
          updatedMeal: {
            ...currentMeal,
            recipeName: null,
            recipeUrl: null,
            items: [{ name: 'Leche desnatada tibia', quantity: '100 ml (½ vaso)', notes: null }],
            totalCalories: 45,
          },
        };
      }
      return {
        message: '¡Listo! Yogur desnatado antes de dormir para evitar hipoglucemias nocturnas. 🛏️',
        updatedMeal: {
          ...currentMeal,
          recipeName: null,
          recipeUrl: null,
          items: [{ name: 'Yogur desnatado sin azúcar', quantity: '1 unidad (125g)', notes: null }],
          totalCalories: 50,
        },
      };
    }

    // === 4. COMIDAS Y CENAS (LUNCH & DINNER) ===
    const isLunch = mealType === 'lunch';
    const oilLabel = isLunch ? '1,5 cucharadas soperas (15g)' : '1 cucharada sopera (10g)';
    const postreStandard = { name: 'Postre: Fruta fresca (150g) ó 2 yogures desnatados', quantity: '1 ración', notes: null };

    // 4.1 Pollo / Pavo / Carne magra / Ternera
    if (prompt.includes('pollo') || prompt.includes('pavo') || prompt.includes('carne') || prompt.includes('ternera') || prompt.includes('conejo')) {
      const isCarneRoja = prompt.includes('ternera') || prompt.includes('carne roja');
      const name = isCarneRoja ? 'Filete de ternera magra a la plancha' : 'Pechuga de pollo o pavo a la plancha';
      const recipeName = isCarneRoja ? 'Filete de Ternera con Verduras' : 'Pechuga de Pollo con Verduras';
      return {
        message: `¡Oído cocina! Hemos cambiado el plato por ${name} (100g en crudo sin grasa), según el protocolo del Morales Meseguer. 🍗`,
        updatedMeal: {
          ...currentMeal,
          recipeName,
          recipeUrl: buildCookidooSearchUrl(recipeName),
          items: [
            { name, quantity: '100 g', notes: 'Carne magra en crudo sin grasa' },
            { name: 'Guarnición de verduras al vapor o a la plancha', quantity: isLunch ? '250 g' : '300 g', notes: null },
            { name: 'Patata cocida o al vapor', quantity: '100 g', notes: null },
            { name: 'Pan integral', quantity: '20 g', notes: null },
            { name: 'Aceite de oliva virgen extra', quantity: oilLabel, notes: null },
            postreStandard,
          ],
          totalCalories: isLunch ? 540 : 440,
        },
      };
    }

    // 4.2 Pescado blanco / Merluza / Dorada / Lubina / Sepia / Salmón
    if (prompt.includes('pescado') || prompt.includes('merluza') || prompt.includes('dorada') || prompt.includes('lubina') || prompt.includes('sepia') || prompt.includes('calamar') || prompt.includes('salmón') || prompt.includes('salmon')) {
      const isAzul = prompt.includes('salmón') || prompt.includes('salmon') || prompt.includes('atun') || prompt.includes('atún');
      const name = isAzul ? 'Salmón fresco a la plancha' : 'Merluza o dorada a la plancha / vapor';
      const qty = isAzul ? '100 g' : '150 g';
      const recipeName = isAzul ? 'Salmón a la Plancha con Verduras' : 'Merluza al Vapor con Patatas';
      return {
        message: `¡Hecho! Hemos cambiado el plato por ${name} (${qty}), según el protocolo hospitalario. 🐟`,
        updatedMeal: {
          ...currentMeal,
          recipeName,
          recipeUrl: buildCookidooSearchUrl(recipeName),
          items: [
            { name, quantity: qty, notes: 'Pesado en crudo' },
            { name: 'Patatas cocidas al vapor o ensalada fresca', quantity: '100 g patata o 200 g ensalada', notes: null },
            { name: 'Verduras cocidas o salteadas', quantity: '200 g', notes: null },
            { name: 'Pan integral', quantity: '20 g', notes: null },
            { name: 'Aceite de oliva virgen extra', quantity: oilLabel, notes: null },
            postreStandard,
          ],
          totalCalories: isLunch ? 520 : 430,
        },
      };
    }

    // 4.3 Tortilla francesa / Huevos
    if (prompt.includes('huevo') || prompt.includes('tortilla') || prompt.includes('revuelto')) {
      const recipeName = 'Tortilla Francesa con Ensalada Completa';
      return {
        message: '¡Marchando! Tortilla francesa con ensalada variada de la huerta, manteniendo la proteína pautada. 🍳',
        updatedMeal: {
          ...currentMeal,
          recipeName,
          recipeUrl: buildCookidooSearchUrl(recipeName),
          items: [
            { name: 'Tortilla francesa (1 huevo entero ó 1 yema + 2 claras)', quantity: '1 huevo + 1 clara', notes: null },
            { name: 'Ensalada mixta (lechuga 150g, tomate 150g, pepino)', quantity: '300 g', notes: null },
            { name: 'Pan integral', quantity: '20 g', notes: null },
            { name: 'Aceite de oliva virgen extra', quantity: oilLabel, notes: null },
            postreStandard,
          ],
          totalCalories: isLunch ? 500 : 420,
        },
      };
    }

    // 4.4 Ensalada Murciana (permitida en comida o cena)
    if (prompt.includes('murciana') || prompt.includes('ensalada murciana')) {
      const recipeName = 'Ensalada Murciana Tradicional';
      return {
        message: '¡Platazo de la tierra! Ajustado a Ensalada Murciana con las proporciones clínicas completas del hospital. 🥗',
        updatedMeal: {
          ...currentMeal,
          recipeName,
          recipeUrl: buildCookidooSearchUrl(recipeName),
          items: [
            { name: 'Patatas cocidas', quantity: '200 g', notes: null },
            { name: 'Tomate natural en conserva o picado', quantity: '200 g (1 bote pequeño)', notes: null },
            { name: 'Huevo duro', quantity: '1 unidad', notes: null },
            { name: 'Atún al natural escurrido', quantity: '1 lata (60g)', notes: null },
            { name: 'Cebolla picada', quantity: '¼ unidad (40g)', notes: null },
            { name: 'Aceitunas', quantity: '3 unidades', notes: null },
            { name: 'Pan integral', quantity: '20 g', notes: null },
            { name: 'Aceite de oliva virgen extra', quantity: oilLabel, notes: null },
            postreStandard,
          ],
          totalCalories: 530,
        },
      };
    }

    // 4.5 Verduras / Crema / Puré / Hervido
    if (prompt.includes('verdura') || prompt.includes('crema') || prompt.includes('pure') || prompt.includes('puré') || prompt.includes('hervido') || prompt.includes('calabacín') || prompt.includes('calabacin')) {
      const isCrema = prompt.includes('crema') || prompt.includes('pure') || prompt.includes('puré');
      const recipeName = isCrema ? 'Crema Suave de Calabacín con Pescado' : 'Hervido de Judías Verdes con Pescado Blanco';
      return {
        message: `¡Cambiado! Te hemos asignado ${recipeName}, ligero, reconfortante y muy saciante. 🥦`,
        updatedMeal: {
          ...currentMeal,
          recipeName,
          recipeUrl: buildCookidooSearchUrl(recipeName),
          items: [
            { name: isCrema ? 'Crema de calabacín (calabacín 250g, patata 100g, cebolla, quesito 0%)' : 'Hervido de judías verdes y patata (100g patata + 200g verdura)', quantity: '300 g', notes: null },
            { name: 'Pescado blanco al vapor o plancha (merluza o pescadilla)', quantity: '150 g', notes: null },
            { name: 'Pan integral', quantity: '20 g', notes: null },
            { name: 'Aceite de oliva virgen extra', quantity: oilLabel, notes: null },
            postreStandard,
          ],
          totalCalories: 430,
        },
      };
    }

    // 4.6 Arroz / Pasta / Legumbres (solo para comida o cena ligera de pasta/arroz)
    if (prompt.includes('arroz') || prompt.includes('pasta') || prompt.includes('lentejas') || prompt.includes('garbanzos') || prompt.includes('alubias')) {
      const platoName = prompt.includes('lentejas')
        ? 'Lentejas Caseras Estofadas'
        : prompt.includes('arroz')
        ? 'Arroz con Marisco y Verduras'
        : prompt.includes('garbanzos') || prompt.includes('alubias')
        ? 'Ensalada de Alubias con Hortalizas'
        : 'Ensalada de Pasta con Atún al Natural';

      const hidratoQty = isLunch ? '60 g en crudo' : '45 g en crudo';

      return {
        message: `¡Ajustado! Cambiado a ${platoName} con los hidratos medidos en crudo (${hidratoQty}) según el Morales Meseguer. 🍲`,
        updatedMeal: {
          ...currentMeal,
          recipeName: platoName,
          recipeUrl: buildCookidooSearchUrl(platoName),
          items: [
            { name: platoName, quantity: `${hidratoQty} (plato hondo medido)`, notes: null },
            { name: 'Ensalada verde o tomate aliñado', quantity: '150 g', notes: null },
            { name: 'Pan integral', quantity: '20 g', notes: null },
            { name: 'Aceite de oliva virgen extra', quantity: oilLabel, notes: null },
            postreStandard,
          ],
          totalCalories: isLunch ? 550 : 450,
        },
      };
    }

    // 4.7 Extra de saciedad
    if (prompt.includes('hambre') || prompt.includes('proteina') || prompt.includes('proteína') || prompt.includes('saciedad') || prompt.includes('poco')) {
      const currentItems = [...currentMeal.items];
      currentItems.push({
        name: 'Clara de huevo cocida extra o 35g queso fresco 0%',
        quantity: '1 clara (30g) ó 35g queso',
        notes: 'Refuerzo de proteína pura sin grasa',
      });
      return {
        message: '¡Extra de saciedad activado! Reforzamos con proteína magra sin añadir grasa ni calorías vacías. 💪',
        updatedMeal: {
          ...currentMeal,
          items: currentItems,
        },
      };
    }

    // 4.8 Personalización libre dentro de comida/cena
    const kcal = 1500;
    const customTitle = userPrompt.length < 40 ? userPrompt.charAt(0).toUpperCase() + userPrompt.slice(1) : `Plato Adaptado ${kcal} kcal`;
    return {
      message: `¡Anotado por El Gordólogo! Hemos adaptado "${customTitle}" a las 1.500 kcal de tu protocolo. ✨`,
      updatedMeal: {
        ...currentMeal,
        recipeName: customTitle,
        recipeUrl: buildCookidooSearchUrl(customTitle),
        items: [
          { name: customTitle, quantity: '150 g proteína o 200 g verdura', notes: null },
          { name: 'Guarnición de ensalada fresca o verduras al vapor', quantity: '150 g', notes: null },
          { name: 'Pan integral', quantity: '20 g', notes: null },
          { name: 'Aceite de oliva virgen extra', quantity: oilLabel, notes: null },
          postreStandard,
        ],
        totalCalories: isLunch ? 530 : 440,
      },
    };
  },
};
