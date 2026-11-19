import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  Copy,
  KeyRound,
  LockKeyhole,
  PlugZap,
  Search,
  ShieldCheck,
  Webhook,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { socialIntegrations, webhookPath, type SocialProvider } from "@/lib/social-integrations";

export function IntegrationsHub() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas");
  const [selected, setSelected] = useState<SocialProvider>("github");
  const [origin, setOrigin] = useState("");
  const [feedback, setFeedback] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  const provider = socialIntegrations.find((item) => item.id === selected)!;
  const callback = `${origin}${webhookPath(provider.id)}`;
  const available = provider.protocol !== "unverified";
  const filtered = socialIntegrations.filter(
    (item) =>
      (category === "Todas" || item.category === category) &&
      `${item.name} ${item.summary}`
        .toLocaleLowerCase("es")
        .includes(query.toLocaleLowerCase("es")),
  );
  async function copy() {
    try {
      await navigator.clipboard.writeText(callback);
      setFeedback("URL copiada. No contiene credenciales.");
    } catch {
      setFeedback("No se pudo copiar. Selecciona la URL y cópiala manualmente.");
    }
  }
  const iconSlug: Record<string, string> = { facebook: "facebook", instagram: "instagram", tiktok: "tiktok", threads: "threads", whatsapp: "whatsapp", telegram: "telegram", linkedin: "linkedin", github: "github", twitter: "x" };
  const iconColor: Record<string, string> = { facebook: "1877F2", instagram: "E4405F", tiktok: "FFFFFF", threads: "FFFFFF", whatsapp: "25D366", telegram: "26A5E4", linkedin: "0A66C2", github: "FFFFFF", twitter: "FFFFFF" };
  function ProviderMark({ id, monogram }: { id: string; monogram: string }) {
    const slug = iconSlug[id];
    return slug ? <img className={`provider-official-icon provider-icon-${id}`} src={`https://cdn.simpleicons.org/${slug}/${iconColor[id]}`} alt="" aria-hidden="true" loading="lazy" decoding="async" /> : <span>{monogram}</span>;
  }
  return (
    <>
      <div className="page-heading dashboard-heading">
        <div>
          <span className="eyebrow">CONNECTION HUB / INTEGRACIONES</span>
          <h1>Tu ecosistema. Conectado.</h1>
          <p>Recibe señales de tus canales, verifica su origen y conserva el control.</p>
        </div>
        <span className="protocol-badge">
          <ShieldCheck size={15} />
          Firmas verificadas en servidor
        </span>
      </div>
      <section className="connection-banner">
        <div className="feature-icon">
          <Webhook size={28} />
        </div>
        <div>
          <h2>Un punto de entrada. Reglas claras.</h2>
          <p>
            9 receptores nativos implementados · 10 proveedores en catálogo · activación externa
            pendiente.
          </p>
        </div>
        <span className="status-pill">Sin publicación automática</span>
      </section>
      <div className="integration-flow" aria-label="Flujo del webhook">
        {["Evento de tu red", "Verificar firma", "Entregar al relay", "Flujo externo"].map(
          (label, i) => (
            <div key={label}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              {label}
              {i < 3 && <ArrowRight size={15} />}
            </div>
          ),
        )}
      </div>
      <div className="integrations-layout">
        <section aria-label="Catálogo de integraciones">
          <div className="integration-filters">
            <label className="search-field">
              <Search size={18} />
              <input
                aria-label="Buscar integración"
                placeholder="Buscar un canal…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <select
              className="field"
              aria-label="Categoría de integración"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {["Todas", "Comunidad", "Contenido", "Mensajería", "Desarrollo", "IA"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
          <div className="connector-grid">
            {filtered.map((item) => (
              <button
                key={item.id}
                className={`connector-card ${selected === item.id ? "connector-selected" : ""}`}
                aria-pressed={selected === item.id}
                onClick={() => {
                  setSelected(item.id);
                  setFeedback("");
                }}
              >
                <div className="connector-top">
                  <span className={`provider-monogram provider-${item.id}`} aria-hidden="true">
                    <ProviderMark id={item.id} monogram={item.monogram} />
                  </span>
                  <span>{item.category}</span>
                </div>
                <h2>{item.name}</h2>
                <p>{item.summary}</p>
                <div className="connector-state">
                  {item.protocol === "unverified" ? (
                    <LockKeyhole size={14} />
                  ) : (
                    <Webhook size={14} />
                  )}
                  {item.protocol === "unverified"
                    ? "Contrato por verificar"
                    : "Receptor implementado"}
                  <ArrowRight size={14} />
                </div>
              </button>
            ))}
          </div>
          {!filtered.length && (
            <div className="project-empty" role="status">
              <Search />
              <h2>No encontramos ese canal</h2>
              <p>Prueba otra búsqueda o muestra todas las categorías.</p>
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("");
                  setCategory("Todas");
                }}
              >
                Restablecer filtros
              </Button>
            </div>
          )}
        </section>
        <section className="connector-detail" aria-label={`Configurar ${provider.name}`}>
          <div className="connector-detail-heading">
            <span className={`provider-monogram provider-${provider.id}`} aria-hidden="true">
              <ProviderMark id={provider.id} monogram={provider.monogram} />
            </span>
            <div>
              <span className="eyebrow">GUÍA DE CONEXIÓN</span>
              <h2>{provider.name}</h2>
            </div>
          </div>
          <span className="status-pill">
            {available ? "Requiere configuración de operador" : "Integración no disponible"}
          </span>
          <p>{provider.prerequisite}</p>
          {available ? (
            <>
              <ol className="connection-checklist">
                <li>
                  <span>1</span>
                  <div>
                    <h3>Prepara tu aplicación</h3>
                    <p>Obtén permisos oficiales y suscribe solo los eventos necesarios.</p>
                  </div>
                </li>
                <li>
                  <span>2</span>
                  <div>
                    <h3>Registra el callback</h3>
                    <p>Utiliza el dominio HTTPS de tu despliegue, nunca localhost.</p>
                  </div>
                </li>
              </ol>
              <label className="field-label" htmlFor="webhook-callback">
                URL del receptor
              </label>
              <input
                id="webhook-callback"
                className="field callback-field"
                readOnly
                value={callback}
                onFocus={(e) => e.target.select()}
              />
              <Button variant="outline" onClick={() => void copy()} className="w-full">
                <Copy size={16} />
                Copiar callback
              </Button>
              {origin && !origin.startsWith("https:") && (
                <p className="connection-warning">
                  Entorno local: esta URL no es accesible para las redes sociales.
                </p>
              )}
              <div className="connection-secret">
                <KeyRound size={18} />
                <h3>3. Secretos solo en servidor</h3>
                <code>{provider.secretEnv}</code>
                {"verifyEnv" in provider && <code>{provider.verifyEnv}</code>}
                <p>
                  Configúralos en el gestor de secretos del despliegue. Nunca en este formulario ni
                  en VITE_*.
                </p>
              </div>
              <div className="connection-secret">
                <PlugZap size={18} />
                <h3>4. Conecta un destino seguro</h3>
                <p>
                  El relay debe aceptar el sobre firmado y devolver el eventId. Sin su confirmación,
                  el receptor falla cerrado y la red puede reintentar.
                </p>
                <code>TAMV_WEBHOOK_RELAY_URL</code>
                <code>TAMV_WEBHOOK_RELAY_ALLOWED_ORIGIN</code>
                <code>TAMV_WEBHOOK_RELAY_SECRET</code>
                <code>TAMV_WEBHOOK_FORWARDING_ENABLED=true</code>
              </div>
              <div className="connection-secret">
                <Check size={18} />
                <h3>5. Verifica una entrega oficial</h3>
                <p>
                  Usa el evento de prueba del portal del proveedor. Una tarjeta en este catálogo no
                  significa que tu cuenta esté conectada.
                </p>
              </div>
            </>
          ) : (
            <div className="project-empty">
              <LockKeyhole />
              <h3>Primero, un contrato verificable</h3>
              <p>
                No encontramos documentación oficial suficiente para identificar la API de Longe.ai.
                Su ruta devuelve 501 y no recibe ni reenvía eventos.
              </p>
            </div>
          )}
          <p role="status" aria-live="polite" className="copy-feedback">
            {feedback}
          </p>
          <div className="integration-disclosure">
            <ShieldCheck size={18} />
            <p>
              Recepción y relay no equivalen a publicar. OAuth, envío de posts, respuestas y
              aprobación en cada red requieren integración adicional.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
