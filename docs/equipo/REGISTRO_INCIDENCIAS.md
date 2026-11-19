# Registro de incidencias — EduAmigo

Este registro recoge solo incidencias de este proyecto. Si algo afecta a otro proyecto, se registra en el suyo y, si hay dependencia, también en `C:\DESARROLLO\00_COORDINACION\DEPENDENCIAS.md`.

## Criterios

**Gravedad**
- **Crítica**: permite tomar el control de cuentas o datos de otros, o causa pérdida o falsificación grave de datos fiscales o económicos. Bloquea producción.
- **Alta**: fraude interno, pérdida de datos o incumplimiento serio con escenario realista.
- **Media**: riesgo acotado, mala práctica con impacto probable, o requisito legal o técnico incompleto.
- **Baja**: mantenibilidad, rendimiento o claridad, sin riesgo inmediato.

**Estado**: Abierta → En análisis → Autorizada → En corrección → Verificada → Cerrada (o Descartada con motivo). Una incidencia solo pasa a **Cerrada** con evidencia verificada y confirmación del usuario.

**Tipo de evidencia**: *ejecutado*, *estático* o *supuesto*.

**Origen de INC-001 a INC-021**: auditoría de incorporación del 19/11/2026, solo lectura. La hicieron el director, `arquitecto-software` y `auditor-ciberseguridad`. Lo que el director comprobó en el código va marcado [C]; lo que solo afirma un agente, [A].

## Resumen

| ID | Gravedad | Estado | Título | Evidencia |
|---|---|---|---|---|
| INC-001 | Alta | Abierta | Datos de menores sin base de cumplimiento (privacidad, consentimiento, borrado de cuenta, IA externa) | estático + supuesto |
| INC-002 | Alta | Abierta | Al borrar un hijo no se borran sus datos asociados ni sus fotos | estático |
| INC-003 | Alta | Abierta | La contraseña se restablece solo con email y PIN de 4 cifras, sin bloqueo progresivo | estático |
| INC-004 | Media | Abierta | IDOR de escritura en `save_history` | estático |
| INC-005 | Media | Abierta | Un anónimo puede bloquear el PIN de una cuenta ajena | estático |
| INC-006 | Media | Abierta | Sin límite de intentos en login ni en registro; se puede saber qué emails tienen cuenta | estático |
| INC-007 | Media | Abierta | Sin cabeceras de seguridad (CSP, X-Frame-Options, Referrer-Policy) | estático |
| INC-008 | Baja | Abierta | CSRF por GET en `/api.php` y `/api_study.php` | estático |
| INC-009 | Baja | Abierta | Huecos en la separación entre niño y adulto | estático |
| INC-010 | Baja | Abierta | Puntos que dependen de datos enviados por el cliente | estático |
| INC-011 | Baja | Abierta | Posible carrera en las peticiones de premios | supuesto |
| INC-012 | Baja | Abierta | Token de `/admin/avisos` en la URL | estático |
| INC-013 | Baja | Abierta | Errores internos devueltos al cliente; cookie mal formada provoca error 500 | estático |
| INC-014 | Alta | Abierta | Despliegue frágil: puerto fijo, Vite en producción, pérdida de datos sin Turso o S3 | estático + supuesto |
| INC-015 | Alta | Abierta | Esquema sin migraciones versionadas, sin claves foráneas y sin índices en las tablas base | estático |
| INC-016 | Media | Abierta | PWA y modo sin conexión incoherentes | estático |
| INC-017 | Media | Abierta | Contratos entre cliente y servidor sin tipar, con clientes HTTP duplicados | estático |
| INC-018 | Media | Abierta | Contenidos generados por IA compartidos entre familias sin revisión humana | estático |
| INC-019 | Baja | Abierta | Restos de la plantilla AI Studio y dependencias mal clasificadas | estático |
| INC-020 | Baja | Abierta | Archivos demasiado grandes y código de arranque innecesario | estático |
| INC-021 | Media | Abierta | No hay pruebas automatizadas | estático |

---

## INC-001 — Datos de menores sin base de cumplimiento
- **Gravedad**: Alta · **Estado**: Abierta · **Área**: datos personales / legal
- **Archivos afectados**: todo el producto. En el código no aparece nada sobre privacidad, RGPD, consentimiento ni borrado de cuenta [C]. Llamada a Anthropic en `server/ai.ts:64` [C].
- **Escenario**: se tratan nombre y curso de menores, fotos de deberes, audios de lectura, conversaciones con el tutor (incluidas señales de riesgo), notas escolares y circulares. No hay política de privacidad, consentimiento de los padres ni forma de borrar la cuenta. Los datos se envían a proveedores de EE. UU. (Anthropic y Cloudflare).
- **Evidencia**: búsqueda de `privacidad|RGPD|consentim|delete_account` sin resultados [estático]. La valoración legal concreta está pendiente de `especialista-legal-es` [supuesto].
- **Impacto**: incumplimiento del RGPD y la LOPDGDD si se abre a familias ajenas; riesgo reputacional.

