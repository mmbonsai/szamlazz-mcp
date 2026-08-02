import { z } from "zod";
import { findDrafts, upsertDraft, deleteDraft, loadDrafts } from "../drafts.js";

const draftItemSchema = z.object({
  megnevezes: z.string().describe("Tétel megnevezése"),
  mennyiseg: z.number().describe("Mennyiség"),
  mennyisegiEgyseg: z.string().describe("Mennyiségi egység"),
  nettoEgysegar: z.number().describe("Nettó egységár"),
  afakulcs: z.string().describe("ÁFA kulcs (pl. '27', '5', 'TAM')"),
  nettoErtek: z.number().describe("Nettó érték"),
  afaErtek: z.number().describe("ÁFA érték"),
  bruttoErtek: z.number().describe("Bruttó érték"),
  megjegyzes: z.string().optional().describe("Tétel megjegyzés"),
});

export const saveDraftSchema = z.object({
  id: z.string().optional().describe("Piszkozat egyedi azonosítója (opcionális, automatikusan generálódik ha nincs megadva)"),
  title: z.string().describe("Piszkozat elnevezése (pl. 'Fiwi-Hűt Kft. 2026-06 felvásárlás')"),
  company: z.string().optional().describe("Cég azonosító"),
  vevoNev: z.string().describe("Vevő neve"),
  vevoIrsz: z.string().optional().describe("Vevő irányítószáma"),
  vevoTelepules: z.string().optional().describe("Vevő települése"),
  vevoCim: z.string().optional().describe("Vevő címe"),
  vevoEmail: z.string().optional().describe("Vevő email címe"),
  vevoAdoszam: z.string().optional().describe("Vevő adószáma"),
  vevoAdpipoalany: z.number().optional().describe("Adóalanyiság"),
  keltDatum: z.string().describe("Számla kelte (YYYY-MM-DD)"),
  teljesitesDatum: z.string().describe("Teljesítés dátuma (YYYY-MM-DD)"),
  fizetesiHataridoDatum: z.string().describe("Fizetési határidő (YYYY-MM-DD)"),
  fizmod: z.string().describe("Fizetési mód"),
  penznem: z.string().optional().describe("Pénznem (alapértelmezett: HUF)"),
  szamlaNyelve: z.string().optional().describe("Számla nyelve (alapértelmezett: hu)"),
  megjegyzes: z.string().optional().describe("Megjegyzés"),
  tetelek: z.array(draftItemSchema).min(1).describe("Tételek"),
});

export function saveDraft(params: z.infer<typeof saveDraftSchema>): string {
  const nettoOsszesen = params.tetelek.reduce((acc, i) => acc + i.nettoErtek, 0);
  const afaOsszesen = params.tetelek.reduce((acc, i) => acc + i.afaErtek, 0);
  const bruttoOsszesen = params.tetelek.reduce((acc, i) => acc + i.bruttoErtek, 0);

  const draft = upsertDraft({
    id: params.id,
    title: params.title,
    company: params.company,
    vevoNev: params.vevoNev,
    vevoIrsz: params.vevoIrsz,
    vevoTelepules: params.vevoTelepules,
    vevoCim: params.vevoCim,
    vevoEmail: params.vevoEmail,
    vevoAdoszam: params.vevoAdoszam,
    vevoAdpipoalany: params.vevoAdpipoalany,
    keltDatum: params.keltDatum,
    teljesitesDatum: params.teljesitesDatum,
    fizetesiHataridoDatum: params.fizetesiHataridoDatum,
    fizmod: params.fizmod,
    penznem: params.penznem || "HUF",
    szamlaNyelve: params.szamlaNyelve || "hu",
    megjegyzes: params.megjegyzes,
    tetelek: params.tetelek,
    nettoOsszesen,
    afaOsszesen,
    bruttoOsszesen,
  });

  return `Piszkozat sikeresen mentve: "${draft.title}" (azonosító: "${draft.id}")`;
}

export const listDraftsSchema = z.object({
  query: z.string().optional().describe("Keresési kifejezés (cím, vevő neve, adószám)"),
});

export function listDrafts(params: z.infer<typeof listDraftsSchema>): string {
  const drafts = findDrafts(params.query);
  if (drafts.length === 0) {
    return params.query
      ? `Nincs a "${params.query}" keresésnek megfelelő piszkozat.`
      : "Még nincsenek elmentett piszkozatok.";
  }
  return JSON.stringify({ drafts, totalCount: drafts.length }, null, 2);
}

export const getDraftSchema = z.object({
  id: z.string().describe("Piszkozat azonosítója (id)"),
});

export function getDraft(params: z.infer<typeof getDraftSchema>): string {
  const drafts = loadDrafts();
  const draft = drafts[params.id];
  if (!draft) {
    throw new Error(`A "${params.id}" azonosítójú piszkozat nem található.`);
  }
  return JSON.stringify(draft, null, 2);
}

export const deleteDraftSchema = z.object({
  id: z.string().describe("Piszkozat azonosítója (id)"),
});

export function deleteDraftTool(params: z.infer<typeof deleteDraftSchema>): string {
  const success = deleteDraft(params.id);
  if (!success) {
    throw new Error(`A "${params.id}" azonosítójú piszkozat nem található.`);
  }
  return `Piszkozat ("${params.id}") sikeresen törölve.`;
}
