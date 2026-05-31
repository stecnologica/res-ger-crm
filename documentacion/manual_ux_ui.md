# Manual de Diseño y UX: RESGER CRM

Este documento establece las normativas de **Experiencia de Usuario (UX)** y **Diseño de Interfaz (UI)** para RESGER CRM. Se enfoca en cómo la aplicación debe comportarse ante el usuario, especialmente en estados de carga, interacciones y prevención de errores.

---

## 1. Estados de Carga y Transiciones (Loading States)

La percepción de velocidad es crucial en un punto de venta. Para evitar que el usuario piense que la aplicación se "congeló", se deben seguir estas reglas:

### 1.1. Cargas Globales (Full Page Load)
Se utiliza un "Spinner" o círculo giratorio minimalista en el centro de la pantalla.
- **Color:** Utiliza siempre el borde de color primario de la marca (`border-brand-primary`).
- **Contexto:** Se usa al iniciar la app (`App.tsx`) mientras se verifica el token de sesión o se cargan los datos de la empresa.
- **Fondo:** El fondo de la pantalla de carga debe ser idéntico al fondo final (`bg-surface`) para evitar saltos visuales bruscos (flickering).

### 1.2. Cargas Contextuales (Botones y Tablas)
Nunca se debe bloquear toda la pantalla por una acción menor.
- **En Tablas de Datos:** Si se están buscando productos o clientes, se muestra un spinner centrado solo en el contenedor de la tabla, manteniendo visible la cabecera, filtros y barra lateral.
- **En Botones de Acción:** Cuando el usuario hace clic en "Guardar", "Finalizar Venta" o "Crear Empresa", el texto del botón se reemplaza (o acompaña) por un icono de carga giratorio (`<Loader2 className="animate-spin" />`).
- **Bloqueo Preventivo:** Durante la carga, el botón debe aplicar la clase `disabled:opacity-50 disabled:cursor-not-allowed` para prevenir dobles envíos accidentales.

---

## 2. Microinteracciones y Respuesta Visual (Feedback)

Las microinteracciones le confirman al usuario que el sistema ha detectado su acción.

### 2.1. Estados Hover (Pasar el ratón)
- **Tarjetas y Botones:** Deben elevarse ligeramente (ej. `-translate-y-[2px]`) y/o aumentar su sombra (`hover:shadow-lg`) para invitar al clic.
- **Filas de Tabla (`tr`):** Al pasar sobre un registro (cliente o producto), el fondo debe cambiar sutilmente (ej. `hover:bg-slate-50`) para ayudar al ojo a seguir los datos horizontalmente.

### 2.2. Botones de Acción (Call to Action)
- **Primary:** Tienen fondo degradado vibrante (Primary a Tertiary).
- **Secondary:** Fondo blanco con texto del color Navy (`#001A41`) y bordes grises.
- **Destructivos:** Los botones de eliminar usan el color `rose-500` (Rojo), pero usualmente solo al hacer `hover` (sobre el icono) para no saturar la vista si hay muchos.
- **Efecto Active:** Al hacer clic (`active:`), los botones importantes deben escalar hacia abajo (`active:scale-95`) para dar una sensación de botón físico siendo presionado.

### 2.3. Transiciones Generales
- Las vistas nuevas, modales y tarjetas utilizan la librería `Framer Motion` (`motion.div`) para aparecer suavemente, deslizando ligeramente desde abajo o la izquierda (`opacity: 0, y: 20` a `opacity: 1, y: 0`). Esto suaviza el estrés cognitivo.

---

## 3. Prevención y Recuperación de Errores

El sistema debe guiar al usuario a no cometer errores en un entorno rápido como un POS.

### 3.1. Alertas de Inventario
- **Visualización Proactiva:** Los productos no se limitan a "Con stock" o "Sin stock". Se emplea un sistema de semáforo:
  - **Verde (`emerald`):** Más de 10 unidades.
  - **Naranja (`amber`):** Menos de 10 unidades ("Stock Bajo"). Se muestra un banner preventivo.
  - **Rojo (`rose`):** 0 unidades. Imposible agregar al carrito en una situación ideal.

### 3.2. Formularios de "Solo Lectura" en Modo Visualización
En modales como "Detalle de Venta", los datos se muestran claramente legibles pero sin opciones de edición (sin inputs) para proteger la integridad histórica de una factura ya procesada.

### 3.3. Doble Confirmación (Destructive Actions)
Al eliminar un cliente o producto, el sistema detiene el flujo con un `window.confirm` ("¿Estás seguro de que deseas eliminar esto?"). Esto previene clicks accidentales en la papelera, que podrían alterar reportes financieros pasados.

---

## 4. Jerarquía y Tipografía de Información

- **Números Críticos (Precios, IDs, Facturas):** Usan la tipografía `JetBrains Mono` (`font-mono`). Las fuentes monoespaciadas aseguran que los números estén alineados en columnas verticalmente, facilitando sumar mentalmente.
- **Nombres de Clientes y Títulos:** Usan `font-display` (Hanken Grotesk) con peso `font-black` para destacar instantáneamente en listados densos.
- **Fechas y Horas:** Se separan visualmente. La fecha suele estar en un color oscuro y la hora justo debajo, más pequeña, en color gris claro (`slate-400`).
