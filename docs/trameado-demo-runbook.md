# Runbook — demo MVP Trameado

> **Fase 18P-C** — Guía operativa corta para demo interna seria post-push.  
> **Caso principal:** HL-1289-02 · **Sin funcionalidad nueva**

---

## Objetivo

Enseñar en 10–15 minutos cómo un ingeniero pasa de un isométrico vectorial a un **entregable combinado** (Excel + PDF marcado + resumen de validación), con asistencia supervisada en cada paso.

**Mensaje clave:**

> Trameado semiautomático supervisado: la app propone, valida y empaqueta; el ingeniero revisa.

---

## Metadatos sugeridos (18S-B)

Tras subir planos, el detalle del plano muestra una tarjeta **Confirma los metadatos del plano** con propuesta desde el nombre del archivo (ej. `2301GB47G-C1-L-HL-1289-01.pdf` → línea `HL-1289`, revisión `01`).

- El usuario revisa y pulsa **Confirmar metadatos**; no hay auto-guardado silencioso.
- **Analizar relación de materiales** queda despriorizado hasta confirmar metadatos.
- El flujo del trabajo recomienda **Confirmar metadatos** antes de materiales o palillería.

## Limpieza de duplicidades (18S-C)

Con metadatos pendientes y tarjeta de confirmación visible:

- No aparece el banner rosa «Faltan metadatos» ni un segundo CTA de confirmar.
- La tarjeta superior es el único foco principal.
- La pestaña Metadatos pasa a **Ajuste manual de metadatos** (secundaria); «Detectar metadatos» se oculta mientras hay propuesta automática.
- Tras confirmar, desaparece la tarjeta y el flujo avanza a materiales.

## Opciones avanzadas plegadas (18S-D)

Con metadatos pendientes, la pestaña Metadatos muestra solo un bloque **Opciones avanzadas** cerrado por defecto.

- El usuario ve la tarjeta de confirmación y pulsa **Confirmar metadatos**; no aparecen botones de estado, guardado manual ni diagnóstico hasta desplegar.
- Al abrir **Mostrar opciones avanzadas** siguen disponibles estado, ajuste manual y herramientas de diagnóstico.
- Con metadatos ya confirmados, la pestaña Metadatos vuelve al layout normal (sin plegado).

## Transición tras confirmar metadatos (18S-E)

Tras pulsar **Confirmar metadatos**:

- La pantalla abre **Propuesta beta** y muestra la tarjeta **Analiza la relación de materiales** con CTA principal.
- El banner operativo indica el siguiente paso; la pestaña Metadatos pasa a **Herramientas avanzadas** plegadas (sin «Detectar metadatos» como acción principal).
- La guía del trabajo avanza cuando todos los planos tienen metadatos confirmados.
- Si quedan otros planos pendientes en el trabajo, el plano confirmado puede analizar materiales localmente mientras el trabajo global sigue pidiendo confirmar metadatos.

## Foco único en análisis de materiales (18S-F)

Con metadatos confirmados y materiales sin analizar en Propuesta beta:

- Solo la tarjeta **Analiza la relación de materiales** muestra el CTA principal.
- El banner operativo superior se oculta para no repetir el mismo botón.
- El asistente beta queda plegado en **Detalles del asistente beta** hasta completar el análisis.
- Tras analizar, la tarjeta desaparece y el asistente beta recupera el flujo normal de revisión e importación.

## Mini guía de flujo dentro del plano (18S-I)

En el detalle de cada plano, encima de las pestañas del workspace:

- Brújula compacta con **Paso X de 8** y el recorrido Trabajo → … → Entrega.
- El paso actual del plano queda resaltado; nota: «Este es el avance de este plano dentro del trabajo».
- Acceso a **Ver conceptos básicos** sin volver a la página del trabajo.
- No añade CTAs ni duplica la tarjeta grande del flujo del trabajo.

## Contexto de flujo y conceptos básicos (18S-H)

- Numeración **Paso X de 8** en la guía del trabajo, tarjetas protagonistas de plano y wizard de Trameado.
- Acordeón **Ver conceptos básicos** en el flujo del trabajo: palillería, trameado y paquete.
- Subtítulos breves en pestañas Propuesta beta, Palillería y Trameado.
- No cambia lógica de análisis, importación ni exports; reduce explicación verbal en demo.

