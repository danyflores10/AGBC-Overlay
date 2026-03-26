# 📺 OBS Overlay System — Agencia Boliviana de Correos

Sistema web profesional de overlays para transmisiones en vivo, diseñado para usarse como **Browser Source** en OBS Studio.

Construido con **Laravel 11 + Vue.js 3** — estilo broadcast / noticiero televisivo.

---

## 📋 Requisitos

- **PHP 8.2+** con extensión SQLite
- **Composer** (gestor de paquetes PHP)
- **Node.js 18+** y **NPM**
- **OBS Studio** (cualquier versión reciente)

---

## 🚀 Instalación Paso a Paso

### 1. Instalar dependencias de PHP
```bash
cd obs-overlay
composer install
```

### 2. Instalar dependencias de Node
```bash
npm install
```

### 3. Crear la base de datos SQLite
```bash
# Crear archivo de base de datos vacío
copy NUL database\database.sqlite
```
> En PowerShell: `New-Item database\database.sqlite -ItemType File -Force`

### 4. Ejecutar migraciones
```bash
php artisan migrate
```

### 5. Compilar assets (CSS y JavaScript)
```bash
npm run build
```

### 6. Iniciar el servidor
```bash
php artisan serve
```

El servidor estará disponible en: **http://127.0.0.1:8000**

---

## 🎛️ Cómo Usar

### Panel de Control
Abre en tu navegador:
```
http://127.0.0.1:8000/control
```

Desde aquí puedes:
- Cambiar todos los textos (título, expositor, ticker, etc.)
- Activar/desactivar módulos (lower third, barra, ticker, QR, reloj, EN VIVO)
- Seleccionar el modo de escena (Bienvenida, Cámara Full, Diapositivas, Lower Third, Cierre)
- Elegir la posición de la cámara PIP
- Restaurar valores por defecto

**Los cambios se guardan automáticamente** y se reflejan en el overlay en menos de 1 segundo.

### Vista del Overlay
Para ver el overlay directamente en tu navegador:
```
http://127.0.0.1:8000/overlay
```

---

## 📹 Configuración en OBS Studio

### Paso 1: Agregar el Overlay como Browser Source

1. En OBS, ve a **Fuentes** → clic en **+** → **Navegador** (Browser)
2. Ponle nombre: `Overlay ABC`
3. Configuración:
   - **URL**: `http://127.0.0.1:8000/overlay`
   - **Ancho**: `1920`
   - **Alto**: `1080`
   - **FPS**: `30`
   - ✅ Marcar **"Usar color de fondo personalizado"** y poner **transparente** (alfa = 0)
   - ✅ Marcar **"Actualizar navegador cuando la escena se active"**
4. Clic en **Aceptar**

### Paso 2: Orden de Capas en OBS (MUY IMPORTANTE)

El orden correcto de capas en OBS (de abajo hacia arriba):

#### Layout "Cámara Full":
```
📋 Orden de capas (abajo → arriba):
─────────────────────────────
4. 🔝 Overlay ABC (Browser Source) ← ENCIMA DE TODO
3. 📹 Cámara (Video Capture Device)
2. 🖼️ Fondo (Color/Imagen)
1. 🔽 Base
```

#### Layout "Diapositivas + Cámara":
```
📋 Orden de capas (abajo → arriba):
─────────────────────────────
5. 🔝 Overlay ABC (Browser Source)
4. 📹 Cámara PIP (Video Capture, redimensionada al marco)
3. 📊 Diapositivas (Window Capture / Display Capture)
2. 🖼️ Fondo (Color/Imagen)
1. 🔽 Base
```

#### Layout "Bienvenida" o "Cierre":
```
📋 Orden de capas:
─────────────────────────────
2. 🔝 Overlay ABC (Browser Source) ← Cubre toda la pantalla
1. 🔽 Base
```

### Paso 3: Configurar la Cámara

1. Agrega tu cámara como fuente de **"Dispositivo de captura de video"**
2. Redimensiónala y posiciona según el layout:
   - **Cámara Full**: Ocupa casi toda la pantalla, debajo del overlay
   - **PIP Derecha Abajo**: Colócala en la esquina inferior derecha, cubierta por el marco del overlay
   - **PIP Izquierda**: Colócala en la esquina inferior izquierda
   - **PIP Grande**: Tamaño más grande, esquina inferior derecha
3. El overlay web dibuja los marcos / esquinas decorativas — alinea tu cámara con ellos

### Paso 4: Crear Escenas en OBS

Recomendamos crear estas escenas:

| Escena OBS        | Layout en Panel | Capas necesarias             |
|--------------------|-----------------|-------------------------------|
| Bienvenida         | Bienvenida      | Overlay                       |
| Presentación       | Cámara Full     | Fondo + Cámara + Overlay      |
| Diapositivas       | Diapositivas    | Diapos + Cámara PIP + Overlay |
| Solo Lower Third   | Lower Third     | Fondo + Cámara + Overlay      |
| Cierre             | Cierre          | Overlay                       |

---

## 🏗️ Arquitectura del Proyecto

```
obs-overlay/
├── app/
│   ├── Http/Controllers/
│   │   └── OverlayController.php    ← Controlador API + vistas
│   └── Models/
│       └── OverlayConfig.php        ← Modelo de configuración
├── database/
│   └── migrations/                  ← Migración de tabla config
├── resources/
│   ├── css/
│   │   └── app.css                  ← Estilos broadcast profesionales
│   ├── js/
│   │   ├── overlay.js               ← App Vue del overlay (OBS)
│   │   └── control.js               ← App Vue del panel de control
│   └── views/
│       ├── overlay.blade.php        ← Vista HTML del overlay
│       └── control.blade.php        ← Vista HTML del panel
├── routes/
│   └── web.php                      ← Rutas web + API
├── vite.config.js                   ← Config de Vite + Vue
└── README.md                        ← Este archivo
```

---

## 🎨 Paleta de Colores

| Color         | Código    | Uso                          |
|---------------|-----------|-------------------------------|
| Azul Oscuro   | `#0a1628` | Fondos principales            |
| Azul Medio    | `#132744` | Fondos secundarios            |
| Rojo Intenso  | `#dc2626` | Acentos, EN VIVO, bordes      |
| Blanco        | `#ffffff` | Textos principales            |
| Dorado        | `#f59e0b` | Cargos, subtítulos especiales |
| Azul Acento   | `#2563eb` | Elementos interactivos        |

---

## 💡 Consejos de Uso

- **El servidor debe estar corriendo** (`php artisan serve`) antes de usar el overlay en OBS
- Los cambios desde el panel de control se reflejan **en tiempo real** en el overlay
- Para **desarrollo**, usa `npm run dev` en vez de `npm run build` para hot-reload de estilos
- Si cambias de escena en OBS, el overlay se adapta automáticamente según el layout seleccionado en el panel
- El Panel de Control y el Overlay se pueden abrir en la misma PC simultáneamente

---

## 📌 Notas Importantes

- El overlay usa **fondo transparente** — solo se ven los gráficos sobre tu contenido
- La cámara **NO se embebe en el navegador** — se agrega como fuente independiente en OBS
- El overlay dibuja marcos decorativos para guiarte dónde posicionar la cámara
- Todo funciona 100% **offline** y **localmente**, sin depender de internet
- La configuración se guarda en **SQLite** (persistente entre reinicios)

---

## 📄 Licencia

Desarrollado para la **Agencia Boliviana de Correos** — Uso institucional.
