# Manual Técnico: RESGER CRM

Este documento describe la arquitectura, las decisiones de diseño, la estructura de la base de datos y los flujos de trabajo principales de **RESGER CRM**, un sistema integral de Punto de Venta (POS) y gestión de clientes multi-empresa (Multi-Tenant).

---

## 1. Sistema de Diseño (Design System)

La aplicación utiliza un enfoque moderno y limpio inspirado en tendencias "Glassmorphism" y corporativas de alta densidad. Se gestiona mediante variables CSS globales y Tailwind CSS v4.

### Paleta de Colores
- **Surface (Fondo Principal):** `#f9f9ff` - Un blanco/gris muy tenue para reducir la fatiga visual.
- **Brand Navy (Primario Oscuro):** `#001A41` - Azul marino profundo utilizado en el menú lateral y tarjetas de alto impacto.
- **Brand Primary (Acento Principal):** `#0052FF` - Azul vibrante para acciones principales y botones.
- **Brand Secondary (Acento Secundario):** `#00E6A4` - Verde tipo "Teal" utilizado para indicadores de éxito y estados positivos.
- **Brand Tertiary:** `#00A3FF` - Azul claro (Cyan) utilizado en gradientes para aportar dinamismo visual.

**Gradiente Principal:** Los botones primarios (como "Nueva Venta" o "Añadir Cliente") utilizan una transición de `brand-primary` a `brand-tertiary` (`bg-gradient-to-r from-brand-primary to-brand-tertiary`).

### Tipografía
Se definieron tres fuentes para propósitos específicos, mejorando la jerarquía visual:
1. **Hanken Grotesk (`font-display`):** Utilizada en títulos, encabezados grandes y branding. Aporta un carácter moderno y corporativo.
2. **Inter (`font-sans`):** Utilizada para textos de cuerpo, botones y UI general debido a su excelente legibilidad en pantallas digitales.
3. **JetBrains Mono (`font-mono`):** Utilizada estrictamente para **datos financieros**, precios, códigos de inventario (SKUs) y cantidades. Al ser monoespaciada, alinea perfectamente las cifras en tablas y facturas.

---

## 2. Arquitectura de Software

El sistema sigue una arquitectura _Client-Server_ donde el cliente es una SPA (Single Page Application) y el servidor es administrado por Supabase (BaaS).

### Frontend (Capa de Presentación)
- **Framework:** React 18 + TypeScript.
- **Build Tool:** Vite (rápido y optimizado).
- **Estilos:** Tailwind CSS v4, que permite definir tokens de diseño mediante directivas `@theme` en `index.css`.
- **Iconografía:** `lucide-react`.
- **Animaciones:** `motion/react` (Framer Motion) para transiciones fluidas de modales y tarjetas.
- **Generación de PDFs:** `jspdf` y `jspdf-autotable` para generar reportes y facturas del lado del cliente.
- **Estado Global:** Context API (`CompanyContext.tsx`) para gestionar el inquilino (tenant) activo y los roles del usuario.

### Backend (Capa de Datos y Lógica)
- **Plataforma:** Supabase.
- **Base de Datos:** PostgreSQL.
- **Autenticación:** Supabase Auth (Email/Contraseña).
- **Seguridad (RLS):** Row Level Security policies en Postgres para asegurar el aislamiento de datos (Multi-Tenant). Los usuarios solo pueden ver datos de la `company_id` a la que pertenecen.

---

## 3. Esquema de Base de Datos (Backend)

La base de datos está diseñada para ser **Multi-Empresa**. Todas las tablas transaccionales tienen una clave foránea `company_id`.

- **`empresas`**: Almacena los tenants (id, nombre, rut).
- **`profiles`**: Extiende la autenticación de Supabase con datos del usuario (full_name, email).
- **`company_members`**: Tabla pivote que une usuarios con empresas y define su nivel de acceso (`role`: admin, user).
- **`clientes`**: Base de datos de clientes por empresa (nombre, email, teléfono, dirección).
- **`productos`**: Catálogo de inventario (nombre, descripcion, precio, stock, imagen_url).
- **`ventas`**: Registro maestro de cada transacción de POS (total, user_id, cliente_id, notas, modalidad manual/registrado).
- **`venta_items`**: Detalle uno-a-muchos de productos vendidos en una venta (cantidad, precio_unitario).
- **`cierres_caja`**: Historial de auditorías financieras generadas al final de un turno o jornada (total_ventas, conteo_ventas, periodo_inicio, periodo_fin, notas).

---

## 4. Flujos de Trabajo Principales (Workflows)

### 4.1. Autenticación y Selección de Empresa
1. El usuario inicia sesión (`Auth.tsx`).
2. El sistema consulta `company_members`.
3. Si no tiene empresa, se le obliga a **crear una** (`App.tsx`).
4. Si tiene varias, selecciona la empresa activa.
5. El `CompanyContext` almacena la empresa elegida y el rol del usuario, proveyendo esta información a toda la aplicación.

### 4.2. Flujo de Nueva Venta (POS)
Implementado en `NewSale.tsx`, es un proceso dividido en pasos visuales claros:
1. **Cliente:** Buscar un cliente existente (con autocompletado) o activar el "Modo Cliente No Registrado" para ventas rápidas o al paso.
2. **Productos:** Búsqueda en tiempo real. Al hacer clic en un producto (tarjetas visuales), se añade al "Carrito". Se puede modificar la cantidad o eliminar ítems.
3. **Pago:** Selección del método (Tarjeta, Efectivo, Transferencia).
4. **Checkout:** Se calcula Subtotal e IVA (19%). Al confirmar, se hace una transacción en base de datos:
   - Se crea el registro en `ventas`.
   - Se crean los ítems en `venta_items`.
   - **Se descuenta el stock** en `productos`.
5. **Recibo:** Se abre un modal de éxito presentando la "Factura Proforma" con opción de descarga PDF usando `jsPDF`.

### 4.3. Flujo de Cierre de Caja
Implementado en `SalesHistory.tsx`, vital para cuadrar la caja.
1. El usuario solicita un "Cierre de Caja".
2. El sistema busca la fecha/hora del **último cierre** (`periodo_fin` previo).
3. Suma todas las ventas realizadas desde ese instante hasta **ahora**.
4. Al confirmar, se inserta un registro en `cierres_caja` dejando constancia de la fecha, monto y responsable.
5. Inmediatamente se genera y descarga un **Reporte PDF** detallando todas las ventas por vendedor en ese rango de tiempo.

### 4.4. Gestión de Usuarios y Permisos
- El Administrador (creador de la empresa) puede ir a "Configuración > Gestión de Equipo" (`UserManagement.tsx`).
- Puede buscar usuarios registrados por correo y agregarlos a su empresa.
- Asigna roles: `admin` (acceso a configuración y cierres globales) o `user` (solo vende y ve su propio historial).
