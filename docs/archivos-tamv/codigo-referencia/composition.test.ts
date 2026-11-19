// state: draft | engine-generated — pruebas del compositor determinista TAMV Music.
import { describe, expect, it } from 'vitest';
import { compose, titleFrom, promptForAudio } from '../../src/music/arrangement';
import { GENRES, findGenre } from '../../src/music/genres';

describe('Music · composición determinista', () => {
  it('mismo prompt y misma semilla producen el mismo arreglo, byte a byte en su estructura', () => {
    const a = compose({ prompt: 'lo-fi nocturno para estudiar', seed: 'semilla-fija' });
    const b = compose({ prompt: 'lo-fi nocturno para estudiar', seed: 'semilla-fija' });
    expect(a.title).toBe(b.title);
    expect(a.bpm).toBe(b.bpm);
    expect(a.key).toEqual(b.key);
    expect(a.totalBars).toBe(b.totalBars);
    expect(a.chords.map((c) => c.label)).toEqual(b.chords.map((c) => c.label));
    expect(a.tracks.map((t) => t.notes.length)).toEqual(b.tracks.map((t) => t.notes.length));
    expect(a.drums.length).toBe(b.drums.length);
    expect(a.tracks[0].notes).toEqual(b.tracks[0].notes);
  });

  it('semillas distintas divergen: no es un arreglo único servido a todos', () => {
    const a = compose({ prompt: 'una canción', seed: 'alpha' });
    const b = compose({ prompt: 'una canción', seed: 'beta' });
    const signature = (arr: ReturnType<typeof compose>) =>
      JSON.stringify({ chords: arr.chords.map((c) => c.label), notes: arr.tracks.map((t) => t.notes.length) });
    expect(signature(a)).not.toBe(signature(b));
  });

  it('la estructura cubre la canción: un acorde por compás y secciones contiguas', () => {
    const arr = compose({ prompt: 'pop brillante de verano', seed: 7 });
    expect(arr.chords.length).toBe(arr.totalBars);
    expect(arr.sections.length).toBeGreaterThan(0);
    let cursor = 0;
    for (const section of arr.sections) {
      expect(section.startBar).toBe(cursor);
      cursor += section.bars;
    }
    expect(cursor).toBe(arr.totalBars);
    expect(arr.totalBeats).toBe(arr.totalBars * arr.beatsPerBar);
    expect(arr.durationSeconds).toBeCloseTo((arr.totalBeats / arr.bpm) * 60, 5);
  });

  it('todas las notas viven en el rango MIDI y las velocidades en 0..1', () => {
    const arr = compose({ prompt: 'jazz sofisticado de bar', seed: 'rango' });
    expect(arr.tracks.length).toBeGreaterThan(0);
    for (const track of arr.tracks) {
      for (const note of track.notes) {
        expect(note.midi).toBeGreaterThanOrEqual(0);
        expect(note.midi).toBeLessThanOrEqual(127);
        expect(note.velocity).toBeGreaterThan(0);
        expect(note.velocity).toBeLessThanOrEqual(1);
        expect(note.beat).toBeGreaterThanOrEqual(0);
        expect(note.duration).toBeGreaterThan(0);
      }
    }
    for (const hit of arr.drums) {
      expect(hit.velocity).toBeGreaterThan(0);
      expect(hit.velocity).toBeLessThanOrEqual(1);
    }
  });

  it('respeta tonalidad y tempo explícitos por encima de la deducción', () => {
    const arr = compose({ prompt: 'algo oscuro', key: 'F# minor', bpm: 96, seed: 'explicito' });
    expect(arr.key.tonicPc).toBe(6);
    expect(arr.key.mode).toBe('aeolian');
    expect(arr.bpm).toBe(96);
  });

  it('detecta el género desde el prompt y cae a la biblioteca cuando no hay señal', () => {
    expect(findGenre('jazz de medianoche')?.id).toBe('jazz');
    const jazz = compose({ prompt: 'jazz de medianoche', seed: 'g' });
    expect(jazz.genre.id).toBe('jazz');
    expect(GENRES.length).toBeGreaterThanOrEqual(20);
    for (const genre of GENRES) {
      expect(genre.bpm[0]).toBeLessThanOrEqual(genre.bpm[1]);
      expect(genre.defaultBpm).toBeGreaterThanOrEqual(genre.bpm[0]);
      expect(genre.defaultBpm).toBeLessThanOrEqual(genre.bpm[1]);
      expect(genre.layers.length).toBeGreaterThan(0);
    }
  });

  it('humanize 0 cuantiza estricto; el microtiming por defecto desplaza las notas', () => {
    const strict = compose({ prompt: 'techno hipnótico', seed: 'hum', humanize: 0 });
    const human = compose({ prompt: 'techno hipnótico', seed: 'hum', humanize: 0.9 });
    const beatsOf = (arr: ReturnType<typeof compose>) => arr.tracks.flatMap((t) => t.notes.map((n) => n.beat));
    expect(beatsOf(strict)).not.toEqual(beatsOf(human));
  });

  it('el título conceptual no es "Canción sin título" y el prompt de audio es reusable', () => {
    const arr = compose({ prompt: 'x', seed: 'titulo' });
    expect(arr.title.length).toBeGreaterThan(0);
    expect(arr.title.toLowerCase()).not.toContain('sin título');
    expect(titleFrom('Neón bajo la lluvia')).toBe('Neón bajo la lluvia');
    const prompt = promptForAudio(arr);
    expect(prompt).toContain(`${arr.bpm} BPM`);
    expect(prompt.length).toBeGreaterThan(0);
  });
});