## INC-002 — Al borrar un hijo no se borran sus datos asociados
- **Gravedad**: Alta · **Estado**: Abierta · **Área**: base de datos / datos personales
- **Archivos afectados**: `server.ts:549-551`. `delete_child` borra solo la fila de `children` [C]. No hay ningún `DELETE … WHERE child_id` en `server/` [C].
- **Escenario**: un padre borra el perfil de su hijo. Se quedan guardados su historial, las fotos y los audios (en R2 o en disco), las conversaciones con el tutor, los puntos, los repasos, las notas y lo demás.
- **Evidencia**: estático.
- **Impacto**: no se cumple el derecho de supresión, quedan datos huérfanos y crece el almacenamiento.

## INC-003 — Contraseña restablecible con email y PIN de 4 cifras
- **Gravedad**: Alta · **Estado**: Abierta · **Área**: autenticación
- **Archivos afectados**: `server.ts:459-478` (`reset_password`), `:386-388` (el contador vuelve a 0 al bloquear) y `:248` (`PIN_LOCK_MS` de 15 min) [C].
- **Escenario**: un anónimo que conozca el email prueba PINs a razón de 5 cada 15 minutos. Con 10.000 combinaciones, en unos días acierta y toma la cuenta. No se pide la contraseña anterior ni se manda confirmación por email.
- **Evidencia**: estático.
- **Impacto**: acceso completo a la cuenta, con fotos y conversaciones de menores.

## INC-004 — IDOR de escritura en `save_history`
- **Gravedad**: Media · **Estado**: Abierta · **Área**: autorización / aislamiento
- **Archivos afectados**: `server.ts:563-567`. Inserta en `history` con el `data.childId` del cliente sin comprobar que el niño sea de la familia. En cambio, `add_event` (`:569`) sí lo comprueba [C].
- **Escenario**: un usuario con sesión que conozca el `childId` de otro niño escribe texto libre en su historial, y esa familia lo ve en su panel (`get_initial_data`, `:507`). Los ids de los niños los genera el cliente.
- **Evidencia**: estático.
- **Impacto**: se rompe la integridad de los datos de otra familia y se le puede mostrar contenido arbitrario.

## INC-005 — Bloqueo del PIN de cuentas ajenas
- **Gravedad**: Media · **Estado**: Abierta · **Área**: autenticación / disponibilidad
- **Archivos afectados**: `server.ts:466-470`. `reset_password` usa el mismo contador de fallos que `verify_pin` [C].
- **Escenario**: un anónimo envía 5 intentos de `reset_password` con un PIN erróneo y bloquea el panel de padres de esa cuenta durante 15 minutos. Puede repetirlo sin fin.
- **Evidencia**: estático.
- **Impacto**: los padres no pueden entrar en su panel ni aprobar premios.

## INC-006 — Sin límite de intentos en login ni en registro
- **Gravedad**: Media · **Estado**: Abierta · **Área**: autenticación
- **Archivos afectados**: no hay limitador en todo el servidor [C]. El registro avisa de que ya existe una cuenta con ese email (`server.ts:402`). El login no ejecuta bcrypt si el usuario no existe y responde más rápido (`:413`).
- **Escenario**: se pueden probar contraseñas por fuerza bruta y averiguar qué emails tienen cuenta.
- **Evidencia**: estático.
- **Impacto**: riesgo de que se adivinen contraseñas y de que se filtre quién es usuario.

## INC-007 — Sin cabeceras de seguridad
- **Gravedad**: Media · **Estado**: Abierta · **Área**: configuración / seguridad web
- **Archivos afectados**: `server.ts`. No hay `helmet`, CSP, X-Frame-Options ni Referrer-Policy [C].
- **Escenario**: la app se puede incrustar en otra web (clickjacking) y no hay una segunda barrera contra XSS.
- **Evidencia**: estático.
- **Impacto**: riesgo acotado; ahora mismo no hay XSS conocido.

## INC-008 — CSRF por GET en `/api.php` y `/api_study.php`
- **Gravedad**: Baja · **Estado**: Abierta · **Área**: seguridad web
- **Archivos afectados**: `server.ts:490` y `:603`. Usan `app.all`, que acepta también GET, y las acciones leen `id` de la URL [C].
- **Escenario**: un padre con el panel desbloqueado abre un enlace externo a `/api.php?action=delete_child&id=X`. Como la cookie es SameSite=Lax, el navegador la envía en esa navegación y el borrado se ejecuta [A]. El atacante necesita conocer el id.
- **Evidencia**: estático.
- **Impacto**: borrado de datos. Escenario poco probable.

