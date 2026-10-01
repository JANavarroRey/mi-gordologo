# 🍽️ Mi Gordólogo — Plan de Proyecto

## 📋 Resumen Ejecutivo

**Mi Gordólogo** es una aplicación web (Mobile First / PWA) de planificación nutricional personalizada con seguimiento antropométrico. Nace para ayudar a **María Ignacia** (68 años, Murcia) a seguir una dieta de **1.500 kcal** prescrita por el Hospital Morales Meseguer, pero se diseña como plataforma multiusuario reutilizable.

---

## 1. Contexto y Datos Clave

### 1.1 Perfil de la Paciente Principal

| Parámetro | 10/09/2026 | 22/09/2026 | Variación |
|-----------|-----------|-----------|-----------|
| **Peso** | 78,9 kg | 77,8 kg | **−1,1 kg** ✅ |
| **IMC** | 28,3 (Sobrepeso II) | 27,9 (Sobrepeso II) | −0,4 |
| **Masa Grasa** | 33,9 kg (43%) | 33,3 kg (42,8%) | −0,6 kg |
| **Masa Libre Grasa** | 45 kg (57%) | 44,5 kg (57,2%) | −0,5 kg |
| **Masa Muscular** | 25,5 kg | 25,2 kg | −0,3 kg |
| **Agua Corporal** | 31,5 kg (39,9%) | 31,1 kg (40%) | −0,4 kg |
| **Grasa Visceral** | 11 (Bajo) | 11 (Bajo) | = |
| **Edad Metabólica** | 77 años | 77 años | = |
| **Metabolismo Basal** | 1.377 kcal | 1.362 kcal | −15 kcal |

> [!IMPORTANT]
> **Estado fisiológico: Obesidad**. Masa Grasa en 42-43% (rango saludable: 23-35%). Agua corporal baja (39-40% vs 45-60% de referencia). Edad metabólica 9 años por encima de la real.

### 1.2 Dieta Prescrita

- **Hospital Morales Meseguer** — Dieta de **1.500 kcal**
- **21 menús de comida** + **21 menús de cena** intercambiables
- **5 tomas diarias**: Desayuno, Media mañana, Comida, Merienda, Cena
- Estructura semanal: 2-3× legumbres, 1× arroz, 1× pasta, 1× patatas, 1× verdura
- Pautas estrictas de aceite (1-1,5 cucharadas/comida), pan integral (20-40g) y equivalencias de frutas/verduras/proteínas

### 1.3 Menús del "Nutricionista" Externo (referencia de formato)

- 4 semanas de menús con solo **Comida y Cena** (sin cantidades)
- Formato muy visual y simple → **referencia de UX para la app**
- Incluye pautas de desayuno, almuerzo y merienda genéricas
- Carece de gramajes, valores nutricionales y rigor profesional

---

## 2. Requisitos Funcionales

### 2.1 Gestión de Usuarios y Perfiles

| Feature | Descripción | Prioridad |
|---------|-------------|-----------|
| **Multiusuario** | Login por usuario con perfil independiente | P0 |
| **Perfil antropométrico** | Datos médicos (peso, IMC, grasa, músculo, agua, etc.) | P0 |
| **Porciones para 2** | Opción de calcular cantidades para 2 personas (madre + padre) | P1 |
| **Sincronización de menú** | Usuarios que conviven comparten menú pero tienen seguimiento independiente | P1 |
| **Roles implícitos** | Sin admin formal; cada usuario ve solo su perfil y menús compartidos | P2 |

### 2.2 Planificación Nutricional y Menús

| Feature | Descripción | Prioridad |
|---------|-------------|-----------|
| **Menú mensual** | Vista de 4 semanas completas, estructuradas por semana | P0 |
| **5 tomas diarias** | Desayuno, Almuerzo (media mañana), Comida, Merienda, Cena | P0 |
| **Día libre** | Configurable (por defecto: sábado) | P0 |
| **Generación con IA** | Menús generados respetando dieta 1.500 kcal + pautas del hospital | P0 |
| **Edición interactiva** | Chat/texto para pedir ajustes ("más proteína", "quita este ingrediente") | P0 |
| **Enlaces a recetas** | URL a Thermomix/Cookidoo preferente; web fiable si no hay Thermomix | P1 |
| **Lista de la compra** | Generada automáticamente desde el menú semanal, 100% editable | P0 |

### 2.3 Exportación y Compartición

