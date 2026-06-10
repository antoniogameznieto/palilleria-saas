# Reporte de validación MVP — trameado/palilleo asistido

> **Fase 18P-A** — Cierre del bloque MVP con validación end-to-end real y documentada.  
> **Fecha:** junio 2026 · **Caso principal:** HL-1289-02 / HL-1289-A010AA-N-02

---

## Objetivo

Comprobar que el flujo completo de trameado/palilleo asistido funciona de extremo a extremo y puede enseñarse como **demo interna** o **validación con usuario técnico**, sin prometer automatización total.

**Flujo validado:**

```
PDF original
  → pestaña Trameado
  → crear hoja de palilleo
  → revisar cotas candidatas
  → usar tramos sugeridos
  → confirmar tramos
  → validar hoja contra BOM
  → marcar isométrico
  → exportar PDF marcado
  → descargar paquete ZIP
  → revisar entregables
```

**Documentos relacionados:**

- [trameado-demo-checklist.md](./trameado-demo-checklist.md) — guion operativo para repetir la demo
- [trameado-functional-validation.md](./trameado-functional-validation.md) — evidencia funcional por fase
- [trameado-mvp-proposal.md](./trameado-mvp-proposal.md) — roadmap y criterios MVP
- [trameado-hardening-report.md](./trameado-hardening-report.md) — hardening QA 18P-B

---

## Estado Git al cierre (18P-A)

Rama `main`, working tree limpio, **8 commits** por delante de `origin/main`.

| Commit | Fase | Descripción |
|--------|------|-------------|
| `588ae09` | **18O-A** | `feat(trameado): suggest supervised palilleo segments` |
| `ba7ccb7` | **18O-B** | `feat(trameado): validate palilleo sheet totals` |
| `2291f82` | **18O-C** | `feat(trameado): mark confirmed segments on drawing overlay` |
| `97baa5f` | **18O-D** | `feat(trameado): persist isometric segment marks on sheet` |
| `1adb698` | **18O-E** | `feat(trameado): export marked isometric PDF from sheet` |
| `6e61985` | **18O-F** | `feat(trameado): export delivery package for palilleo sheet` |

Fases 18O-A … 18O-F presentes y encadenadas en `main`.

---

## Caso principal de demo

| Aspecto | Valor |
|---------|-------|
| Plano | `2301GB47G-C1-L-HL-1289-02.pdf` |
| Identificador | **HL-1289-02** |
| Hoja | **HL-1289-A010AA-N-02** |
| CLASE | A010AA |
| Ø / SCH (asistente) | 3/4" / SCH 80 |
| Golden PALILLO | 100, 120, 170 mm |
| Referencia BOM | 0,4 m tubería 3/4" SCH 80 |
| Σ PALILLO esperado | 390 mm → 0,39 m → **2,5 %** vs BOM |

**Justificación:** plano corto del paquete `Ejemplos/Ejemplo 1`; las tres cotas golden aparecen en panel de cotas y en tramos sugeridos; la validación BOM es clara y didáctica; permite recorrer todo el MVP en pocos minutos.

---

## Recorrido end-to-end documentado

### Paso 1 — Abrir plano

1. Entrar al **trabajo** con el PDF subido y takeoff beta ejecutado.
2. Abrir detalle de **HL-1289-02**.
3. Pestaña **Trameado**.

**Resultado:** layout dos columnas (PDF + cotas a la izquierda; hoja + tramos a la derecha). Flujo numerado visible en cabecera.

---

### Paso 2 — Crear hoja

1. Usar asistente o **Crear hoja de palilleo** con identificador **HL-1289-A010AA-N-02**.
2. Comprobar metadatos heredados del BOM.

| Campo | Esperado | Obtenido |
|-------|----------|----------|
| ISO / línea | HL-1289-A010AA-N-02 | ✅ |
| CLASE | A010AA | ✅ |
| Ø | 3/4" | ✅ |
| SCH | 80 | ✅ |

---

### Paso 3 — Tramos sugeridos

1. Revisar panel **Tramos sugeridos** (18O-A).
2. Aceptar o preparar desde sugerencias de alta confianza:

| PALILLO (mm) | Acción | Confianza sugerida |
|--------------|--------|-------------------|
| 100 | Confirmado en hoja | Alta confianza |
| 120 | Confirmado en hoja | Alta confianza |
| 170 | Confirmado en hoja | Alta confianza |
| 85 | Descartado / no usado | Revisar |
| 339 | Descartado / no usado | Revisar |

**Nota:** el panel propone hasta 5 tramos; el ingeniero decide cuáles incorporar. No hay guardado automático hasta **Añadir a hoja** o **Confirmar tramo**.

---

### Paso 4 — Tabla de tramos

Tramos confirmados en la hoja:

