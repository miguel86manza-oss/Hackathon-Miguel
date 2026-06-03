# Adapsys · Generador de Propuestas + Tablero de Indicadores

Repositorio con **dos entregables independientes**:

1. **Generador de propuestas (PDF)** — pipeline Python que arma una propuesta
   de consultoría fiel a la identidad visual de Adapsys (portada, separadores
   de sección, contexto, sello metodológico, plan de trabajo y casos de éxito).
2. **Tablero de indicadores (web)** — app React/Vite que replica el dashboard
   de la lámina "Ejemplo tablero de indicadores" (Pulso de Coalición y Avance
   de Objetivos), leyendo datos desde Google Sheets.

---

## 1) Generador de propuestas

### Flujo
```
minuta (notas/correo)
   --> prompt "Estructurador de Propuestas Adapsys"  -->  propuesta.json
                                                            --> orchestrator.py
                                                                  --> propuesta_generada.pdf
```
El JSON usa exactamente el esquema del prompt (`cliente`, `desafio_tecnico`,
`desafio_adaptativo`, `alcance`, `intro_metodologia`, `metodo1..3`,
`modulo1..5`) y se le agrega un bloque `casos` (lista) y metadatos de portada
(`titulo_propuesta`, `fecha`, `subtitulo_plan`).

### Estructura
```
orchestrator.py        # arma la secuencia de laminas, numera paginas y exporta el PDF
example_propuesta.json # datos de ejemplo (Casaideas) - copia el formato
assets/
  styles.css           # identidad de marca Adapsys (paleta, tipografia, motivos)
templates/
  00_portada.html      # portada + lamina "Propuesta + titulo"
  _divider.html        # separador de seccion (gradiente teal + cursor "_")
  contexto.html
  sello_metodologico.html
  plan_trabajo.html
  caso.html            # se renderiza una lamina por cada caso de exito
```

### Identidad visual (alineada al deck)
- Pagina **widescreen 16:9** (338.667 x 190.5 mm), como las laminas reales.
- Paleta exacta: teal #006278, cian #00B8B8, rosa #C20C5B, off-white #F4F4F4.
- Tipografia **Poppins**.
- Motivos de marca: wordmark **ADAPSYS** (con A=Lambda), grilla de puntos,
  aros rosados y el cursor "_" de los titulos de seccion.

### Uso
```bash
pip install -r requirements.txt
python orchestrator.py                          # usa los datos de ejemplo
python orchestrator.py example_propuesta.json   # carga una propuesta desde JSON
```
Genera `propuesta_generada.pdf` en la raiz. (En Google Colab, WeasyPrint corre
sin configuracion extra.)

### Personalizacion
- **Contenido:** edita el JSON o `DEFAULT_DATA` en `orchestrator.py`.
- **Secciones:** agrega/quita pasos en `build_sequence()`.
- **Estilo:** ajusta los tokens de color en `:root` dentro de `assets/styles.css`.
- **Casos de exito:** suma objetos al arreglo `casos` (uno = una lamina).

---

## 2) Tablero de indicadores (React)

App Vite separada del generador de PDF.
```bash
npm install
npm run dev
```
Ver `src/` (componentes de Pulso de Coalicion y Avance de Objetivos).

---

## Licencia
MIT.
