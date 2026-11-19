# EduAmigo — instrucciones para Claude Code

Las reglas comunes de la cartera (autorización, estados PASS/FAIL, registros, aislamiento, equipo y consumo) están en `C:\DESARROLLO\CLAUDE.md` y se cargan solas. Aquí va solo lo propio de EduAmigo; el detalle está en `docs/`.

## 1. Qué es
- Producto: tutor inteligente y asistente escolar para niños y adolescentes (Primaria, ESO, Bachillerato y FP), con panel de padres protegido por PIN.
- Versión: 3.0.0. Está en tres sitios (`package.json`, `version.ts`, `changelog.md`): mantenerlos a la par.
- Código de proyecto para los registros: `EA` (incidencias `INC-NNN`, cambios `CAM-NNN`).
- **Trata datos de menores.** Cualquier cambio en datos personales, fotos, audios, chats o IA requiere revisión de `auditor-ciberseguridad`. Si afecta al tratamiento de datos, también de `especialista-legal-es`.

## 2. Tecnología y estructura
- Frontend: React 19, Vite 6 y Tailwind 4. Archivos: `App.tsx`, `components/**` y `services/**` (los clientes HTTP).
- Backend: Express 5 ejecutado con `tsx`.
  - `server.ts`: esquema base, autenticación y PIN (`:244-490`), `/api.php` y `/api_study.php`.
  - `server/*.ts`: un módulo por área.
  - Rutas: `POST /<area>.php?action=…`.
- Base de datos: libSQL. En producción, Turso; en local, `eduamigo.db` o `DB_FILE` (`server/db.ts`). El esquema se crea con `CREATE TABLE IF NOT EXISTS` y se amplía con `ALTER` en cada módulo; no hay migraciones versionadas.
- IA: Anthropic, solo desde el servidor (`server/ai.ts`, `server/tutor.ts`). Con `TUTOR_PROVIDER=mock` se prueba sin coste.
- Archivos: fotos y audios en S3/R2 o en disco (`server/storage.ts`). Copia diaria a R2 (`server/backup.ts`).
- `shared/**` (catálogos, cursos y asignaturas) lo usan tanto el cliente como el servidor.
- Restos heredados sin uso:
  - de la plantilla de Google AI Studio: README, `metadata.json` y `bun.lock`;
  - `public/sw.js`, que no se registra;
  - los nombres `.php` de las rutas.

## 3. Documentación del proyecto
| Documento | Contenido |
|---|---|
| `docs/proyecto/CONTEXTO_AGENTES.md` | Lo que cada especialista necesita saber de este proyecto |
| `docs/proyecto/PRUEBAS_Y_VERIFICACION.md` | Cómo probar sin tocar el proyecto; línea base |
| `docs/equipo/REGISTRO_INCIDENCIAS.md` | Incidencias del proyecto |
| `docs/equipo/REGISTRO_CAMBIOS.md` | Cambios aplicados |

## 4. Estado actual (19/11/2026)
- Hay **23 incidencias registradas** (INC-001 a INC-023): 18 abiertas, 5 de ellas de gravedad Alta (INC-003 ya mitigada), 1 verificada pendiente de cierre (INC-014) y 4 cerradas (INC-004, INC-005, INC-022 e INC-023). Ver el registro.
- Línea base (copia aislada): `tsc` PASS, build PASS, `npm audit` con 1 vulnerabilidad baja aceptada y scripts de prueba de la API en PASS (ver `PRUEBAS_Y_VERIFICACION.md`). No hay pruebas automatizadas en el proyecto.
- Instalar dependencias siempre con `npm ci`, nunca con `npm install`.
- Sirve para uso familiar controlado. **No se debe abrir a otras familias** hasta resolver INC-001 a INC-005.

## 5. Operaciones peligrosas propias de este proyecto
- `npm run restore` (`scripts/restore-backup.ts`) sobrescribe la base de datos. Nunca se ejecuta sin autorización.
- `npm run dev` y `npm start` crean y alteran tablas al arrancar, sobre la base de datos que indique `.env` (Turso real si está configurado). Las pruebas se hacen solo en copia aislada, con `DB_FILE` temporal y sin `TURSO_*` ni `S3_*`.
- Servicios reales: Turso, Cloudflare R2 (fotos y copias), Anthropic (cuesta dinero por uso) y Google Books. No se usan en pruebas: se pone `TUTOR_PROVIDER=mock`.
- Despliegue: Render, desde la rama `main`. La configuración no está versionada en el repositorio [NV]: confirmarla con el usuario.
- **Requisitos de Render** (desde CAM-007, en producción el servidor se detiene con un mensaje `[ARRANQUE]` en el log si falta algo):
  - Comando de build: debe instalar con `npm ci` y ejecutar `npm run build` para generar `dist/`. Ejemplo: `npm ci && npm run build`.
  - Comando de arranque: `npm start`, que ya incluye `--prod`.
  - `PORT`: no fijarla; la asigna Render.
  - Variables obligatorias: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID` y `S3_SECRET_ACCESS_KEY`. Además, `ANTHROPIC_API_KEY` para la IA.
  - Las vistas previas y los servicios secundarios de Render necesitan las mismas variables.
  - Gestor de paquetes: debe ser npm. El `bun.lock` está desactualizado (INC-019).
- En local, `npm start` exige haber ejecutado antes `npm run build`. `npm run dev` no cambia.

## 6. Dependencias con otros proyectos
- No se conoce ninguna. Ver `C:\DESARROLLO\00_COORDINACION\DEPENDENCIAS.md`. Contratos importados: ninguno.
