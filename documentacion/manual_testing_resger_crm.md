# Manual de Testing: RESGER CRM

Este documento sirve como una **guía exhaustiva de pruebas manuales (QA)** para verificar que todos los módulos y flujos de trabajo de la aplicación funcionen correctamente. 

Utiliza este manual cada vez que hagas cambios importantes para asegurar la estabilidad del sistema.

---

## 1. Módulo de Autenticación y Cuentas

### 1.1. Registro e Inicio de Sesión
- [ ] **Registro Nuevo:** Ingresa a la app, ve a "Crear Cuenta", ingresa un correo nuevo y contraseña. Verifica que se cree el usuario correctamente.
- [ ] **Login Exitoso:** Cierra sesión e ingresa con las credenciales creadas. Verifica el acceso al dashboard.
- [ ] **Login Fallido:** Intenta ingresar con una contraseña incorrecta y verifica que aparezca el mensaje de error "Credenciales inválidas".

### 1.2. Recuperación de Contraseña
- [ ] **Solicitar Recuperación:** En el login, haz clic en "¿Olvidaste tu contraseña?". Ingresa un correo válido.
- [ ] **Flujo de Cambio:** Recibe el correo, haz clic en el enlace y verifica que te lleve a la pantalla de "Restablecer Contraseña". Ingresa la nueva clave y verifica que puedas loguearte.

---

## 2. Gestión de Empresas (Multi-Tenant)

### 2.1. Creación de Empresa
- [ ] **Flujo de Primera Vez:** Si eres un usuario nuevo sin empresa, verifica que la app te obligue a crear una (Pantalla "¡Bienvenido!").
- [ ] **Creación Exitosa:** Ingresa un nombre, haz clic en "Crear Empresa" y verifica que seas redirigido al Dashboard principal como Administrador.

### 2.2. Seguridad de Datos (Aislamiento)
- [ ] **Privacidad de Inventario:** Crea una Empresa A (agrega productos) y luego crea/inicia sesión con otro usuario en una Empresa B. Verifica que el usuario B **no pueda ver** los productos ni clientes de la Empresa A.

---

## 3. Catálogo de Productos (Inventario)

### 3.1. CRUD de Productos
- [ ] **Crear Producto:** Ve a "Productos > Agregar Producto". Llena todos los datos y sube una imagen de prueba. Verifica que aparezca en la lista con su imagen.
- [ ] **Editar Producto:** Haz clic en el botón de lápiz de un producto. Cambia el precio y guarda. Verifica la actualización en la tabla.
- [ ] **Eliminar Producto:** Haz clic en la papelera, confirma la alerta del navegador y verifica que el producto desaparezca de la lista.

### 3.2. Lógica de Stock
- [ ] **Indicadores Visuales:** Crea un producto con 5 unidades de stock. Verifica que la etiqueta diga "Stock Bajo" y esté en color naranja/ámbar. Crea uno con 0 y verifica "Sin Stock" en color rojo.

---

## 4. Gestión de Clientes

### 4.1. CRUD de Clientes
- [ ] **Crear Cliente:** Ve a "Clientes > Añadir Cliente". Ingresa Nombre, Email y Teléfono. Verifica que se guarde correctamente.
- [ ] **Validación de Duplicados:** Intenta crear un cliente con un Email que ya usaste en esta misma empresa. Verifica que el sistema arroje una alerta de "El cliente ya existe".
- [ ] **Edición:** Modifica la dirección de un cliente y valida que el cambio se refleje inmediatamente en la tabla.

---

## 5. Módulo de Nueva Venta (POS)

### 5.1. Selección de Cliente
- [ ] **Cliente Registrado:** Busca un cliente escribiendo parte de su nombre. Selecciónalo y verifica que la etiqueta diga "Seleccionado".
- [ ] **Cliente No Registrado:** Activa el botón "Cliente No Registrado". Llena los campos manuales (Nombre, Teléfono) y verifica que te permita continuar sin un cliente de la base de datos.

### 5.2. Carrito de Compras
- [ ] **Búsqueda Visual:** Busca un producto por nombre y agrégalo haciendo clic en su tarjeta.
- [ ] **Cantidades:** Usa los botones `+` y `-` en la tabla del carrito. Verifica que el subtotal y total se actualicen automáticamente.
- [ ] **Eliminar Item:** Elimina un producto del carrito con el icono de la papelera y verifica el recálculo total.

### 5.3. Finalización y Recibo
- [ ] **Checkout:** Selecciona "Efectivo" y haz clic en "Finalizar Venta".
- [ ] **Descuento de Stock:** Ve a la vista de Productos y verifica que las unidades compradas se hayan restado del stock de esos productos.
- [ ] **Factura Proforma:** Al finalizar la venta, verifica que se abra el modal con la factura y haz clic en "Descargar PDF". Verifica que el PDF se descargue correctamente.

---

## 6. Historial de Ventas y Cierre de Caja

### 6.1. Historial
- [ ] **Lista de Ventas:** Ve a "Historial" y verifica que la venta que acabas de hacer aparezca de primera.
- [ ] **Detalles:** Haz clic en "Detalle" y verifica que el modal muestre correctamente el desglose de productos y el monto exacto.

### 6.2. Cierre de Caja
- [ ] **Cálculo del Cierre:** Haz clic en "Cierre de Caja". Verifica que el modal te diga cuántas ventas se hicieron en este turno y el monto total recaudado.
- [ ] **Realizar Cierre:** Ejecuta el cierre. Verifica que se descargue un PDF corporativo con el resumen.
- [ ] **Reinicio:** Ve de nuevo a "Cierre de Caja" inmediatamente después. El total debería ser $0, ya que no se han hecho ventas desde el último cierre.
- [ ] **Historial de Cierres:** Revisa la lista de "Historial de Cierres" en la pantalla de Historial de Ventas y asegúrate de que el cierre recién hecho aparezca allí.

---

## 7. Configuración y Permisos (Roles)

### 7.1. Preferencias de Empresa
- [ ] **Editar Datos Básicos:** Ve a Configuración y cambia el nombre o RUT de la empresa. Verifica el cambio.

### 7.2. Gestión de Equipo
- [ ] **Invitar Usuario:** (Solo como Admin) Ve a Gestión de Equipo e ingresa el correo de otro usuario existente. Agrégalo con rol `user`.
- [ ] **Restricciones de Rol:** Inicia sesión con el correo del nuevo empleado (`user`). Ve a Historial de Ventas y verifica que este empleado **no vea** las opciones críticas de configuración y que, al ver sus ventas, solo vea las que él generó (según lo configurado por el admin).
