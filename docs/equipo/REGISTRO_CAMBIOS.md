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

### CAM-013 — Aviso y límite de tiempo en la primera conexión con la base de datos (INC-014)
- **Fecha**: 2026-11-20
- **Incidencia(s)**: INC-014 (seguimiento del primer despliegue real en Render)
- **Autorización**: el 20/11/2026 el usuario respondió «Sí, aplícalo» a la propuesta de añadir un aviso y un límite de 15 s a la conexión con Turso.
- **Agente(s)**: implementó el director de proyecto. Sin revisión independiente: es un cambio pequeño de arranque y diagnóstico, sin efecto en la seguridad ni en los datos.
- **Archivos modificados**:
  - `server/db.ts`:
    - antes de conectar con Turso escribe `[DB] Conectando con Turso (<host>)…`; solo el host, nunca el token;
    - la primera consulta (`SELECT 1`) compite con un temporizador de 15 s (configurable con `DB_CONNECT_TIMEOUT_MS`). Si vence, lanza `[ARRANQUE] La base de datos no responde en 15 s. Revisa TURSO_DATABASE_URL y TURSO_AUTH_TOKEN, y que la base de datos esté activa (no archivada) en el panel de Turso.`
  - `server.ts`: si no se puede abrir la base de datos, el mensaje sale con el prefijo `[ARRANQUE]` antes de `exit(1)`.
- **Motivo**: en Render, la app se quedaba colgada conectando con Turso sin escribir nada; Render solo decía «no open ports detected».
- **Riesgos identificados**: si Turso tarda más de 15 s en una conexión legítima, el arranque falla y Render lo reintenta. El tiempo se puede subir con `DB_CONNECT_TIMEOUT_MS`.
- **Pruebas realizadas** (copia aislada; Turso simulado con un servidor local que acepta conexiones y nunca responde, `turso_colgado.mjs`; `RENDER=true` con variables ficticias):
  - **Código original**: ninguna línea en el log; cortado a los 45 s y seguía colgado (código 124). Reproduce el comportamiento de Render.
  - **Código corregido**:
    - escribe `[DB] Conectando con Turso (127.0.0.1:3998)…` y luego `[ARRANQUE] La base de datos no responde en 15 s…`, con código de salida 1 a los 20 s (contando el arranque de `tsx`);
    - con un host inexistente: `[ARRANQUE] No se ha podido abrir la base de datos: fetch failed`, al momento.
  - **Regresión**: `inc014.sh` (A–F) y `inc002.sh` (10/10, 1/1, 4/4), PASS. `tsc`: salida 0. Build: «✓ built in 4.85s».
  - Archivos del proyecto idénticos a los de la copia probada. Simulador y servidores parados.
- **Cómo revertir**: restaurar `server.ts` y `server/db.ts` desde `scratchpad/respaldo/antes-CAM-013/`.
- **Estado**: Aplicado. No se ha hecho commit.

### CAM-012 — Protección CSRF: sin escrituras por GET y rechazo de escrituras de otra web (INC-008)
- **Fecha**: 2026-11-19
- **Incidencia(s)**: INC-008. También quita a CAM-009 (borrado irreversible de perfiles) el agravante señalado por la revisión de seguridad.
- **Autorización**: el 19/11/2026 el usuario respondió «Sí, adelante» al plan de INC-008.
- **Agente(s)**: implementó el director de proyecto; revisó `auditor-ciberseguridad`.
- **Archivos modificados**:
  - `server/securityHeaders.ts`, dos funciones nuevas:
    - `readOnlyByGet()`: en una ruta con `?action=`, por GET/HEAD solo deja pasar las acciones de lectura indicadas (el resto da 405, con la cabecera `Allow: POST, DELETE`);
    - `rejectCrossSiteWrites`: en métodos distintos de GET, HEAD y OPTIONS, rechaza con 403 (código `CROSS_SITE`) si llega `Sec-Fetch-Site: cross-site`, si `Origin` es `null` o si el host de `Origin` no es el de la cabecera `Host`. Cada rechazo se registra en el log como `[CSRF]`, con el motivo, la ruta, `Origin` y `Host`.
  - `server.ts`:
    - `rejectCrossSiteWrites` se monta para todas las rutas;
    - `/api.php` solo admite `get_initial_data` por GET, y `/api_study.php` solo `get_study_data`.
  - `App.tsx`: `toggle_task` se envía por POST (era la única escritura por GET del cliente).