| Nº | PALILLO (mm) | Ø | SCH. | CLASE |
|----|--------------|---|------|-------|
| &lt;2&gt; | 100 | 3/4" | 80 | A010AA |
| &lt;4&gt; | 120 | 3/4" | 80 | A010AA |
| &lt;6&gt; | 170 | 3/4" | 80 | A010AA |

ISO en export: **HL-1289-A010AA-N-02**.

Los números de tramo &lt;2&gt;/&lt;4&gt;/&lt;6&gt; provienen de las etiquetas sugeridas por el asistente (no necesariamente &lt;1&gt;/&lt;2&gt;/&lt;3&gt; secuenciales).

---

### Paso 5 — Validación de hoja (18O-B)

Panel **Validación de hoja**:

| Métrica | Esperado | Obtenido |
|---------|----------|----------|
| Tramos confirmados | 3 | ✅ 3 |
| Total PALILLO | 390 mm / 0,39 m | ✅ |
| Referencia BOM | 0,4 m | ✅ |
| Diferencia | 2,5 % | ✅ |
| Estado | Parece razonable | ✅ |

La validación es **orientativa**; no bloquea export ni marcar revisada.

---

### Paso 6 — Marcado del isométrico (18O-C / 18O-D)

1. **Marcar en plano** para Nº 2, Nº 4 y Nº 6 (punto o rectángulo).
2. Resumen: **Tramos marcados: 3/3**.
3. Recarga de página: marcas **persisten** (18O-D).

---

### Paso 7 — Export individual

| Export | Requisito | Resultado |
|--------|-----------|-----------|
| **Exportar Excel** (XLSX) | ≥1 tramo | ✅ Abre; columnas ISO, CLASE, Nº, Ø, SCH., PALILLO, COLADA |
| **Exportar PDF marcado** | ≥1 marca | ✅ Abre; plano original + relación de materiales + etiquetas Nº 2 / Nº 4 / Nº 6; pie «PDF marcado · HL-1289-A010AA-N-02» |

---

### Paso 8 — Paquete ZIP (18O-F)

**Descargar paquete** con hoja completa y marcas:

| Entrada ZIP | Presente | Contenido verificado |
|-------------|----------|----------------------|
| `hoja-palilleo.xlsx` | ✅ | 3 tramos; ISO, CLASE, Ø, SCH correctos |
| `iso-marcado.pdf` | ✅ | Etiquetas Nº 2/4/6; pie de hoja |
| `resumen-validacion.txt` | ✅ | Estado, totales, BOM, 3/3, nota prudente |
| `resumen-validacion.json` | ✅ | `status: reasonable`, `totalPalilloMm: 390`, `deltaPct: 2.5`, `includesMarkedPdf: true` |

Nombre ZIP: `trameado-paquete-HL-1289-A010AA-N-02.zip`.

---

## Checklist de resultado

| Paso | Resultado esperado | Resultado obtenido | Estado | Notas |
|------|-------------------|-------------------|--------|-------|
| 1 — Abrir plano | Pestaña Trameado carga PDF y paneles | Layout correcto; flujo visible | **OK** | — |
| 2 — Crear hoja | ISO/CLASE/Ø/SCH desde BOM | HL-1289-A010AA-N-02; A010AA; 3/4"; SCH 80 | **OK** | Requiere takeoff previo para asistente |
| 3 — Tramos sugeridos | 100/120/170 usables; 85/339 revisar | 3 golden confirmados; 2 descartados | **OK** | Supervisado por diseño |
| 4 — Tabla tramos | &lt;2&gt;/&lt;4&gt;/&lt;6&gt; con PALILLO correcto | Coincide con golden | **OK** | Nº sugeridos, no secuenciales |
| 5 — Validación | 390 mm; 0,4 m; 2,5 %; razonable | Coincide | **OK** | `validate-trameado-functional` alineado |
| 6 — Marcado | 3/3; persistencia tras recarga | Marcas visibles tras F5 | **OK** | E2E `trameado-annotations` |
| 7 — Export XLSX/PDF | Archivos abren con datos correctos | Validado manualmente | **OK** | PDF marcado aproximado |
| 8 — Paquete ZIP | 4 entradas; resumen coherente | Validado manualmente | **OK** | Primer entregable combinado |
| Viewer — lectura | Ve hoja, marcas, exports | Sin botones de edición | **OK** | E2E package + marked-pdf |
| Viewer — restricción | No edita tramos ni marcas | Confirmado | **OK** | — |

**Resumen:** 10/10 **OK** en el caso HL-1289-02.

---

## Bugs y fricciones

### Bugs bloqueantes

**Ninguno** detectado en la validación 18P-A del caso principal.

### Fricciones menores (no bloqueantes)

