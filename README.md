# 📋 Manual Técnico — RES-GER CRM
**Versión:** 2.0 | **Actualizado:** 28 junio 2026  
**Stack:** React 18 + TypeScript + Vite + Supabase + TailwindCSS + Recharts

---

## 1. Descripción General

**RES-GER CRM** es un sistema de gestión comercial multi-empresa para negocios locales colombianos. Gestión de ventas (POS), inventario, clientes, colaboradores y analíticas de desempeño.

Soporta múltiples empresas por usuario y múltiples usuarios por empresa, con roles **Administrador** y **Empleado**.

---

## 2. Arquitectura

```
res-ger-crm/
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx       # Dashboard analítico 360° con filtros de período
│   │   ├── NewSale.tsx         # Punto de Venta (POS)
│   │   ├── Products.tsx        # Gestión de inventario
│   │   ├── SalesHistory.tsx    # Historial y generación de facturas PDF
│   │   ├── Clients.tsx         # CRM de clientes
│   │   ├── UserManagement.tsx  # Colaboradores, nómina y productividad
│   │   ├── Settings.tsx        # Configuración con pestaña Base de Datos
│   │   ├── Auth.tsx            # Login / Registro
│   │   ├── TopBar.tsx          # Barra superior, selector de empresa
│   │   └── Sidebar.tsx
│   ├── context/
│   │   └── CompanyContext.tsx  # Contexto global de empresa activa
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── formatCurrency.ts   # formatCOP() — pesos colombianos
│   │   └── initialData.ts      # Sectores y catálogos de demostración
│   └── App.tsx                 # Enrutador principal
```

---

## 3. Base de Datos — Supabase

### Tablas principales

| Tabla | Descripción |
|---|---|
| `profiles` | Perfil público del usuario |
| `companies` | Empresas (incluye campo `industry`) |
| `company_members` | Relación usuario-empresa con `role` y **`salario`** |
| `company_invitations` | Invitaciones pendientes |
| `productos` | Catálogo por empresa |
| `clientes` | Clientes por empresa |
| `ventas` | Cabecera de cada venta |
| `venta_items` | Líneas de detalle de cada venta |

### Columnas clave

```sql
-- company_members
salario NUMERIC(12,2) DEFAULT 0   -- Salario mensual del colaborador

-- companies
industry TEXT   -- cafeteria | ferreteria | restaurante | minimercado | papeleria

-- productos
stock_minimo INTEGER   -- Umbral de alerta de stock crítico
costo NUMERIC          -- Usado para calcular utilidad en el Dashboard
```

---

## 4. Módulos

### 4.1 Dashboard 360°
- **Filtros:** Día / Semana / Mes — recalcula todos los KPIs y gráficas dinámicamente.
- **KPIs:** Ventas, Transacciones, Utilidad Estimada, Alertas de Stock.
- **Gráficas:** LineChart de rendimiento + BarChart Top 5 productos.
- **Productividad del Equipo:** Rankings de vendedores reales del período desde `profiles`.
- **Listado de Productos Vendidos:** Tabla completa con scroll de todos los artículos vendidos.

### 4.2 Punto de Venta (POS)
- Carrito + búsqueda de productos + cliente manual o desde BD.
- Al confirmar: INSERT en `ventas` y `venta_items` + UPDATE de stock filtrando por `company_id`.

### 4.3 Historial de Ventas
- Filtros por fecha / cliente / vendedor.
- Generación de **PDF con formato COP** (punto de miles, sin decimales).
- Anulación de ventas con restauración de stock.

### 4.4 Colaboradores y Nómina
- **Tabla de nómina** con columna **Salario Mensual editable inline** (guardada en Supabase).
- **KPI Nómina Total** = suma de todos los salarios.
- **Ranking de Productividad** con barras de progreso porcentual.
- Invitar colaboradores por email; gestión de invitaciones pendientes.

### 4.5 Configuración
| Pestaña | Contenido |
|---|---|
| Perfil | Nombre empresa, país, IVA |
| Impuestos | Tasa de IVA por defecto |
| Soporte | Canal de ayuda |
| **Base de Datos** | Cargar catálogo de demostración por sector (solo admin) |

### 4.6 Sectores Comerciales (`lib/initialData.ts`)
`cafeteria` · `ferreteria` · `restaurante` · `minimercado` · `papeleria`  
Cada sector incluye 6–8 productos base con nombre, precio, costo, stock y categoría.

---

## 5. Flujo de Creación de Empresa

1. Nombre + selector de sector + checkbox "cargar productos demo".
2. INSERT en `companies` (con `industry`) → INSERT en `company_members` (como `admin`).
3. Si checkbox activo: INSERT masivo en `productos` del sector.

---

## 6. Sistema de Roles

| Rol | Permisos |
|---|---|
| `admin` | Todo: ventas, inventario, clientes, colaboradores, nómina, configuración |
| `employee` | Ventas, inventario, clientes (sin gestión de equipo ni nómina) |

---

## 7. Variables de Entorno

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## 8. Scripts

```bash
npm install    # Instalar dependencias
npm run dev    # Servidor local → http://localhost:5173
npm run build  # Build de producción
```

---

## 9. Changelog — 28 junio 2026

| Módulo | Cambio |
|---|---|
| **Dashboard** | Filtros Día/Semana/Mes — todos los KPIs y gráficas responden al filtro |
| **Dashboard** | Listado completo de productos vendidos en el período seleccionado |
| **Dashboard** | Productividad del Equipo con perfiles reales desde Supabase |
| **Colaboradores** | Columna "Salario Mensual" editable inline, persistida en `company_members.salario` |
| **Colaboradores** | KPI "Nómina Total" = suma de todos los salarios del equipo |
| **Configuración** | Nueva pestaña "Base de Datos" para cargar catálogo en empresa existente |
| **Empresa** | Selector de sector comercial + opción de productos demo al crear empresa |
| **POS** | Fix: descuento de stock filtra por `company_id` (fix colisión multi-empresa) |
| **Global** | Formato moneda COP `$1.250.000` en toda la aplicación |
