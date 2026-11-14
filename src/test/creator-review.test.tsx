import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CreatorReview } from '@/components/creator-review';
import { reviewContent } from '@/lib/content.functions';

vi.mock('@/lib/content.functions', () => ({ reviewContent: vi.fn() }));

const response = {
  ok: true as const,
  review: {
    diagnosis: 'La propuesta puede aclarar su objetivo.',
    improvements: [{ title: 'Invitación', reason: 'Explica el objetivo.', action: 'Incluye una invitación.' }],
    revised: 'Te invitamos a un taller original de composición.',
    safety: 'Mantén el control creativo.',
  },
  audit: {
    hash: 'a'.repeat(64),
    runId: 'review-test-1',
    model: 'openai/gpt-6-astra',
    timestamp: '2026-11-13T12:00:00.000Z',
    governance: { policyVersion: 'test-policy', decision: 'POLICY_ALLOWED' as const },
    skills: ['tamv-content-review'],
  },
};

function fillReview() {
  fireEvent.change(screen.getByLabelText('Contenido'), { target: { value: 'Un taller original para aprender a componer música.' } });
  fireEvent.change(screen.getByLabelText('Tu audiencia'), { target: { value: 'Músicos principiantes' } });
  fireEvent.change(screen.getByLabelText('¿Qué quieres lograr?'), { target: { value: 'Invitar a mi comunidad al taller' } });
  fireEvent.click(screen.getByRole('checkbox'));
  return screen.getByRole('button', { name: /Proponer mejoras/ }).closest('form')!;
}

beforeEach(() => { vi.mocked(reviewContent).mockReset(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Creator review feedback and evidence', () => {
  it('distinguishes missing authentication from certification and keeps the draft', async () => {
    vi.mocked(reviewContent).mockRejectedValue(new Response(null, { status: 401 }));
    render(<CreatorReview onComplete={vi.fn()}/>);
    fireEvent.submit(fillReview());
    expect(await screen.findByRole('alert')).toHaveTextContent('Necesitas una sesión válida');
    expect(screen.getByRole('alert')).not.toHaveTextContent('no está certificada');
    expect(screen.getByLabelText('Contenido')).toHaveValue('Un taller original para aprender a componer música.');
  });

  it('reports rate limits without automatically repeating the request', async () => {
    vi.mocked(reviewContent).mockRejectedValue(new Response(null, { status: 429, headers: { 'Retry-After': '30' } }));
    render(<CreatorReview onComplete={vi.fn()}/>);
    fireEvent.submit(fillReview());
    expect(await screen.findByRole('alert')).toHaveTextContent('Espera 30 segundos');
    expect(screen.getByRole('alert')).toHaveTextContent('no se reintentará automáticamente');
    expect(reviewContent).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['TAMV_ATTRIBUTION_INTEGRITY_FAILED', 'no está certificada'],
    ['TAMV_FEATURE_NOT_LICENSED', 'no está habilitada en la licencia'],
    ['OTHER', 'política de acceso'],
  ])('distinguishes forbidden response %s', async (code, expected) => {
    vi.mocked(reviewContent).mockRejectedValue(new Response(JSON.stringify({ code }), { status: 403 }));
    render(<CreatorReview onComplete={vi.fn()}/>);
    fireEvent.submit(fillReview());
    expect(await screen.findByRole('alert')).toHaveTextContent(expected);
  });

  it('does not label an invalid server response as a certification failure', async () => {
    vi.mocked(reviewContent).mockRejectedValue(new Response('upstream unavailable', { status: 500 }));
    render(<CreatorReview onComplete={vi.fn()}/>);
    fireEvent.submit(fillReview());
    expect(await screen.findByRole('alert')).toHaveTextContent('El servicio no pudo completar');
    expect(screen.getByRole('alert')).not.toHaveTextContent('certificad');
  });

  it('does not send duplicate requests while the first request is pending', async () => {
    let finish: ((value: typeof response) => void) | undefined;
    vi.mocked(reviewContent).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const onComplete = vi.fn();
    render(<CreatorReview onComplete={onComplete}/>);
    const form = fillReview();
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(reviewContent).toHaveBeenCalledTimes(1);
    await act(async () => { finish?.(response); });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
  });

  it('downloads only the returned proposal and provenance as JSON', async () => {
    const createObjectURL = vi.fn<(blob: Blob | MediaSource) => string>(() => 'blob:review-test');
    const revokeObjectURL = vi.fn();
    const OriginalURL = URL;
    vi.stubGlobal('URL', class extends OriginalURL {
      static override createObjectURL = createObjectURL;
      static override revokeObjectURL = revokeObjectURL;
    });
    const clicked: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { clicked.push(this); });
    vi.mocked(reviewContent).mockResolvedValue(response);
    render(<CreatorReview onComplete={vi.fn()}/>);
    fireEvent.submit(fillReview());
    fireEvent.click(await screen.findByRole('button', { name: 'Descargar revisión y trazabilidad' }));
    expect(clicked[0]?.download).toBe('tamv-review-review-test-1.json');
    const blob = createObjectURL.mock.calls[0]?.[0] as Blob | undefined;
    expect(blob?.type).toBe('application/json');
    const reader = new FileReader();
    const text = new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
    });
    reader.readAsText(blob!);
    const downloaded = JSON.parse(await text);
    expect(downloaded).toEqual({ schema: 'tamv.review.export.v1', review: response.review, audit: response.audit });
    expect(downloaded).not.toHaveProperty('draft');
    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith('blob:review-test'));
  });

  it('displays returned provenance without claiming durable or signed storage', async () => {
    vi.mocked(reviewContent).mockResolvedValue(response);
    render(<CreatorReview onComplete={vi.fn()}/>);
    fireEvent.submit(fillReview());
    expect(await screen.findByText('Modelo: openai/gpt-6-astra')).toBeInTheDocument();
    expect(screen.getByText('Política: test-policy · POLICY_ALLOWED')).toBeInTheDocument();
    expect(screen.getByText('Skills declaradas: tamv-content-review')).toBeInTheDocument();
    expect(screen.getByText(/no un registro persistente ni una certificación firmada/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Descargar revisión y trazabilidad' })).toBeEnabled();
  });
});
