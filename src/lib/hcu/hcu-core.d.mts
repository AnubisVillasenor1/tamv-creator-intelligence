/* Tipos mínimos del núcleo HCU (fuente en hcu-core.mjs). Deliberadamente laxos: el modelo es un instrumento exploratorio. */
export interface HcuNode { id: string; name: string; kind: "core" | "domain" | "atom"; dom: number; impact: number; risk: number; ev: number; deg: number; cross: boolean; psi?: number; [k: string]: unknown }
export interface HcuAtom { id: string; name: string; dom: number; impact: number; risk: number; ev: number; note: string; prov: boolean; custom: boolean; tri: string; role: string }
export interface HcuHyperedge { id: string; label: string; S: string[]; T: [string, 1 | -1][]; w: number; lag: number; off: boolean; origin: string; ref: string; lvl: string }
export interface HcuShock { id: string; node: string; year: number; mag: number }
export interface HcuState { v: number; atoms: HcuAtom[]; hyp: HcuHyperedge[]; shocks: HcuShock[]; quar: string[]; [k: string]: unknown }
export interface HcuModel { nodes: HcuNode[]; idx: Record<string, number>; H: unknown[]; deg: number[]; cross: boolean[]; domAtoms: number[][]; invalid: unknown[] }
export interface HcuSim { a: Float64Array[]; tx: Float64Array[] }
export interface HcuMc { lo: Float32Array[]; md: Float32Array[]; hi: Float32Array[]; fp: Float32Array[]; fn: Float32Array[]; runs: number; seed: number }
export type HcuScenario = "A" | "B" | "C";
export const Y0: number;
export const T: number;
export const SC: Record<HcuScenario, { name: string; gain: number; decay: number; amp: number }>;
export function sha3(input: string): string;
export function orcid(v: string): boolean;
export function isni(v: string): boolean;
export function doi(v: string): boolean;
export function tri(v: string): boolean;
export function seedState(): HcuState;
export function build(s: HcuState): HcuModel;
export function simulate(m: HcuModel, shocks: HcuShock[], quar: string[], scen: HcuScenario, pert?: unknown): HcuSim;
export function mc(m: HcuModel, shocks: HcuShock[], quar: string[], scen: HcuScenario, runs: number, seed: number): HcuMc;
export function atomHashes(s: HcuState, m: HcuModel): Record<string, string>;
export function rootOf(h: Record<string, string>): string;
export function ledgerAppend(l: unknown[], actor: unknown, act: string, det: unknown): unknown;
export function ledgerVerify(l: unknown[]): unknown;
export function audit(s: HcuState, m: HcuModel, h: Record<string, string>): unknown;
declare const Core: Record<string, unknown>;
export default Core;
