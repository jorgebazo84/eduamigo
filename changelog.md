# Changelog — EduAmigo: Tutor Inteligente J21

Todas las modificaciones, mejoras de funcionalidad, parches de seguridad y correcciones del proyecto EduAmigo quedan registradas en este documento siguiendo el estándar de versionado semántico [SemVer](https://semver.org/).


---

## [1.1.0] - 2026-09-19 — Reconocimiento de Voz en Vivo y Modo Offline

### 🎙️ Reconocimiento de Voz Nativo por Micrófono (Live Voice Tracking)
- **Seguimiento de Lectura en Tiempo Real (`ReadingModule.tsx`)**:
  - Integración con la Web Speech API nativa del navegador (`SpeechRecognition` / `webkitSpeechRecognition`).
  - Resaltado dinámico palabra a palabra en el texto a medida que el alumno lee en voz alta.
  - Cálculo automático en tiempo real de **Palabras Por Minuto (PPM / WPM)** y porcentaje de precisión.
  - Detección de silencios prolongados (>3.5s) con mensajes amables de aliento (*"¡Vas fenomenal, respira hondo y continúa a tu ritmo!"*).
  - Opción de **Lectura Modelo por Síntesis de Voz**: botón para escuchar cómo suena el texto leído con cadencia infantil adecuada antes de comenzar a leer.
  - Selector de lecturas organizadas por niveles curriculares: Primaria baja (1º-2º), Primaria media (3º-4º) y Primaria alta (5º-6º).

### 📡 Modo Offline y Sincronización Automática
- **Motor de Almacenamiento Local Resiliente (`services/offlineStorageService.ts`)**:
  - Detección de conectividad en tiempo real (`online`/`offline`).
  - Caché de libros de texto, temarios y ejercicios en almacenamiento local para permitir el estudio sin conexión (coche, autobús, zonas de baja cobertura).
  - Cola de actividades offline (`eduamigo_offline_queue_v1`): almacena sesiones de lectura, retos de matemáticas y puntos de experiencia cuando no hay red.
  - Sincronización automática de tareas y progresos acumulados tan pronto como el dispositivo recupera la conexión a Internet.
  - Componente **`OfflineStatusBanner.tsx`**: indicador no invasivo que informa al estudiante de que puede seguir estudiando sin conexión y notifica cuando los datos se sincronizan.

### 🧹 Correcciones de Versionado, Limpieza y Coherencia
- **Fuente Única de Verdad para Versionado (`version.ts`)**:
  - Creación de `APP_VERSION = '1.1.0'` y `APP_YEAR = '2026'`.
  - Eliminación de referencias desincronizadas en el pie de página de la pantalla de bienvenida (`AuthScreen.tsx`), pie de página principal (`App.tsx`), fichas de caligrafía (`CalligraphyModule.tsx`) y caché del Service Worker (`sw.js`).
  - Unificación en un único archivo `changelog.md` oficial para el seguimiento de versiones.
- **Saneamiento del Repositorio y Eliminación de Archivos Obsoletos**:
  - Eliminados 11 scripts `.sql` obsoletos de migraciones MySQL antiguas (`db_updates*.sql`, `db_schema_complete.sql`, etc.), centralizando el esquema en la base de datos nativa y conservando únicamente `supabase_schema.sql` como referencia PostgreSQL.
  - Eliminados los scripts heredados en desuso en `/public` (`api.php`, `auth.php`, `config.php`, `api_study.php`, `api_english.php`, `db_schema.sql`).
  - Eliminado el archivo de bloqueo no utilizado `bun.lock` y el directorio de historial de migración `migrated_prompt_history/`.

---

## [1.0.0] - 2026-09-19 — Versión Base Estable & Homologación PWA Móvil

### 🚀 Módulos y Funcionalidades Incluidas (Features)
- **Tutor Inteligente con Gemini AI (`geminiService.ts`)**:
  - Explicaciones pedagógicas adaptadas por nivel educativo (Primaria, ESO, Bachillerato).
  - Generación de temarios, cuestionarios y exámenes interactivos con retroalimentación inmediata.
  - Modo socrático para resolución de dudas paso a paso sin dar la respuesta directamente.
- **English Academy (`components/english/` y `services/englishService.ts`)**:
  - Módulos organizados por destrezas: Grammar, Vocabulary, Reading Comprehension, Listening y Speaking.
  - Ejercicios interactivos con pronunciación asistida por síntesis de voz (Web Speech API).
- **Caligrafía y Grafomotricidad (`CalligraphyModule.tsx` y `calligraphyService.ts`)**:
  - Lienzo interactivo para trazo de letras y números con detección de dirección y precisión.
  - Historial de intentos y evaluación mediante visión por IA.
- **Taller de Matemáticas (`MathModule.tsx` y `mathService.ts`)**:
  - Generador de retos aritméticos y algebraicos con validación en tiempo real y pizarra digital.
- **Escáner y Visión Escolar (`VisionTutor.tsx` y `SchoolDocumentScanner.tsx`)**:
  - Análisis óptico con IA multimodal de enunciados, problemas de libros de texto y ejercicios manuscritos.
- **Sistema de Repaso Espaciado SRS (`SRSReviewModule.tsx` y `srsService.ts`)**:
  - Algoritmo de intervalos progresivos para afianzar conceptos y memorización duradera.
- **Panel de Padres y Control Parental (`ParentDashboard.tsx` y `ParentReviewManager.tsx`)**:
  - Bloqueo por PIN de seguridad (`1234` por defecto, configurable).
  - Gestión de múltiples perfiles infantiles con avatares independientes.
  - Aprobación de recompensas, historial de actividad, informes diarios y tareas asignadas.
- **Gamificación y Recompensas (`RewardsShop.tsx` y `GamificationCenter.tsx`)**:
  - Puntos de experiencia (XP), rachas de estudio activas y canje de premios parentales.
- **Agenda Escolar y Planificador de Estudio (`AgendaManager.tsx` e `ISBNStudyPlanner.tsx`)**:
  - Programación de fechas de exámenes, entrega de trabajos y temporizador Pomodoro.
- **Seguridad y Ubicación (`LocationHub.tsx` y `SOSModal.tsx`)**:
  - Alerta SOS con geolocalización protegida y radio de seguridad casa/colegio.

### 📱 Homologación PWA Móvil (Progressive Web App)
- **Instalabilidad en Móviles (Android & iOS)**:
  - Creación del componente `PWAInstallButton` con soporte para el evento `beforeinstallprompt` en Android/Chrome.
  - Modal interactivo con instrucciones paso a paso para iOS Safari ("Compartir -> Añadir a pantalla de inicio").
  - Configuración completa de `public/manifest.json` con `id: "/"`, `scope: "/"`, categorías educativas y orientación vertical.
  - Generación de iconos reales PNG de alta resolución: `pwa-192x192.png`, `pwa-512x512.png`, `pwa-maskable-512x512.png` (con margen de seguridad del 15% para launchers de Android) y `apple-touch-icon.png` (180x180 para Apple).
  - Actualización de etiquetas en `index.html`: `viewport-fit=cover`, `apple-mobile-web-app-capable` y enlaces de iconos.
  - Service Worker optimizado (`public/sw.js`): Estrategia `NetworkFirst` para navegación e index HTML, cache de iconos/estáticos y exclusión estricta de llamadas API y desarrollo.

### 🛠️ Correcciones y Estabilidad (Bug Fixes)
- **Corrección de pantalla en blanco por entorno Node en navegador**:
  - Se introdujo el polyfill global de `window.process` y `window.global` para prevenir caídas al instanciar `@google/genai` y la librería interna `google-logging-utils`.
- **Eliminación de colisiones de Service Worker heredado**:
  - Purgado de cachés corruptas que servían versiones desactualizadas de JavaScript.
- **Seguridad en Notificaciones dentro de iFrames**:
  - Verificación `cross-origin` protegida en `services/notificationService.ts` evitando bloqueos de seguridad en previews embebidas.
- **Persistencia y Base de Datos**:
  - Motor híbrido en `server.ts` con SQLite local (`eduamigo.db`) de arranque instantáneo y compatibilidad transparente con PostgreSQL/Supabase en despliegues cloud mediante `DATABASE_URL`.
  - Hashing de contraseñas mediante `bcryptjs` con sal y autenticación de sesión resiliente.
