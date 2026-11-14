export const skillRegistry = [
  {
    "id": "tamv-core-governance",
    "name": "Core Governance",
    "category": "Base",
    "description": "Aplicar gobernanza algorítmica TAMV a cualquier solución generada con este paquete.",
    "dependencies": [],
    "inputs": "tipo de proyecto",
    "outputs": "diagnóstico"
  },
  {
    "id": "tamv-play-and-go-architect",
    "name": "Play And Go Architect",
    "category": "Base",
    "description": "Diseñar arquitectura completa de PLAY & GO como Creator Operating System.",
    "dependencies": [
      "tamv-core-governance"
    ],
    "inputs": "objetivos del producto y alcance del MVP",
    "outputs": "arquitectura por módulos"
  },
  {
    "id": "tamv-nextjs-supabase-builder",
    "name": "Nextjs Supabase Builder",
    "category": "Base",
    "description": "Construir apps fullstack con Next.js, TypeScript, Tailwind y Supabase.",
    "dependencies": [
      "tamv-core-governance"
    ],
    "inputs": "requisitos funcionales",
    "outputs": "esquema de base de datos"
  },
  {
    "id": "tamv-musicgen-local",
    "name": "Musicgen Local",
    "category": "Base",
    "description": "Integrar generación musical local con MusicGen / AudioCraft.",
    "dependencies": [
      "tamv-core-governance"
    ],
    "inputs": "descripción y estilo musical",
    "outputs": "pipeline de inferencia local"
  },
  {
    "id": "tamv-voice-identity",
    "name": "Voice Identity",
    "category": "Base",
    "description": "Crear perfiles de voz propios y autorizados.",
    "dependencies": [
      "tamv-core-governance"
    ],
    "inputs": "consentimiento escrito del titular",
    "outputs": "perfil de voz autorizado"
  },
  {
    "id": "tamv-audiocore-dsp",
    "name": "Audiocore Dsp",
    "category": "Base",
    "description": "Análisis y procesamiento de audio con C++17 y Python.",
    "dependencies": [
      "tamv-core-governance"
    ],
    "inputs": "archivos de audio autorizados",
    "outputs": "mediciones de LUFS, picos y espectro"
  },
  {
    "id": "tamv-bullmq-redis",
    "name": "Bullmq Redis",
    "category": "Base",
    "description": "Diseñar colas de trabajo y workers para tareas pesadas.",
    "dependencies": [
      "tamv-core-governance"
    ],
    "inputs": "tipo y volumen de tareas",
    "outputs": "diseño de colas y workers"
  },
  {
    "id": "tamv-supabase-rls-security",
    "name": "Supabase Rls Security",
    "category": "Base",
    "description": "Aplicar RLS, auditoría y trazabilidad.",
    "dependencies": [
      "tamv-core-governance"
    ],
    "inputs": "tablas y columnas",
    "outputs": "políticas RLS por tabla"
  },
  {
    "id": "tamv-license-authority",
    "name": "License Authority",
    "category": "Base",
    "description": "Licenciamiento híbrido con Vault Transit + Ed25519.",
    "dependencies": [
      "tamv-core-governance"
    ],
    "inputs": "titular y alcance de derechos",
    "outputs": "esquema de licencia"
  },
  {
    "id": "tamv-creator-growth",
    "name": "Creator Growth",
    "category": "Base",
    "description": "Acompañar el crecimiento del creador.",
    "dependencies": [
      "tamv-core-governance"
    ],
    "inputs": "audiencia propia y canales",
    "outputs": "plan de crecimiento por etapas"
  },
  {
    "id": "tamv-monetization-advisor",
    "name": "Monetization Advisor",
    "category": "Base",
    "description": "Diseñar monetización ética para creadores.",
    "dependencies": [
      "tamv-core-governance"
    ],
    "inputs": "propuesta de valor",
    "outputs": "modelo de precios y planes"
  },
  {
    "id": "tamv-marketing-growth",
    "name": "Marketing Growth",
    "category": "Base",
    "description": "Marketing y contenido para creadores.",
    "dependencies": [
      "tamv-core-governance"
    ],
    "inputs": "propuesta de valor",
    "outputs": "mensajes y ángulos"
  },
  {
    "id": "tamv-seo-discoverability",
    "name": "Seo Discoverability",
    "category": "Base",
    "description": "Optimizar SEO y descubrimiento.",
    "dependencies": [
      "tamv-core-governance"
    ],
    "inputs": "URLs y contenido propio",
    "outputs": "mapa de metadatos por página"
  },
  {
    "id": "tamv-conversion-optimizer",
    "name": "Conversion Optimizer",
    "category": "Base",
    "description": "CRO y estrategia de precios.",
    "dependencies": [
      "tamv-core-governance"
    ],
    "inputs": "embudo y pasos actuales",
    "outputs": "hipótesis priorizadas"
  },
  {
    "id": "tamv-launch-strategist",
    "name": "Launch Strategist",
    "category": "Base",
    "description": "Planear lanzamientos.",
    "dependencies": [
      "tamv-core-governance"
    ],
    "inputs": "producto y propuesta",
    "outputs": "plan de lanzamiento por fases"
  },
  {
    "id": "tamv-rights-safety-guard",
    "name": "Rights Safety Guard",
    "category": "Base",
    "description": "Proteger derechos de autor, identidad vocal, privacidad y uso responsable de IA.",
    "dependencies": [
      "tamv-core-governance"
    ],
    "inputs": "obra o material a evaluar",
    "outputs": "nivel de riesgo"
  },
  {
    "id": "tamv-support-assistant",
    "name": "Support Assistant",
    "category": "Base",
    "description": "Soporte técnico al creador.",
    "dependencies": [
      "tamv-core-governance"
    ],
    "inputs": "descripción del incidente",
    "outputs": "diagnóstico"
  },
  {
    "id": "tamv-audience-research",
    "name": "Audiencia",
    "category": "Crecimiento",
    "description": "Definir segmentos a partir de datos propios y necesidades verificables.",
    "dependencies": [
      "tamv-core-governance",
      "tamv-rights-safety-guard",
      "tamv-creator-growth"
    ],
    "inputs": "Perfil de audiencia y señales disponibles",
    "outputs": "Segmentos, necesidades y supuestos pendientes"
  },
  {
    "id": "tamv-content-review",
    "name": "Revisión de contenido",
    "category": "Contenido",
    "description": "Revisar un borrador según audiencia, canal y objetivo.",
    "dependencies": [
      "tamv-core-governance",
      "tamv-rights-safety-guard",
      "tamv-marketing-growth"
    ],
    "inputs": "Borrador, audiencia, objetivo y consentimiento",
    "outputs": "Diagnóstico, mejoras priorizadas y versión propuesta"
  },
  {
    "id": "tamv-brand-voice",
    "name": "Voz de marca",
    "category": "Contenido",
    "description": "Establecer tono propio sin imitar personas ni marcas.",
    "dependencies": [
      "tamv-core-governance",
      "tamv-rights-safety-guard",
      "tamv-marketing-growth"
    ],
    "inputs": "Valores, ejemplos propios y audiencia",
    "outputs": "Guía de tono y vocabulario"
  },
  {
    "id": "tamv-storytelling",
    "name": "Narrativa",
    "category": "Contenido",
    "description": "Transformar una idea original en un relato coherente.",
    "dependencies": [
      "tamv-core-governance",
      "tamv-rights-safety-guard",
      "tamv-marketing-growth"
    ],
    "inputs": "Idea, mensaje y formato",
    "outputs": "Estructura narrativa y cierre"
  },
  {
    "id": "tamv-editorial-calendar",
    "name": "Calendario editorial",
    "category": "Contenido",
    "description": "Planificar publicaciones sin automatizar su publicación.",
    "dependencies": [
      "tamv-core-governance",
      "tamv-rights-safety-guard",
      "tamv-launch-strategist"
    ],
    "inputs": "Fechas, disponibilidad y canales",
    "outputs": "Calendario editable y dependencias"
  },
  {
    "id": "tamv-channel-adaptation",
    "name": "Adaptación por canal",
    "category": "Contenido",
    "description": "Adaptar contenido propio a restricciones del canal.",
    "dependencies": [
      "tamv-core-governance",
      "tamv-rights-safety-guard",
      "tamv-marketing-growth"
    ],
    "inputs": "Contenido aprobado y canal",
    "outputs": "Versión adaptada y cambios justificados"
  },
  {
    "id": "tamv-community-care",
    "name": "Comunidad",
    "category": "Crecimiento",
    "description": "Preparar respuestas respetuosas y escalar casos sensibles.",
    "dependencies": [
      "tamv-core-governance",
      "tamv-rights-safety-guard",
      "tamv-support-assistant"
    ],
    "inputs": "Mensajes anonimizados y contexto",
    "outputs": "Respuestas sugeridas y escalamiento"
  },
  {
    "id": "tamv-experiment-design",
    "name": "Experimentos",
    "category": "Crecimiento",
    "description": "Diseñar experimentos medibles sin manipular métricas.",
    "dependencies": [
      "tamv-core-governance",
      "tamv-rights-safety-guard",
      "tamv-conversion-optimizer"
    ],
    "inputs": "Hipótesis, muestra y métrica",
    "outputs": "Plan de comparación y criterios de decisión"
  },
  {
    "id": "tamv-retention-insights",
    "name": "Retención",
    "category": "Crecimiento",
    "description": "Analizar abandono con datos propios y sin causalidad inventada.",
    "dependencies": [
      "tamv-core-governance",
      "tamv-rights-safety-guard",
      "tamv-creator-growth"
    ],
    "inputs": "Datos agregados y periodo",
    "outputs": "Hallazgos y experimentos de retención"
  },
  {
    "id": "tamv-campaign-measurement",
    "name": "Medición",
    "category": "Crecimiento",
    "description": "Comparar campañas con denominadores y periodos explícitos.",
    "dependencies": [
      "tamv-core-governance",
      "tamv-rights-safety-guard",
      "tamv-marketing-growth"
    ],
    "inputs": "Resultados agregados y objetivos",
    "outputs": "Métricas reproducibles y límites"
  },
  {
    "id": "tamv-learning-path",
    "name": "Ruta educativa",
    "category": "Educación",
    "description": "Diseñar aprendizaje musical progresivo.",
    "dependencies": [
      "tamv-core-governance",
      "tamv-rights-safety-guard",
      "tamv-play-and-go-architect"
    ],
    "inputs": "Nivel, tiempo y meta musical",
    "outputs": "Ruta con prerrequisitos y evaluaciones"
  },
  {
    "id": "tamv-lesson-design",
    "name": "Diseño de lecciones",
    "category": "Educación",
    "description": "Crear lecciones con material propio o autorizado.",
    "dependencies": [
      "tamv-core-governance",
      "tamv-rights-safety-guard",
      "tamv-play-and-go-architect"
    ],
    "inputs": "Competencia, nivel y fuentes autorizadas",
    "outputs": "Lección, ejercicio y criterio de evaluación"
  },
  {
    "id": "tamv-practice-coach",
    "name": "Práctica musical",
    "category": "Educación",
    "description": "Proponer rutinas sostenibles sin promesas de rendimiento.",
    "dependencies": [
      "tamv-core-governance",
      "tamv-rights-safety-guard",
      "tamv-creator-growth"
    ],
    "inputs": "Nivel, instrumento y disponibilidad",
    "outputs": "Rutina y registro de progreso"
  },
  {
    "id": "tamv-release-readiness",
    "name": "Preparación de lanzamiento",
    "category": "Operación",
    "description": "Comprobar derechos y pendientes antes del lanzamiento.",
    "dependencies": [
      "tamv-core-governance",
      "tamv-rights-safety-guard",
      "tamv-launch-strategist"
    ],
    "inputs": "Contenido, permisos y fecha",
    "outputs": "Lista de bloqueos y responsables"
  },
  {
    "id": "tamv-accessibility-review",
    "name": "Accesibilidad",
    "category": "Operación",
    "description": "Revisar lectura, subtítulos y alternativas accesibles.",
    "dependencies": [
      "tamv-core-governance",
      "tamv-rights-safety-guard",
      "tamv-play-and-go-architect"
    ],
    "inputs": "Contenido y formatos",
    "outputs": "Hallazgos, alternativas y verificación manual"
  },
  {
    "id": "tamv-metadata-provenance",
    "name": "Procedencia",
    "category": "Gobernanza",
    "description": "Registrar origen y hash sin exponer contenido privado.",
    "dependencies": [
      "tamv-core-governance",
      "tamv-rights-safety-guard"
    ],
    "inputs": "Origen, permisos y configuración",
    "outputs": "Manifiesto de procedencia y SHA-256"
  },
  {
    "id": "tamv-consent-ledger",
    "name": "Consentimiento",
    "category": "Gobernanza",
    "description": "Verificar alcance, vigencia y revocación de permisos.",
    "dependencies": [
      "tamv-core-governance",
      "tamv-rights-safety-guard"
    ],
    "inputs": "Permiso, finalidad y vigencia",
    "outputs": "Decisión permitida o bloqueo fundamentado"
  },
  {
    "id": "tamv-privacy-minimization",
    "name": "Privacidad",
    "category": "Gobernanza",
    "description": "Minimizar datos antes de enviarlos a servicios externos.",
    "dependencies": [
      "tamv-core-governance",
      "tamv-rights-safety-guard",
      "tamv-supabase-rls-security"
    ],
    "inputs": "Datos, finalidad y consentimiento",
    "outputs": "Campos eliminados y riesgo residual"
  },
  {
    "id": "tamv-quality-gate",
    "name": "Control de calidad",
    "category": "Gobernanza",
    "description": "Validar entregables contra contratos y criterios verificables.",
    "dependencies": [
      "tamv-core-governance",
      "tamv-rights-safety-guard"
    ],
    "inputs": "Entregable y criterios de aceptación",
    "outputs": "Resultado, evidencia y bloqueos"
  },
  {
    "id": "tamv-workflow-orchestrator",
    "name": "Orquestación",
    "category": "Gobernanza",
    "description": "Ordenar habilidades con dependencias y controles humanos.",
    "dependencies": [
      "tamv-core-governance",
      "tamv-rights-safety-guard"
    ],
    "inputs": "Objetivo, entradas y skills necesarias",
    "outputs": "Plan ordenado, traspasos y confirmaciones"
  }
] as const;
