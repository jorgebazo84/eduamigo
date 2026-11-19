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
| INC-001 | Alta | Abierta (fase 1 de 3 hecha, CAM-008) | Datos de menores sin base de cumplimiento (privacidad, consentimiento, borrado de cuenta, IA externa) | estático + ejecutado |
| INC-002 | Alta | Cerrada | Al borrar un hijo no se borran sus datos asociados ni sus fotos | ejecutado (CAM-009) |
| INC-003 | Alta | Abierta (mitigada en CAM-005) | La contraseña se restablece solo con email y PIN de 4 cifras; ya tiene bloqueo progresivo, falta recuperación por email | estático + ejecutado |
| INC-004 | Media | Cerrada | IDOR de escritura en `save_history` | ejecutado (CAM-003) |
| INC-005 | Media | Cerrada | Un anónimo puede bloquear el PIN de una cuenta ajena | ejecutado (CAM-005) |
| INC-006 | Media | Cerrada | Sin límite de intentos en login ni en registro; se puede saber qué emails tienen cuenta | ejecutado (CAM-010) |
| INC-007 | Media | Verificada | Sin cabeceras de seguridad (CSP, X-Frame-Options, Referrer-Policy) | ejecutado (CAM-011) |
| INC-008 | Baja | Verificada | CSRF por GET en `/api.php` y `/api_study.php` | ejecutado (CAM-012) |
| INC-009 | Baja | Abierta | Huecos en la separación entre niño y adulto | estático |
| INC-010 | Baja | Abierta | Puntos que dependen de datos enviados por el cliente | estático |
| INC-011 | Baja | Abierta | Posible carrera en las peticiones de premios | supuesto |
| INC-012 | Baja | Abierta | Token de `/admin/avisos` en la URL | estático |
| INC-013 | Baja | Abierta | Errores internos devueltos al cliente; cookie mal formada provoca error 500 | estático |
| INC-014 | Alta | Verificada | Despliegue frágil: puerto fijo, Vite en producción, pérdida de datos sin Turso o S3 | ejecutado (CAM-007) |
| INC-015 | Alta | Abierta | Esquema sin migraciones versionadas, sin claves foráneas y sin índices en las tablas base | estático |
| INC-016 | Media | Abierta | PWA y modo sin conexión incoherentes | estático |
| INC-017 | Media | Abierta | Contratos entre cliente y servidor sin tipar, con clientes HTTP duplicados | estático |
| INC-018 | Media | Abierta | Contenidos generados por IA compartidos entre familias sin revisión humana | estático |
| INC-019 | Baja | Abierta | Restos de la plantilla AI Studio y dependencias mal clasificadas | estático |
| INC-020 | Baja | Abierta | Archivos demasiado grandes y código de arranque innecesario | estático |
| INC-021 | Media | Abierta | No hay pruebas automatizadas | estático |
| INC-022 | Alta | Cerrada | Dependencias con vulnerabilidades conocidas: 1 crítica, 9 altas (queda 1 baja aceptada) | ejecutado (CAM-006) |
| INC-023 | Media | Cerrada | IDOR en `complete_study_task`: el `childId` que se valida no es el que se usa | ejecutado (CAM-004) |

---

## INC-001 — Datos de menores sin base de cumplimiento
- **Gravedad**: Alta · **Estado**: Abierta · **Área**: datos personales / legal
- **Archivos afectados**: todo el producto. En el código no aparece nada sobre privacidad, RGPD, consentimiento ni borrado de cuenta [C]. Llamada a Anthropic en `server/ai.ts:64` [C].
- **Escenario**: se tratan nombre y curso de menores, fotos de deberes, audios de lectura, conversaciones con el tutor (incluidas señales de riesgo), notas escolares y circulares. No hay política de privacidad, consentimiento de los padres ni forma de borrar la cuenta. Los datos se envían a proveedores de EE. UU. (Anthropic y Cloudflare).
- **Evidencia**: búsqueda de `privacidad|RGPD|consentim|delete_account` sin resultados [estático]. La valoración legal concreta está pendiente de `especialista-legal-es` [supuesto].
- **Impacto**: incumplimiento del RGPD y la LOPDGDD si se abre a familias ajenas; riesgo reputacional.
- **Análisis legal (19/11/2026, `especialista-legal-es`)**: es orientación, no dictamen; las normas se citaron de memoria, sin consultar las fuentes en la sesión.
  - **Obligatorio antes de abrir a otras familias**:
    - información según el art. 13 RGPD y aviso legal (LSSI);
    - consentimiento parental por debajo de 14 años (art. 8 RGPD, art. 7 LOPDGDD);
    - contratos de encargado (art. 28) con Anthropic, Cloudflare, Turso y Render, y garantías para las transferencias a EE. UU.;
    - borrado de cuenta completo (art. 17) y exportación de datos (arts. 15 y 20);
    - EIPD (art. 35) y registro de actividades (art. 30).
  - **Requiere abogado colegiado**: el consentimiento de los mayores de 14, el deber de comunicación según la LOPIVI, la clasificación según el Reglamento de IA (UE) 2024/1689 y la vigencia del marco de transferencias UE-EE. UU.
