# Runbook — demo MVP Trameado

> **Fase 18P-C** — Guía operativa corta para demo interna seria post-push.  
> **Caso principal:** HL-1289-02 · **Sin funcionalidad nueva**

---

## Objetivo

Enseñar en 10–15 minutos cómo un ingeniero pasa de un isométrico vectorial a un **entregable combinado** (Excel + PDF marcado + resumen de validación), con asistencia supervisada en cada paso.

**Mensaje clave:**

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

### 1. Contexto (30 s)

Mostrar layout: PDF + cotas a la izquierda; hoja + tramos a la derecha.

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