## INC-009 — Huecos en la separación entre niño y adulto
- **Gravedad**: Baja · **Estado**: Abierta · **Área**: autorización
- **Archivos afectados**:
  - `server.ts:342-344`: `add_event` no está en `PARENT_ONLY`, aunque al guardarse queda como `created_by='parent'` (`:570`) [C];
  - `server.ts:320`: iniciar sesión con contraseña abre el panel de padres 10 minutos sin pedir el PIN [C];
  - `update_pin` no pide el PIN anterior ni cierra las demás sesiones [A].
- **Escenario**: el niño crea eventos que aparecen como puestos por sus padres.
- **Evidencia**: estático.
- **Impacto**: bajo.

## INC-010 — Puntos que dependen de datos del cliente
- **Gravedad**: Baja · **Estado**: Abierta · **Área**: gamificación / integridad
- **Archivos afectados**:
  - `server/math.ts:131-148`: el cliente elige el problema [A];
  - `server/rewards.ts:442`: el valor de `concentration` lo envía el cliente [A];
  - `/api_study.php` (`complete_study_task`): guarda `aiScore` y `aiFeedback*` tal como llegan del cliente [A].
- **Escenario**: un niño envía «1+1=2» repetidamente hasta llegar al tope diario, o falsea la valoración que ven sus padres.
- **Evidencia**: estático (según el agente).
- **Impacto**: bajo; los topes diarios lo limitan.

## INC-011 — Posible carrera en las peticiones de premios
- **Gravedad**: Baja · **Estado**: Abierta · **Área**: gamificación / concurrencia
- **Archivos afectados**: `server/rewards.ts:421-426` (`cancel_request`), y también `decide_request` y `request_reward`. El UPDATE de estado no comprueba que la petición siga pendiente [C]. El índice UNIQUE `idx_points_ledger_ref` (`:62`) debería impedir el doble reembolso [C].
- **Escenario**: dos peticiones simultáneas cancelan o deciden la misma petición de premio.
- **Evidencia**: supuesto; no se ha probado.
- **Impacto**: inconsistencia de estados; doble reembolso improbable.

## INC-012 — Token de administración en la URL
- **Gravedad**: Baja · **Estado**: Abierta · **Área**: secretos
- **Archivos afectados**: `server/parent.ts:307`, `:321` y `:340` [C].
- **Escenario**: el `ADMIN_TOKEN` queda guardado en los registros del proxy o del hosting y en el historial del navegador.
- **Evidencia**: estático.
- **Impacto**: bajo. La página no muestra nombres, pero sí correcciones de trabajos de menores.

## INC-013 — Errores internos devueltos al cliente
- **Gravedad**: Baja · **Estado**: Abierta · **Área**: robustez / exposición
- **Archivos afectados**: `server.ts:485`, `:597` y `:667` devuelven `e.message` sin filtrar [A]. `server.ts:296` llama a `decodeURIComponent` sin try [C].
- **Escenario**: aparecen mensajes internos de SQLite en la respuesta. Una cookie con un `%` mal formado provoca un error 500 en cada petición protegida (solo afecta a quien la envía).
- **Evidencia**: estático.
- **Impacto**: bajo.

## INC-014 — Despliegue frágil
- **Gravedad**: Alta · **Estado**: Abierta · **Área**: operación / despliegue
- **Archivos afectados**:
  - `server.ts:31`: puerto 3000 fijo, sin `process.env.PORT` [C];
  - `server.ts:4` y `:841`: Vite se importa siempre y el modo desarrollo se activa salvo que `NODE_ENV=production` [C];
  - `package.json:8`: `start` es igual que `dev` [C];
  - `server/db.ts:50-52`: sin Turso en producción, el servidor solo avisa [C];
  - no hay `render.yaml` ni Dockerfile [C].
- **Escenario**: un despliegue en Render sin `PORT=3000` o sin `NODE_ENV` falla o sirve el modo desarrollo. Sin `TURSO_*` o `S3_*`, se pierden los datos o las fotos en cada despliegue.
- **Evidencia**: estático. La configuración real de Render no se ha verificado [supuesto].
- **Impacto**: caídas o pérdida de datos.