- **Plan en 3 fases** (aprobado el 19/11/2026):
  - **Fase 1** (código de minimización): hecha en CAM-008.
  - **Fase 2** (consentimiento y páginas legales): pendiente de los textos del titular.
  - **Fase 3** (borrado de cuenta y exportación): después de INC-002.
- **Seguimiento (19/11/2026), fase 1 en CAM-008**:
  - **Corregido**: el tutor ya no envía a la IA el nombre del niño ni el país de raíces, y la fuente se sirve desde la propia app.
  - **Pruebas** [ejecutado]: `inc001.mjs` da 2/7 con el código original y 7/7 con el corregido. En el navegador, la app hace 0 peticiones externas.
  - **Riesgo residual (revisión de `auditor-ciberseguridad`)**:
    - no se enmascaran las partes de un nombre compuesto, los apellidos, los apodos ni los nombres de 1 letra;
    - el nombre puede llegar a la IA dentro de texto libre en otros módulos o en las fotos (cuadernos, circulares).

    La minimización reduce la exposición pero no la elimina: hay que indicarlo en la política.
  - **Estado**: la incidencia sigue **Abierta** hasta completar las fases 2 y 3 y los documentos del titular.

## INC-002 — Al borrar un hijo no se borran sus datos asociados
- **Gravedad**: Alta · **Estado**: Cerrada (19/11/2026; el usuario confirmó el cierre con «Sí, ciérrala». Los pendientes fuera de alcance se indican abajo) · **Área**: base de datos / datos personales
- **Archivos afectados**: `server.ts:549-551`. `delete_child` borra solo la fila de `children` [C]. No hay ningún `DELETE … WHERE child_id` en `server/` [C].
- **Escenario**: un padre borra el perfil de su hijo. Se quedan guardados su historial, las fotos y los audios (en R2 o en disco), las conversaciones con el tutor, los puntos, los repasos, las notas y lo demás.
- **Evidencia**: estático.
- **Impacto**: no se cumple el derecho de supresión, quedan datos huérfanos y crece el almacenamiento.
- **Seguimiento (19/11/2026)**:
  - **Reproducido** [ejecutado] con el código original (`inc002.mjs`): tras borrar A1 quedaban filas en **40 tablas** y 4 archivos.
  - **Corregido** en CAM-009, con limpieza de los huérfanos existentes autorizada por el usuario. Pruebas [ejecutado]: 10/10, reintento 1/1, huérfanos 4/4 y salvaguardas 2/2.
  - **Revisiones independientes**: `especialista-bd-sql` y `auditor-ciberseguridad`, ambas APROBADA CON OBSERVACIONES. Las salvaguardas obligatorias que señalaron se incorporaron y se probaron.
  - **Pendiente fuera de alcance**:
    - **Copias de seguridad**: los datos borrados siguen hasta 30 días en las copias y en el punto de restauración de Turso. Si se restaura una copia, reaparecen: falta un registro de borrados que se vuelva a aplicar tras restaurar.
    - **Fallo a mitad de transacción**: el rollback forzado no está probado (NOT TESTED).
    - **CSRF por GET**: el borrado irreversible agrava INC-008.
    - **Panel desbloqueado**: un hermano podría borrar otro perfil (ver INC-009).
    - **Prefijo de la clave del archivo**: falta comprobarlo antes de borrar (defensa en profundidad).

