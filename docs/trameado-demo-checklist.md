# Demo interna: flujo de trameado asistido

> **Fase 18N-A** — Guion y checklist para validar el estado actual del producto con PDFs reales.  
> **Sin cambios de código.** Solo documentación operativa para demo interna o sesión con cliente.

---

## Objetivo de la demo

Mostrar de forma ordenada cómo un **ingeniero** puede, hoy, pasar de un isométrico vectorial a una **hoja de palilleo exportable**, con asistencia en metadatos, cotas candidatas y entrada rápida de tramos — **sin** prometer automatización total.

La demo debe permitir responder con claridad:

- Qué **funciona** y aporta valor inmediato.
- Qué **requiere confirmación humana** (por diseño).
- Qué **no está** en el producto todavía.

---

## Qué problema resuelve

| Problema del taller / ingeniería | Cómo lo aborda el flujo actual |
|----------------------------------|--------------------------------|
| Teclear ISO, Ø y SCH desde cero | Asistente de hoja desde metadatos + BOM takeoff |
| Buscar cotas en el PDF a ojo | Panel de **cotas candidatas** rankeadas (high/medium/low) |
| Copiar longitudes al formulario | **Preparar tramo** → PALILLO pre-rellenado |
| Hoja dispersa en Excel ad hoc | Tabla de tramos + **export CSV/XLSX** con columnas de taller |
| Revisión antes de entregar | Marcar hoja **revisada**; export con aviso si pendiente |

---

## Qué NO intenta resolver todavía

- Generar el **iso trameado** con marcas azules `<n>` sobre el PDF.
- Crear tramos o PALILLO **automáticamente** sin confirmar.
- **Agrupar** cotas por tramo lógico ni **sumar** longitudes.
- Usar posición **X/Y** de cotas en el dibujo.
- Validar **Σ PALILLO** frente a metros de tubería en BOM.
- Completar planos **-01 largos** sin criterio humano (muchas cotas, pocos hits golden literales).

---

## Preparación previa

### Entorno

```bash
npm run dev
# App en http://localhost:3000
```

Opcional (datos de referencia, no obligatorio en la demo):

```bash
npm run validate:trameado-functional
```

### Datos en la app

1. **Trabajo** con al menos un plano del paquete `Ejemplos/Ejemplo 1/` subido.
2. **Takeoff beta** ejecutado en el plano (para que el asistente proponga ISO, Ø y SCH).
3. Usuarios de prueba:
   - **Engineer** — flujo completo de edición.
   - **Viewer** — solo lectura (Paso 7).

### Archivos de referencia (fuera de la app)

| Recurso | Uso en demo |
|---------|-------------|
| `Ejemplos/Ejemplo 1/2301GB47G-C1-L-HL-1289-02.pdf` | **Caso principal** |
| `Ejemplos/Ejemplo 1/2301GB47G-C1-L-HL-1291-02.pdf` | Caso alternativo |
| `Ejemplos/Ejemplo 1/Isos trameados.pdf` p.2 | Golden visual HL-1289-02 (170, 100, 120 mm) |
| [trameado-functional-validation.md](./trameado-functional-validation.md) | Evidencia 18L / 18M-A |

---

## Plano recomendado

### Caso principal: **HL-1289-02**

| Aspecto | Valor |
|---------|-------|
| Archivo | `2301GB47G-C1-L-HL-1289-02.pdf` |
| Línea | HL-1289-A010AA-N-02 |
| Ø / SCH (asistente) | 3/4" / SCH 80 |
| Golden (3 tramos) | **170, 100, 120 mm** |
| Panel cotas (18M-A) | **3/3 golden** en primary high |

**Por qué este plano:** mejor caso corto del paquete; demuestra en pocos minutos cotas útiles + preparar tramo + export, con las tres longitudes golden visibles en el panel.

### Caso alternativo: **HL-1291-02**

| Aspecto | Valor |
|---------|-------|
| Archivo | `2301GB47G-C1-L-HL-1291-02.pdf` |
| Línea | HL-1291-A012AA-N-02 |
| Golden | 170, 100, 120 mm |
| Hits en panel | **100, 120** (2/3); **170 no literal** en PDF |

**Cuándo usarlo:** para explicar que el sistema **asiste** pero no inventa cotas que no están en el texto embebido; el gap del 170 mm es del plano, no solo del filtro.

---

## Recorrido paso a paso

### Paso 1 — Entrar al plano

1. Abrir un **trabajo** que contenga el PDF (HL-1289-02).
2. Entrar al **detalle del plano**.
3. Pestaña **Trameado**.

**Qué decir:** «Aquí trabajamos la hoja de palilleo en paralelo al isométrico: izquierda el plano y cotas, derecha la hoja y los tramos.»

