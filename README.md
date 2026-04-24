# Adapsys · Tablero de Pulso y Avance

Dashboard en **React + Vite** para visualizar los datos de los recopiladores de Adapsys (Cosude 2026 o cualquier otro cliente):

- **Pulso de Coalición** — 10 afirmaciones, escala Likert 1–5.
- **Avance de Objetivos** — 3 objetivos, escala 1–3 (No realizado / En proceso / Realizado).

Los datos se leen directamente desde **Google Sheets publicados como CSV**, agrupados por fecha en sesiones, para mostrar el cambio entre aplicaciones del instrumento.

## Características

- KPI con índice global consolidado + delta vs. sesión anterior.
- Evolución temporal del índice entre sesiones.
- Ranking por dimensión con marca de la sesión anterior (línea rosa) para ver shift.
- Distribución de respuestas en la última sesión.
- Comparación por objetivo a lo largo de todas las sesiones.
- Logo y nombre de cliente personalizables (upload o URL).
- Persistencia de configuración en `localStorage` — al recargar la página, se mantiene.
- Modo demo con datos sintéticos para ver cómo se verá el tablero antes de conectar.

## Paleta y tipografía

- **Turquesa claro** `#00b8b8` · **Turquesa secundario** `#006379`
- **Gris marengo** `#222222`
- **Magenta 1** `#ef2b97` · **Magenta 2** `#c20c5b`
- **Grises** `#595959` · `#999999` · `#b7b7b7` · `#f3f3f3`
- Tipografía: **Poppins** (via Google Fonts).

Todas las variables están definidas en `:root` en `src/styles.css` — cambiá un color ahí y se propaga a todo el dashboard.

## Correr en local

```bash
npm install
npm run dev
```

Queda en `http://localhost:5173`.

## Publicar los Google Sheets (paso CRÍTICO)

El navegador NO puede leer directamente un Sheet compartido con "Cualquiera con el enlace puede ver" por restricciones de CORS. Hay que **publicarlo como CSV** (paso único por Sheet, dura 30 segundos):

1. Abrí el Google Sheet.
2. `Archivo` → `Compartir` → `Publicar en la web`.
3. En el desplegable de **contenido**, elegí la pestaña específica del recopilador.
4. En el desplegable de **formato**, elegí `.csv`.
5. Click en `Publicar` → confirmar.
6. Copiá la URL que aparece (termina en `/pub?output=csv`).
7. Pegala en el campo correspondiente del dashboard.

> También podés pegar la URL normal de edición (la que termina en `/edit#gid=...`) — el dashboard intenta convertirla, pero eso depende de que la hoja sea accesible sin auth. Si falla, publicala como CSV.

## Deploy en Vercel

1. Subí el proyecto a GitHub.
2. En [vercel.com/new](https://vercel.com/new), importá el repo.
3. Vercel detecta Vite automáticamente (el `vercel.json` ya tiene todo configurado).
4. Click en **Deploy**.

Cada push a `main` redeploya automáticamente.

## Estructura del proyecto

```
src/
├── components/
│   ├── TopBar.jsx             # Header con logo + nombre cliente
│   ├── ConfigPanel.jsx        # URLs Sheets + logo + empresa
│   ├── PulsoDashboard.jsx     # Dashboard Pulso (Likert 1-5)
│   └── AvanceDashboard.jsx    # Dashboard Avance (escala 1-3)
├── lib/
│   ├── schema.js              # Preguntas, escalas, metadatos
│   └── csvParser.js           # Fetch, parseo y agrupación por sesiones
├── data/
│   └── mockData.js            # Datos demo (3 sesiones sintéticas)
├── App.jsx                    # App principal, estado global, localStorage
├── main.jsx
└── styles.css                 # Variables + estilos
```

## Adaptar a otro instrumento

Si los recopiladores cambian (distintas preguntas, otra escala, otros objetivos), editá `src/lib/schema.js`:

- `PULSO_QUESTIONS` — 10 afirmaciones del Pulso (el parser detecta las columnas por match de texto, no por índice, así que aguanta cambios de orden).
- `AVANCE_OBJETIVOS` — 3 items de avance.
- Si querés agregar una cuarta dimensión o un objetivo nuevo, simplemente añadí el registro al array.

## Formato esperado del CSV

El parser espera el formato estándar de los recopiladores de Cosude:

- Columna 0: ID de respuesta
- Columna 3: **Marca de tiempo** (`mm/dd/yyyy` o `mm/dd/yyyy hh:mm:ss`) — fundamental, agrupa sesiones.
- Headers con el texto completo de cada pregunta (en algún renglón cercano al inicio).
- Respuestas: número 1-5 (Pulso) o 1-3 (Avance), puede venir con prefijo tipo `"4. De acuerdo"` — el parser extrae el número automáticamente.

Si tu archivo tiene otra estructura, editá `src/lib/csvParser.js` (función `fetchAndParseCsv`).

## Limitaciones conocidas

- Los datos se descargan en cada conexión. Si el Sheet es enorme (>10k respuestas) puede tardar.
- `localStorage` tiene ~5 MB — suficiente para URLs y un logo chico, no para datos.
- La agrupación por sesiones usa el **día** del timestamp. Si aplicás dos veces el mismo día, se mezclan.
- Los logos se almacenan como data URL en localStorage; para imágenes >500 KB usar URL pública en su lugar.
