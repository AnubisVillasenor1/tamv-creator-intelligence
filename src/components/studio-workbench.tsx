import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { AudioWaveform, Bot, Download, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/hooks/use-auth-session";
import {
  buildAgentPlan,
  buildAudioRequest,
  callStudioEndpoint,
  describeStudioFailure,
  getStudioAccessToken,
  StudioApiError,
  wavBytesFromBase64,
  type AgentOrchestrationResult,
  type AudioRenderResult,
  type StudioAudioForm,
} from "@/lib/studio-client";

const DEFAULT_FORM: StudioAudioForm = {
  mode: "instrumental",
  prompt: "",
  durationSeconds: 8,
  sampleRate: 44100,
  license: "original",
  attestationId: "",
  title: "",
};

function asStudioApiError(error: unknown): StudioApiError {
  return error instanceof StudioApiError
    ? error
    : new StudioApiError(0, null, "No se pudo contactar al servicio.", null);
}

function artifactOf(output: unknown): { sha256: string; bytes: number } | null {
  if (!output || typeof output !== "object" || !("artifact" in output)) return null;
  const artifact = (output as { artifact?: unknown }).artifact;
  if (!artifact || typeof artifact !== "object") return null;
  const { sha256, bytes } = artifact as { sha256?: unknown; bytes?: unknown };
  return typeof sha256 === "string" && typeof bytes === "number" ? { sha256, bytes } : null;
}

function formatDb(value: number | null): string {
  return value === null ? "no calculado" : `${value.toFixed(2)} dB`;
}

export function StudioWorkbench() {
  const session = useAuthSession();
  if (session.status === "loading")
    return <p className="text-muted-foreground">Cargando sesión…</p>;
  if (session.status === "anonymous")
    return (
      <div className="empty-ledger">
        <AudioWaveform size={38} />
        <h2>Estudio privado</h2>
        <p>Inicia sesión para renderizar audio y ejecutar planes de agente con tu identidad.</p>
        <Button variant="outline" asChild className="mt-4">
          <Link to="/auth" search={{ redirect: "/studio" }}>
            Iniciar sesión
          </Link>
        </Button>
      </div>
    );
  return <AuthenticatedStudio key={session.email} subject={session.email ?? "creator"} />;
}

function AuthenticatedStudio({ subject }: { subject: string }) {
  const requests = useRef<{ audio?: AbortController; agent?: AbortController }>({});
  useEffect(() => {
    const pending = requests.current;
    return () => {
      pending.audio?.abort();
      pending.agent?.abort();
    };
  }, []);
  const [form, setForm] = useState<StudioAudioForm>(DEFAULT_FORM);
  const [audioConsent, setAudioConsent] = useState(false);
  const [audioBusy, setAudioBusy] = useState(false);
  const [audioResult, setAudioResult] = useState<AudioRenderResult | null>(null);
  const [audioFailure, setAudioFailure] = useState<StudioApiError | null>(null);
  const [audioFormError, setAudioFormError] = useState("");
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);

  const [digestText, setDigestText] = useState("");
  const [includeAudio, setIncludeAudio] = useState(true);
  const [agentConsent, setAgentConsent] = useState(false);
  const [agentBusy, setAgentBusy] = useState(false);
  const [agentResult, setAgentResult] = useState<AgentOrchestrationResult | null>(null);
  const [agentFailure, setAgentFailure] = useState<StudioApiError | null>(null);
  const [agentFormError, setAgentFormError] = useState("");

  useEffect(() => {
    setPlaybackUrl(null);
    if (!audioResult) return;
    const url = URL.createObjectURL(
      new Blob([wavBytesFromBase64(audioResult.audio.data)], {
        type: audioResult.audio.contentType,
      }),
    );
    setPlaybackUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [audioResult]);

  async function renderAudio(event: FormEvent) {
    event.preventDefault();
    if (requests.current.audio) return;
    setAudioFailure(null);
    setAudioFormError("");
    setAudioResult(null);
    if (!audioConsent) {
      setAudioFormError("El consentimiento de audio es obligatorio.");
      return;
    }
    const built = buildAudioRequest(form, subject);
    if (!built.ok) {
      setAudioFormError(built.error);
      return;
    }
    const controller = new AbortController();
    requests.current.audio = controller;
    setAudioBusy(true);
    try {
      const token = await getStudioAccessToken();
      if (controller.signal.aborted) return;
      if (!token) throw new StudioApiError(401, null, "Authentication required", null);
      const result = await callStudioEndpoint<AudioRenderResult>(
        "/api/audiocore/advanced",
        built.request,
        token,
        controller.signal,
      );
      if (!controller.signal.aborted) setAudioResult(result);
    } catch (error) {
      if (!controller.signal.aborted) setAudioFailure(asStudioApiError(error));
    } finally {
      delete requests.current.audio;
      if (!controller.signal.aborted) setAudioBusy(false);
    }
  }

  async function runPlan(event: FormEvent) {
    event.preventDefault();
    if (requests.current.agent) return;
    setAgentFailure(null);
    setAgentFormError("");
    setAgentResult(null);
    if (!agentConsent || (includeAudio && !audioConsent)) {
      setAgentFormError(
        "Otorga el consentimiento del plan y, si incluye audio, el consentimiento de audio.",
      );
      return;
    }
    const built = buildAgentPlan({ digestText, includeAudio, audioForm: form, subject });
    if (!built.ok) {
      setAgentFormError(built.error);
      return;
    }
    const controller = new AbortController();
    requests.current.agent = controller;
    setAgentBusy(true);
    try {
      const token = await getStudioAccessToken();
      if (controller.signal.aborted) return;
      if (!token) throw new StudioApiError(401, null, "Authentication required", null);
      const result = await callStudioEndpoint<AgentOrchestrationResult>(
        "/api/agent",
        built.plan,
        token,
        controller.signal,
      );
      if (!controller.signal.aborted) setAgentResult(result);
    } catch (error) {
      if (!controller.signal.aborted) setAgentFailure(asStudioApiError(error));
    } finally {
      delete requests.current.agent;
      if (!controller.signal.aborted) setAgentBusy(false);
    }
  }

  function downloadWav() {
    if (!audioResult) return;
    const anchor = document.createElement("a");
    anchor.href =
      playbackUrl ?? `data:${audioResult.audio.contentType};base64,${audioResult.audio.data}`;
    anchor.download = `tamv-studio-${audioResult.job.jobId}.wav`;
    anchor.click();
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <section aria-label="Render de audio">
        <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
          <AudioWaveform size={18} /> Render de audio local
        </h2>
        <form onSubmit={renderAudio} className="grid gap-4">
          <label className="grid gap-1 text-sm">
            Modo
            <select
              className="field"
              value={form.mode}
              onChange={(e) =>
                setForm({ ...form, mode: e.target.value as StudioAudioForm["mode"] })
              }
            >
              <option value="instrumental">Instrumental</option>
              <option value="lyrics">Textura procedural (sin voz ni canto)</option>
              <option value="background">Background</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Prompt
            <textarea
              className="field min-h-24"
              value={form.prompt}
              maxLength={4000}
              onChange={(e) => setForm({ ...form, prompt: e.target.value })}
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-1 text-sm">
              Duración (segundos)
              <input
                className="field"
                type="number"
                min={5}
                max={30}
                step={1}
                value={form.durationSeconds}
                onChange={(e) => setForm({ ...form, durationSeconds: Number(e.target.value) })}
              />
            </label>
            <label className="grid gap-1 text-sm">
              Frecuencia de muestreo
              <select
                className="field"
                value={form.sampleRate}
                onChange={(e) =>
                  setForm({ ...form, sampleRate: Number(e.target.value) as 44100 | 48000 })
                }
              >
                <option value={44100}>44100 Hz</option>
                <option value={48000}>48000 Hz</option>
              </select>
            </label>
          </div>
          <label className="grid gap-1 text-sm">
            Título
            <input
              className="field"
              value={form.title}
              maxLength={200}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-1 text-sm">
              Licencia declarada
              <select
                className="field"
                value={form.license}
                onChange={(e) =>
                  setForm({ ...form, license: e.target.value as StudioAudioForm["license"] })
                }
              >
                <option value="original">Original</option>
                <option value="licensed">Licenciada</option>
                <option value="public-domain">Dominio público</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              ID de atestación de derechos
              <input
                className="field"
                value={form.attestationId}
                maxLength={200}
                onChange={(e) => setForm({ ...form, attestationId: e.target.value })}
              />
            </label>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={audioConsent}
              onChange={(e) => setAudioConsent(e.target.checked)}
              aria-label="Consentimiento de render de audio"
            />
            Otorgo consentimiento explícito para renderizar audio local con los derechos que
            declaro.
          </label>
          {audioFormError && (
            <p role="alert" className="text-destructive text-sm">
              {audioFormError}
            </p>
          )}
          {audioFailure && (
            <p role="alert" className="text-destructive text-sm">
              {describeStudioFailure(audioFailure)}{" "}
              {audioFailure.status === 401 && (
                <Link to="/auth" search={{ redirect: "/studio" }} className="underline">
                  Iniciar sesión
                </Link>
              )}
            </p>
          )}
          <Button type="submit" disabled={audioBusy || !audioConsent}>
            {audioBusy ? "Renderizando…" : "Renderizar WAV"}
          </Button>
        </form>

        {audioResult && (
          <section aria-label="Resultado del render" className="mt-6 grid gap-3">
            <h3 className="font-semibold">Render completado</h3>
            {playbackUrl && (
              <audio controls src={playbackUrl} aria-label="Reproducir WAV renderizado" />
            )}
            <div>
              <Button variant="outline" size="sm" onClick={downloadWav}>
                <Download /> Descargar WAV
              </Button>
            </div>
            {audioResult.job.artifact && (
              <dl className="text-xs text-muted-foreground grid gap-1">
                <div>
                  SHA-256: <span className="break-all">{audioResult.job.artifact.sha256}</span>
                </div>
                <div>Bytes: {audioResult.job.artifact.bytes}</div>
                <div>
                  Duración: {audioResult.job.artifact.durationSeconds} s ·{" "}
                  {audioResult.job.artifact.sampleRate} Hz
                </div>
              </dl>
            )}
            {audioResult.job.analysis && (
              <dl className="text-xs grid gap-1">
                <div>
                  Sonoridad integrada:{" "}
                  {audioResult.job.analysis.integratedLufs === null
                    ? "no calculada"
                    : `${audioResult.job.analysis.integratedLufs.toFixed(2)} LUFS`}
                </div>
                <div>
                  Pico de muestra (sin sobremuestreo):{" "}
                  {formatDb(audioResult.job.analysis.truePeakDb)}
                </div>
                <div>
                  Chroma:{" "}
                  {audioResult.job.analysis.chroma
                    ? audioResult.job.analysis.chroma.map((v) => v.toFixed(2)).join(", ")
                    : "no calculado"}
                </div>
              </dl>
            )}
            <div className="text-xs text-muted-foreground border rounded-md p-3 grid gap-1">
              <span className="flex items-center gap-1 text-primary">
                <ShieldCheck size={12} /> Disclosure
              </span>
              <span>Proveedor: {audioResult.disclosure.provider}</span>
              <span>{audioResult.disclosure.kind}</span>
              <span>
                Modelo neuronal: {audioResult.disclosure.neuralModel ? "sí" : "no"} · Voz:{" "}
                {audioResult.disclosure.voice ? "sí" : "no"}
              </span>
              <span>DSP: {audioResult.disclosure.dsp}</span>
              <span>
                Cuota restante hoy: {audioResult.disclosure.quota.remainingToday} (
                {audioResult.disclosure.quota.source})
              </span>
              <span className="break-all">Actor: {audioResult.disclosure.actorRef}</span>
            </div>
          </section>
        )}
      </section>

      <section aria-label="Plan de agente local">
        <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
          <Bot size={18} /> Plan de agente local
        </h2>
        <form onSubmit={runPlan} className="grid gap-4">
          <label className="grid gap-1 text-sm">
            Texto para digest SHA-256
            <textarea
              className="field min-h-24"
              value={digestText}
              maxLength={8000}
              onChange={(e) => setDigestText(e.target.value)}
            />
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeAudio}
              onChange={(e) => setIncludeAudio(e.target.checked)}
              aria-label="Incluir paso de render de audio"
            />
            Incluir un paso de render de audio con la configuración del formulario de la izquierda.
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={agentConsent}
              onChange={(e) => setAgentConsent(e.target.checked)}
              aria-label="Consentimiento del plan de agente"
            />
            Otorgo consentimiento explícito para ejecutar este plan local determinista.
          </label>
          {agentFormError && (
            <p role="alert" className="text-destructive text-sm">
              {agentFormError}
            </p>
          )}
          {agentFailure && (
            <p role="alert" className="text-destructive text-sm">
              {describeStudioFailure(agentFailure)}{" "}
              {agentFailure.status === 401 && (
                <Link to="/auth" search={{ redirect: "/studio" }} className="underline">
                  Iniciar sesión
                </Link>
              )}
            </p>
          )}
          <Button type="submit" disabled={agentBusy || !agentConsent}>
            {agentBusy ? "Ejecutando…" : "Ejecutar plan local"}
          </Button>
        </form>

        {agentResult && (
          <section aria-label="Resultado del plan" className="mt-6 grid gap-3">
            <h3 className="font-semibold">
              Plan{" "}
              {agentResult.result.status === "succeeded" ? "completado" : agentResult.result.status}
            </h3>
            <ol className="grid gap-3">
              {agentResult.result.steps.map((step) => {
                const artifact = artifactOf(step.output);
                return (
                  <li key={step.stepId} className="border rounded-md p-3 text-sm grid gap-1">
                    <span className="font-medium">
                      {step.stepId} · {step.tool} ·{" "}
                      {step.status === "succeeded" ? "exitoso" : "fallido"}
                    </span>
                    {step.tool === "digest.sha256" &&
                      step.output !== null &&
                      typeof step.output === "object" &&
                      "sha256" in step.output &&
                      typeof step.output.sha256 === "string" && (
                        <span className="break-all text-xs">{step.output.sha256}</span>
                      )}
                    {artifact && (
                      <span className="text-xs text-muted-foreground break-all">
                        Artefacto: {artifact.sha256} · {artifact.bytes} bytes
                      </span>
                    )}
                    {step.failure && (
                      <span className="text-xs text-destructive">
                        {step.failure.code}: {step.failure.detail}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
            <div className="text-xs text-muted-foreground border rounded-md p-3 grid gap-1">
              <span className="flex items-center gap-1 text-primary">
                <ShieldCheck size={12} /> Disclosure
              </span>
              <span>{agentResult.disclosure.kind}</span>
              <span>
                LLM: {agentResult.disclosure.llm ? "sí" : "no"} · Efectos externos:{" "}
                {agentResult.disclosure.externalEffects ? "sí" : "no"}
              </span>
              <span>Herramientas: {agentResult.disclosure.tools.join(", ")}</span>
              <span>
                Cuota restante hoy: {agentResult.disclosure.quota.remainingToday} (
                {agentResult.disclosure.quota.source})
              </span>
              <span className="break-all">Actor: {agentResult.disclosure.actorRef}</span>
            </div>
          </section>
        )}
      </section>
    </div>
  );
}
