# Manual Técnico: RESGER CRM

Este documento describe la arquitectura, las decisiones de diseño, la estructura de la base de datos y los módulos de trabajo principales de **RESGER CRM**, un sistema integral de Punto de Venta (POS) y gestión de clientes multi-empresa (Multi-Tenant).

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
- **`company_members`**: Tabla pivote que une usuarios con empresas y define su nivel de acceso (`role`: admin, employee).
- **`company_invitations`**: Administra las invitaciones pendientes para que nuevos usuarios se unan a una empresa.
- **`clientes`**: Base de datos de clientes por empresa (nombre, email, teléfono, dirección).
- **`productos`**: Catálogo de inventario (nombre, descripcion, precio, stock, imagen_url).
- **`ventas`**: Registro maestro de cada transacción de POS (total, user_id, cliente_id, manual_name).
- **`venta_items`**: Detalle uno-a-muchos de productos vendidos en una venta (cantidad, precio_unitario).
- **`cierres_caja`**: Historial de auditorías financieras generadas al final de un turno o jornada.

---

## 4. Módulos y Funcionalidades Principales

### 4.1. Dashboard y Analítica (`Dashboard.tsx`)
- **Métricas KPIs:** Interfaz que muestra en tiempo real las Ventas Totales, Clientes Nuevos, Conversión y Alertas de Stock crítico (productos con pocas unidades).
- **Rendimiento de Equipo:** Calcula el volumen de ventas por cada usuario (vendedor), identificando el rendimiento comercial.
- **Actividad Reciente:** Historial rápido de las últimas transacciones, mostrando el cliente, responsable, fecha y total.

### 4.2. Autenticación y Selección de Empresa (`Auth.tsx`, `App.tsx`)
1. El usuario inicia sesión.
2. El sistema consulta `company_members`. Si no tiene empresa asignada, se requiere la creación de un nuevo *Tenant*.
3. El `CompanyContext` distribuye globalmente la información de la empresa activa y el rol del usuario, inyectando la seguridad base para las consultas a Supabase.

### 4.3. Flujo de Nueva Venta - POS (`NewSale.tsx`)
- **Selección de Cliente Flexible:** Permite asociar la venta a un cliente en base de datos, o usar la opción "Cliente No Registrado" (Invitado) para ventas ágiles sin persistir información de contacto innecesaria.
- **Carrito Interactivo:** Interfaz visual con catálogo de productos que actualiza dinámicamente los subtotales, totales e IVA al ajustar cantidades.
- **Checkout Transaccional:** 
  - Registra datos en las tablas `ventas` y `venta_items`.
  - **Descuenta automáticamente el stock** del catálogo.
- **Generación de Recibos:** Creación de facturas proforma en formato PDF listas para descarga mediante `jsPDF`.

### 4.4. Catálogo y Gestión de Clientes (`Products.tsx`, `Clients.tsx`)
- **Inventario Inteligente:** CRUD completo de productos con indicadores visuales de color (Ámbar/Rojo) basados en la lógica de stock bajo o stock en cero.
- **Validación de Clientes:** CRUD de clientes que incorpora validaciones de unicidad (no duplicados) basadas en el correo electrónico por empresa.

### 4.5. Historial de Ventas y Cierre de Caja (`SalesHistory.tsx`)
- **Trazabilidad:** Consulta del historial completo con un modal de detalle (desglose por ítem).
- **Cierre de Turnos:** Algoritmo de consolidación de caja. Calcula las ventas realizadas desde el `periodo_fin` del último cierre hasta la fecha actual, inserta el registro y genera el **Reporte en PDF** con el balance para el control de contabilidad.

### 4.6. Gestión de Equipo (`UserManagement.tsx`)
- Panel de administradores para buscar correos electrónicos y enviar invitaciones a la plataforma.
- Visualización de tabla de miembros activos, control de permisos de roles (Administrador vs Empleado) y capacidad de remoción de accesos al tenant.

### 4.7. Configuración, Perfil e Impuestos (`Settings.tsx`)
- **Gestión de Identidad:** Actualización del perfil de Supabase (Nombre, visualización de correos, estado y rol).
- **Internacionalización de Impuestos (Taxes):** Configuración localizada almacenada vía `localStorage` (`resger_country`, `resger_iva_rate`) para aplicar la tasa impositiva correspondiente por país (ej. Colombia 19%, México 16%, España 21%) directamente en el módulo de ventas.
- **Hub de Soporte:** Acceso a canales directos de soporte técnico (WhatsApp, Correo) del equipo de desarrollo (SoftBootDev).
