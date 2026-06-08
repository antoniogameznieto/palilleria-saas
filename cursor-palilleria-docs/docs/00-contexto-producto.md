# Contexto del producto

## Qué queremos construir

Una aplicación SaaS para ayudar a ingenieros a generar documentación de palillería a partir de planos isométricos de tuberías.

El usuario sube planos isométricos en PDF y la aplicación debe ayudar a producir dos entregables:

1. Hoja de palillería
2. Isos trameados marcados sobre el PDF original

La herramienta no debe sustituir al ingeniero. Debe ayudarle a trabajar más rápido, dejando revisión y aprobación humana en todo lo delicado.

## Usuario principal

El usuario principal es un ingeniero o técnico que sabe interpretar isométricos y necesita acelerar el trabajo de palilleo.

## Conceptos principales

### Trabajo

Un trabajo agrupa varios planos isométricos relacionados. Un trabajo puede contener varias líneas de tubería.

### Plano isométrico

Documento PDF técnico que representa una línea o parte de una línea de tubería. Contiene número de plano, número de línea, diámetro, clase, materiales, cotas, accesorios, soportes, notas y continuidades.

### Hoja de palillería

Tabla/listado con los tubos a cortar o preparar. Debe incluir, como mínimo, trabajo, plano, línea, material, diámetro, schedule, número de palillo, longitud, observaciones y estado.

### Iso trameado

El plano isométrico original marcado visualmente con tramos, números de palillo, círculos, líneas y etiquetas tipo Tramo A, Tramo B, etc.

## Hipótesis funcionales detectadas

- Un trabajo puede tener varios planos.
- Una hoja de palillería puede agrupar varios planos.
- Cada plano puede generar varios palillos.
- Cada palillo pertenece a un plano/línea/fichero.
- Se debe separar por diámetro.
- Se debe separar por schedule.
- Se debe separar por material.
- Los accesorios ayudan a detectar posibles cortes.
- Los soportes y notas son observaciones, no palillos.
- Las longitudes finales deben ser revisables por el ingeniero.

## Estados

No usar la palabra IA en los estados. Usar Detectado.

Estados de trabajo:

- draft
- in_progress
- reviewed
- approved
- archived

Estados de plano:

- uploaded
- processing
- detected
- reviewed
- approved
- error

Estados de palillo:

- detected
- reviewed
- corrected
- approved