| Feature | Descripción | Prioridad |
|---------|-------------|-----------|
| **Exportar PDF** | Menú semanal como PDF descargable | P0 |
| **Infografía visual** | Formato visual optimizado para compartir | P1 |
| **Compartir WhatsApp** | Link o imagen directa para WhatsApp | P1 |
| **Compartir Email** | Enviar menú por correo | P2 |

### 2.4 Panel de Seguimiento

| Feature | Descripción | Prioridad |
|---------|-------------|-----------|
| **Registro semanal** | Peso y métricas corporales autointroducidas | P0 |
| **Gráficas de evolución** | Peso, masa grasa, IMC en el tiempo | P0 |
| **Métricas del hospital** | Poder registrar todos los parámetros del estudio de composición corporal | P1 |
| **Recomendaciones IA** | Sugerencias basadas en la evolución (simulando nutricionista) | P2 |

### 2.5 Identidad Visual y UX

| Feature | Descripción | Prioridad |
|---------|-------------|-----------|
| **Mobile First** | 100% responsive, diseñada para smartphone | P0 |
| **Accesibilidad** | Tipografías claras, alto contraste, botones grandes (usuario de ~70 años) | P0 |
| **Tono de marca** | Humorístico, desenfadado, satírico pero sin resultar ofensivo | P0 |
| **Paleta cromática** | Salud + frescura + toque lúdico | P0 |
| **Logo/Isotipo** | Imagotipo de "Mi Gordólogo" + icono PWA | P1 |

---

## 3. Arquitectura Técnica Propuesta

### 3.1 Stack Tecnológico

```
┌─────────────────────────────────────────────┐
│                  FRONTEND                    │
│  React + TypeScript + Vite                   │
│  Tailwind CSS (design tokens semánticos)     │
│  PWA (Service Worker + manifest.json)        │
│  Chart.js / Recharts (gráficas)              │
│  html2canvas + jsPDF (export PDF)            │
└──────────────────┬──────────────────────────┘
                   │ API calls
┌──────────────────▼──────────────────────────┐
│               BACKEND / BaaS                 │
│  Firebase (Auth + Firestore + Hosting)       │
│  ó                                           │
│  Supabase (Auth + PostgreSQL + Storage)      │
│  ó                                           │
│  GitHub Pages + LocalStorage (MVP offline)   │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│                  IA                          │
│  Gemini API (generación de menús, chat,      │
│  recomendaciones nutricionales)              │
└─────────────────────────────────────────────┘
```

> [!TIP]
> **Recomendación**: Para un MVP gratuito y rápido, sugiero empezar con **React + Vite + Tailwind + Firebase (free tier)** + **Gemini API**. Firebase ofrece Auth, Firestore y Hosting gratuitos suficientes para este caso de uso.

### 3.2 Estructura de Datos (Firestore)

```
users/
  {userId}/
    profile: { name, age, height, targetCalories, ... }
    linkedMenuUserId: string | null  // sincronización de menú
    
    measurements/
      {date}/
        weight, bmi, fatMass, fatPercent, freeFatMass,
        leanMass, skeletalMuscle, totalWater, 
        boneMinerals, proteins, visceralFat,
        metabolicRate, metabolicAge, basalMetabolism

    menus/
      {yearMonth}/
        weeks: [
          {
            days: [
              {
                dayOfWeek, isFreeDay,
                meals: {
                  breakfast: { items, recipe?, recipeUrl? },
                  midMorning: { items },
                  lunch: { firstCourse, secondCourse, dessert, recipe?, recipeUrl? },
                  snack: { items },
                  dinner: { firstCourse, secondCourse, dessert, recipe?, recipeUrl? }
                }
              }
            ]
          }
        ]
        shoppingList: [{ item, quantity, unit, checked }]
```

### 3.3 Separación de Responsabilidades (SoC)

```
src/
├── domain/           # Lógica de negocio pura
│   ├── models/       # Tipos: User, Meal, Menu, Measurement
│   ├── services/     # MenuService, MeasurementService, NutritionCalculator
│   └── validators/   # Validación de datos médicos y nutricionales
├── data/             # Capa de datos
│   ├── repositories/ # FirestoreUserRepo, FirestoreMenuRepo
│   ├── adapters/     # GeminiAdapter (wrapper IA)
│   └── mappers/      # DTO ↔ Domain
├── ui/               # Capa de presentación (UI "tonta")
│   ├── components/   # Componentes atómicos reutilizables
│   ├── pages/        # Vistas/pantallas
│   ├── hooks/        # useMenu, useMeasurements, useAuth
│   └── theme/        # Design tokens, paleta, tipografía
└── shared/           # Utilidades transversales
    ├── constants/    
    └── types/        
```

---

## 4. Backlog del Producto (Epics → User Stories)