## INC-003 — Contraseña restablecible con email y PIN de 4 cifras
- **Gravedad**: Alta · **Estado**: Abierta · **Área**: autenticación
- **Archivos afectados**: `server.ts:459-478` (`reset_password`), `:386-388` (el contador vuelve a 0 al bloquear) y `:248` (`PIN_LOCK_MS` de 15 min) [C].
- **Escenario**: un anónimo que conozca el email prueba PINs a razón de 5 cada 15 minutos. Con 10.000 combinaciones, en unos días acierta y toma la cuenta. No se pide la contraseña anterior ni se manda confirmación por email.
- **Evidencia**: estático.
- **Impacto**: acceso completo a la cuenta, con fotos y conversaciones de menores.
- **Seguimiento (19/11/2026), mitigación parcial en CAM-005**: la incidencia sigue **Abierta**.
  - **Bloqueo progresivo**: el PIN y la recuperación se bloquean 15 min, luego 1 h y después 24 h cada vez. Medido [ejecutado]: 15, 60, 1440 y 1440 min (antes, siempre 15).
  - **Efecto**: el ataque por fuerza bruta pasa de unos 10 días a unos 1.000 días de media.
  - **Pendiente para resolverla**:
    - recuperación por email (requiere servicio de correo);
    - PIN más largo;
    - límite por IP (no es fiable mientras siga abierta INC-022, por `proxy-addr`).
  - **Concurrencia**: 50 peticiones simultáneas a `reset_password` comprobaron solo 4 PIN; el resto recibió 429 [ejecutado, SQLite local]. Contra Turso, con más latencia, está NOT TESTED. La revisión independiente recomienda que el contador se actualice de forma atómica.
  - **Limitación conocida**: un desconocido puede bloquear la recuperación de contraseña de una cuenta hasta 24 h. No afecta al panel de padres ni al inicio de sesión normal.
  - **Propuesta pendiente de decisión del usuario**: rebajar la gravedad a Media.

## INC-004 — IDOR de escritura en `save_history`
- **Gravedad**: Media · **Estado**: Cerrada (19/11/2026; el usuario confirmó el cierre con «Sí, ciérralas») · **Área**: autorización / aislamiento
- **Archivos afectados**: `server.ts:563-567`. Inserta en `history` con el `data.childId` del cliente sin comprobar que el niño sea de la familia. En cambio, `add_event` (`:569`) sí lo comprueba [C].
- **Escenario**: un usuario con sesión que conozca el `childId` de otro niño escribe texto libre en su historial, y esa familia lo ve en su panel (`get_initial_data`, `:507`). Los ids de los niños los genera el cliente.
- **Evidencia**: estático.
- **Impacto**: se rompe la integridad de los datos de otra familia y se le puede mostrar contenido arbitrario.
- **Seguimiento (19/11/2026)**:
  - Reproducido [ejecutado] en la copia aislada con el código original. B guardó una entrada en el historial del hijo de A (respuesta `200 {"status":"success"}`) y A la vio en `get_initial_data`.
  - Corregido en CAM-003. Tras la corrección: `400 {"error":"Perfil no encontrado"}`, la fila no se crea y A sigue guardando en el historial de su propio hijo.
  - Revisión independiente de `auditor-ciberseguridad`: APROBADA CON OBSERVACIONES. La observación lleva a un hallazgo nuevo en `complete_study_task`, que se propone como incidencia aparte.

## INC-005 — Bloqueo del PIN de cuentas ajenas
- **Gravedad**: Media · **Estado**: Cerrada (19/11/2026; el usuario confirmó el cierre con «Sí, ciérrala») · **Área**: autenticación / disponibilidad
- **Archivos afectados**: `server.ts:466-470`. `reset_password` usa el mismo contador de fallos que `verify_pin` [C].
- **Escenario**: un anónimo envía 5 intentos de `reset_password` con un PIN erróneo y bloquea el panel de padres de esa cuenta durante 15 minutos. Puede repetirlo sin fin.
- **Evidencia**: estático.
- **Impacto**: los padres no pueden entrar en su panel ni aprobar premios.
- **Seguimiento (19/11/2026)**:
  - **Reproducido** [ejecutado] en la copia aislada con el código original, mediante el script `inc005.mjs`. Tras `reset_password` ×5 de un anónimo (400, 400, 400, 400, 429), el padre llama a `verify_pin` con su PIN correcto y recibe `429 PIN_LOCKED`.
  - **Corregido** en CAM-005: la recuperación tiene contadores propios (`reset_*`). Con el mismo ataque, el padre recibe `verify_pin` → `200`.
  - **Revisión independiente** de `auditor-ciberseguridad`: APROBADA CON OBSERVACIONES. Ver CAM-005.