- **Motivo**: con la cookie `SameSite=Lax`, un enlace abierto desde otra web podía borrar perfiles, eventos, tareas o libros (el borrado de perfiles es irreversible desde CAM-009).
- **Riesgos identificados**:
  - Si un proxy cambiara la cabecera `Host`, la propia app recibiría 403. Se detectaría por la línea `[CSRF]` en el log; está pendiente de comprobar en Render.
  - Un GET de escritura que usara otro cliente dejaría de funcionar; se revisaron todas las llamadas del cliente.
- **Pruebas realizadas** (copia aislada):
  - **`inc008.mjs` con el código original**: 2/12.
    - GET de `delete_child`, `toggle_task`, `delete_event` y `delete_book` → 200, y se ejecutaban.
    - `Origin` de otra web aceptado.
  - **`inc008.mjs` con el código corregido**: 12/12.
    - Las cuatro acciones por GET dan 405 y no cambian nada.
    - Las lecturas por GET siguen dando 200.
    - `DELETE` con `Origin` de otra web, `POST` con `Sec-Fetch-Site: cross-site`, `Origin: null` y login desde otra web: 403.
    - Mismo `Origin` y peticiones sin `Origin`: funcionan.
    - El log registra las 4 líneas `[CSRF]`.
  - **Navegador integrado** (producción):
    - el registro, las altas de perfiles, la tarea y marcar la tarea por POST se hicieron desde la propia página → 200;
    - una web atacante en `127.0.0.1:3999` navegó a `…/api.php?action=delete_child&id=…` con la sesión iniciada → **405** («Método no permitido para esta acción.») y el perfil «Ana» siguió;
    - el borrado legítimo desde el panel de padres funcionó y mostró la confirmación de CAM-009.
  - **Regresión**: `inc014.sh` (A–F) y `inc002.sh` (10/10, 1/1, 4/4), PASS. `tsc`: salida 0. Build: «✓ built in 8.04s».
  - Los archivos del proyecto son idénticos a los de la copia probada. Servidores (3000 y 3999) parados.
- **Revisión independiente**: `auditor-ciberseguridad`, APROBADA CON OBSERVACIONES.
  - No quedan rutas con efectos por GET.
  - El formulario de `/admin/avisos` no se ve afectado: es del mismo origen y además exige token.
  - Aceptar `same-site` es correcto, porque onrender.com es un sufijo público.
  - Incorporado: el registro `[CSRF]`.
  - El token de admin en la URL ya está registrado como INC-012.
- **Cómo revertir**: restaurar `server.ts`, `server/securityHeaders.ts` y `App.tsx` desde `scratchpad/respaldo/antes-CAM-012/`.
- **Estado**: Aplicado. No se ha hecho commit. Queda pendiente comprobar en Render una escritura real desde la app.

### CAM-011 — Cabeceras de seguridad y CSP (INC-007)
- **Fecha**: 2026-11-19
- **Incidencia(s)**: INC-007
- **Autorización**: el 19/11/2026 el usuario respondió «Sí, adelante» al plan de INC-007.
- **Agente(s)**: implementó el director de proyecto; revisó `auditor-ciberseguridad`.
- **Archivos modificados**:
  - `server/securityHeaders.ts` (nuevo, sin dependencias). Middleware con:
    - siempre: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (cámara y micrófono solo para la propia app; geolocalización, pagos, USB, serie, Bluetooth, HID, sensores y captura de pantalla, desactivados) y `Cross-Origin-Opener-Policy: same-origin`;
    - solo en producción: `Strict-Transport-Security: max-age=31536000` y la CSP: `default-src 'self'`; `script-src 'self'` más el sha256 de los `<script>` en línea de `dist/index.html`, calculado al arrancar; `style-src 'self' 'unsafe-inline'`; `img-src 'self' data: blob:`; `media-src 'self' blob:`; `font-src`, `connect-src`, `worker-src` y `manifest-src 'self'`; `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`; `frame-ancestors 'none'`.
  - `server.ts`: monta el middleware tras `trust proxy` y antes de todas las rutas.
