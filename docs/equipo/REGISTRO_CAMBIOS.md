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

### CAM-007 — Arranque seguro en producción y en Render (INC-014)
- **Fecha**: 2026-11-19
- **Incidencia(s)**: INC-014
- **Autorización**: el 19/11/2026 el usuario eligió «Completo (1 a 4)» para el plan de INC-014.
- **Agente(s)**: implementó el director de proyecto; revisó `arquitecto-software`.
- **Archivos modificados**:
  - `server.ts`:
    - `PORT = Number(process.env.PORT) || 3000`;
    - nueva constante `IS_PROD` (`NODE_ENV=production`, argumento `--prod` o variable `RENDER`), que fija `NODE_ENV=production`;
    - Vite pasa a importarse de forma dinámica, solo en desarrollo;
    - comprobación al arrancar en producción: si falta `dist/index.html`, o si en Render faltan `TURSO_*` o `S3_*`, muestra un mensaje `[ARRANQUE]` y sale con `exit(1)` antes de abrir la BD;
    - importa `storageMode` de `server/storage`.
  - `package.json`: `start` pasa de `tsx server.ts` a `tsx server.ts --prod`.
  - `server/db.ts` y `server/storage.ts` no cambian: sus avisos funcionan ahora porque `NODE_ENV` queda fijado.
- **Motivo**: puerto fijo, posible servidor de desarrollo de Vite en producción, y pérdida de datos en silencio en Render sin Turso o S3.
- **Riesgos identificados**:
  - El siguiente despliegue **falla de forma visible** si Render no ejecuta `npm run build` o si faltan las variables de Turso o S3. Ver la lista de comprobación en `CLAUDE.md` §5.
  - Los servicios de vista previa de Render también tienen `RENDER`, así que necesitan sus propias variables.
  - `npm start` en local sin build previa ahora se detiene: es intencionado.
- **Pruebas realizadas** (copia aislada, BD temporal, IA simulada; script `inc014.sh`):
  - **A)** `npm start` con `PORT=3123` y sin `NODE_ENV`: escucha en el 3123 y no en el 3000. `/@vite/client` devuelve el `index.html` de la app, lo que confirma que Vite no se carga. `prod_smoke` 6/6.
  - **B)** `npm run dev`: puerto 3000, y `/@vite/client` devuelve el cliente JS de Vite.
  - **C)** `RENDER=true` sin Turso ni S3: `exit 1` con los dos mensajes `[ARRANQUE]`.
  - **D)** `RENDER=true` con Turso ficticio y sin S3: `exit 1` solo con el mensaje de S3, sin intentar conectar a la BD.
  - **E)** producción sin `dist/`: `exit 1` con el mensaje de la build.
  - **F)** regresión en modo producción: `inc004`, `inc023`, `inc005` (5/5), `inc003_carrera` y `prod_smoke` (6/6) en PASS.
  - `npx tsc --noEmit`: salida 0. `npx vite build`: «✓ built in 5.01s».
  - Puertos 3000 y 3123 libres. Los archivos del proyecto son idénticos a los de la copia probada (`cmp`).
  - Nota: la primera comprobación de A daba 200 en `/@vite/client` porque en producción cualquier ruta devuelve `index.html`; se repitió mirando el contenido de la respuesta.
- **Revisión independiente**: `arquitecto-software`, APROBADA CON OBSERVACIONES.
  - El orden de carga de los módulos es correcto: ningún módulo lee `NODE_ENV` al importarse.
  - El import dinámico de Vite no rompe nada.
  - Observaciones:
    - si `PORT` no es numérico, se usa 3000 sin avisar;
    - el primer despliegue real queda NOT TESTED.
- **Cómo revertir**: restaurar `server.ts` y `package.json`. Hay copia en `scratchpad/respaldo/*.antes-CAM-007`; mientras no haya commit, también se puede descartar desde GitHub Desktop.
- **Estado**: Aplicado. No se ha hecho commit.

### CAM-006 — Actualización de dependencias vulnerables (INC-022)
- **Fecha**: 2026-11-19
- **Incidencia(s)**: INC-022
- **Autorización**: el 19/11/2026 el usuario respondió «Sí, adelante» al plan de INC-022.
- **Agente(s)**: implementó el director de proyecto; revisó `auditor-ciberseguridad`.
- **Archivos modificados**:
  - `package-lock.json`: se sustituye por el que generó `npm audit fix --ignore-scripts` en la copia aislada (214 líneas añadidas y 176 borradas).
  - `package.json` no cambia.
  - No se instaló nada en la carpeta del proyecto.