### 🏗️ FASE 0 — Fundación (Sprint 0)
- [ ] Scaffolding del proyecto (React + Vite + Tailwind + TypeScript)
- [ ] Sistema de diseño: design tokens (colores, tipografía, spacing)
- [ ] Propuesta de identidad visual y logo "Mi Gordólogo"
- [ ] Configuración PWA (manifest.json, service worker básico)
- [ ] Setup Firebase (proyecto, Auth, Firestore)

### 🍽️ FASE 1 — Menús y Dieta (Core MVP)
- [ ] **US-01**: Como usuario, quiero ver el menú semanal completo (5 tomas × 7 días) para saber qué comer
- [ ] **US-02**: Como usuario, quiero navegar entre las 4 semanas del mes
- [ ] **US-03**: Como usuario, quiero ver el detalle de cada comida (ingredientes, cantidades, preparación)
- [ ] **US-04**: Como usuario, quiero que el menú tenga un día libre configurable
- [ ] **US-05**: Como usuario, quiero poder editar un plato concreto del menú
- [ ] **US-06**: Como usuario, quiero pedir cambios al menú mediante texto/chat con IA
- [ ] **US-07**: Como usuario, quiero ver la receta con enlace a Thermomix/Cookidoo
- [ ] **US-08**: Como usuario, quiero ver la lista de la compra semanal generada automáticamente
- [ ] **US-09**: Como usuario, quiero poder editar (marcar/tachar/añadir) la lista de la compra

### 📊 FASE 2 — Seguimiento
- [ ] **US-10**: Como usuario, quiero registrar mi peso y medidas semanalmente
- [ ] **US-11**: Como usuario, quiero ver gráficas de mi evolución (peso, grasa, IMC)
- [ ] **US-12**: Como usuario, quiero registrar datos del estudio de composición corporal completo
- [ ] **US-13**: Como usuario, quiero recibir un resumen/feedback de cómo va mi progreso

### 👥 FASE 3 — Usuarios y Compartición
- [ ] **US-14**: Como usuario, quiero registrarme y hacer login
- [ ] **US-15**: Como usuario, quiero tener mi propio perfil con mis datos médicos
- [ ] **US-16**: Como usuario, quiero sincronizar mi menú con el de mi pareja (mismo menú, seguimiento independiente)
- [ ] **US-17**: Como usuario, quiero ajustar las porciones del menú para 1 o 2 personas

### 📤 FASE 4 — Exportación
- [ ] **US-18**: Como usuario, quiero descargar el menú semanal en PDF
- [ ] **US-19**: Como usuario, quiero compartir el menú por WhatsApp
- [ ] **US-20**: Como usuario, quiero compartir el menú por email

### 🤖 FASE 5 — IA Avanzada
- [ ] **US-21**: Como usuario, quiero que la IA genere menús nuevos respetando la dieta de 1.500 kcal
- [ ] **US-22**: Como usuario, quiero recibir recomendaciones nutricionales basadas en mi evolución
- [ ] **US-23**: Como usuario, quiero poder hacer preguntas sobre nutrición al asistente

---

## 5. Preguntas para Completar Requisitos

Antes de arrancar, necesito que me confirmes o aclares:

### Técnicas
1. **¿Tienes cuenta en Firebase o prefieres otro backend?** (Supabase, o incluso 100% client-side con LocalStorage para el MVP)
2. **¿Tienes API key de Gemini** o necesitas que configure la integración?
3. **¿El despliegue final será Firebase Hosting, GitHub Pages, u otro?**

### Funcionales
4. **Los menús iniciales** — ¿Quieres que pre-cargue los 21+21 menús del hospital como base de datos, y que la IA genere variaciones a partir de ahí?
5. **El padre** — ¿Solo come lo mismo que María Ignacia (×2 porciones) o necesita configuración propia (por ejemplo, más calorías)?
6. **Día libre** — ¿Significa "sin menú planificado" o "menú especial/libre"?
7. **Recetas Thermomix** — ¿Tienes cuenta en Cookidoo? ¿Las URLs serían a recetas públicas o privadas?

### Marca y Diseño
8. **¿Tienes alguna preferencia de colores o estilo visual**, o te fías de mi propuesta?
9. **¿El logo lo genero yo con IA**, o ya tienes algo en mente?

---

> [!NOTE]
> Este plan está diseñado para empezar a desarrollar por la **Fase 0 + Fase 1** (identidad visual + menús), que es el core de la app. Las fases son incrementales y cada una produce un entregable funcional.

**¿Respondemos las preguntas y arrancamos? 🚀**
