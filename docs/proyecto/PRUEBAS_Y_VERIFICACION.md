# Pruebas y verificación — EduAmigo

## Línea base

**Pendiente.** La auditoría de incorporación del 19/11/2026 fue solo estática. La compilación, el build, `npm audit` y las pruebas de la API están en NOT TESTED, porque el proyecto no tiene `node_modules` y todavía no se ha autorizado la copia aislada.

| Comprobación | Comando | Último resultado |
|---|---|---|
| Tipos | `npx tsc --noEmit` | NOT TESTED |
| Build del cliente | `npx vite build` | NOT TESTED |
| Dependencias | `npm audit` | NOT TESTED |
| Pruebas automatizadas | — | No existen (INC-021) |

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