- **Versiones clave**:

  | Paquete | Antes | Después |
  |---|---|---|
  | `proxy-addr` (crítica) | 2.0.7 | 2.0.8 |
  | `body-parser` | 2.2.2 | 2.4.0 |
  | `path-to-regexp` | 8.3.0 | 8.4.2 |
  | `ws` | 8.19.0 | 8.23.0 |
  | `qs` | 6.15.0 | 6.17.1 |
  | `vite` | 6.4.1 | 6.4.6 |
  | `postcss` | 8.5.8 | 8.5.33 |
  | `@babel/*` y otras de compilación | — | parches |

  Paquete nuevo: `content-type` 2.1.0, anidado.
- **Motivo**: había 14 vulnerabilidades conocidas: 1 crítica, 9 altas, 2 moderadas y 2 bajas.
- **Riesgos identificados**:
  - Son subidas menores, dentro de los rangos que ya permite `package.json`.
  - **Despliegue**: Render instalará estas versiones solo si usa npm con `package-lock.json`. El `bun.lock` antiguo (INC-019) no se ha actualizado; si Render usara bun, instalaría las versiones viejas [NV].
  - **Instalaciones futuras**: hay que hacerlas con `npm ci`, que respeta el lockfile, no con `npm install`.
- **Pruebas realizadas** (copia aislada con `server.ts` y lockfile idénticos a los del proyecto):
  - `npm audit`: de «14 vulnerabilities (2 low, 2 moderate, 9 high, 1 critical)» a «1 low severity vulnerability» (esbuild dentro de tsx).
  - `npx tsc --noEmit`: salida 0. `npx vite build`: «✓ built in 5.31s».
  - `inc004`, `inc023`, `inc005` (5/5) e `inc003_carrera`: PASS.
  - `prod_smoke` con `NODE_ENV=production` y `dist/`: 6/6 PASS. Detalle:
    - `GET /` 200;
    - `/assets/*.js` 200;
    - ruta del cliente 200;
    - cuerpo de 150 KB → 413;
    - JSON mal formado → 400;
    - la API sigue respondiendo.
  - Servidores de prueba parados; puerto 3000 libre.
- **Revisión independiente**: `auditor-ciberseguridad`, APROBADA CON OBSERVACIONES.
  - **Lockfile limpio**: las 323 entradas resuelven a `registry.npmjs.org` con `integrity` sha512. El único paquete nuevo es `content-type` 2.1.0.
  - **Baja restante**: no afecta al proyecto.
  - **Observaciones**:
    - instalar siempre con `npm ci`;
    - repetir las comprobaciones en el entorno real tras instalar;
    - sigue pendiente confirmar que producción fija `NODE_ENV=production` (INC-014).
- **Cómo revertir**: restaurar el `package-lock.json` anterior. Hay copia en `scratchpad/respaldo/package-lock.json.antes-CAM-006`; mientras no haya commit, también se puede descartar desde GitHub Desktop.
- **Estado**: Aplicado. No se ha hecho commit.

### CAM-005 — Contador propio para la recuperación y bloqueo progresivo (INC-005; mitiga INC-003)
- **Fecha**: 2026-11-19
- **Incidencia(s)**: INC-005 (corregida); INC-003 (mitigada, sigue Abierta)
- **Autorización**: el 19/11/2026 el usuario respondió «Sí, adelante» al plan conjunto de INC-005 e INC-003.
- **Agente(s)**: implementó el director de proyecto; revisó `auditor-ciberseguridad`.
- **Archivos modificados**: `server.ts`
  - **Columnas nuevas en `users`** (`ALTER TABLE … ADD COLUMN`, valor por defecto 0): `pin_lock_level`, `reset_failed`, `reset_locked_until` y `reset_lock_level`.
  - **Bloqueo progresivo**: `PIN_LOCK_MS` se sustituye por `PIN_LOCK_STEPS_MS` y `lockDuration()`, con escalones de 15 min, 1 h y 24 h.
  - **Contadores separados**: `registerPinFailure` se sustituye por `registerFailure(user, 'pin' | 'reset')`.
  - **`verify_pin` y `update_pin`**: al acertar, ponen a cero también `pin_lock_level`.
  - **`reset_password`**: usa solo las columnas `reset_*`. Al acertar, pone a cero los contadores de recuperación y los de PIN. Es una decisión consciente: quien acierta ya ha demostrado conocer el PIN.
  - **Mensaje de bloqueo**: muestra horas cuando la espera supera 60 min (por ejemplo, «Espera 24 h»).