**Qué mirar:** flujo numerado en cabecera (Hoja → Cotas → Tramos → Export/revisión).

---

### Paso 2 — Crear hoja de palilleo

1. Sin hoja: tarjeta **«Crea una hoja de palilleo para empezar»**.
2. Si hay asistente: seleccionar sugerencia **HL-1289-A010AA-N-02** → **Crear hojas sugeridas**.
3. Si no hay asistente: **Crear hoja de palilleo** manual con el identificador de línea.

**Qué decir:** «La hoja guarda los tramos que confirmemos; no se crean longitudes solas. El asistente solo rellena ISO, clase, Ø y SCH desde el BOM.»

**Qué mirar:** badge de estado, resumen `0 tramos · 0 mm` secundario; en cotas, «Preparar tramo» pasa de deshabilitado a activo.

---

### Paso 3 — Revisar cotas candidatas

1. Panel **Cotas candidatas** bajo el PDF.
2. Sección **Cotas más probables** (170, 100, 120 en 1289-02).
3. Badges **Alta / Media / Baja** — «más fiables arriba, no son decisión automática».
4. Opcional: **Ver más cotas** si hay adicionales.

**Qué decir:** «Son ayudas extraídas del texto del PDF, ordenadas por utilidad probable. El ingeniero elige y confirma contra el dibujo.»

**Qué mirar:** que no se presente como «palillos automáticos».

---

### Paso 3b — Tramos sugeridos (18O-A)

1. Panel **Tramos sugeridos** en la columna de la hoja.
2. En **HL-1289-02** aparecen hasta 5 propuestas (incluyen golden 170, 100, 120).
3. En **-01 largos** el panel indica que las sugerencias automáticas no son fiables todavía.

**Qué decir:** «El sistema propone tramos desde cotas rankeadas. No se guardan hasta Añadir a hoja o Confirmar tras Preparar/editar.»

**Acciones:** Añadir a hoja · Preparar/editar · Descartar.

---

### Paso 4 — Preparar tramo

1. En una cota (p. ej. **120 mm**): **Preparar tramo**.
2. Formulario a la derecha: banner **«Preparando tramo desde cota 120 mm»**.
3. Comprobar **PALILLO** rellenado.
4. Comprobar **Ø / SCH / COLADA** sticky si ya hubo un tramo previo.

**Qué decir:** «Esto no guarda nada todavía; solo prepara el formulario. Hay que revisar el isométrico y pulsar Confirmar tramo.»

---

### Paso 5 — Confirmar tramo

1. Completar **Nº** (`<1>`, `<2>`…) si hace falta.
2. **Confirmar tramo**.
3. Ver fila en **tabla de tramos** (Nº, Ø, SCH., PALILLO destacados).
4. Repetir con **100 mm** y **170 mm** para completar el golden de 1289-02.

**Qué decir:** «Cada tramo es una decisión explícita. Podemos duplicar, editar o borrar después.»

---

### Paso 5b — Validación de hoja (18O-B)

1. Panel **Validación de hoja** bajo la tabla de tramos.
2. Comprobar **Tramos confirmados**, **Total PALILLO** y, si hay tubería en BOM con unidad M, **Referencia BOM** y **Diferencia %**.
3. Estados posibles: *Sin tramos*, *Sin referencia suficiente*, *Parece razonable*, *Revisar diferencia*, *Revisar datos*.

**Qué decir:** «Es una comprobación orientativa. La suma PALILLO no tiene por qué coincidir exactamente con los metros de tubería del BOM; ayuda a detectar desvíos grandes antes de cerrar la hoja.»

**Qué mirar:** que no bloquee export ni marcar revisada.

---

### Paso 6 — Exportar

1. Con al menos un tramo: **Exportar CSV** y **Exportar Excel**.
2. Abrir el XLSX: columnas `ISO, CLASE, Nº, Ø, SCH., PALILLO, COLADA`.
3. Opcional: **Marcar revisada** antes de entregar al taller.

**Qué decir:** «El Excel ya tiene la estructura de hoja de taller; falta validación con el cliente en un iso real.»

---

### Paso 7 — Viewer

1. Cerrar sesión engineer; entrar como **viewer**.
2. Mismo plano → pestaña Trameado.

**Debe ver:** PDF, hoja, cotas (solo **Copiar**), tabla, enlaces de export.  
**No debe ver:** crear hoja, añadir tramo, preparar tramo, editar, marcar revisada.

**Qué decir:** «Consulta y exportación sí; edición solo ingeniería.»

---

## Checklist de observación

Rellenar durante o justo después de la demo.

