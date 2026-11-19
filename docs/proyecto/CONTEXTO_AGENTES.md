# Contexto de EduAmigo para el equipo de especialistas

Los agentes del equipo son genéricos y comunes a toda la cartera. Este documento les da lo que necesitan saber de **este** proyecto. Cada agente lee la sección general y la suya. Marcas: [C] comprobado · [NV] no verificado. Última revisión: 19/11/2026 (auditoría de incorporación).

## General (todos)
- **Dominio y usuarios:** familias en España. [C]
  - El adulto crea la cuenta (email, contraseña y PIN) y los perfiles de sus hijos.
  - El niño usa la app en el dispositivo familiar.
  - El panel de padres se abre con el PIN.
- **Stack:** React 19 + Vite 6 + Tailwind 4 / Express 5 con tsx / libSQL (Turso) / Anthropic / S3-R2. [C]
- **Archivos clave:**
  - `server.ts`: esquema base; autenticación en `:244-490`; `/api.php` en `:490`; `/api_study.php` en `:603`;
  - `server/*.ts`: un módulo por área;
  - `server/db.ts`, `server/ai.ts`, `server/storage.ts`, `server/backup.ts`;
  - `App.tsx`, `services/*`, `shared/*`.
- **Aislamiento:** por familia (`users.id` = `children.parentId`). Cada módulo filtra con `ownChild(userId, childId)` o con `user_id`/`child_id`, y el `userId` sale siempre de la sesión. [C] Excepción abierta: INC-004.
- **Registros:** `docs/equipo/REGISTRO_INCIDENCIAS.md` y `docs/equipo/REGISTRO_CAMBIOS.md`.

## arquitecto-software
- `server.ts` hace a la vez de composition root, esquema, autenticación y dos APIs.
- Hay 51 tablas, que cada módulo crea al registrar sus rutas. Los `ALTER` van dentro de try/catch; no hay claves foráneas ni migraciones (INC-015).
- La PWA está desactivada en la práctica (INC-016).
- Los contratos cliente-servidor no están tipados y la función `api()` se repite en cada servicio (INC-017).
- Hay archivos de más de 800 líneas (INC-020).
- Despliegue: ver INC-014.

## auditor-ciberseguridad
- **Sesión:** cookie httpOnly con SameSite=Lax; el token se guarda como sha256 en `sessions` y dura 180 días (`server.ts:245-334`). [C]
- **PIN:** scrypt; tras 5 fallos se bloquea 15 min (`:247-248`, `:383-395`).
- **Panel de padres:** ventana deslizante de 15 min. Listas `PARENT_ONLY` en `server.ts:341` y `server/worksheets.ts:444`.
- **Rutas sin sesión:** `/auth.php` (register, login, reset_password) y `/admin/avisos`, protegida con `ADMIN_TOKEN` (`server/parent.ts:300-342`).
- **Incidencias abiertas:** INC-003 a INC-013.

## especialista-bd-sql
- **Motor:** libSQL/SQLite: Turso en producción; `eduamigo.db` o `DB_FILE` en local.
- **Esquema:** `server.ts:52-242` y el comienzo de cada `server/*.ts`.
- **Volcado y restauración:** `server/db.ts` (`dumpDatabase`) y `scripts/restore-backup.ts`.
- **Índices:** solo en las tablas nuevas.
- **Claves foráneas:** ninguna.
- **Borrado de un hijo:** sin cascada (INC-002).

## especialista-apis-integraciones
- **API propia:** `POST /<area>.php?action=…` con cuerpo JSON. Los clientes están en `services/*.ts`. `App.tsx` llama a `/api.php` directamente.
- **Integraciones externas** [C en el código; NV en producción]:
  - Anthropic Messages API: implementada; simulación con `TUTOR_PROVIDER=mock`.
  - S3/R2 mediante aws4fetch: implementada; si falta la configuración, se usa disco local.
  - Google Books: opcional.
  - Búsqueda web de Anthropic: opcional.

## disenador-ux-ui
- **Uso:** móvil o tablet familiar y escritorio; niños de 6 a más de 16 años, y adultos.
- **PWA:** `public/manifest.json` e iconos en `public/`.
- **Identidad:** `public/icon.svg`, Tailwind en `index.css`, marca «EWOLA J21 TECH» (`version.ts`). Guía de estilo [NV].

## especialista-legal-es
- **Normativa:**
  - RGPD y LOPDGDD: menores, con consentimiento de los padres por debajo de 14 años;
  - transferencias internacionales (Anthropic, Cloudflare);
  - conservación: fotos 365 días, copias 30 días;
  - derecho de supresión.
- **Datos tratados:**
  - email de los adultos;
  - nombre, curso y avatar de los menores;
  - fotos de deberes y fichas;
  - audios de lectura;
  - conversaciones con el tutor, incluidas las señales de riesgo;
  - notas escolares;
  - circulares escaneadas.
- **Incidencias abiertas:** INC-001 e INC-002.

## consultor-erp-crm
- No aplica por ahora: es un producto familiar sin facturación.

## especialista-desarrollo-movil
- Hoy es una PWA: hay manifest, pero el service worker está desactivado en `index.html:57-73`.
- Usa la cámara (fotos de deberes y QR con `jsqr`) y el micrófono (lectura en voz alta).
- Si se publica en tiendas, habrá que cumplir sus requisitos para apps infantiles o familiares.
- Plan de app nativa [NV].

## especialista-pedagogia-primaria / especialista-pedagogia-adolescentes
- **Cursos:** `shared/grades.ts` (Primaria, ESO, Bachillerato) y FP (`shared/fpCatalog.ts`, `shared/fpCurriculum.ts`).
- **Asignaturas:** `shared/schoolSubjects.ts`.
- **Contenidos y prompts:**
  - `server/tutor.ts`: tutor y filtro de riesgo, con derivación a la Fundación ANAR y al 112;
  - `server/worksheets.ts`, `server/review.ts`, `server/english.ts`, `server/reading.ts`, `server/math.ts`, `server/gamesBank.ts`;
  - `shared/englishBank.ts`, `shared/readingLibrary.ts`, `data/staticContent.ts`.
- **Gamificación:** puntos, rachas, insignias y tienda de premios aprobados por los padres (`server/rewards.ts`, `shared/rewardsCatalog.ts`), con topes diarios.
- **Pendiente:** hay contenidos generados por IA que se comparten entre familias sin revisión humana (INC-018).

## especialista-qa / desarrollador-fullstack
- Comprobaciones y copia aislada: ver `docs/proyecto/PRUEBAS_Y_VERIFICACION.md`.
- Línea base vigente: ninguna (pendiente).
- Puerto: 3000, fijo en `server.ts:31`.
- Prohibido sin autorización:
  - `npm run restore`;
  - conectarse a Turso o R2 reales;
  - hacer llamadas reales a Anthropic.
