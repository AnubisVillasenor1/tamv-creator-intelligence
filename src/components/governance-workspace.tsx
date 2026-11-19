import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Download, Save, ShieldCheck, RefreshCw, Trash2, Activity, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { coordinators, workflows, type Coordinator, type Workflow } from '@/core/governance/engine';
import { listGovernance, saveGovernanceProject, approveGovernanceProject, executeGovernanceProject, revokeGovernanceMemory } from '@/lib/governance.functions';
import type { Database, Json } from '@/integrations/supabase/types';

type Project = Database['public']['Tables']['governance_projects']['Row'];
type Snapshot = Awaited<ReturnType<typeof listGovernance>>;
export function GovernanceWorkspace({ signedIn }: { signedIn: boolean }) {
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [project, setProject] = useState<Project>();
  const [coordinator, setCoordinator] = useState<Coordinator>('tamv-creator-os');
  const [workflow, setWorkflow] = useState<Workflow>('Launch');
  const [title, setTitle] = useState('');
  const [brief, setBrief] = useState('');
  const [consent, setConsent] = useState(false);
  const [retention, setRetention] = useState(30);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<Json>();
  const list = useServerFn(listGovernance);
  const save = useServerFn(saveGovernanceProject);
  const approve = useServerFn(approveGovernanceProject);
  const execute = useServerFn(executeGovernanceProject);
  const revoke = useServerFn(revokeGovernanceMemory);
  async function refresh() { setSnapshot(await list()); }
  async function run(action: () => Promise<void>) {
    setBusy(true); setMessage('');
    try { await action(); await refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'La operación no pudo completarse.'); }
    finally { setBusy(false); }
  }
  function open(item: Project) {
    setProject(item); setTitle(item.title); setBrief(item.brief); setCoordinator(item.coordinator as Coordinator); setWorkflow(item.workflow as Workflow); setResult(undefined);
  }
  const changed = project && (title !== project.title || brief !== project.brief || coordinator !== project.coordinator || workflow !== project.workflow);
  const jsonResult = result && typeof result === 'object' && !Array.isArray(result) ? result : undefined;
  function download() {
    const blob = new Blob([JSON.stringify(jsonResult?.['artifact'] ?? project?.artifact, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'tamv-exagon-entregable.json'; anchor.click(); URL.revokeObjectURL(url);
  }
  return <section className="space-y-7">
    <div className="page-title"><div><span className="eyebrow">TAMV / EXAGON</span><h1>Creator Intelligence</h1><p>La IA propone; el humano decide.</p></div><Button variant="outline" disabled={!signedIn || busy} onClick={() => void run(refresh)}><RefreshCw/>Cargar proyectos</Button></div>
    <div className="workflow-band">{['Govern','Integrity','Velocity'].map(name => <div key={name}><ShieldCheck size={18}/><span>HyperCore {name}</span></div>)}</div>
    {!signedIn ? <p className="text-muted-foreground flex items-center gap-2"><LockKeyhole size={18}/>Inicia sesión para trabajar con tus proyectos y evidencia.</p> : <>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(250px,0.65fr)]">
        <form className="space-y-5" onSubmit={e => { e.preventDefault(); void run(async () => { const saved = await save({ data: { ...(project ? { id: project.id } : {}), coordinator, workflow, title, brief } }); setProject(saved); setResult(undefined); setMessage('Propuesta guardada.'); }); }}>
          <label className="block text-sm space-y-2">Coordinadora<select className="field w-full" value={coordinator} onChange={e => setCoordinator(e.target.value as Coordinator)}>{coordinators.map(id => <option key={id} value={id}>{id.replace('tamv-','').replaceAll('-',' ').toUpperCase()}</option>)}</select></label>
          <label className="block text-sm space-y-2">Flujo Exagon<select className="field w-full" value={workflow} onChange={e => setWorkflow(e.target.value as Workflow)}>{workflows.map(item => <option key={item}>{item}</option>)}</select></label>
          <label className="block text-sm space-y-2">Proyecto<Input aria-label="Nombre del proyecto" value={title} onChange={e => setTitle(e.target.value)} required minLength={3} maxLength={160}/></label>
          <label className="block text-sm space-y-2">Brief y datos propios<Textarea aria-label="Brief y datos propios" value={brief} onChange={e => setBrief(e.target.value)} required minLength={10} maxLength={12000} rows={7}/></label>
          {workflow === 'Memory' && <div className="space-y-3"><label className="flex gap-2 text-sm"><Checkbox checked={consent} onCheckedChange={value => setConsent(value === true)}/>Autorizo conservar este entregable como memoria.</label><label className="block text-sm">Vigencia en días<Input aria-label="Vigencia en días" type="number" min={1} max={365} value={retention} onChange={e => setRetention(Number(e.target.value))}/></label></div>}
          <div className="flex flex-wrap gap-3"><Button type="submit" disabled={busy}><Save/>Guardar propuesta</Button><Button type="button" variant="outline" onClick={() => { setProject(undefined); setTitle(''); setBrief(''); setResult(undefined); }}>Nuevo proyecto</Button></div>
        </form>
        <div className="space-y-4 min-w-0"><h2 className="text-xl font-semibold">Propuesta y aprobación</h2>{project ? <><div className="text-sm text-muted-foreground">{project.status} · Revisión {project.revision}</div><pre className="overflow-auto max-h-80 whitespace-pre-wrap break-words text-xs bg-muted p-4 rounded-md">{JSON.stringify(project.artifact,null,2)}</pre><p className="text-xs break-all text-muted-foreground">SHA-256 · {project.digest}</p><div className="flex flex-wrap gap-2"><Button disabled={busy || Boolean(changed) || project.status === 'APPROVED'} onClick={() => void run(async () => { setProject(await approve({ data: { id: project.id, digest: project.digest, revoke: false } })); setMessage('Aprobación vinculada al entregable actual.'); })}><ShieldCheck/>Aprobar propuesta</Button><Button variant="outline" disabled={busy || Boolean(changed)} onClick={() => void run(async () => { const output=await execute({ data:{ id:project.id, idempotencyKey:`exagon:${project.id}:${project.digest}:${workflow==='Memory' ? retention : 0}`, consent, retentionDays:retention } }); setResult(output); setMessage('Decisión registrada.'); })}><Activity/>Ejecutar entregable</Button><Button variant="ghost" disabled={busy} onClick={() => void run(async () => { setProject(await approve({data:{id:project.id,digest:project.digest,revoke:true}})); setResult(undefined); setMessage('Aprobación revocada.'); })}>Revocar</Button></div>{changed && <p className="text-sm text-destructive">Guarda los cambios y revisa la nueva propuesta antes de aprobar.</p>}{jsonResult && <div className="space-y-3"><p className="font-semibold">Decisión: {String(jsonResult['decision'])}</p><pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(result,null,2)}</pre>{jsonResult['decision']==='ALLOW' && <Button variant="outline" onClick={download}><Download/>Descargar entregable</Button>}</div>}</> : <p className="text-muted-foreground">Sin propuesta seleccionada.</p>}</div>
      </div>
      {message && <p role="status" className="text-sm text-primary">{message}</p>}
      <section className="border-t border-border pt-6"><h2 className="text-xl font-semibold mb-4">Proyectos guardados</h2><div className="space-y-2">{snapshot?.projects.map(item => <Button variant="outline" key={item.id} className="w-full justify-between h-auto whitespace-normal text-left" onClick={() => open(item)}><span>{item.title}</span><span className="text-xs text-muted-foreground">{item.workflow} · {item.status}</span></Button>)}{snapshot?.projects.length===0 && <p className="text-muted-foreground">Sin proyectos.</p>}</div></section>
      <section className="border-t border-border pt-6"><h2 className="text-xl font-semibold mb-4">BOOKPI · Evidencia</h2><div className="space-y-3">{snapshot?.evidence.map(item => <div key={item.id} className="text-sm border-b border-border pb-3"><strong>{item.decision}</strong> · {item.action}<p className="text-xs text-muted-foreground break-all">{item.id} · {new Date(item.created_at).toLocaleString('es-MX')}</p><p className="text-xs">{JSON.stringify(item.reason_codes)}</p></div>)}</div></section>
      <section className="border-t border-border pt-6"><h2 className="text-xl font-semibold mb-4">Memoria consentida</h2>{snapshot?.memories.map(item => <div key={item.id} className="flex items-center justify-between gap-3 border-b border-border py-3"><span className="text-sm break-all">{item.project_id}<span className="block text-xs text-muted-foreground">Vence: {new Date(item.expires_at).toLocaleDateString('es-MX')}</span></span><Button variant="ghost" size="icon" aria-label="Revocar memoria" onClick={() => void run(async () => { await revoke({data:item.id}); })}><Trash2/></Button></div>)}</section>
    </>}
  </section>;
}