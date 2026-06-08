# Settings de palillería

Los settings se configuran por trabajo. Más adelante se pueden añadir defaults por empresa.

## Criterio de longitud

Campo: lengthCriteria

Opciones:

- real_cut_length
- center_to_center
- face_to_face
- drawing_dimension
- drawing_dimension_with_review
- manual
- calculated_with_fitting_deductions

Valor por defecto:

- drawing_dimension_with_review

## Unidad de longitud

Campo: lengthUnit

Opciones:

- mm
- cm
- m

Valor por defecto:

- mm

## Redondeo

Campo: roundingMm

Ejemplos:

- 1
- 5
- 10

## Límites de fabricación

Campos:

- maxPieceLengthMm
- minPieceLengthMm
- maxPieceWeightKg

Deben ser editables por el usuario.

## Separaciones automáticas

Campos booleanos:

- separateByDiameter
- separateBySchedule
- separateByMaterial
- separateAtFlanges
- separateAtValves
- separateAtFittings

Valores por defecto:

- true para todos

## Revisión obligatoria

Campo:

- requireReviewBeforeExport

Valor por defecto:

- true

## Notas

Campo libre:

- notes

Sirve para criterios específicos del taller o del ingeniero.

## Reglas de producto

- La longitud debe ser siempre editable.
- Cada fila de palillería debe guardar el origen de la longitud.
- No se debe exportar un trabajo si requireReviewBeforeExport es true y existen palillos en estado detected.
- No usar la palabra IA en los estados.