| Punto observado | Resultado esperado | OK / KO | Notas |
|-----------------|-------------------|---------|-------|
| El usuario entiende que **primero debe crear hoja** | Tarjeta derecha + aviso en cotas lo dejan claro antes de preparar tramo | | |
| El usuario entiende qué son las **cotas candidatas** | Las describe como ayudas ordenadas, no como palillos finales | | |
| El usuario **identifica cotas útiles** | En 1289-02 señala 170/100/120 sin buscar mucho en el PDF | | |
| El usuario **prepara un tramo en &lt;10 s** | Tras tener hoja: un clic en Preparar tramo + confirmar | | |
| El usuario entiende que debe **confirmar manualmente** | No asume guardado automático al pulsar Preparar tramo | | |
| La **tabla de tramos** se entiende | Nº, Ø, SCH., PALILLO legibles como hoja de taller | | |
| El **Excel exportado** resulta reconocible | Columnas y valores coherentes con lo introducido | | |
| **Viewer no puede editar** | Sin CTAs de creación/edición | | |
| El usuario **no interpreta** el sistema como automático total | Acepta límites (sin iso trameado, sin suma BOM) | | |

---

## Criterios de éxito

La demo se considera **exitosa** si:

1. El flujo completo (hoja → cota → tramo → export) se **explica en menos de 2 minutos**.
2. Un ingeniero puede **crear una hoja y confirmar un tramo** sin guía paso a paso externa.
3. El panel de cotas **ahorra búsqueda manual** en el PDF (caso 1289-02).
4. El export Excel **sirve como base** de hoja de palilleo (pendiente validación cliente).
5. Las **limitaciones** quedan explícitas y no generan expectativa de iso trameado automático.

---

## Gaps conocidos (decir en voz alta)

| Gap | Impacto en demo |
|-----|-----------------|
| No genera **iso trameado** con marcas azules | Entregable visual del cliente sigue manual / externo |
| No **agrupa tramos** automáticamente | En -01 el ingeniero decide qué cotas son tramos |
| No **suma cotas** (p. ej. 235+129→363) | PALILLO compuesto requiere criterio humano |
| No usa **X/Y** | No se puede clicar sobre la cota en el dibujo |
| No valida **Σ PALILLO vs BOM** | Metros de tubería en BOM no se contrastan |
| Planos **-01 largos** | Muchas cotas rankeadas; 0/5 golden literal típico |
| Golden **no siempre literal** en PDF | Ej.: 170 mm en HL-1291-02 no aparece en texto embebido |

---

## Preguntas para validar con usuario / cliente

1. ¿La hoja generada se parece **suficientemente** a vuestra hoja de taller?
2. ¿El flujo **«Preparar tramo» → Confirmar** resulta natural frente al papel?
3. ¿Prefieres priorizar **marcar el PDF** (iso trameado) o **mejorar el cálculo de tramos** en planos largos?
4. ¿Qué **campos faltan** para usarlo en producción (COLADA, notas, formato, etc.)?
5. ¿Qué **error sería crítico** en taller si el sistema se equivocara?
6. ¿Qué parte del proceso actual **consume más tiempo** (buscar cotas, teclear, revisar, exportar)?

---

## Próximas decisiones

Tras la demo interna con **HL-1289-02**, elegir dirección según feedback:

| Fase | Enfoque | Cuándo priorizar |
|------|---------|------------------|
| **18N-B** | Demo guiada con datos de ejemplo fijos (seed / walkthrough) | Varias demos repetidas; onboarding interno |
| **18M-C** | Anotaciones manuales sobre PDF / iso trameado | Si piden entregable visual sobre el plano |
| **18M-D** | Validación **Σ PALILLO vs BOM** | Si la confianza en longitudes es el bloqueo |
| **18M-E** | Mejorar ranking/cálculo en **-01 largos** | Si el dolor principal son planos principales 4" |

### Recomendación (18N-A)

1. **Primero:** demo interna con **HL-1289-02** usando este checklist.
2. **Después:** según respuestas a las preguntas de validación:
   - Énfasis en **marca visual** → explorar **18M-C**.
   - Énfasis en **confianza numérica / BOM** → explorar **18M-D**.
   - Énfasis en **productividad en -01** → explorar **18M-E** antes que más UI.

---

## Referencias

- [trameado-functional-validation.md](./trameado-functional-validation.md) — validación 18L con PDFs reales
- [trameado-mvp-proposal.md](./trameado-mvp-proposal.md) — roadmap y fases
- [trameado-technical-model.md](./trameado-technical-model.md) — modelo hoja/tramos
- [internal-release-checklist.md](./internal-release-checklist.md) — checklist release general

---

*Checklist Fase 18N-A — jun 2026. Sin cambios productivos.*
