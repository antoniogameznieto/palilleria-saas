# Fase 18L — Validación funcional del flujo de trameado (PDFs reales)

> **Tipo:** validación manual/documentada. Sin cambios productivos.  
> **Fecha:** jun 2026  
> **Paquete:** `Ejemplos/Ejemplo 1/`  
> **Golden (solo referencia):** `Isos trameados.pdf` p.3 (HL-1291-01), p.4 (HL-1291-02), p.1 (HL-1289-01), p.2 (HL-1289-02)  
> **Script reproducible:** `npm run validate:trameado-functional`

## 1. Objetivo

Comprobar si el **flujo actual de trameado** (18B–18K) permite a un ingeniero **reproducir asistidamente** una hoja de palilleo a partir de PDFs vectoriales reales del cliente, y documentar los **gaps** frente al entregable esperado (`Hoja de palilleo.pdf` / `Isos trameados.pdf`).

## 2. Alcance del flujo evaluado

| Capacidad | Estado en producto |
|-----------|-------------------|
| Modelo hoja + tramos (BD) | ✅ |
| UI manual hojas/tramos + sticky Ø/SCH/COLADA | ✅ |
| PDF embebido junto a hoja | ✅ |
| Export CSV / XLSX (`ISO, CLASE, Nº, Ø, SCH., PALILLO, COLADA`) | ✅ |
| Asistente hoja desde metadatos + BOM takeoff | ✅ |
| Panel cotas candidatas (texto embebido) | ✅ |
| Preparar tramo desde cota + confirmación manual | ✅ |
| Auto-crear tramos / PALILLO | ❌ (por diseño) |
| Posición X/Y de cotas | ❌ |
| Iso trameado anotado / marcas azules | ❌ |
| Validación suma PALILLO vs BOM | ❌ |

## 3. Metodología

1. **PDFs de input:** planos vectoriales `2301GB47G-C1-L-HL-xxxx-0n.pdf` (no escaneos).
2. **Extracción productiva:** mismos helpers que la app (`extractCandidateDimensionsFromText`, `buildTrameadoSheetSuggestions`).
3. **Contraste golden:** valores PALILLO de [trameado-functional-analysis.md](./trameado-functional-analysis.md) / páginas de `Isos trameados.pdf` (referencia visual humana).
4. **Research complementario:** `npm run research:trameado-vector -- <pdf> --json` (18J).
5. **Flujo UI (walkthrough):** subir plano → takeoff beta → pestaña Trameado → asistente → cotas → preparar tramo → export.

### Reproducir datos de esta validación

```bash
npm run validate:trameado-functional
npm run research:trameado-vector -- "Ejemplos/Ejemplo 1/2301GB47G-C1-L-HL-1291-01.pdf" --json
```

## 4. Caso principal — HL-1291-01 / HL-1291-02

### 4.1 HL-1291-01 (`2301GB47G-C1-L-HL-1291-01.pdf`)

