import os
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML, CSS

print("🚀 Iniciando generador de propuestas Adapsys...")

# 1. CONFIGURACIÓN
# Rutas a las carpetas de plantillas y assets
TEMPLATES_DIR = 'templates'
ASSETS_DIR = 'assets'
OUTPUT_FILENAME = 'propuesta_generada.pdf'

# Datos dinámicos para la propuesta. En un proyecto real, esto podría venir
# de una base de datos, un formulario o un archivo de configuración.
proposal_data = {
    'client_name': 'Cliente Ejemplo S.A.',
    'project_title': 'Transformación Digital del Core de Negocio',
    'proposal_date': '25 de Julio, 2024',
    'consultants': [
        {'name': 'Miguel', 'role': 'Líder de Proyecto'},
        {'name': 'Ana', 'role': 'Consultora Estratégica Senior'},
    ]
}
print(f"Cliente: {proposal_data['client_name']}")

# 2. CARGAR PLANTILLAS
# Configurar Jinja2 para que busque plantillas en la carpeta /templates
env = Environment(loader=FileSystemLoader(TEMPLATES_DIR))

# Obtener la lista de plantillas de diapositivas, ordenadas por nombre
slide_templates = sorted([f for f in os.listdir(TEMPLATES_DIR) if f.endswith('.html') and f != 'base.html'])
print(f"Encontradas {len(slide_templates)} diapositivas: {slide_templates}")

# 3. RENDERIZAR HTML
# Renderizar cada plantilla con los datos y unirlas en un solo string HTML
full_html_content = ""
for template_name in slide_templates:
    template = env.get_template(template_name)
    rendered_slide = template.render(proposal_data)
    full_html_content += rendered_slide

# Envolver todo en la plantilla base (si la usas para una estructura general)
# base_template = env.get_template('base.html')
# final_html = base_template.render(content=full_html_content, **proposal_data)
# Por simplicidad, aquí concatenamos directamente.

print("✅ HTML renderizado correctamente.")

# 4. GENERAR PDF
# Cargar el CSS
css = CSS(os.path.join(ASSETS_DIR, 'styles.css'))

# Crear el objeto HTML de WeasyPrint desde el string renderizado
html_doc = HTML(string=full_html_content, base_url=os.path.abspath(ASSETS_DIR))

# Escribir el PDF, aplicando los estilos CSS
html_doc.write_pdf(OUTPUT_FILENAME, stylesheets=[css])

print(f"🎉 ¡Éxito! Propuesta guardada como '{OUTPUT_FILENAME}'")