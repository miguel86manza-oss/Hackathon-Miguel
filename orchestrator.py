#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ADAPSYS · Generador de Propuestas
==================================
Toma los datos estructurados de una propuesta (el JSON que produce el
prompt "Estructurador de Propuestas Adapsys") y ensambla un PDF widescreen
16:9 fiel a la identidad de marca: portada, separadores de sección con
cursor "_", contexto, sello metodológico, plan de trabajo y casos de éxito.

Stack: Jinja2 (plantillas) + WeasyPrint (HTML/CSS -> PDF).
Uso:   python orchestrator.py            (usa los datos de ejemplo de abajo)
       python orchestrator.py datos.json (carga la propuesta desde un JSON)
"""

import os
import sys
import json
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML, CSS

# ----------------------------------------------------------------------
# 1. CONFIGURACIÓN
# ----------------------------------------------------------------------
BASE_DIR      = os.path.dirname(os.path.abspath(__file__))
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")
ASSETS_DIR    = os.path.join(BASE_DIR, "assets")
OUTPUT_FILE   = os.path.join(BASE_DIR, "propuesta_generada.pdf")

print("🚀  Generador de propuestas Adapsys")

# ----------------------------------------------------------------------
# 2. DATOS DE LA PROPUESTA
#    Estructura idéntica al esquema del "Estructurador de Propuestas".
#    Reemplazá este diccionario por el JSON generado a partir de la minuta,
#    o pasá un archivo .json como argumento.
# ----------------------------------------------------------------------
DEFAULT_DATA = {
    # --- portada ---
    "cliente": "Casaideas",
    "titulo_propuesta": "Equipo ejecutivo para los desafíos del futuro",
    "fecha": "07 | 2026",
    "subtitulo_plan": "Programa de liderazgo para jefaturas y líderes de equipo",

    # --- contexto y desafío ---
    "desafio_tecnico": "Líderes promovidos por desempeño técnico sin espacios formales "
                       "para desarrollar habilidades de gestión. Concentración excesiva "
                       "en la operación cotidiana.",
    "desafio_adaptativo": "Necesidad de fortalecer prácticas comunes y consistentes de "
                          "liderazgo ante el crecimiento regional. Brechas en la entrega "
                          "de retroalimentación y movilización de equipos.",
    "alcance": "Aproximadamente 80 participantes, jefaturas y líderes de equipo de "
               "distintas áreas en modalidad presencial.",

    # --- sello metodológico ---
    "intro_metodologia": "Los siguientes modelos, parte del sello Adapsys, servirán de "
                         "base al trabajo propuesto y se explican brevemente a continuación:",
    "metodo1_nombre": "Cambio adaptativo",
    "metodo1_descripcion": "Los cambios organizacionales pasan por las personas. Si las "
                           "jefaturas no transforman su forma de pensar y actuar como "
                           "líderes, ningún resultado sostenible será posible en Casaideas.",
    "metodo2_nombre": "Despliegue integrador",
    "metodo2_descripcion": "Miramos el desarrollo del liderazgo de forma integral, "
                           "conectando propósito, estrategia, estructura, cultura y talento, "
                           "para que el cambio impacte a toda la organización.",
    "metodo3_nombre": "Iteración adaptativa",
    "metodo3_descripcion": "El trabajo sigue una lógica iterativa: involucrar a los líderes, "
                           "entender sus desafíos, generar aprendizajes y ejecutar acciones "
                           "que movilicen a sus equipos.",

    # --- plan de trabajo ---
    "modulo1_nombre": "Diagnóstico Inicial",
    "modulo1_proposito": "Mapear brechas de liderazgo en jefaturas y líderes de equipo.",
    "modulo1_actividades": "Entrevistas a gerentes y encuesta de liderazgo a los 80 participantes.",
    "modulo1_duracion": "Mes 1",
    "modulo2_nombre": "Liderazgo Técnico vs. Adaptativo",
    "modulo2_proposito": "Instalar el marco del liderazgo adaptativo y la conciencia del propio estilo.",
    "modulo2_actividades": "2 talleres presenciales de 4h con autoevaluación previa.",
    "modulo2_duracion": "Mes 1 – 2",
    "modulo3_nombre": "Retroalimentación Efectiva",
    "modulo3_proposito": "Desarrollar habilidades de feedback que movilicen el desempeño.",
    "modulo3_actividades": "2 talleres de 4h con práctica guiada entre sesiones.",
    "modulo3_duracion": "Mes 2",
    "modulo4_nombre": "Movilización de Equipos",
    "modulo4_proposito": "Fortalecer la conducción de equipos hacia resultados en cambio.",
    "modulo4_actividades": "2 talleres de 4h con proyecto aplicado al desafío de cada jefatura.",
    "modulo4_duracion": "Mes 2 – 3",
    "modulo5_nombre": "Cierre y Evaluación",
    "modulo5_proposito": "Consolidar aprendizajes y medir el impacto del programa.",
    "modulo5_actividades": "Sesión plenaria de 3h y evaluación de impacto 360° pre/post.",
    "modulo5_duracion": "Mes 3",

    # --- casos de éxito (lista; se genera una lámina por caso) ---
    "casos": [
        {
            "caso_industria": "Retail",
            "caso_empresa": "SMU",
            "caso_titulo": "Transformación de SMU",
            "caso_contexto": "SMU requería una transformación organizacional para enfrentar "
                             "importantes desafíos del negocio y, años después, volver a mirar "
                             "sus definiciones culturales para adaptarse a los nuevos tiempos.",
            "caso_testimonio": "Lo hicimos de una manera práctica y concreta que ha permitido "
                               "que los casi 30.000 colaboradores de SMU hayan comenzado a vivir "
                               "estos valores en su día a día.",
            "caso_autor": "Marcelo Gálvez",
            "caso_cargo": "CEO SMU",
            "caso_proposito": "Enfrentar los cambios del entorno fortaleciendo la organización y "
                              "adaptando su cultura para desarrollar su capacidad adaptativa.",
            "caso_ruta": "Estrategia y definiciones culturales con más de 100 líderes, llevadas "
                         "luego a todos los mandos medios con un trabajo de internalización.",
            "caso_adaptativo": "Relevar la cultura como activo clave y alinear competencias en "
                               "líderes que trabajan con equipos distribuidos y realidades diversas.",
            "caso_impacto": "Alineamiento estratégico y cultural que dio contención en un momento "
                            "complejo; lenguaje común que aumentó la capacidad adaptativa de los líderes.",
        },
        {
            "caso_industria": "Retail",
            "caso_empresa": "MALLPLAZA",
            "caso_titulo": "Transformando la Cultura",
            "caso_contexto": "Mallplaza identifica la necesidad de empujar una transformación "
                             "cultural para responder mejor a los cambios del entorno.",
            "caso_testimonio": "Adapsys se involucra y conecta fuertemente desde la estrategia, "
                               "y logra movilizar los distintos estilos de liderazgo de la Compañía.",
            "caso_autor": "Fernando de Peña",
            "caso_cargo": "Vicepresidente Ejecutivo Mallplaza",
            "caso_proposito": "Instalar una cultura adecuada a los cambios de contexto para "
                              "protagonizar las siguientes etapas de desarrollo de Mallplaza.",
            "caso_ruta": "Diagnóstico de la cultura, definición de la nueva cultura y posterior "
                         "internalización con anclajes concretos.",
            "caso_adaptativo": "Repensar la forma de trabajar y cambiar un estilo exitoso que no "
                               "aprovechaba grandes potenciales organizacionales.",
            "caso_impacto": "Nuevos valores y conductas comunicados en toda la compañía y un equipo "
                            "ejecutivo con nuevas capacidades para la efectividad.",
        },
    ],
}


def load_data():
    if len(sys.argv) > 1:
        path = sys.argv[1]
        with open(path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        print(f"📄  Datos cargados desde {path}")
        # rellena claves de presentación que el JSON del prompt no incluye
        for k, v in DEFAULT_DATA.items():
            data.setdefault(k, v if not isinstance(v, list) else [])
        return data
    print("📄  Usando datos de ejemplo (Casaideas)")
    return DEFAULT_DATA


# ----------------------------------------------------------------------
# 3. SECUENCIA DE LÁMINAS
#    (plantilla, contexto extra).  El número de página se asigna solo.
# ----------------------------------------------------------------------
def build_sequence(data):
    seq = [
        ("00_portada.html", {}),                                   # portada (2 láminas, sin nº)
        ("_divider.html",   {"divider_titulo": "Contexto"}),
        ("contexto.html",   {}),
        ("_divider.html",   {"divider_titulo": "Sello\nmetodológico"}),
        ("sello_metodologico.html", {}),
        ("_divider.html",   {"divider_titulo": "Plan de\ntrabajo"}),
        ("plan_trabajo.html", {}),
        ("_divider.html",   {"divider_titulo": "Casos\nde éxito"}),
    ]
    for caso in data.get("casos", []):
        seq.append(("caso.html", caso))
    return seq


# ----------------------------------------------------------------------
# 4. RENDER
# ----------------------------------------------------------------------
def main():
    data = load_data()
    print(f"   Cliente: {data['cliente']}")

    env = Environment(
        loader=FileSystemLoader(TEMPLATES_DIR),
        autoescape=False,
        trim_blocks=True,
        lstrip_blocks=True,
    )

    sequence = build_sequence(data)
    html_parts = []
    page = 0  # numeración para láminas de contenido/divisores

    for template_name, extra in sequence:
        ctx = {**data, **extra}
        # la portada no lleva número; el resto sí
        if template_name != "00_portada.html":
            page += 1
            ctx["num_pagina"] = page
        # los saltos de línea de los títulos de divisor se vuelven <br>
        if "divider_titulo" in ctx:
            ctx["divider_titulo"] = ctx["divider_titulo"].replace("\n", "<br>")
        tpl = env.get_template(template_name)
        html_parts.append(tpl.render(ctx))

    full_html = "\n".join(html_parts)
    print(f"✅  {len(sequence)} bloques renderizados ({page} láminas numeradas).")

    css = CSS(filename=os.path.join(ASSETS_DIR, "styles.css"))
    HTML(string=full_html, base_url=ASSETS_DIR).write_pdf(OUTPUT_FILE, stylesheets=[css])

    print(f"🎉  Listo: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