- **Motivo**: evitar que otra web incruste la app (clickjacking) y añadir una segunda barrera frente a XSS.
- **Riesgos identificados**:
  - Una CSP estricta puede romper funciones de la app; se ha probado en el navegador real.
  - HSTS obliga a usar HTTPS: en Render siempre hay HTTPS.
  - No se añade `upgrade-insecure-requests`: rompería la prueba local en HTTP, y en Render HSTS ya fuerza HTTPS.
- **Pruebas realizadas** (copia aislada):
  - **Cabeceras**:
    - en desarrollo, las básicas sin CSP; en producción, todas;
    - la huella de la CSP coincide con el script en línea de `dist/index.html` (`zievw6/K6Fyhb…`);
    - las rutas de la API también llevan las cabeceras.
  - **Navegador integrado**, en producción con IA simulada:
    - se registró una familia de prueba, se introdujo el PIN, se dio de alta un perfil y se usó el tutor (que responde con el nombre del niño);
    - se recorrieron 10 módulos (Mates, Juegos, Biblioteca, Repasar, Caligrafía, Premios, Mi semana, Deberes, Inglés y Lectura) con **0 violaciones de CSP** y 0 imágenes rotas;
    - el audio `blob:` y las imágenes `data:` y `blob:` cargan;
    - un `<script>` inyectado **se bloquea**, y es la única violación;
    - una página de otro origen (puerto 3999) con un `<iframe>` queda bloqueada: «violates … frame-ancestors 'none'».
  - **Regresión**: `inc014.sh` (A–F) y `inc002.sh` (10/10, 1/1, 4/4), PASS. `prod_smoke`: 6/6, tras quitar `interest-cohort`.
  - `tsc`: salida 0. Build: «✓ built in 8.49s».
  - Los archivos del proyecto son idénticos a los de la copia probada. Servidores (3000 y 3999) parados.
- **Revisión independiente**: `auditor-ciberseguridad`, APROBADA CON OBSERVACIONES.
  - La CSP es sólida, la huella es estable y HSTS sin `includeSubDomains` es correcto en onrender.com.
  - Incorporado: se quita `interest-cohort`, que está obsoleta.
  - El tipo de audio que preguntaba el revisor ya lo fija el servidor por la firma del archivo, con una lista cerrada (`server/storage.ts:152-163`).
- **Cómo revertir**: restaurar `server.ts` desde `scratchpad/respaldo/antes-CAM-011/` y borrar `server/securityHeaders.ts`.
- **Estado**: Aplicado. No se ha hecho commit. Queda pendiente comprobar las cabeceras en Render.

### CAM-010 — Límite de intentos y tiempo de respuesta uniforme en /auth.php (INC-006)
- **Fecha**: 2026-11-19
- **Incidencia(s)**: INC-006. También refuerza INC-003, con el límite por IP en la recuperación.
- **Autorización**: el 19/11/2026 el usuario respondió «Sí, adelante» al plan de INC-006.
- **Agente(s)**: implementó el director de proyecto; revisó `auditor-ciberseguridad`.
- **Archivos modificados**:
  - `server/rateLimit.ts` (nuevo): limitador en memoria por ventana fija. Tiene un tope de 10.000 claves y, al llenarse, descarta la más antigua.
  - `server.ts`, en `/auth.php`:
    - **inicio de sesión**: por IP + email, 10 fallos cada 15 min (se pone a cero al acertar); por IP, 50 intentos cada 15 min;
    - **registro**: 5 cada hora por IP (cuentan las altas y los «ya existe»);
    - **recuperación**: 10 cada 15 min por IP;
    - al superar un límite responde 429, `RATE_LIMITED`, con la cabecera `Retry-After`;
    - **hash ficticio**: si el email no existe, se compara igualmente con él;
    - un email de más de 254 caracteres se trata como vacío.
