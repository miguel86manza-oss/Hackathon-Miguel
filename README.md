# Hackathon-Miguel: Generador de Propuestas Adapsys

![Adapsys](https://img.shields.io/badge/Firma-Adapsys-00b8b8?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.10%2B-blue?style=for-the-badge&logo=python)
![License](https://img.shields.io/badge/Licencia-MIT-green?style=for-the-badge)

Este proyecto es un generador automatizado de propuestas de consultoría estratégica en formato PDF para la firma **Adapsys**. Utiliza plantillas HTML y estilos CSS para ensamblar documentos profesionales y consistentes con la marca, a partir de datos dinámicos.

## ✨ Características

- **Modularidad:** Cada sección de la propuesta (portada, contexto, diseño, etc.) es una plantilla HTML independiente.
- **Consistencia de Marca:** Un único archivo `styles.css` centraliza toda la identidad visual de Adapsys (colores, tipografías), garantizando que todas las propuestas sean uniformes.
- **Automatización:** Un script de Python (`orchestrator.py`) se encarga de tomar los datos del proyecto, renderizar las plantillas y fusionarlas en un único PDF final.
- **Fácil de Extender:** Añadir nuevas secciones a la propuesta es tan simple como crear un nuevo archivo HTML en la carpeta `templates/`.

## 🚀 Stack Tecnológico

- **Python:** Lenguaje principal para la orquestación.
- **Jinja2:** Motor de plantillas para inyectar datos en los archivos HTML.
- **WeasyPrint:** Librería para convertir el HTML y CSS renderizado en un PDF de alta calidad.

## 📂 Estructura del Proyecto

```
Hackathon-Miguel/
├── .gitignore
├── README.md
├── requirements.txt
├── orchestrator.py         # Script principal que ejecuta la generación
├── assets/
│   ├── styles.css          # Estilos CSS con la marca Adapsys
│   └── logo.png
└── templates/
    ├── base.html           # Plantilla base (esqueleto común)
    ├── 01_portada.html
    ├── 02_contexto.html
    # ... y más plantillas
```

## 🛠️ Instalación y Uso

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/tu-usuario/Hackathon-Miguel.git
    cd Hackathon-Miguel
    ```

2.  **Crear y activar un entorno virtual** (recomendado):
    ```bash
    python -m venv venv
    source venv/bin/activate  # En Windows: venv\Scripts\activate
    ```

3.  **Instalar las dependencias:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Ejecutar el generador:**
    El script `orchestrator.py` generará un archivo `propuesta.pdf` en la raíz del proyecto.
    ```bash
    python orchestrator.py
    ```

## 🎨 Personalización

- **Contenido:** Modifica los archivos `.html` en la carpeta `templates/` para cambiar la estructura de las diapositivas.
- **Estilo:** Edita `assets/styles.css` para cambiar colores, fuentes y otros aspectos visuales. Los colores corporativos de Adapsys ya están definidos como variables CSS.
- **Datos:** En `orchestrator.py`, modifica el diccionario `proposal_data` para cambiar el contenido dinámico de la propuesta (nombre del cliente, fechas, etc.).

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.