## INC-006 — Sin límite de intentos en login ni en registro
- **Gravedad**: Media · **Estado**: Cerrada (19/11/2026; el usuario confirmó el cierre con «Sí, ciérrala». El riesgo aceptado o pendiente se detalla abajo) · **Área**: autenticación
- **Archivos afectados**: no hay limitador en todo el servidor [C]. El registro avisa de que ya existe una cuenta con ese email (`server.ts:402`). El login no ejecuta bcrypt si el usuario no existe y responde más rápido (`:413`).
- **Escenario**: se pueden probar contraseñas por fuerza bruta y averiguar qué emails tienen cuenta.
- **Evidencia**: estático.
- **Impacto**: riesgo de que se adivinen contraseñas y de que se filtre quién es usuario.
- **Seguimiento (19/11/2026)**:
  - **Reproducido** [ejecutado] con el código original (`inc006.mjs`), resultado 1/7:
    - no había ningún límite;
    - el tiempo de respuesta delataba las cuentas: 2,6 ms si el email no existe frente a 117 ms si existe.
  - **Corregido** en CAM-010:
    - límites por IP + email y por IP en el inicio de sesión, por IP en el registro y por IP en la recuperación;
    - bcrypt con hash ficticio, para que el tiempo sea igual exista o no la cuenta.
    - Resultado: 7/7, con 113 frente a 115 ms.
  - **Revisión independiente** de `auditor-ciberseguridad`: APROBADA CON OBSERVACIONES. Se incorporaron el tope de memoria y la longitud máxima del email.
  - **Riesgo aceptado o pendiente**:
    - el registro sigue diciendo «Ya existe una cuenta»: se resolvería con verificación por email, igual que INC-003;
    - `reset_password` da 429 en lugar de 400 solo si la cuenta existe y ya está bloqueada;
    - los límites por IP solo son fiables detrás del proxy de Render (`trust proxy` = 1);
    - una red compartida (un colegio) podría topar con los 5 registros por hora.