- **Motivo**: evitar la fuerza bruta de contraseñas y averiguar qué emails tienen cuenta.
- **Riesgos identificados**:
  - **Red compartida** (un colegio): podría topar con los límites por IP.
  - **Contadores en memoria**: se pierden al reiniciar; vale con una instancia.
  - **IP fiable solo tras el proxy**: los límites por IP dependen de `trust proxy` = 1 detrás del proxy de Render. Si el servidor se expone sin proxy, la IP se puede falsear.
- **Pruebas realizadas** (copia aislada; IPs simuladas con `X-Forwarded-For`):
  - **`inc006.mjs` con el código original**: 1/7.
    - Sin ningún límite: 11 fallos dan 11 respuestas 400, 6 registros dan 6 respuestas 200.
    - El tiempo delata las cuentas: 2,6 ms frente a 117 ms.
  - **`inc006.mjs` con el código corregido**: 7/7.
    - El fallo 11 da 429, incluso con la contraseña correcta desde esa IP; desde otra IP se entra.
    - Intento 51 por IP: 429.
    - Sexto registro: 429.
    - Undécima recuperación: 429.
    - Tiempo: 113,2 ms frente a 114,7 ms.
  - **`ratelimit_tope.mts`**: el tope de claves descarta la más antigua, PASS. Un email de 312 caracteres da 400 en el inicio de sesión y «Introduce un email válido» en el registro.
  - **Regresión** con una IP aleatoria por petición (`xff_aleatoria.mjs`), para no topar con los límites; los límites no se cambiaron: `inc014.sh` (A–F), `inc002.sh` (10/10, 1/1, 4/4) y salvaguardas (2/2), todo PASS.
  - `tsc`: salida 0. Build: «✓ built in 7.80s». Los archivos del proyecto son idénticos a los de la copia probada. Servidores parados.
- **Revisión independiente**: `auditor-ciberseguridad`, APROBADA CON OBSERVACIONES.
  - Correcto: la IP tras el proxy y el uso del hash ficticio.
  - Incorporado: el tope de claves y la longitud del email.
  - Pendiente, anotado en INC-006:
    - la enumeración residual;
    - la valoración de subir el límite de registros para redes compartidas.
- **Cómo revertir**: restaurar `server.ts` desde `scratchpad/respaldo/antes-CAM-010/` y borrar `server/rateLimit.ts`.
- **Estado**: Aplicado. No se ha hecho commit.

### CAM-009 — Borrado completo de los datos de un niño y limpieza de huérfanos (INC-002)
- **Fecha**: 2026-11-19
- **Incidencia(s)**: INC-002. Es también el requisito previo de la fase 3 de INC-001.
- **Autorización**: el 19/11/2026 el usuario respondió «Sí, con limpieza» al plan de INC-002 (borrado en cascada y limpieza de los datos huérfanos existentes).
- **Agente(s)**: implementó el director de proyecto; revisaron `especialista-bd-sql` y `auditor-ciberseguridad`.
- **Archivos modificados**:
  - `server/childData.ts` (nuevo):
    - `childTables()` descubre en el esquema las tablas con columna `child_id` o `childId` (hoy 40);
    - `deleteChildData()` hace lo siguiente:
      1. comprueba la familia;
      2. borra primero la fila de `children`;
      3. borra en una sola transacción (`client.batch`) todas las tablas del niño, más los mensajes del tutor por conversación y las tareas por libro;
      4. borra sus archivos (fotos, miniaturas y audios);
    - `purgeOrphanChildData()` limpia los datos de perfiles inexistentes, con dos salvaguardas: no hace nada si `children` está vacía, ni si hay más de `ORPHAN_PURGE_MAX_CHILDREN` perfiles huérfanos (20 por defecto).
  - `server/storage.ts`:
    - `deleteObject()` devuelve si ha conseguido borrar el archivo;
    - nueva tabla `pending_object_deletions`, con `deleteObjectOrQueue()` y `retryPendingDeletions()` (que tolera claves erróneas);
    - el reintento se ejecuta junto con `purgeExpiredPhotos`, al arrancar y cada 12 h.
  - `server.ts`:
    - `delete_child` llama a `deleteChildData()` y devuelve 404 si el perfil no es de la familia;
    - la limpieza de huérfanos se ejecuta 2 min después de arrancar (configurable con `ORPHAN_PURGE_DELAY_MS`), cuando ya se ha comprobado la copia diaria, y después cada 24 h.
  - `components/ChildManager.tsx`: la confirmación explica qué se borra y que no se puede deshacer.