## Foco único en revisión de propuesta beta (18S-G)

Tras analizar materiales:

- Desaparece la tarjeta de análisis; aparece **Revisa la propuesta beta** con resumen y CTA único (seleccionar recomendadas o importar).
- El asistente técnico queda plegado en **Detalles de la propuesta beta** (listas, filtros, tabla).
- El banner operativo sigue oculto en Propuesta beta hasta importar o salir del paso.
- No cambia la lógica de análisis ni importación.

---

## Flujo del trabajo (18S-A)

En el **detalle del trabajo**, la tarjeta **Flujo del trabajo** orienta el proceso completo: planos → metadatos → materiales → propuesta → palillería → Trameado → entrega.

- **Diferencia con el modo guiado de palilleo (18R-B):** el flujo del trabajo es la brújula global del trabajo; el wizard de Trameado guía una hoja concreta dentro de un plano.
- **No añade** automatización ni descarga global del trabajo; la entrega sigue descargándose plano a plano.
- Úsalo al inicio de la demo para explicar el recorrido antes de entrar en HL-1289-02.

---

## Modo guiado (18R-A / 18R-B)

En la pestaña Trameado, la tarjeta **Modo guiado de palilleo** ordena el flujo en 6 pasos con checklist compacto. Úsala como hilo conductor de la demo; la UI avanzada sigue disponible debajo para ajustes manuales.

**18R-B — pulido UX:** pasos completados se muestran en una línea (título + resumen); el paso activo tiene más contraste y un CTA principal único; al terminar aparece el banner «Hoja lista para revisar o entregar» con descarga destacada. No cambia lógica de tramos, validación ni permisos.

Mensaje para la audiencia:

> Trameado semiautomático supervisado: la app propone, valida y empaqueta; el ingeniero revisa.

---

## Antes de enseñar (checklist)

- [ ] `npm run dev` en marcha (o entorno desplegado accesible).
- [ ] PDF `2301GB47G-C1-L-HL-1289-02.pdf` subido al trabajo de demo.
- [ ] Takeoff beta ejecutado en el plano (para ISO, Ø, SCH y referencia BOM).
- [ ] Usuario **engineer** para el flujo completo; **viewer** preparado para el cierre de permisos.
- [ ] Hoja **HL-1289-A010AA-N-02** con 3 tramos (100 / 120 / 170 mm) y 3 marcas — o crearla en vivo siguiendo los pasos.
- [ ] Opcional: `npm run validate:trameado-functional` → bloque HL-1289-02 OK.

Documentación de respaldo:

- [trameado-demo-checklist.md](./trameado-demo-checklist.md) — guion extendido
- [trameado-mvp-demo-report.md](./trameado-mvp-demo-report.md) — evidencia 18P-A
- [trameado-hardening-report.md](./trameado-hardening-report.md) — permisos 18P-B

---

## Ruta a abrir

```
http://localhost:3000/companies/{companyId}/jobs/{jobId}/drawings/{drawingId}
```

1. Entrar al **trabajo** que contiene HL-1289-02.
2. Abrir el **detalle del plano** (`2301GB47G-C1-L-HL-1289-02`).
3. Pestaña **Trameado**.

En seed E2E la ruta es análoga a:

`/companies/seed-company-e2e/jobs/seed-job-e2e/drawings/{id-del-plano}`

---

## Caso principal: HL-1289-02

| Campo | Valor esperado |
|-------|----------------|
| Archivo | `2301GB47G-C1-L-HL-1289-02.pdf` |
| Hoja | HL-1289-A010AA-N-02 |
| CLASE | A010AA |
| Ø / SCH | 3/4" / 80 |
| Tramos golden | 100, 120, 170 mm |
| Σ PALILLO | 390 mm / 0,39 m |
| Referencia BOM | 0,4 m |
| Diferencia | 2,5 % |
| Estado validación | Parece razonable |
| Marcado | 3/3 |

---

## Pasos de demo (orden)

### 0. Modo guiado (opcional, 30 s)

Señalar la tarjeta **Modo guiado** y el checklist Hoja → Sugerencias → Tramos → Marcas → Validación → Paquete.

### 1. Contexto (30 s)