## INC-015 — Esquema sin migraciones, sin claves foráneas y sin índices base
- **Gravedad**: Alta · **Estado**: Abierta · **Área**: base de datos / arquitectura
- **Archivos afectados**:
  - `server.ts:52-242`: tablas base sin índices, ni siquiera en `children.parentId` o `history.childId`;
  - `ALTER TABLE` dentro de try/catch en 9 módulos (p. ej. `server.ts:235-242`, `server/tutor.ts:208-209`, `server/review.ts:124-126`) [A, comprobado por muestreo];
  - no hay ninguna `FOREIGN KEY` [C].
- **Escenario**: si un cambio de esquema falla, el error se ignora; las consultas se ralentizan al crecer los datos; quedan datos huérfanos (ver INC-002).
- **Evidencia**: estático.
- **Impacto**: es técnicamente arriesgado cambiar el esquema.

## INC-016 — PWA y modo sin conexión incoherentes
- **Gravedad**: Media · **Estado**: Abierta · **Área**: frontend / sin conexión
- **Archivos afectados**:
  - `index.html:57-73`: da de baja todos los service workers y borra las cachés en cada carga [C];
  - no hay ningún `serviceWorker.register` [C];
  - `public/sw.js` (V1.1.0) no cachea los recursos que genera Vite [A];
  - `services/offlineStorageService.ts:97` (`queueActivity`) no se llama desde ningún sitio, y `OfflineStatusBanner` siempre muestra 0 pendientes [A].
- **Escenario**: la app se instala como PWA pero no funciona sin conexión.
- **Evidencia**: estático.
- **Impacto**: hay que decidir si se hace una PWA con modo sin conexión real o se retira lo que no se usa.

## INC-017 — Contratos sin tipar y clientes HTTP duplicados
- **Gravedad**: Media · **Estado**: Abierta · **Área**: arquitectura
- **Archivos afectados**:
  - `services/*.ts:5-7`: la función `api()` se repite en cada servicio [A];
  - `App.tsx:155-397`: 12 llamadas a `/api.php` con `userId` en la URL, aunque el servidor no lo usa [A];
  - `MyWeek.tsx:16` y `StudyModuleContainer.tsx` hacen su propio fetch [A].
- **Escenario**: un cambio en el servidor rompe el cliente y TypeScript no lo detecta.
- **Evidencia**: estático.
- **Impacto**: regresiones y coste de mantenimiento.

## INC-018 — Contenidos de IA compartidos sin revisión humana
- **Gravedad**: Media · **Estado**: Abierta · **Área**: pedagogía / calidad de contenidos
- **Archivos afectados**: `server/review.ts:288-326` (`question_bank`, `syllabus_cache`) y `server/reading.ts:262` (`reading_texts`) [A].
- **Escenario**: una pregunta o un texto incorrecto que genera la IA se guarda y se muestra a niños de otras familias.
- **Evidencia**: estático.
- **Impacto**: errores pedagógicos que se propagan. Revisión pendiente de los especialistas de pedagogía.

## INC-019 — Restos de AI Studio y dependencias mal clasificadas
- **Gravedad**: Baja · **Estado**: Abierta · **Área**: mantenibilidad
- **Archivos afectados** [C]:
  - `README.md:1-9`;
  - `metadata.json`;
  - `bun.lock`, que incluye `@google/genai`, junto a `package-lock.json`;
  - `vite.config.ts:6-10`: `loadEnv` sin uso y `define` heredado;
  - `index.html:22-37`: polyfill de `process`;
  - `package.json:14-37`: `@types/*`, `typescript`, `tailwindcss` y similares en `dependencies`.
- **Escenario**: generan confusión y hay dos gestores de paquetes.
- **Evidencia**: estático.
- **Impacto**: bajo.

## INC-020 — Archivos grandes y código de arranque innecesario
- **Gravedad**: Baja · **Estado**: Abierta · **Área**: mantenibilidad
- **Archivos afectados**:
  - archivos muy largos: `HomeworkScannerModal.tsx` (993 líneas), `WorksheetHub.tsx` (975), `server.ts` (864), `App.tsx` (800) [A/C];
  - `server.ts:42-48`: prueba de bcrypt en cada arranque [C];
  - `server.ts:829-831`: si un módulo falla al arrancar, el servidor sigue funcionando sin él [A].
- **Evidencia**: estático.
- **Impacto**: mantenimiento costoso; fallos silenciosos al arrancar.

## INC-021 — No hay pruebas automatizadas
- **Gravedad**: Media · **Estado**: Abierta · **Área**: calidad
- **Archivos afectados**: `package.json`. La única comprobación es `lint` (`tsc --noEmit`) [C].
- **Escenario**: ninguna corrección se puede verificar con una batería de regresión.
- **Evidencia**: estático.
- **Impacto**: riesgo de regresiones en cada cambio.
