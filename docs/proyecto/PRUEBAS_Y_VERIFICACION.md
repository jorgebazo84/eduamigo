# Pruebas y verificación — EduAmigo

## Línea base

**Vigente: 19/11/2026, tras CAM-003 a CAM-006.**
- Se obtuvo en la copia aislada, con un `server.ts` y un `package-lock.json` idénticos a los del proyecto (comprobado con `cmp`).
- Entorno: Node v24.14.0 y npm 11.9.0.
- Dependencias instaladas con `npm ci --ignore-scripts`, más `npm audit fix --ignore-scripts` (CAM-006).

| Comprobación | Comando | Resultado |
|---|---|---|
| Tipos | `npx tsc --noEmit` | **PASS**: código de salida 0 |
| Build del cliente | `npx vite build` | **PASS**: «✓ built in 5.31s». Sigue el aviso de que el JS supera los 500 kB |
| Dependencias | `npm audit` | **1 vulnerabilidad baja**: `esbuild` 0.27.4 dentro de `tsx` (GHSA-g7r4-m6w7-qqqr). Riesgo aceptado: afecta solo al servidor de desarrollo de esbuild, que el proyecto no usa (ver INC-022) |
| Pruebas de la API | scripts de `pruebas/` (ver abajo) | **PASS**: `inc004`, `inc023`, `inc005` (5/5), `inc003_carrera` y `prod_smoke` (6/6) |
| Pruebas automatizadas del proyecto | — | No existen (INC-021) |

Una corrección no puede empeorar esta línea base: tsc, build y los scripts deben seguir en PASS, y no debe aparecer ninguna vulnerabilidad moderada, alta ni crítica.

**Línea base anterior (19/11/2026, antes de las correcciones):** tsc PASS, build PASS y `npm audit` FAIL con «14 vulnerabilities (2 low, 2 moderate, 9 high, 1 critical)».

### Scripts de prueba de la API

Están fuera del proyecto, en la carpeta temporal de la sesión (`scratchpad/pruebas/`). Si se borra, se pueden reescribir a partir de esta descripción.

| Script | Qué comprueba |
|---|---|
| `inc004.mjs` | Una familia no puede escribir en el historial de otra (`save_history`) y la propia sí |
| `inc023.mjs` | Una familia no puede completar ni puntuar tareas de estudio de otra (`complete_study_task`) y la propia sí |
| `inc005.mjs <BD temporal>` | La recuperación de contraseña no bloquea el panel de padres; bloqueo progresivo de 15, 60 y 1440 min; un acierto pone el bloqueo a cero; la recuperación cambia la contraseña y cierra las sesiones |
| `inc003_carrera.mjs` | 50 intentos simultáneos de recuperación: como mucho 5 PIN comprobados por tanda |
| `prod_smoke.mjs` | Con `NODE_ENV=production`: página, recursos, rutas del cliente, límite de 100 KB (413), JSON mal formado (400) |

## Cómo probar sin tocar el proyecto (Windows)

1. **Copia aislada.** Copiar el proyecto a una carpeta temporal fuera de `C:\DESARROLLO`, **sin** `.git`, `.env`, `*.db`, `data/photos` ni `node_modules`.
2. **Dependencias.** Ejecutar `npm ci` en la copia, nunca en el proyecto. Instalar es un punto de parada: requiere autorización.
3. **Variables de la prueba.** Se definen en la propia sesión de terminal, no en un `.env`:
   - `DB_FILE=<carpeta temporal>\test.db`
   - `PHOTO_DIR=<carpeta temporal>\photos`
   - `TUTOR_PROVIDER=mock`
   - Sin `TURSO_*`, `S3_*`, `ANTHROPIC_API_KEY` ni `GOOGLE_BOOKS_API_KEY`.
4. **Arranque.** `npx tsx server.ts` en la copia. Escucha en el puerto 3000, que es fijo.
5. **Cierre.** Al terminar, parar el proceso y borrar la carpeta temporal.

## Pruebas pendientes de diseñar

Prioridad tras la auditoría:
- reproducir INC-004 (`save_history` con el `childId` de otra familia);
- INC-005 (bloqueo del PIN por `reset_password` sin sesión);
- INC-008 (borrado por GET);
- INC-011 (llamadas simultáneas a `cancel_request`);
- regresión de autenticación: registro, inicio de sesión, PIN y bloqueo.

## Prohibido sin autorización

- `npm run restore`.
- Arrancar contra Turso o R2 reales.
- Hacer llamadas reales a Anthropic o a Google Books.
- Ejecutar cualquier comando en la carpeta del proyecto que cree o altere `eduamigo.db`: arrancar el servidor allí ya lo hace.