Mostrar layout: PDF + cotas a la izquierda; wizard + hoja + tramos a la derecha.

### 2. Hoja de palilleo (1 min)

- Crear o mostrar hoja **HL-1289-A010AA-N-02**.
- Comprobar ISO, CLASE, Ø, SCH desde asistente/BOM.

### 3. Cotas y tramos sugeridos (2 min)

- Panel **Cotas candidatas**: 170, 100, 120 en alta confianza.
- Panel **Tramos sugeridos**: aceptar 100 / 120 / 170; dejar 85 / 339 como «revisar».
- Confirmar tramos en tabla (p. ej. Nº &lt;2&gt;, &lt;4&gt;, &lt;6&gt;).

### 4. Validación de hoja (1 min)

- Panel **Validación**: 390 mm, 0,4 m BOM, 2,5 %, «Parece razonable».
- Decir: orientativa, no bloquea export.

### 5. Marcado del isométrico (2 min)

- **Marcar en plano** para cada tramo.
- Resumen **3/3**; recargar → marcas persisten.

### 6. Exports individuales (1 min)

- **Exportar Excel** → columnas de taller.
- **Exportar PDF marcado** → etiquetas Nº 2 / 4 / 6.

### 7. Paquete de entrega (1 min)

- **Descargar paquete** → ZIP con:
  - `hoja-palilleo.xlsx`
  - `iso-marcado.pdf`
  - `resumen-validacion.txt`
  - `resumen-validacion.json`

### 8. Viewer (1 min)

- Sesión **viewer**: ve hoja, marcas y puede descargar paquete.
- No ve crear/editar tramos ni marcar/borrar.

### 9. Cierre (30 s)

Repetir mensaje clave y limitaciones (ver abajo).

---

## Datos esperados en entregables

### XLSX / ZIP `hoja-palilleo.xlsx`

| Nº | PALILLO | Ø | SCH. | ISO |
|----|---------|---|------|-----|
| &lt;2&gt; | 100 | 3/4" | 80 | HL-1289-A010AA-N-02 |
| &lt;4&gt; | 120 | 3/4" | 80 | HL-1289-A010AA-N-02 |
| &lt;6&gt; | 170 | 3/4" | 80 | HL-1289-A010AA-N-02 |

### `resumen-validacion.txt` / `.json`

- `status`: reasonable / «Parece razonable»
- `totalPalilloMm`: 390
- `referencePipeLengthM`: 0.4
- `deltaPct`: 2.5
- `markedCount`: 3 / `totalSegmentCount`: 3

---

## Limitaciones que hay que decir claramente

| Limitación | Qué decir |
|------------|-----------|
| No automático total | Cada tramo y marca requiere confirmación del ingeniero |
| Planos -01 largos | Sugerencias automáticas no fiables; flujo más manual |
| Coordenadas relativas | Marcas dependen del visor, no de CAD |
| PDF marcado aproximado | Revisar colocación antes de entregar al taller |
| Validación BOM | Orientativa; Σ PALILLO ≠ metros tubería en muchos casos |
| Sin geometría auto | No hay motor vectorial de tuberías ni iso trameado perfecto |
| Criterio ingeniero | La app **no sustituye** el criterio del ingeniero |

---

## Smoke post-push (18P-C)

Comandos mínimos tras push o antes de demo en entorno limpio:

```bash
npx prisma generate
npx prisma migrate status   # debe: Database schema is up to date
npm run verify:trameado
npm run validate:trameado-functional
npm run build
npm run test:e2e -- tests/e2e/trameado-permissions.spec.ts
npm run test:e2e -- tests/e2e/trameado-package.spec.ts
```

Migración de anotaciones requerida en BD destino:

`prisma/migrations/20260610071824_add_trameado_annotations/`

---

## Veredicto demo

| Criterio | Estado (jun 2026) |
|----------|-------------------|
| Flujo HL-1289-02 completo | ✅ Validado (18P-A manual + scripts) |
| Permisos viewer/engineer | ✅ 18P-B + E2E |
| Push razonable | ✅ Tras aplicar migraciones en entorno destino |
| Bloqueantes conocidos | Ninguno |

---

*Runbook Fase 18P-C — demo interna MVP Trameado post-push.*