| Fricción | Impacto | Mitigación actual |
|----------|---------|-------------------|
| Hay que **crear hoja** antes de preparar tramo | Confusión inicial si se salta el paso | Tarjeta vacía + aviso en cotas; documentado en demo |
| **Varios botones de export** (CSV, Excel, PDF, paquete) en la misma fila | Puede abrumar en pantallas estrechas | Orden lógico; paquete como entregable principal |
| Nº de tramo **no secuencial** (&lt;2&gt;/&lt;4&gt;/&lt;6&gt;) al usar sugerencias | Puede sorprender al taller acostumbrado a &lt;1&gt;…&lt;n&gt; | Editable manualmente; coherente con etiquetas del iso |
| **PDF marcado** con colocación aproximada | Etiquetas pueden no coincidir con CAD | Disclaimer en UI y resumen; revisión ingeniero |
| **Paquete sin marcas** omite `iso-marcado.pdf` | Puede esperarse siempre el PDF | Hint en botón + nota en resumen |
| **-01 largos** no tienen sugerencias fiables | Flujo distinto al de -02 | Panel indica `unreliable`; no aplica a este caso |

### Incidencias históricas (ya resueltas antes de 18P-A)

- Caché de cliente Prisma tras migración de anotaciones → resuelto en 18O-D.
- Estado de arrastre en overlay de marcas → resuelto en 18O-C.
- E2E de PDF marcado tras recarga → espera `data-saving="false"` añadida.

---

## Viewer

Validado por E2E y coherente con permisos de producto:

| Capacidad | Estado |
|-----------|--------|
| Ver hoja y tramos | ✅ |
| Ver marcas persistidas en PDF | ✅ |
| Descargar CSV / Excel | ✅ |
| Descargar PDF marcado (si hay marcas) | ✅ |
| Descargar paquete ZIP (si hay tramos) | ✅ |
| Crear/editar hoja o tramos | ❌ (correcto) |
| Marcar / borrar en isométrico | ❌ (correcto) |
| Marcar hoja revisada | ❌ (correcto) |

---

## Límites actuales del MVP

El sistema es **semiautomático supervisado**. El ingeniero confirma cada tramo, marca y export.

| Límite | Detalle |
|--------|---------|
| **-01 largos** | Muchas cotas; sugerencias automáticas marcadas como no fiables (`unreliable`) |
| **Agrupación / sumas** | No agrupa cotas por tramo lógico ni suma longitudes automáticamente |
| **Coordenadas** | Marcas en espacio relativo del visor (0–1), no X/Y PDF reales |
| **PDF marcado** | Superposición prudente con `pdf-lib`; no iso trameado de taller |
| **Geometría** | Sin motor vectorial de tuberías ni topología del iso |
| **Validación BOM** | Orientativa; Σ PALILLO ≠ metros tubería en muchos casos reales |
| **OCR / visión** | Fuera de alcance; input vectorial embebido en PDF |
| **Cierre automático** | No hay «aprobar hoja» bloqueante ni entrega sin revisión humana |

---

## Estado del MVP

| Valoración | Conclusión |
|------------|------------|
| **Demo interna** | ✅ **Listo** — flujo HL-1289-02 reproducible y documentado |
| **Validación con usuario técnico** | ✅ **Listo** — entregables (XLSX, PDF marcado, ZIP) revisables en sesión |
| **Automatización total sin revisión** | ❌ **No listo** — por diseño; -01 y geometría pendientes |
| **Release / push a remoto** | ⏳ Recomendable **18P-B** (hardening QA) antes de publicar |

**Siguiente gran decisión de producto:** según feedback de usuario técnico, priorizar **mejora de -01 largos** (18Q-A) o **coordenadas PDF reales** (18Q-B).

---

## Próximas fases propuestas

| Fase | Objetivo |
|------|----------|
| **18P-B** | Hardening QA, permisos y smoke antes de push/release |
| **18Q-A** | Mejorar -01 largos / agrupación de cotas |
| **18Q-B** | Coordenadas PDF reales (visor → página con precisión) |
| **18Q-C** | Export PDF marcado más fiel al iso trameado de taller |
| **18Q-D** | Modo «aceptar sugerencias» batch para -02 |

### Recomendación

1. **Primero 18P-B** — consolidar tests, permisos y checklist de release con los 8 commits locales.
2. **Luego** decidir entre **18Q-A** o **18Q-B** según feedback: si el dolor es planos largos → 18Q-A; si el dolor es precisión de marcas en PDF → 18Q-B.

---

## Evidencia automatizada (18P-A)

Scripts y E2E ejecutados en cierre (ver salida en terminal del agente / CI local):

```bash
npm run verify:trameado
npm run validate:trameado-functional
npm run lint
npm run build
npm run test:e2e -- tests/e2e/trameado-package.spec.ts
npm run test:e2e -- tests/e2e/trameado-marked-pdf.spec.ts
npm run test:e2e -- tests/e2e/trameado-annotations.spec.ts
```

**No ejecutado:** suite E2E completa (`npm run test:e2e`).

---

*Reporte Fase 18P-A — cierre MVP trameado/palilleo asistido. Caso HL-1289-02 validado manualmente (entregables) y respaldado por scripts + E2E específicos.*