- **Motivo**:
  - Un anónimo podía bloquear el panel de padres de cualquier cuenta conociendo solo el email (INC-005).
  - El bloqueo no se endurecía con los intentos (INC-003).
- **Riesgos identificados**:
  - Un anónimo puede bloquear la recuperación de contraseña de una cuenta hasta 24 h. Es una limitación conocida, anotada en INC-003.
  - Un niño que pruebe PINs provoca bloqueos del panel cada vez más largos. Los padres siguen entrando con su contraseña.
  - En el siguiente despliegue las columnas se añaden solas en Turso. Solo se añaden columnas, sin tocar datos.
- **Pruebas realizadas** (copia aislada, BD temporal, `TUTOR_PROVIDER=mock`):
  - `inc005.mjs` con el código original: **2/5 PASS**. Falla INC-005 (`verify_pin` → 429 tras el ataque) y los bloqueos son siempre de 15 min.
  - `inc005.mjs` con el código corregido, sobre una copia de la BD creada por el código antiguo (prueba también la migración): **5/5 PASS**.
    - `verify_pin` del padre tras el ataque: 200.
    - Bloqueos de recuperación: 15, 60, 1440 y 1440 min. Bloqueos de PIN: 15, 60 y 1440 min.
    - El PIN correcto pone el nivel a 0.
    - La recuperación correcta cambia la contraseña, la sesión antigua da 401 y el inicio de sesión con la contraseña nueva da 200.
  - `inc003_carrera.mjs` (50 peticiones simultáneas a `reset_password`): 4 PIN comprobados y 46 respuestas 429. PASS en SQLite local; NOT TESTED contra Turso.
  - Regresiones INC-004 e INC-023: PASS.
  - `npx tsc --noEmit`: salida 0. `npx vite build`: «✓ built in 6.23s».
  - El parche se aplicó al proyecto con `patch`, sin restos, y `cmp` confirma que el archivo es idéntico al de la copia probada. Servidores de prueba parados; puerto 3000 libre.
- **Revisión independiente**: `auditor-ciberseguridad`, APROBADA CON OBSERVACIONES.
  - Sin caminos en los que la recuperación toque columnas `pin_*` salvo al acertar.
  - Los nombres de columna que se insertan en el SQL son solo constantes.
  - Los usuarios existentes quedan bien cubiertos, sin regresiones.
  - Observaciones, no aplicadas:
    - actualizar el contador de forma atómica para evitar carreras (ya existían antes; ver INC-003);
    - lanzar un error si `kind` no es `'pin'` ni `'reset'`.
- **Cómo revertir**: deshacer los cambios de `server.ts`. Las columnas nuevas quedarían sin uso y sin efecto.
- **Estado**: Aplicado. No se ha hecho commit.

### CAM-004 — Comprobar la familia del niño en `complete_study_task` (INC-023)
- **Fecha**: 2026-11-19
- **Incidencia(s)**: INC-023
- **Autorización**: el 19/11/2026 el usuario respondió «si, adelante» al plan de corrección de INC-023.
- **Agente(s)**: implementó el director de proyecto; revisó `auditor-ciberseguridad`.
- **Archivos modificados**:
  - `server.ts:653`: se añade una línea que comprueba que el `data.childId` del cuerpo es de la familia de la sesión antes de buscar, completar y puntuar la tarea. Es el mismo patrón que usa `add_book`.
- **Motivo**: la comprobación general de `/api_study.php` mira primero el `childId` de la URL, pero esta acción usa el del cuerpo.
- **Riesgos identificados**: mínimos. El cliente (`StudyModuleContainer.tsx:113-119`) envía siempre un hijo propio en el cuerpo.
- **Pruebas realizadas** (copia aislada, BD temporal, `TUTOR_PROVIDER=mock`, script `inc023.mjs`):
  - Código original:
    - ataque: `200 {"success":true,"points":50}`, tarea de A `completed` con resumen «FALSO», puntos de A de 0 a 50, «VULNERABLE»;
    - regresión: PASS.
  - Código corregido:
    - ataque: `404 {"error":"Perfil no encontrado"}`, tarea `pending`, puntos 0, «BLOQUEADO»;
    - regresión: A completa su tarea, `200`, +50, PASS;
    - regresión de INC-004: PASS.
  - Compilación: `npx tsc --noEmit` con salida 0; `npx vite build` «✓ built in 5.08s».
  - El `server.ts` del proyecto queda idéntico al de la copia probada (`cmp`).
  - Servidor de pruebas parado; puerto 3000 libre.