- **Motivo**: derecho de supresión (art. 17 RGPD). Antes, al borrar un perfil quedaban datos en 40 tablas y en sus archivos.
- **Riesgos identificados**:
  - El borrado es irreversible, salvo restaurando una copia (30 días).
  - **Primer despliegue**: la limpieza borrará los datos de perfiles eliminados anteriormente; el log mostrará `[BORRADO] Datos huérfanos: …`. Si hay más de 20 perfiles huérfanos o `children` está vacía, no borra nada y lo avisa en el log.
- **Pruebas realizadas** (copia aislada, BD temporal y archivos en disco temporal; `inc002.sh`, `inc002.mjs`, `inc002_salvaguardas.sh`, `reintento.mts`):
  - **Código original**: 7/10. Tras borrar A1 quedaban filas en 40 tablas y 4 archivos. A1 se sembró en las 40 tablas y además por la API (historial y tutor con foto).
  - **Código corregido**: 10/10.
    - 40 tablas a 0 y archivos de A1 borrados.
    - A2 (misma familia) y B1 (otra familia) intactos, con sus archivos.
    - Sin PIN: 403. Otra familia: 404. En ambos casos no se borra nada.
    - Un archivo que no se puede borrar va a la cola.
  - **Reintento**: 1/1. «[FOTOS] Reintento de borrados pendientes: 1/1 hechos».
  - **Huérfanos**: 4/4.
    - Se borra un niño inexistente en las 40 tablas, con sus archivos.
    - A2 y B1 quedan intactos.
    - Las filas con niño NULL no se tocan.
  - **Salvaguardas**: 2/2.
    - Con `children` vacía no se borra nada.
    - Con 3 huérfanos y máximo 2 no se borra nada.
  - Tablas con usuario y sin niño: solo `rewards` (premios de la familia) y `sessions`. Se conservan, correctamente.
  - **Regresión** (`inc014.sh`): PASS. `tsc`: salida 0. Build: «✓ built in 8.18s».
  - Archivos del proyecto idénticos a los de la copia probada (`cmp`). Servidores parados y puertos libres.
- **Revisión independiente**:
  - `especialista-bd-sql`: APROBADA CON OBSERVACIONES. Incorporado:
    - la salvaguarda con `children` vacía y con demasiados huérfanos;
    - borrar el perfil primero (carrera);
    - la limpieza diaria.
  - `auditor-ciberseguridad`: APROBADA CON OBSERVACIONES. Sin vías para borrar datos ajenos ni inyección SQL; los logs no muestran datos personales. Incorporado: try/catch en el reintento.
  - **Observaciones no aplicadas** (anotadas en INC-002):
    - registro de borrados para después de restaurar una copia;
    - prueba de rollback;
    - CSRF por GET (INC-008);
    - borrado de un hermano con el panel abierto (INC-009);
    - prefijo de la clave del archivo.
- **Cómo revertir**: restaurar `server.ts`, `server/storage.ts` y `components/ChildManager.tsx` desde `scratchpad/respaldo/antes-CAM-009/` y borrar `server/childData.ts`. **Los datos ya borrados no se recuperan**, salvo restaurando una copia.
- **Estado**: Aplicado. No se ha hecho commit.

