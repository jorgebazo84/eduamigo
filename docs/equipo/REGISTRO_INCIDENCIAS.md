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
| INC-007 | Media | Cerrada | Sin cabeceras de seguridad (CSP, X-Frame-Options, Referrer-Policy) | ejecutado (CAM-011) |
| INC-008 | Baja | Cerrada | CSRF por GET en `/api.php` y `/api_study.php` | ejecutado (CAM-012) |
| INC-009 | Baja | Abierta | Huecos en la separación entre niño y adulto | estático |
| INC-010 | Baja | Abierta | Puntos que dependen de datos enviados por el cliente | estático |
| INC-011 | Baja | Abierta | Posible carrera en las peticiones de premios | supuesto |
| INC-012 | Baja | Cerrada | Token de `/admin/avisos` en la URL | ejecutado (CAM-014) |
| INC-013 | Baja | Cerrada | Errores internos devueltos al cliente; cookie mal formada provoca error 500 | ejecutado (CAM-014) |
| INC-014 | Alta | Cerrada | Despliegue frágil: puerto fijo, Vite en producción, pérdida de datos sin Turso o S3 | ejecutado (CAM-007) |
| INC-015 | Alta | Abierta | Esquema sin migraciones versionadas, sin claves foráneas y sin índices en las tablas base | estático |
| INC-016 | Media | Abierta | PWA y modo sin conexión incoherentes | estático |
| INC-017 | Media | Abierta | Contratos entre cliente y servidor sin tipar, con clientes HTTP duplicados | estático |
| INC-018 | Media | Abierta | Contenidos generados por IA compartidos entre familias sin revisión humana | estático |
| INC-019 | Baja | Abierta | Restos de la plantilla AI Studio y dependencias mal clasificadas | estático |
| INC-020 | Baja | Abierta | Archivos demasiado grandes y código de arranque innecesario | estático |
| INC-021 | Media | Abierta | No hay pruebas automatizadas | estático |
| INC-022 | Alta | Cerrada | Dependencias con vulnerabilidades conocidas: 1 crítica, 9 altas (queda 1 baja aceptada) | ejecutado (CAM-006) |
| INC-023 | Media | Cerrada | IDOR en `complete_study_task`: el `childId` que se valida no es el que se usa | ejecutado (CAM-004) |
| INC-024 | Alta | Abierta | Filtro de riesgo del tutor: no detecta frases de riesgo de adolescentes y da falsas alarmas con temas de clase que llegan a los padres | ejecutado |
| INC-025 | Alta | Abierta | La IA corrige fichas y deberes sin ninguna verificación (respuesta esperada generada por ella misma, sin nivel de confianza) | estático |
| INC-026 | Alta | Abierta | Un único prompt de tutor para 6-18 años: sin tramo para 1.º-2.º ni reglas para redacciones, comentarios y traducciones | estático |
| INC-027 | Alta | Abierta | Los padres leen todo el chat del tutor también a los 14-17 años | estático + supuesto |
| INC-028 | Media | Cerrada | Grafología activada por defecto en menores y nota numérica de caligrafía mostrada al niño | ejecutado (CAM-014) |
| INC-029 | Media | Abierta | Gamificación que premia el resultado y no el esfuerzo; rachas con récord perdido; estética infantil para adolescentes | estático |
| INC-030 | Media | Abierta | Currículo genérico («LOMLOE» sin saberes básicos); FP casi sin detalle; sin textos de Bachillerato | estático |
| INC-031 | Media | Abierta | Informes a padres con lenguaje de «diagnóstico»; la fluidez lectora «por debajo» se muestra al niño | estático |
| INC-032 | Media | Abierta | Sin ajustes de accesibilidad ni de atención a la diversidad | estático (por ausencia) |
| INC-033 | Media | Abierta | Falta alfabetización en IA y metacognición en los exámenes | estático (por ausencia) |
| INC-034 | Media | Cerrada | `.gitignore` no excluía `.env`: un archivo de claves podía subirse a GitHub | ejecutado (CAM-014) |

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
- **Gravedad**: Media · **Estado**: Cerrada (20/11/2026; el usuario confirmó el cierre con «Sí, ciérralas» tras la verificación en producción) · **Área**: configuración / seguridad web
- **Verificación en producción (20/11/2026)** [ejecutado contra https://eduamigo.onrender.com]:
  - llegan las 8 cabeceras, y la huella de la CSP es la misma que en las pruebas;
  - la app carga en el navegador sin peticiones externas y con la fuente propia;
  - la consola no muestra violaciones de CSP; solo el 401 esperado de la comprobación de sesión.
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
- **Gravedad**: Baja · **Estado**: Cerrada (20/11/2026; el usuario confirmó el cierre con «Sí, ciérralas» tras la verificación en producción) · **Área**: seguridad web
- **Verificación en producción (20/11/2026)** [ejecutado contra https://eduamigo.onrender.com, sin crear datos]:
  - **POST con `Origin` del propio dominio** a `/auth.php?action=login` (email ficticio): HTTP 400 «Credenciales incorrectas», es decir, la petición pasa el control. Queda confirmado que, detrás del proxy de Render, `Origin` y `Host` coinciden.
  - **POST con `Origin` de otra web**: HTTP 403 `CROSS_SITE`.
  - **`GET /api.php?action=delete_child`**: HTTP 405.
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
- **Gravedad**: Baja · **Estado**: Cerrada (20/11/2026; el usuario confirmó el cierre con «Sí, ciérralas») · **Área**: secretos
- **Archivos afectados**: `server/parent.ts:307`, `:321` y `:340` [C].
- **Escenario**: el `ADMIN_TOKEN` queda guardado en los registros del proxy o del hosting y en el historial del navegador.
- **Evidencia**: estático.
- **Impacto**: bajo. La página no muestra nombres, pero sí correcciones de trabajos de menores.
- **Seguimiento (20/11/2026)**:
  - **Corregido** en CAM-014. El token se escribe en un formulario (POST) y abre una sesión con una cookie firmada: HMAC, solo para `/admin`, httpOnly, SameSite=Strict y 8 h. El token en la URL ya no sirve.
  - **Pruebas** [ejecutado]: `bloque_rapido.mjs` 16/16 frente a 4/16 con el código anterior.
  - **Riesgo aceptado (revisión de seguridad)**: «Cerrar sesión» borra la cookie del navegador, pero una cookie robada sigue valiendo hasta 8 h. Para invalidarla, se cambia `ADMIN_TOKEN`.

## INC-013 — Errores internos devueltos al cliente
- **Gravedad**: Baja · **Estado**: Cerrada (20/11/2026; el usuario confirmó el cierre con «Sí, ciérralas») · **Área**: robustez / exposición
- **Archivos afectados**: `server.ts:485`, `:597` y `:667` devuelven `e.message` sin filtrar [A]. `server.ts:296` llama a `decodeURIComponent` sin try [C].
- **Escenario**: aparecen mensajes internos de SQLite en la respuesta. Una cookie con un `%` mal formado provoca un error 500 en cada petición protegida (solo afecta a quien la envía).
- **Evidencia**: estático.
- **Impacto**: bajo.
- **Seguimiento (20/11/2026)**:
  - **Reproducido** [ejecutado] con el código anterior:
    - el usuario recibía `{"error":"SQLITE_CONSTRAINT: UNIQUE constraint failed: children.id"}`;
    - una cookie mal formada daba HTTP 500.
  - **Corregido** en CAM-014 con `server/errors.ts` (`publicErrorMessage`), aplicado en todas las rutas que devolvían el error crudo.
    - Los errores de base de datos, del proveedor de IA (por ejemplo, «credit balance is too low»), de R2 (`HTTP 403`) o de programación se sustituyen por un mensaje genérico y el detalle va al log.
    - Los mensajes de validación siguen visibles.
  - **Pruebas** [ejecutado]: 16/16 y `errores_publicos.mts` 7/7.
  - **Observación de seguridad, no aplicada**: el filtro funciona por lista de patrones. A futuro, conviene una clase `UserError` para los mensajes de validación y mostrar el mensaje genérico por defecto.

## INC-014 — Despliegue frágil
- **Gravedad**: Alta · **Estado**: Cerrada (20/11/2026; el usuario confirmó el cierre con «Sí, ciérralas» tras la verificación en producción) · **Área**: operación / despliegue
- **Verificación en producción (20/11/2026)** [log de Render facilitado por el usuario; commit `1bb0324`]:
  - `[DB] Conectando con Turso (…aws-eu-west-1.turso.io)…` y `[DB] Base de datos: Turso (nube)`;
  - `Server running on http://localhost:10000`;
  - `[COPIA] backups/eduamigo-2026-11-20.sql.gz: 52 tablas, 0 filas, 3 KB (s3)`;
  - «Your service is live» en https://eduamigo.onrender.com.
  - **Pendiente menor**: el comando de build de Render sigue siendo `npm install --include=dev && npm run build`; se recomienda `npm ci && npm run build`.
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
- **Seguimiento (20/11/2026): primer despliegue real en Render** [ejecutado, log de Render facilitado por el usuario]
  - **Intentos 1 y 2**: `[ARRANQUE] Faltan TURSO_DATABASE_URL y/o TURSO_AUTH_TOKEN` → `Exited with status 1`. La protección de CAM-007 funciona.
  - **Intento 3**, con las variables ya puestas: `tsx server.ts --prod` y ninguna línea más, hasta `Port scan timeout reached, no open ports detected`. La app se quedó colgada en la primera conexión con Turso, que no tenía límite de tiempo.
  - **Despliegue que sigue activo**, el anterior a CAM-007 (`tsx server.ts`): `[DB] Base de datos: SQLite local (eduamigo.db)`, fotos en disco y `[COPIA] … 51 tablas, 0 filas`.
    - Queda **confirmado en producción**: la app nunca había usado Turso, la base de datos está vacía y los datos se perdían en cada despliegue.
    - No hay datos de familias en riesgo.
  - **Corregido** en CAM-013: la primera conexión con la base de datos escribe `[DB] Conectando con Turso (host)…` y tiene un límite de 15 s; si no responde, la app se detiene con un mensaje `[ARRANQUE]`.
  - **Pendiente**: averiguar por qué Turso no responde desde Render (credenciales, base de datos archivada…) y repetir el despliegue.

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
- **Seguimiento (20/11/2026), auditoría pedagógica**:
  - **Riesgo concreto** según `especialista-pedagogia-primaria` y `especialista-pedagogia-adolescentes`:
    - un error factual en un texto o en una pregunta se convierte en «verdad escolar» para todos los niños de ese curso;
    - una clave de respuesta errónea castiga a los niños que aciertan;
    - los sesgos y estereotipos se replican;
    - el nivel de lectura puede no corresponder al curso;
    - `syllabus_cache` guarda «temas oficiales» que también genera la IA.
  - No hay campo de revisión en `reading_texts` ni en `question_bank` [A].
  - **Propuesta**:
    - estados pendiente, aprobado y rechazado, y servir solo lo aprobado;
    - una segunda llamada que verifique el contenido;
    - comprobar la legibilidad por curso y las claves de aritmética;
    - un botón «esto está mal» con retirada automática;
    - muestreo por un docente.
  - **Decisión del usuario pendiente**: los especialistas proponen subir la gravedad a **Alta**.

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

---

**Origen de INC-024 a INC-033**: auditoría pedagógica del 20/11/2026, solo lectura. La hicieron `especialista-pedagogia-primaria` y `especialista-pedagogia-adolescentes`; el director contrastó y verificó los puntos clave.
- **Marcas**: [C] comprobado por el director; [E] ejecutado; [A] afirmado por un especialista sin volver a comprobarlo; [S] supuesto.
- No se ha probado nada con alumnos ni con la IA real: el impacto pedagógico está en NOT TESTED.
- Los especialistas no consultaron en esta sesión el BOE ni los estudios que citan.

## INC-024 — Filtro de riesgo del tutor: no detecta frases de riesgo de adolescentes y da falsas alarmas con temas de clase
- **Gravedad**: Alta · **Estado**: Abierta (trabajo hecho en la copia aislada, sin aplicar; aparcado por el usuario el 20/11/2026) · **Área**: protección del menor / tutor de IA
- **Seguimiento (20/11/2026)**:
  - **Implementado en la copia aislada** (capas A y B), sin aplicar al proyecto.
    - Guardado en `scratchpad/respaldo/inc024_pendiente/`: `server/tutor.ts` e `inc024.diff`.
    - Al guardarse en una carpeta temporal, una limpieza del sistema podría borrarlo.
  - **Medición** [ejecutado]:
    - corpus de desarrollo de 50 frases: 20/50 con el filtro anterior, 50/50 con el nuevo, cifra inflada porque las expresiones se escribieron viendo esas frases;
    - **corpus ciego** de 42 frases, escrito por `especialista-pedagogia-adolescentes` sin ver el filtro: detección 8/30 (27 %) con 2/12 falsas alarmas el anterior, y 10/30 (33 %) con 1/12 el nuevo. La capa A no generaliza; la protección depende de la capa B.
  - **Capa B**: probada con IA simulada (12/12 de extremo a extremo; la marca no se puede colar ni se muestra). **Sin probar con la IA real**: el intento del 20/11 falló porque la cuenta de Anthropic no tenía saldo.
  - **Revisiones independientes**: pedagogía y seguridad, ambas APROBADA CON OBSERVACIONES; sus observaciones principales ya están incorporadas en la copia.
  - **Falsa alarma detectada** en la prueba real: «mi hermano me ha pegado un susto de muerte».
  - **Para retomar**:
    - añadir saldo en Anthropic;
    - ejecutar `pruebas/capaB_real.ps1`;
    - decidir si se aplica.
- **Archivos afectados**:
  - `server/tutor.ts:39-48`: el filtro es una lista de expresiones regulares [C];
  - `:271`: solo se aplica en el modo guiado. Es el único con texto libre, así que por ahí no hay hueco [C];
  - `:310-312`: salvo en posible abuso, cada alerta avisa a los padres [C];
  - `:255`: las fotos no pasan por el filtro [A].
- **Escenario**:
  - Un adolescente escribe «no aguanto más, quiero acabar con todo»: el filtro no lo detecta y la IA responde como a una pregunta escolar.
  - Un alumno pregunta «¿por qué se suicida Werther?» para Literatura: recibe una respuesta fija de ayuda en vez de ayuda con el tema, y sus padres reciben una alerta de autolesión.
- **Evidencia** [ejecutado, 20/11/2026]: se pasó el `detectRisk` real sobre 10 frases, en la copia aislada idéntica al proyecto (`filtro_riesgo.mts`). **Resultado: 1 de 10 correcta.**
  - **4 falsas alarmas** con temas de clase:
    - Werther → `autolesion`;
    - Durkheim → `autolesion`;
    - «¿Qué es el acoso escolar? … trabajo» → `acoso`;
    - «bullying … siglo XIX» → `acoso`.
  - **5 riesgos sin detectar**:
    - «no aguanto más, quiero acabar con todo»;
    - «me odio y me da igual vivir»;
    - acoso en un grupo de WhatsApp;
    - «me chantajean con unas fotos mías»;
    - «me kiero morir».
  - Solo acierta «me quiero morir».
- **Impacto**:
  - falsos negativos: riesgo para la seguridad de los menores;
  - falsos positivos: pérdida de confianza y avisos indebidos a los padres.
- **Propuesta** (sin ejecutar):
  - ampliar las expresiones con lenguaje adolescente, de redes y con faltas de ortografía;
  - una segunda capa contextual que distinga «hablar de» un tema de «vivirlo»;
  - pasar también las fotos por el filtro;
  - respuestas según la edad con 024, ANAR y 112, sin cortar la conversación;
  - un corpus de pruebas revisado por un orientador.

  Requiere la revisión de `auditor-ciberseguridad` y de `especialista-legal-es`, que debe decidir cuándo se avisa a los padres.

## INC-025 — La IA corrige fichas y deberes sin ninguna verificación
- **Gravedad**: Alta · **Estado**: Abierta · **Área**: pedagogía / corrección automática
- **Archivos afectados**:
  - `server/worksheets.ts:182-233`: los prompts de generación y de corrección [C];
  - `:194-197`: la `expectedAnswer` la genera la propia IA al crear la ficha, y la corrección devuelve un `isCorrect` sin nivel de confianza [A].
- **Escenario**:
  - Si la IA lee mal la letra o calcula mal, el niño oye que se equivocó cuando acertó, o se le da por bueno un error.
  - En Física, Química y Matemáticas de cursos altos el error de la IA es más probable.
- **Evidencia**: estático; el comportamiento real del modelo no se ha probado.
- **Impacto**:
  - daño a la autoeficacia del alumno;
  - errores que se refuerzan;
  - la familia confía en una nota equivocada.
- **Propuesta** (sin ejecutar):
  - recalcular la aritmética en el servidor (`shared/mathOps.ts` ya existe) y marcar las discrepancias;
  - un campo de confianza que, si es baja, muestre «revísalo con un adulto»;
  - un botón «creo que está bien»;
  - en cursos altos, el aviso «corrección orientativa, contrástala con tu profesor»;
  - una enumeración de errores por asignatura, no solo de divisiones (`:213`).

## INC-026 — Un único prompt de tutor para 6-18 años
- **Gravedad**: Alta · **Estado**: Abierta · **Área**: pedagogía / tutor de IA
- **Archivos afectados**:
  - `server/tutor.ts:103-125`: solo se adapta según `grade` («frases cortas, vocabulario adecuado a…») [C];
  - `:111-112`: «no dar la solución» depende solo del prompt [C];
  - `server/english.ts:149` y `:283`: los prompts hablan de «children» también para Secundaria [A].
- **Escenario**:
  - Un niño de 6-7 años, que aún lee con esfuerzo, recibe de 2 a 6 frases escritas. Hay botón para escuchar la respuesta (`components/TutorChat.tsx:216`) [C], pero no se puede dictar la pregunta.
  - En ESO o Bachillerato, quien pide «hazme el comentario» o «tradúcemelo», o lo disfraza de «ejemplo», probablemente consiga que el modelo ceda [S].
- **Evidencia**: estático; no se ha probado con la IA real.
- **Impacto**:
  - los más pequeños no pueden usar bien el tutor;
  - en Secundaria, la IA puede acabar haciendo los deberes.
- **Propuesta** (sin ejecutar):
  - prompts por tramo de edad (6-8, 9-11, 12-15 y 16-18) y por tipo de tarea:
    - redacción: estructura y comentarios sobre el borrador del propio alumno;
    - problemas: pistas graduadas;
    - traducción: vocabulario y pistas, no la traducción;
  - una batería de peticiones adversarias, probada con la IA real (tiene coste);
  - dictado para los pequeños, con revisión legal y de seguridad si se graba la voz;
  - un límite diario de preguntas según el curso; ahora son 30 para todos (`:26`).

## INC-027 — Los padres leen todo el chat del tutor también a los 14-17 años
- **Gravedad**: Alta · **Estado**: Abierta · **Área**: privacidad del menor / pedagogía
- **Archivos afectados**:
  - `server/tutor.ts:430-437`: la vista de los padres sobre las conversaciones [A];
  - `components/TutorChat.tsx:180`: el aviso «Tus padres pueden ver estas conversaciones» [A];
  - las conversaciones de posible abuso quedan ocultas (`:272`) [C].
- **Escenario**:
  - Un adolescente de 15-17 años sabe que sus padres lo leen todo, así que deja de plantear sus dudas reales o se va a otra IA sin supervisión [S].
  - Una alerta de autolesión llega a los padres sin que el alumno sepa que se les avisará.
- **Evidencia**: estático + supuesto.
- **Impacto**:
  - pérdida de confianza y de utilidad;
  - posible choque con la autonomía progresiva del menor y con el consentimiento propio desde los 14 años (art. 7 LOPDGDD; ver INC-001).
- **Propuesta** (sin ejecutar): visibilidad según la edad, configurable y acordada entre el alumno y la familia:
  - menores de 14: completa;
  - 14-15: resumen y alertas;
  - 16-18: solo alertas y progreso.

  Además, informar al alumno de cuándo y a quién se avisa. Requiere la decisión del titular y la revisión de `especialista-legal-es`.

## INC-028 — Grafología activada por defecto en menores y nota numérica de caligrafía mostrada al niño
- **Gravedad**: Media · **Estado**: Cerrada (20/11/2026; el usuario confirmó el cierre con «Sí, ciérralas») · **Área**: pedagogía / bienestar / datos de menores
- **Seguimiento (20/11/2026)**:
  - **Corregido** en CAM-014:
    - la grafología queda desactivada por defecto (`DEFAULT 0`, `?? 0` y `add_child` la pone a 0); los padres pueden activarla en su panel;
    - el niño ya no recibe la nota numérica, ni al analizar ni en su historial; ve un icono neutro y los comentarios;
    - los padres siguen viendo la nota.
  - **Pruebas** [ejecutado]: 16/16.
  - **Sin cambios de datos**: en producción no hay perfiles (copia de seguridad con 0 filas). Si existieran perfiles anteriores con la grafología activada, no se han tocado.
  - **Pendiente fuera de alcance**: separar la ortografía de la letra, y los puntos según la nota (INC-029).
- **Archivos afectados**:
  - `server/calligraphy.ts:43`: `graphology_enabled INTEGER DEFAULT 1` [C];
  - `:117`: se aplica si no hay un valor guardado [C];
  - `:127`: una nota de la IA de 0 a 10 que mezcla legibilidad, trazo, espaciado y ortografía [A].
- **Escenario**:
  - Un niño con la motricidad fina aún inmadura recibe notas bajas una y otra vez.
  - Los padres reciben comentarios de grafología sobre un menor, una técnica sin base científica, aunque haya avisos y un filtro de palabras (`:23`, `:26`).
- **Evidencia**: estático.
- **Impacto**: desmotivación y etiquetas sin fundamento sobre menores.
- **Propuesta** (sin ejecutar):
  - desactivar la grafología por defecto o retirarla para menores;
  - mostrar al niño solo comentarios cualitativos y una cosa que mejorar, sin número;
  - separar la ortografía de la letra.

## INC-029 — Gamificación que premia el resultado y no el esfuerzo
- **Gravedad**: Media · **Estado**: Abierta · **Área**: pedagogía / motivación
- **Archivos afectados**:
  - `server/calligraphy.ts:151`: 15 puntos si la nota es 7 o más, 5 si no [C];
  - `server/rewards.ts:106` y `:208`: la racha se rompe tras dos días y se guarda el récord perdido (`streak_best`) [A];
  - cromos e insignias con estética infantil también para 14-18 años [A].
- **Escenario**:
  - el niño estudia por los puntos;
  - cuando pierde la racha, ve el récord que ha perdido;
  - a un adolescente todo esto le resulta infantil.
- **Evidencia**: estático.
- **Impacto**: riesgo de desplazar la motivación intrínseca y de añadir presión [S].
- **Propuesta** (sin ejecutar):
  - puntos por intentarlo y por mejorar respecto a uno mismo;
  - una racha que no vuelva a cero («días activos esta semana»);
  - premios como experiencias compartidas;
  - un modo «sin gamificación» desde los 14 años.

## INC-030 — Currículo genérico, FP casi sin detalle y sin textos de Bachillerato
- **Gravedad**: Media · **Estado**: Abierta · **Área**: pedagogía / currículo
- **Archivos afectados** [A]:
  - prompts con «LOMLOE» a secas, sin saberes básicos ni criterios: `server/tutor.ts:104`, `server/worksheets.ts:189`, `server/library.ts:193` y `server/review.ts:225`;
  - `shared/fpCurriculum.ts`: solo detalla 5 módulos de Grado Básico de Informática; el resto cae en un genérico (`:163`);
  - `server/reading.ts:98`: los textos llegan hasta 4.º de ESO.
- **Escenario**: la IA inventa temas o mezcla currículos antiguos o de otra comunidad, y los guarda en el `syllabus_cache` compartido (INC-018).
- **Evidencia**: estático. No se ha verificado en el BOE la vigencia de los reales decretos citados.
- **Impacto**: contenidos que no corresponden a lo que se enseña en clase.
- **Propuesta** (sin ejecutar):
  - un catálogo curricular versionado como fuente de los temas (RD 157/2022, 217/2022 y 243/2022, y la normativa de FP vigente);
  - un aviso para el alumnado de FP;
  - textos y tipologías propios de Bachillerato.

## INC-031 — Informes a padres con lenguaje de «diagnóstico»; la fluidez lectora «por debajo» se muestra al niño
- **Gravedad**: Media · **Estado**: Abierta · **Área**: pedagogía / informes
- **Archivos afectados** [A]:
  - `server/worksheets.ts:206-213`: los campos `summaryDiagnosis` y `pedagogicalInsight`, y las etiquetas de error;
  - `server/reading.ts:217-220`: la banda de velocidad lectora por curso, con `below`/`above`.
- **Escenario**:
  - los padres leen una «diagnosis» automática como si fuera una evaluación profesional;
  - un niño de 6-8 años ve que lee «por debajo».
- **Evidencia**: estático.
- **Impacto**: ansiedad e interpretaciones equivocadas.
- **Propuesta** (sin ejecutar):
  - hablar de «observación», con un texto fijo: «orientación automática, puede equivocarse»;
  - empezar por lo que va bien, seguir con una sugerencia práctica e indicar cuándo conviene hablar con el profesor;
  - al niño, mostrarle solo su propio progreso.

## INC-032 — Sin ajustes de accesibilidad ni de atención a la diversidad
- **Gravedad**: Media · **Estado**: Abierta · **Área**: pedagogía / inclusión
- **Archivos afectados**: no se encontraron ajustes para dislexia o TDAH, tamaño de letra, interlineado, contraste, reducción de animaciones, tiempo extra ni apoyo lingüístico [A, por búsqueda; no se revisaron todos los componentes].
- **Escenario**: un alumno con dislexia, con TDAH o que no habla español no puede adaptar la app.
- **Evidencia**: estático (por ausencia).
- **Impacto**: se excluye al alumnado con necesidades específicas.
- **Propuesta** (sin ejecutar):
  - ajustes por perfil;
  - un «modo apoyo lingüístico»;
  - una guía para familias que remita al orientador, sin diagnosticar.

## INC-033 — Falta alfabetización en IA y metacognición en los exámenes
- **Gravedad**: Media · **Estado**: Abierta · **Área**: pedagogía / uso responsable de la IA
- **Archivos afectados** [A]:
  - el tutor avisa de que es una IA (`components/TutorChat.tsx:178`) y dice «si no sabes algo, dilo» (`server/tutor.ts:122`), pero no enseña a comprobar sus respuestas ni explica sus límites;
  - `components/ExamMode.tsx:157-162` solo da ánimos según la nota.
- **Escenario**:
  - el alumno se fía de la IA sin contrastar;
  - no aprende de sus errores en los exámenes.
- **Evidencia**: estático (por ausencia).
- **Impacto**: uso acrítico de la IA y menos aprendizaje.
- **Propuesta** (sin ejecutar):
  - una mini-lección en el primer uso: qué es una IA, cómo comprobar lo que dice y cuándo desconfiar;
  - preguntas del tipo «¿cómo lo comprobarías?»;
  - en los exámenes, pedir la confianza antes de responder y clasificar los errores;
  - preguntas de desarrollo para la EBAU/PAU.

## INC-034 — `.gitignore` no excluía `.env`
- **Gravedad**: Media · **Estado**: Cerrada (20/11/2026; el usuario confirmó el cierre con «Sí, ciérralas») · **Área**: secretos / repositorio
- **Archivos afectados**: `.gitignore`, que no tenía ninguna regla para `.env` [C].
- **Escenario**: si se crea en la carpeta del proyecto un `.env` con las claves (Turso, R2, Anthropic), GitHub Desktop lo ofrece para el commit y acaba en GitHub.
- **Evidencia**: [ejecutado, 20/11/2026] con el `.gitignore` anterior, `git check-ignore` → `.env` se subiría. Hoy no hay ningún `.env` en la carpeta ni en el repositorio (`git ls-files` solo muestra `.env.example`).
- **Impacto**: exposición pública de secretos de producción.
- **Origen**: detectado por el director al preparar la guía de configuración de Render (20/11/2026). Registrada con la autorización del bloque rápido.
- **Seguimiento (20/11/2026)**:
  - **Corregido** en CAM-014: se añaden `.env`, `.env.*` y `!.env.example`.
  - **Prueba** [ejecutado]: `git check-ignore` → `.env`, `.env.local` y `.env.production` quedan ignorados; `.env.example` se sigue subiendo.
