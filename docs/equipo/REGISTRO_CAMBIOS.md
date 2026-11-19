# Registro de cambios — EduAmigo

Aquí se anota cada cambio autorizado y aplicado en este proyecto, del más reciente al más antiguo. No se anotan las auditorías ni los análisis de solo lectura.

## Plantilla

```
### CAM-XXX — <título corto>
- Fecha: AAAA-MM-DD
- Incidencia(s): INC-XXX
- Autorización: <fecha y texto literal o resumen fiel del "sí" del usuario>
- Agente(s): <quién implementó / quién revisó>
- Archivos modificados:
  - <ruta> — <qué cambió>
- Motivo: <por qué>
- Riesgos identificados: <…>
- Pruebas realizadas: <qué se ejecutó, dónde (copia aislada / proyecto), resultado con el código original y con el corregido>
- Revisión independiente: <agente y resultado, o "no aplica">
- Cómo revertir: <…>
- Estado: Aplicado / Revertido
```

## Cambios

### CAM-001 — Documentación de incorporación a la cartera
- **Fecha**: 2026-11-19
- **Incidencias**: ninguna. Registra INC-001 a INC-021 de la auditoría de incorporación.
- **Autorización**: el 19/11/2026 el usuario respondió «Sí, créalos» a la pregunta «¿Creo la documentación y los registros en el proyecto con estas propuestas?».
- **Agentes**: el director de proyecto escribió los documentos. Los hallazgos proceden de `arquitecto-software` y `auditor-ciberseguridad`.
- **Archivos creados**:
  - `CLAUDE.md`: instrucciones del proyecto;
  - `docs/proyecto/CONTEXTO_AGENTES.md`: contexto para los especialistas;
  - `docs/proyecto/PRUEBAS_Y_VERIFICACION.md`: cómo probar en una copia aislada; la línea base está pendiente;
  - `docs/equipo/REGISTRO_INCIDENCIAS.md`: incidencias INC-001 a INC-021;
  - `docs/equipo/REGISTRO_CAMBIOS.md`: este registro.
- **Motivo**: incorporar EduAmigo a la cartera según las plantillas de `00_COORDINACION/plantillas/`.
- **Riesgos identificados**: ninguno. Solo se ha añadido documentación; no se ha tocado código, configuración ni datos.
- **Pruebas realizadas**: no aplica (solo documentación).
- **Revisión independiente**: no aplica.
- **Cómo revertir**: borrar los cinco archivos creados.
- **Estado**: Aplicado. No se ha hecho commit.
