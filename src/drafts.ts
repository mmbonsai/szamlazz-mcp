import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface InvoiceDraftItem {
  megnevezes: string;
  mennyiseg: number;
  mennyisegiEgyseg: string;
  nettoEgysegar: number;
  afakulcs: string;
  nettoErtek: number;
  afaErtek: number;
  bruttoErtek: number;
  megjegyzes?: string;
}

export interface InvoiceDraft {
  id: string;
  title: string;
  company?: string;
  vevoNev: string;
  vevoIrsz?: string;
  vevoTelepules?: string;
  vevoCim?: string;
  vevoEmail?: string;
  vevoAdoszam?: string;
  vevoAdpipoalany?: number;
  keltDatum: string;
  teljesitesDatum: string;
  fizetesiHataridoDatum: string;
  fizmod: string;
  penznem: string;
  szamlaNyelve: string;
  megjegyzes?: string;
  tetelek: InvoiceDraftItem[];
  nettoOsszesen: number;
  afaOsszesen: number;
  bruttoOsszesen: number;
  createdAt: string;
  updatedAt: string;
}

export type DraftsData = Record<string, InvoiceDraft>;

const CONFIG_DIR = path.join(os.homedir(), ".szamlazz-mcp");
const DRAFTS_FILE = path.join(CONFIG_DIR, "drafts.json");

export const isHosted: boolean = !!process.env.SMITHERY_HOSTED || !!process.env.SMITHERY_SERVER_URL;
let memoryDrafts: DraftsData = {};

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

export function loadDrafts(): DraftsData {
  if (isHosted) return memoryDrafts;

  ensureConfigDir();
  if (!fs.existsSync(DRAFTS_FILE)) {
    const defaultDrafts: DraftsData = {};
    fs.writeFileSync(DRAFTS_FILE, JSON.stringify(defaultDrafts, null, 2), { encoding: "utf-8", mode: 0o600 });
    return defaultDrafts;
  }

  try {
    const raw = fs.readFileSync(DRAFTS_FILE, "utf-8");
    return JSON.parse(raw) as DraftsData;
  } catch (e) {
    console.error("Hiba a piszkozatok betöltésekor:", e);
    return {};
  }
}

export function saveDrafts(drafts: DraftsData): void {
  if (isHosted) {
    memoryDrafts = drafts;
    return;
  }

  ensureConfigDir();
  const tmpFile = DRAFTS_FILE + ".tmp";
  fs.writeFileSync(tmpFile, JSON.stringify(drafts, null, 2), { encoding: "utf-8", mode: 0o600 });
  fs.renameSync(tmpFile, DRAFTS_FILE);
}

export function generateDraftId(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "piszkozat";
}

export function upsertDraft(data: Omit<InvoiceDraft, "id" | "createdAt" | "updatedAt"> & { id?: string }): InvoiceDraft {
  const drafts = loadDrafts();
  const id = data.id || generateDraftId(data.title);
  const now = new Date().toISOString();

  const existing = drafts[id];
  const { id: _ignore, ...rest } = data;
  const updated: InvoiceDraft = {
    ...rest,
    id,
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now,
  };

  drafts[id] = updated;
  saveDrafts(drafts);
  return updated;
}

export function deleteDraft(id: string): boolean {
  const drafts = loadDrafts();
  if (!drafts[id]) return false;
  delete drafts[id];
  saveDrafts(drafts);
  return true;
}

export function findDrafts(query?: string): InvoiceDraft[] {
  const drafts = loadDrafts();
  const list = Object.values(drafts);
  if (!query || !query.trim()) return list;

  const q = query.toLowerCase().trim();
  return list.filter((d) =>
    d.title.toLowerCase().includes(q) ||
    d.vevoNev.toLowerCase().includes(q) ||
    (d.vevoEmail && d.vevoEmail.toLowerCase().includes(q)) ||
    (d.vevoAdoszam && d.vevoAdoszam.includes(q))
  );
}