### CAM-008 — Minimización de datos hacia la IA y fuente autoalojada (INC-001, fase 1)
- **Fecha**: 2026-11-19
- **Incidencia(s)**: INC-001, fase 1 de 3. La incidencia sigue Abierta.
- **Autorización**: el 19/11/2026 el usuario respondió «Sí, fase 1» al plan en tres fases, con las opciones recomendadas.
- **Agente(s)**:
  - análisis legal: `especialista-legal-es`;
  - implementación: director de proyecto;
  - revisión: `auditor-ciberseguridad`.
- **Archivos modificados**:
  - `server/tutor.ts`:
    - el prompt ya no incluye el nombre ni el país de raíces del niño (se elimina la línea «tiene raíces en…»);
    - nuevo marcador `{NOMBRE}`, con `maskName()`, que enmascara el nombre en el historial que se reenvía a la IA, y `unmaskName()`, que pone el nombre real en la respuesta mostrada;
    - el modo simulado se adapta al cambio.
  - `index.html`: se quita el `<link>` a `fonts.googleapis.com`.
  - `index.tsx`: importa los pesos 300 a 700 de `@fontsource/quicksand`.
  - `package.json` y `package-lock.json`: se añade `@fontsource/quicksand` 5.3.0, con la versión fijada exacta, licencia OFL-1.1, resuelto en `registry.npmjs.org` con integrity sha512 y sin scripts de instalación.
  - `index.css` no cambia. Importar la fuente desde allí rompía las rutas de los `.woff2` con Tailwind 4; se comprobó en la build.
- **Motivo**: minimización de datos (art. 5.1.c RGPD).
  - El país de raíces puede revelar el origen étnico (art. 9).
  - El nombre del niño no es necesario para el servicio.
  - Google Fonts recibía la IP de cada visitante.
- **Riesgos identificados**:
  - Riesgo residual de que el nombre llegue a la IA; ver INC-001.
  - El campo «país» sigue existiendo en el perfil, pero ya no se usa en la IA.
- **Pruebas realizadas** (copia aislada; el `fetch` a `api.anthropic.com` se intercepta con `capture_ai.mjs` y devuelve una respuesta falsa, y cualquier otra petición externa queda bloqueada):
  - `inc001.mjs` con el código original: **2/7**. Llegaban a la IA el nombre «Lucía» y el país «Marruecos».
  - `inc001.mjs` con el código corregido: **7/7**.
    - Sin nombre ni país en el sistema, en los mensajes ni en el historial reenviado.
    - «banana» y «ananá» quedan intactas con una niña llamada «Ana».
    - El niño ve «¡Muy bien, Lucía!».
  - **Navegador integrado** (`npm start`): 0 peticiones externas, Quicksand cargada desde `/assets/*.woff2` y la pantalla de acceso se ve correcta.
  - **Build**: 15 `.woff2` en `dist/` y 0 referencias a Google.
  - **Regresión** (`inc014.sh`, escenarios A–F, con `inc004`, `inc023`, `inc005` 5/5, `inc003_carrera` y `prod_smoke` 6/6): PASS.
  - `tsc`: salida 0. Build: «✓ built in 5.05s». `npm audit`: igual que antes (1 baja aceptada).
  - Los archivos del proyecto son idénticos a los de la copia probada (`cmp`). Servidor parado y puerto 3000 libre.
- **Revisión independiente**: `auditor-ciberseguridad`, APROBADA CON OBSERVACIONES.
  - La RegExp es segura: el nombre se escapa y no hay ReDoS.
  - El nombre no llega a ningún otro prompt; el director lo confirmó con grep en todos los módulos con IA.
  - Observaciones, no aplicadas:
    - enmascarar también cada palabra de los nombres compuestos;
    - validar el nombre al crear el perfil;
    - indicar en la política que la minimización no es una anonimización.
- **Cómo revertir**: restaurar los 5 archivos. Hay copia en `scratchpad/respaldo/antes-CAM-008/`; mientras no haya commit, también se puede descartar desde GitHub Desktop.
- **Estado**: Aplicado. No se ha hecho commit.

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