- **Revisión independiente**: `auditor-ciberseguridad`, APROBADA.
  - No quedan huecos: para cualquier valor que pase la comprobación, lo que se valida y lo que se consulta es la misma cadena.
  - Observaciones opcionales, no aplicadas:
    - en `server.ts:662`, buscar el libro también por `userId`;
    - calcular una sola vez el `childId` validado para toda la ruta.
- **Cómo revertir**: quitar la línea `server.ts:653`. No hay cambios de datos ni de esquema.
- **Estado**: Aplicado. No se ha hecho commit.

### CAM-003 — Comprobar la familia del niño en `save_history` (INC-004)
- **Fecha**: 2026-11-19
- **Incidencia(s)**: INC-004
- **Autorización**: el 19/11/2026 el usuario respondió «SI, ADELANTE» al plan de corrección de INC-004 (qué se modifica, riesgos, pruebas y reversión).
- **Agente(s)**: implementó el director de proyecto; revisó `auditor-ciberseguridad`.
- **Archivos modificados**:
  - `server.ts:565`. Se añade una línea que comprueba que `data.childId` pertenece a la familia de la sesión antes del `INSERT` en `history`. Es el mismo patrón que usan `add_event` y `add_task`.
- **Motivo**: evitar que una familia escriba en el historial de un niño de otra familia.
- **Riesgos identificados**: mínimos. El cliente (`App.tsx:397`) siempre envía un hijo propio. Un `childId` ajeno ahora devuelve 400 en vez de guardarse.
- **Pruebas realizadas** (copia aislada, BD temporal, `TUTOR_PROVIDER=mock`, script `inc004.mjs`):
  - Código original:
    - ataque: `B save_history (hijo ajeno): 200 {"status":"success"}`, resultado «VULNERABLE (fila ajena visible)»;
    - regresión: PASS.
  - Código corregido:
    - ataque: `B save_history (hijo ajeno): 400 {"error":"Perfil no encontrado"}`, resultado «BLOQUEADO»;
    - regresión: `A save_history (hijo propio): 200`, PASS.
  - `npx tsc --noEmit`: salida 0. `npx vite build`: «✓ built in 5.33s».
  - `server.ts` del proyecto queda idéntico al de la copia probada (comprobado con `cmp`).
- **Revisión independiente**: `auditor-ciberseguridad`, APROBADA CON OBSERVACIONES.
  - Sin huecos de tipos, ya que `toArg` aplica la misma conversión en la comprobación y en el insert.
  - El uso legítimo no cambia.
  - Una sobrescritura entre familias es imposible: es un INSERT sobre una clave primaria.
  - Sugiere, como opcional, `String(data.childId)`.
  - Detecta el mismo tipo de fallo en `/api_study.php` `complete_study_task`.
- **Cómo revertir**: quitar la línea `server.ts:565`. No hay cambios de datos ni de esquema.
- **Estado**: Aplicado. No se ha hecho commit.

### CAM-002 — Línea base y registro de INC-022
- **Fecha**: 2026-11-19
- **Incidencias**: INC-022 (nueva)
- **Autorización**: el 19/11/2026 el usuario respondió «Sí, prepárala» a la propuesta de crear la copia aislada y sacar la línea base, y «Sí, anótalas» a la de anotar la línea base y la INC-022.
- **Agentes**: director de proyecto.
- **Archivos modificados**:
  - `docs/proyecto/PRUEBAS_Y_VERIFICACION.md`: línea base vigente con los comandos y sus resultados literales;
  - `docs/equipo/REGISTRO_INCIDENCIAS.md`: INC-022 en el resumen y su entrada completa;
  - `CLAUDE.md`: sección 4, estado actual.
- **Motivo**: dejar constancia de la línea base ejecutable y del resultado de `npm audit`.
- **Riesgos identificados**: ninguno. Solo se ha cambiado documentación. Las dependencias se instalaron únicamente en la copia aislada, fuera del proyecto.
- **Pruebas realizadas**: `npx tsc --noEmit` PASS, `npx vite build` PASS y `npm audit` FAIL, todas en la copia aislada.
- **Revisión independiente**: no aplica.
- **Cómo revertir**: deshacer las ediciones en los tres archivos.
- **Estado**: Aplicado. No se ha hecho commit.

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