## INC-007 — Sin cabeceras de seguridad
- **Gravedad**: Media · **Estado**: Verificada. Por decisión del usuario (19/11/2026, «Esperar a Render»), se cerrará cuando confirme que en Render llegan las cabeceras y no hay violaciones de CSP en la consola · **Área**: configuración / seguridad web
- **Archivos afectados**: `server.ts`. No hay `helmet`, CSP, X-Frame-Options ni Referrer-Policy [C].
- **Escenario**: la app se puede incrustar en otra web (clickjacking) y no hay una segunda barrera contra XSS.
- **Evidencia**: estático.
- **Impacto**: riesgo acotado; ahora mismo no hay XSS conocido.
- **Seguimiento (19/11/2026)**:
  - **Corregido** en CAM-011:
    - en todas las respuestas: nosniff, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` y COOP;
    - en producción, además: HSTS y una CSP con la huella del script en línea, calculada al arrancar.
  - **Pruebas** [ejecutado, en el navegador real]:
    - la app completa funciona sin violaciones de CSP;
    - un script inyectado se bloquea;
    - una web de otro origen no puede incrustar la app.
  - **Revisión independiente** de `auditor-ciberseguridad`: APROBADA CON OBSERVACIONES, ninguna bloqueante.
  - **Pendiente**:
    - comprobar las cabeceras y la consola tras el primer despliegue en Render;
    - `'unsafe-inline'` en los estilos, por los estilos en línea de React: es un riesgo aceptado.

## INC-008 — CSRF por GET en `/api.php` y `/api_study.php`
- **Gravedad**: Baja · **Estado**: Verificada. Por decisión del usuario (19/11/2026, «Esperar a Render»), se cerrará cuando confirme que en Render las escrituras desde la app funcionan sin líneas `[CSRF]` con su dominio · **Área**: seguridad web
- **Archivos afectados**: `server.ts:490` y `:603`. Usan `app.all`, que acepta también GET, y las acciones leen `id` de la URL [C].
- **Escenario**: un padre con el panel desbloqueado abre un enlace externo a `/api.php?action=delete_child&id=X`. Como la cookie es SameSite=Lax, el navegador la envía en esa navegación y el borrado se ejecuta [A]. El atacante necesita conocer el id.
- **Evidencia**: estático.
- **Impacto**: borrado de datos. Escenario poco probable.
- **Seguimiento (19/11/2026)**:
  - **Reproducido** [ejecutado] con el código original (`inc008.mjs`), resultado 2/12:
    - un GET borra perfil, evento y libro, y marca una tarea;
    - se aceptan peticiones con `Origin` de otra web.
  - **Corregido** en CAM-012:
    - en esas rutas, solo las lecturas se aceptan por GET (el resto da 405);
    - se rechazan las escrituras que vienen de otra web (403);
    - `toggle_task` va por POST.
    - Resultado: 12/12.
  - **Ataque real en el navegador** [ejecutado]: una web de otro origen llevó el navegador, con la sesión de padres iniciada, a la URL de borrado. Respuesta: **405**, y el perfil sigue.
  - **Revisión independiente** de `auditor-ciberseguridad`: APROBADA CON OBSERVACIONES. Se incorporó el registro `[CSRF]` de cada rechazo.
  - **Pendiente**: comprobar en Render una escritura real desde la app; si apareciera `[CSRF] … Origin distinto del Host` con el dominio propio, revisar el proxy.

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
- **Gravedad**: Alta · **Estado**: Verificada. Por decisión del usuario (19/11/2026, «Esperar a Render»), se cerrará cuando confirme que el primer despliegue en Render arranca bien · **Área**: operación / despliegue
- **Archivos afectados**:
  - `server.ts:31`: puerto 3000 fijo, sin `process.env.PORT` [C];
  - `server.ts:4` y `:841`: Vite se importa siempre y el modo desarrollo se activa salvo que `NODE_ENV=production` [C];
  - `package.json:8`: `start` es igual que `dev` [C];
  - `server/db.ts:50-52`: sin Turso en producción, el servidor solo avisa [C];
  - no hay `render.yaml` ni Dockerfile [C].
- **Escenario**: un despliegue en Render sin `PORT=3000` o sin `NODE_ENV` falla o sirve el modo desarrollo. Sin `TURSO_*` o `S3_*`, se pierden los datos o las fotos en cada despliegue.
- **Evidencia**: estático. La configuración real de Render no se ha verificado [supuesto].
- **Impacto**: caídas o pérdida de datos.
- **Seguimiento (19/11/2026)**:
  - **Corregido** en CAM-007, con alcance completo autorizado por el usuario:
    - el puerto se toma de `PORT`;
    - el modo producción queda garantizado: con `npm start --prod`, con `NODE_ENV` o en Render;
    - Vite solo se carga en desarrollo;
    - en producción, el servidor no arranca sin `dist/`;
    - en Render, no arranca sin Turso o sin S3.
  - **Pruebas** [ejecutado, copia aislada]: escenarios A–F en PASS (ver CAM-007).
  - **NOT TESTED**: el primer despliegue real en Render.
  - **Pendiente fuera de alcance**:
    - `tsx` en producción;
    - versionar la configuración (`render.yaml`);
    - endpoint `/health`.
  - **Revisión independiente** de `arquitecto-software`: APROBADA CON OBSERVACIONES.

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

## INC-022 — Dependencias con vulnerabilidades conocidas
- **Gravedad**: Alta · **Estado**: Cerrada (19/11/2026; el usuario confirmó el cierre con «Sí, ciérrala». Queda 1 vulnerabilidad baja de esbuild como riesgo aceptado) · **Área**: dependencias / seguridad
- **Archivos afectados**: `package.json` y `package-lock.json`. Las vulnerabilidades directas están en `vite` y `postcss`; el resto son transitivas.
- **Escenario**:
  - `proxy-addr` (crítica, GHSA-jqcg-44mw-7w3h): permite falsear la IP con direcciones IPv4 mapeadas en IPv6. El servidor usa `trust proxy` (`server.ts:369`), así que afecta a `req.ip` y `req.secure` y dejaría saltarse un futuro límite de intentos por IP (INC-006).
  - Altas que afectan al servidor en marcha: `body-parser` (GHSA-v422-hmwv-36x6, GHSA-27r3-jxmh-p828), `path-to-regexp` (GHSA-j3q9-mxjg-w52f, GHSA-27v5-c462-wpq7) y `ws` (GHSA-58qx-3vcg-4xpx, GHSA-96hv-2xvq-fx4p). Provocan denegación de servicio o fuga de memoria.
  - `qs` (moderada): denegación de servicio.
  - `vite` (alta): permite leer archivos y saltarse `server.fs.deny` en el servidor de desarrollo, también en Windows. Se agrava con INC-014: si en producción falta `NODE_ENV=production`, se sirve Vite en modo desarrollo.
  - Solo afectan a la compilación: `postcss`, `@babel/core`, `esbuild`, `picomatch`, `nanoid`, `browserslist`, `source-map-js` y `baseline-browser-mapping`.
- **Evidencia**: [ejecutado] el 19/11/2026, en la copia aislada, tras `npm ci --ignore-scripts`. Resultado de `npm audit`: «14 vulnerabilidades (2 bajas, 2 moderadas, 9 altas, 1 crítica)», todas con arreglo disponible mediante `npm audit fix`.
- **Impacto**: suplantación de IP y denegación de servicio en el servidor expuesto, y lectura de archivos si se sirve Vite en modo desarrollo.
- **Propuesta (sin ejecutar)**: aplicar `npm audit fix` primero en la copia aislada y repetir tsc, build y audit. Cambia `package-lock.json`, así que necesita autorización.

## INC-023 — IDOR en `complete_study_task`: el `childId` validado no es el que se usa
- **Gravedad**: Media · **Estado**: Cerrada (19/11/2026; el usuario confirmó el cierre con «Sí, ciérralas») · **Área**: autorización / aislamiento
- **Archivos afectados**:
  - `server.ts:612-615`: el control de familia de `/api_study.php` valida `req.query.childId || data.childId`, es decir, el de la URL si viene [C].
  - `server.ts:652` y `:659-661`: `complete_study_task` busca la tarea, la marca como hecha, da los puntos (`awardActivity`) y crea el repaso (`addReviewTopic`) con `String(data.childId)`, el del cuerpo de la petición [C].
- **Escenario**: un usuario con sesión envía en la URL el `childId` de un hijo suyo y en el cuerpo el `childId` y el `id` de una tarea de otra familia. La validación pasa con el hijo propio, pero la tarea ajena se marca como completada con el resumen y la valoración que mande el atacante. Además, se dan puntos y se crea un repaso al niño de la otra familia.
- **Evidencia**: [estático]. Lo detectó `auditor-ciberseguridad` en la revisión de CAM-003 y el director lo comprobó leyendo el código. Sin prueba ejecutada; requiere conocer el `id` de la tarea y el `childId` ajenos.
- **Impacto**: se manipulan las tareas de estudio, los puntos y el repaso de otra familia, que además ve un resumen y una valoración falsos.
- **Corrección orientativa (sin ejecutar)**: usar en todas las acciones de `/api_study.php` un único `childId` ya validado (la variable `cid`), o rechazar la petición si el de la URL y el del cuerpo no coinciden.
- **Seguimiento (19/11/2026)**:
  - **Reproducido** [ejecutado] en la copia aislada con el código original, mediante el script `inc023.mjs`. B envió en la URL a su propio hijo y en el cuerpo la tarea y el hijo de A. Respuesta: `200 {"success":true,"points":50}`. La tarea de A quedó `completed` con el resumen «FALSO» y el hijo de A pasó de 0 a 50 puntos.
  - **Corregido** en CAM-004. Tras la corrección:
    - el ataque devuelve `404 {"error":"Perfil no encontrado"}`, la tarea sigue `pending` y los puntos se quedan en 0;
    - A completa su propia tarea con `200` y recibe 50 puntos.
  - **Revisión independiente** de `auditor-ciberseguridad`: APROBADA.
- **Seguimiento (19/11/2026)**:
  - **Corregido** en CAM-006 con `npm audit fix --ignore-scripts`. Solo cambia `package-lock.json`; `package.json` no se toca.
  - **`npm audit` después** [ejecutado, copia aislada]: 1 vulnerabilidad baja, 0 moderadas, 0 altas y 0 críticas.
  - **Riesgo aceptado (propuesta)**: queda `esbuild` 0.27.4 dentro de `tsx` (GHSA-g7r4-m6w7-qqqr, CVSS 2.5, vector local). Afecta solo al servidor de desarrollo de esbuild, que el proyecto no usa: el modo desarrollo usa Vite, que trae su propio esbuild 0.25.12, fuera del rango vulnerable. Se revisará cuando `tsx` incorpore esbuild 0.28.1 o posterior.
  - **Revisión independiente** de `auditor-ciberseguridad`: APROBADA CON OBSERVACIONES. Ver CAM-006.