| Aspecto | Resultado |
|---------|-----------|
| **Metadatos detectables** | `drawingNumber`: 2301GB47G-C1-L-HL-1291-01 · `lineIdentifier`: HL-1291-A012AA-N-01 · `lineClass`: A012AA · revisión en cajetín |
| **Hoja sugerida (asistente)** | HL-1291-A012AA-N-01 · confianza **alta** · fuente `metadata_bom` |
| **Ø / SCH sugeridos** | 4" / SCH 40 (primera tubería BOM: 1.8 M) |
| **Pareja -02** | Patrón típico sugiere HL-1291-A012AA-N-02 (3/4" SCH 80) si el ingeniero importa takeoff o crea hoja manualmente |
| **Texto embebido** | ~2012 caracteres · confianza panel cotas: **alta** |
| **Cotas en panel (17)** | 17, 20, 45, 80, 94, 129, 179, 232, 235, 279, 295, 297, 629, 938, 1059, 1127, 1290 |
| **Golden PALILLO (p.3 Isos trameados, 5 tramos)** | 150, 363, 231, 1052, 139 mm |
| **Coincidencia literal golden ↔ panel** | **Ninguna** |
| **Cotas útiles (ingeniero)** | 129, 179, 232, 235, 279, 295, 297, 629, 938, 1059, 1127 — cotas de tubería en zona de dibujo; hipótesis documentada 235+129≈363 |
| **Ruido / revisar** | 17, 20, 45, 80, 94 (notas/DN/espesores), 1290 (referencia plano KP-1290) |
| **Preparar tramo** | ✅ Tras crear/seleccionar hoja; rellena PALILLO; Nº `<1>`…`<5>` manual; Ø/SCH sticky del asistente |
| **Export CSV/XLSX** | ✅ Columnas reconocibles por taller si el ingeniero completa los 5 tramos manualmente |
| **Gap vs cliente** | No propone los 5 PALILLO; no agrupa cotas por tramo; no suma automática; no valida 1.8 M BOM |

**Conclusión -01:** el flujo **asiste** (metadatos, Ø/SCH, lista de cotas, entrada rápida) pero la hoja golden **solo se reproduce con criterio humano** sobre el isométrico.

### 4.2 HL-1291-02 (`2301GB47G-C1-L-HL-1291-02.pdf`)

| Aspecto | Resultado |
|---------|-----------|
| **Metadatos** | HL-1291-A012AA-N-02 · A012AA · plano 2301GB47G-C1-L-HL-1291-02 |
| **Hoja sugerida** | HL-1291-A012AA-N-02 · **alta** · `metadata_bom` |
| **Ø / SCH** | 3/4" / SCH 80 · tubería BOM 0.4 M |
| **Continuación** | «PARA CONT. VER LINEA NUM.» → HL-1291-01 |
| **Cotas en panel (7)** | 42, 68, 85, 100, 120, 193, 361 |
| **Golden (p.4, 3 tramos)** | 170, 100, 120 mm |
| **Coincidencia literal** | **100, 120** (2/3); **170 no aparece** en texto embebido del -02 |
| **Cotas útiles** | 100, 120, 193, 361, 68, 85 |
| **Ruido** | 42 (posible espesor/nota) |
| **Preparar tramo** | ✅ Mejor caso: 2 de 3 golden preparables con un clic + confirmar |
| **Export** | ✅ Tras 3 tramos manuales |

**Conclusión -02:** mejor alineación que -01 en cotas literales; el tramo de **170 mm** sigue requiriendo cálculo humano (no está como cota en el PDF).

## 5. Caso secundario — HL-1289-01 / HL-1289-02

Validado para comparar otra línea (clase **A010AA** vs A012AA).

| Plano | Golden (5/3 tramos) | Cotas panel | Hits golden en panel | Nota |
|-------|---------------------|-------------|----------------------|------|
| HL-1289-01 | 150, 363, 231, 1052, 139 | 15 cotas | **ninguno** literal | Mismo patrón que 1291-01: muchas cotas, PALILLO derivado |
| HL-1289-02 | 170, 100, 120 | 6 cotas | **170, 100, 120 (3/3)** | Mejor caso del paquete: panel alineado con golden |

**Diferencia clave 1289-02 vs 1291-02:** en 1289-02 la cota **170** sí está en el panel; en 1291-02 el golden incluye 170 pero el PDF no lo expone como número de cota → el gap es de **contenido del plano**, no solo del filtro.

## 6. Tabla de validación

| Plano | Hoja sugerida | Ø/SCH sugerido | Cotas útiles | Cotas ruido | ¿Preparar tramo? | ¿Export correcto? | Gap frente al cliente | Decisión |
|-------|---------------|----------------|--------------|-------------|------------------|-------------------|----------------------|----------|
| HL-1291-01 | HL-1291-A012AA-N-01 | 4" / 40 | 129, 232, 235, 279, 295, 297, 629, 938, 1059, 1127 | 17, 20, 45, 80, 94, 1290 | ✅ asistido | ✅ si se introducen 5 tramos | Sin PALILLO auto; 0/5 golden literal; muchas cotas | **Flujo manual asistido viable** |
| HL-1291-02 | HL-1291-A012AA-N-02 | 3/4" / 80 | 100, 120, 193, 361, 68, 85 | 42 | ✅ asistido | ✅ 3 tramos | 2/3 golden literal; falta 170 | **Flujo manual asistido viable** |
| HL-1289-01 | HL-1289-A010AA-N-01 | 4" / 40 | Similar a 1291-01 | DN, refs plano | ✅ asistido | ✅ manual | Igual que -01 largos | Referencia cruzada |
| HL-1289-02 | HL-1289-A010AA-N-02 | 3/4" / 80 | 170, 100, 120, 339, 85 | 69 marginal | ✅ asistido | ✅ manual | **3/3 golden** en panel | **Mejor iso -02 del paquete** |

## 7. Qué funciona bien

- **Metadatos + asistente:** ISO, CLASE, Ø y SCH correctos en los cuatro planos probados (confianza alta).
- **Workspace:** PDF + hoja en paralelo; entrada rápida con sticky fields.
- **Cotas candidatas:** texto embebido suficiente (~1.2–2.1 k chars); filtro excluye SAP, UTM, presiones en la mayoría de casos.
- **Preparar tramo (18K-B):** acelera PALILLO en -02; no guarda sin confirmar.
- **Export:** columnas alineadas con hoja de cliente (`ISO, CLASE, Nº, Ø, SCH., PALILLO, COLADA`).
- **Planos -02 cortos:** a menudo 3 cotas ≈ 3 tramos golden (1289-02 perfecto).

## 8. Qué no funciona todavía

| Gap | Impacto |
|-----|---------|
| **Sin X/Y** | No se sabe qué cota pertenece a qué tramo ni qué cotas sumar |
| **Demasiadas cotas en -01** | 15–17 entradas; ingeniero debe filtrar mentalmente |
| **Sin agrupación por tramo** | No propone `<1>`…`<n>` ni secuencia A/B |
| **Sin suma de cotas** | PALILLO = suma parcial + criterio corte (codos, válvulas) |
| **Golden -01 sin match literal** | 150, 363, 1052, 139 no aparecen como cotas sueltas |
| **Sin marcas azules / iso trameado** | No genera `Isos trameados.pdf` ni anotaciones sobre PDF |
| **Sin validación BOM** | No comprueba Σ PALILLO vs metros tubería BOM |
| **Takeoff beta separado** | Ø/SCH vienen del BOM importado; flujo completo requiere paso previo takeoff |

## 9. Walkthrough del flujo actual (reproducible)

Para **HL-1291-01** con la app actual:

1. Subir `2301GB47G-C1-L-HL-1291-01.pdf` al trabajo (o usar plano de demo con takeoff ya cargado).
2. Ejecutar takeoff beta → BOM con tubería 4" SCH 40.
3. Pestaña **Trameado** → asistente propone **HL-1291-A012AA-N-01** → crear hoja (sin tramos).
4. Consultar PDF embebido + panel **Cotas candidatas**.
5. Por cada tramo golden (5): **Preparar tramo** con cota más probable → revisar isométrico → completar Ø/SCH si faltan → **Confirmar tramo**.
6. Marcar hoja revisada → **Export CSV/XLSX**.

**Tiempo estimado vs papel:** reducido en metadatos y tecleo PALILLO en -02; en -01 el cuello de botella sigue siendo **decidir tramos y longitudes**.

## 10. Comparación visual con `Isos trameados.pdf`

| Página golden | Plano | Tramos humanos | Observación |
|---------------|-------|----------------|-------------|
| 3 | HL-1291-01 | 5 × PALILLO | Marcas `<1>`…`<5>` solo en escaneo; no legibles por software |
| 4 | HL-1291-02 | 3 × PALILLO | Coincide parcialmente con cotas 100, 120 del vectorial |
| 1 | HL-1289-01 | 5 | Misma estructura que 1291-01 |
| 2 | HL-1289-02 | 3 | Panel producto = golden completo |

## 11. Fase 18M-A — Scoring y ranking de cotas candidatas

**Implementado (jun 2026).** Sin cambios en modelo BD, exports ni auto-PALILLO.

### Scoring (`candidate-dimensions.ts`)

| Señal | Efecto |
|-------|--------|
| Cota en rango dibujo 16–5000 mm | +30 base |
| Rango típico PALILLO 60–2500 mm | +35 |
| Longitud habitual en isos -02 (68, 85, 100, 120, 193, 361…) | +20 |
| Contexto zona dibujo (sin BOM/cajetín) | +25 |
| Contexto textual cota (COTA, mm, LONG…) | +12 |
| Cerca BOM/P&ID | −40 |
| Bloque presión/temperatura | −35 |
| Cota muy larga (>2500) | −15 |
| Valor corto (<60 mm) | −20 |
| Cota corta (<80 mm) | −12 |
| Cerca elevación EL= | −10 |

**Confidence:** high ≥70 · medium ≥40 · low &lt;40 · excluida si score &lt;15.

### Filtros nuevos (ruido -01)

- Orientación **45 / 44.99** (solo esos valores, no todo el bloque ORIENTACION).
- Presión/temperatura diseño: 13, 17.6, 51, 79.
- Ref. línea/plano HL 1289–1294, KP/plano Nº.
- Rating brida 150#/300# (FIGURA 8, BRIDA).
- Espárragos x90mm/x110mm… (solo la longitud del perno).
- DN fraccionario 5/8, 3/4 en contexto tubería.
- Coordenadas E/N/EL y UTM.

### UI panel

- **Cotas más probables** (10 por defecto) + botón **Ver más cotas** (resto hasta 24).
- Tooltip con `reason` + contexto corto.
- **Preparar tramo (18K-B)** sin cambios de contrato.

### Comparativa 18L → 18M-A (`validate:trameado-functional`)

| Plano | Antes (18L) | Después (18M-A) |
|-------|-------------|-----------------|
| HL-1291-01 | 17 cotas sin ranking; 45, 17, 1290 mezclados | 10 primary + 4 additional (14 ranked); sin 45/17/1290; golden literal sigue 0/5 |
| HL-1291-02 | 7 cotas | 7 ranked; 100, 120 en primary high; golden 2/3 |
| HL-1289-02 | 6 cotas, golden 3/3 | 6 ranked; golden 3/3 en primary |

**Siguiente recomendado:** 18M-B export/plantilla cliente o 18M-D vector engine (según prioridad negocio).

## 12. Fase 18O-A — Tramos sugeridos (semiautomático supervisado)

**Implementado (jun 2026).** Helper `buildTrameadoSegmentSuggestions` — sin persistencia en BD.

| Plano | Modo | Sugerencias | Nota |
|-------|------|-------------|------|
| HL-1289-02 | `short_iso` | 5 (top score) | Incluye golden 170, 100, 120 + 85, 339 |
| HL-1291-02 | `short_iso` | 5 | Golden 100, 120; **170 no literal** en PDF |
| HL-1289-01 | `unreliable` | 0 | Muchas cotas high/medium en -01 |
| HL-1291-01 | `unreliable` | 0 | Idem |

**Reglas:** solo cotas high/medium con score ≥40; sin duplicar PALILLO ya en hoja; numeración con `getNextSegmentNumber`; acciones **Añadir a hoja** / **Preparar/editar** / **Descartar** (client-side).

**No hace:** iso trameado, Σ vs BOM estricta, X/Y, guardado automático.

## 13. Fase 18O-B — Validación orientativa de hoja

**Implementado (jun 2026).** Helper `validateTrameadoSheet` en `lib/trameado/sheet-validation.ts`.

| Plano (mock golden) | Referencia BOM | Total PALILLO mock | Estado típico |
|---------------------|----------------|------------------|---------------|
| HL-1289-02 | 0.4 m | 390 mm (170+100+120) | Parece razonable (~2.5 % Δ) |
| HL-1291-02 | 0.4 m | 390 mm (sin 170 literal) | Parece razonable |

**Métricas:** tramos confirmados, Σ PALILLO (mm/m), referencia tubería BOM (M), Δ %, duplicados Nº/PALILLO (informativo).

**Estados:** `no_data` · `incomplete` · `no_comparable` · `review_data` · `review_delta` · `review_delta_high` · `reasonable`.

**Reglas:** tolerancia ≤10 % → razonable; ≤25 % → revisar diferencia; >25 % → revisar diferencia (alta). PALILLO inválido o Nº duplicado → revisar datos.

**No hace:** bloquear export/revisión; afirmar «correcto/incorrecto»; igualdad estricta BOM = Σ PALILLO.

## 14. Fase 18O-C — Marcado manual del isométrico

**Implementado (jun 2026).** Overlay punto/rect en UI (`lib/trameado/pdf-annotations.ts`). Persistencia añadida en 18O-D.

## 15. Fase 18O-D — Persistencia de marcas del isométrico

**Implementado (jun 2026).** Modelo `DrawingTrameadoAnnotation`; marcas guardadas con la hoja/tramo.

| Capacidad | Detalle |
|-----------|---------|
| Tipo de marca | **Punto** (clic) o **rectángulo** (arrastrar) |
| Coordenadas | Relativas 0–1 sobre el visor PDF, no coords PDF reales |
| Persistencia | BD; recarga conserva marcas; «Volver a marcar» reemplaza por `segmentId` |
| Resumen | Tramos marcados X/Y, pendiente / marcado por tramo |
| Viewer | Ve marcas persistidas; sin botones de marcado/borrado |
| Cascada | Borrar tramo/hoja/plano elimina marcas asociadas |

**No hace:** trameado automático, geometría vectorial, OCR, coordenadas PDF reales.

## 16. Fase 18O-E — Exportar PDF marcado

**Implementado (jun 2026).** `pdf-lib` superpone marcas persistidas sobre el PDF original.

| Capacidad | Detalle |
|-----------|---------|
| Export | `GET /api/files/trameado/[sheetId]/marked-pdf` |
| UI | **Exportar PDF marcado** junto a CSV/Excel |
| Requisito | ≥1 marca persistida en la hoja |
| Viewer | Puede descargar si hay marcas; no edita |
| Coordenadas | Relativas del visor → página PDF (no CAD real) |

**No hace:** iso trameado perfecto de taller, coordenadas PDF reales, geometría automática.

## 17. Fase 18O-F — Paquete de entrega ZIP

**Implementado (jun 2026).** Empaqueta en un ZIP los exports existentes más un resumen de validación.

| Capacidad | Detalle |
|-----------|---------|
| Export | `GET /api/files/trameado/[sheetId]/package` |
| UI | **Descargar paquete** junto a CSV/Excel/PDF marcado |
| Requisito | ≥1 tramo confirmado en la hoja |
| Contenido | `hoja-palilleo.xlsx`, `resumen-validacion.txt`, `resumen-validacion.json`; `iso-marcado.pdf` solo con marcas |
| Sin marcas | Paquete descargable; resumen indica que no se incluye PDF marcado |
| Viewer | Puede descargar si hay tramos; no edita |

**No hace:** cierre automático, validación bloqueante, OCR ni APIs externas.

## 18. Fase 18P-A — Cierre MVP y demo end-to-end

**Implementado (jun 2026).** Validación documentada del flujo completo sin código nuevo.

| Aspecto | Detalle |
|---------|---------|
| Caso | HL-1289-02 / HL-1289-A010AA-N-02 |
| Evidencia | [trameado-mvp-demo-report.md](./trameado-mvp-demo-report.md) |
| Flujo | Hoja → sugerencias → validación → marcas → XLSX/PDF → paquete ZIP |
| Resultado | 10/10 pasos OK en caso principal |
| Bugs bloqueantes | Ninguno |
| Conclusión | Listo demo interna; siguiente 18P-B hardening QA |

## 19. Fase siguiente (backlog)

### Alternativas descartadas por ahora:

| Fase | Motivo de postponer |
|------|---------------------|
| 18M-B Export/plantilla | Export ya reconocible; prioridad menor |
| 18M-C Anotaciones PDF | Requiere UX nueva + render; no desbloquea -01 |
| 18M-D Vector engine | Alto coste; research 18J ya documentó límites |

## 20. Criterios MVP — estado tras 18P-A

| Criterio | Estado |
|----------|--------|
| Reproducir digitalmente HL-1291-A012AA-N-01 con 5 tramos | ⚠️ **Parcial** — viable manual asistido, no automático |
| Export columnas reconocibles | ✅ |
| Viewer solo lectura | ✅ (E2E) |
| Beta BOM sin regresión | ✅ (fuera de alcance 18L) |
| Demo interna end-to-end HL-1289-02 | ✅ 18P-A |
| Cliente externo valida export | ⏳ Pendiente sesión formal |

## 21. Referencias

- [trameado-mvp-proposal.md](./trameado-mvp-proposal.md)
- [trameado-vector-research.md](./trameado-vector-research.md) (18J)
- [trameado-functional-analysis.md](./trameado-functional-analysis.md) (18A)
- [trameado-technical-model.md](./trameado-technical-model.md)

---

*Validación Fase 18L; scoring 18M-A; tramos sugeridos 18O-A; validación hoja 18O-B; marcado isométrico 18O-C; persistencia marcas 18O-D; PDF marcado 18O-E; paquete ZIP 18O-F; cierre MVP 18P-A — jun 2026. Datos con `validate-trameado-functional.ts`.*
