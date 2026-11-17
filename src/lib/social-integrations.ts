export const socialIntegrations = [
  {
    id: "facebook",
    name: "Facebook",
    monogram: "f",
    category: "Comunidad",
    protocol: "meta",
    summary: "Recibe notificaciones de páginas y productos habilitados por tu app de Meta.",
    secretEnv: "TAMV_FACEBOOK_APP_SECRET",
    verifyEnv: "TAMV_FACEBOOK_VERIFY_TOKEN",
    prerequisite: "App de Meta, permisos aprobados y suscripción a los campos de tu página.",
  },
  {
    id: "instagram",
    name: "Instagram",
    monogram: "ig",
    category: "Contenido",
    protocol: "meta",
    summary: "Conecta eventos de cuentas profesionales y conversaciones autorizadas.",
    secretEnv: "TAMV_INSTAGRAM_APP_SECRET",
    verifyEnv: "TAMV_INSTAGRAM_VERIFY_TOKEN",
    prerequisite:
      "Cuenta profesional, app de Meta y permisos específicos del producto de Instagram.",
  },
  {
    id: "tiktok",
    name: "TikTok",
    monogram: "tk",
    category: "Contenido",
    protocol: "tiktok",
    summary: "Verifica notificaciones de TikTok for Developers. No incluye TikTok Shop.",
    secretEnv: "TAMV_TIKTOK_CLIENT_SECRET",
    prerequisite: "App de TikTok aprobada con Webhooks habilitado y eventos compatibles.",
  },
  {
    id: "threads",
    name: "Threads",
    monogram: "@",
    category: "Comunidad",
    protocol: "meta",
    summary: "Receptor con protocolo Meta para los eventos de Threads disponibles en tu app.",
    secretEnv: "TAMV_THREADS_APP_SECRET",
    verifyEnv: "TAMV_THREADS_VERIFY_TOKEN",
    prerequisite:
      "App con Threads API y suscripciones autorizadas. Verifica disponibilidad de eventos en el portal de Meta.",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    monogram: "wa",
    category: "Mensajería",
    protocol: "meta",
    summary: "Recibe notificaciones de WhatsApp Business Cloud API sin responder automáticamente.",
    secretEnv: "TAMV_WHATSAPP_APP_SECRET",
    verifyEnv: "TAMV_WHATSAPP_VERIFY_TOKEN",
    prerequisite:
      "WhatsApp Business, número registrado y app de Meta suscrita a la cuenta empresarial.",
  },
  {
    id: "telegram",
    name: "Telegram",
    monogram: "tg",
    category: "Mensajería",
    protocol: "telegram",
    summary: "Recibe actualizaciones de tu bot usando un secreto de webhook independiente.",
    secretEnv: "TAMV_TELEGRAM_WEBHOOK_SECRET",
    prerequisite:
      "Bot administrado por ti y setWebhook con secret_token. No uses el token del bot como secreto de webhook.",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    monogram: "in",
    category: "Comunidad",
    protocol: "linkedin",
    summary: "Challenge y notificaciones firmadas de productos aprobados de LinkedIn.",
    secretEnv: "TAMV_LINKEDIN_CLIENT_SECRET",
    prerequisite:
      "App aprobada para un caso de uso de webhooks. No incluye apps hijas ni acceso universal al feed.",
  },
  {
    id: "longe",
    name: "Longe.ai",
    monogram: "lo",
    category: "IA",
    protocol: "unverified",
    summary:
      "Reservado hasta disponer de documentación oficial del proveedor y su contrato de firma.",
    secretEnv: null,
    prerequisite:
      "Identificar el producto, su documentación API y las condiciones de acceso. No se inventa un conector.",
  },
  {
    id: "github",
    name: "GitHub",
    monogram: "gh",
    category: "Desarrollo",
    protocol: "github",
    summary:
      "Recibe eventos de repositorios: pushes, pull requests y otras suscripciones autorizadas.",
    secretEnv: "TAMV_GITHUB_WEBHOOK_SECRET",
    prerequisite:
      "Webhook de repositorio u organización con application/json y secreto compartido.",
  },
  {
    id: "twitter",
    name: "X / Twitter",
    monogram: "x",
    category: "Comunidad",
    protocol: "twitter",
    summary: "CRC y firmas OAuth 2.0 de X Webhooks. Sin publicación de posts ni mensajes.",
    secretEnv: "TAMV_X_CLIENT_SECRET",
    prerequisite:
      "App con acceso a X Webhooks y secreto OAuth 2.0; no utiliza el bearer token ni el protocolo legado OAuth 1.0.",
  },
] as const;
export type SocialIntegration = (typeof socialIntegrations)[number];
export type SocialProvider = SocialIntegration["id"];
export function findSocialIntegration(id: string) {
  return socialIntegrations.find((item) => item.id === id);
}
export const webhookPath = (provider: SocialProvider) => `/api/webhooks/${provider}`;
