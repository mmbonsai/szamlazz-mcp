import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface Partner {
  id: string;
  name: string;
  zip?: string;
  city?: string;
  address?: string;
  email?: string;
  taxNumber?: string;
  taxSubject?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type PartnersData = Record<string, Partner>;

const CONFIG_DIR = path.join(os.homedir(), ".szamlazz-mcp");
const PARTNERS_FILE = path.join(CONFIG_DIR, "partners.json");

export const isHosted: boolean = !!process.env.SMITHERY_HOSTED || !!process.env.SMITHERY_SERVER_URL;
let memoryPartners: PartnersData = {};

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

export function loadPartners(): PartnersData {
  if (isHosted) return memoryPartners;

  ensureConfigDir();
  if (!fs.existsSync(PARTNERS_FILE)) {
    const defaultPartners: PartnersData = {};
    fs.writeFileSync(PARTNERS_FILE, JSON.stringify(defaultPartners, null, 2), { encoding: "utf-8", mode: 0o600 });
    return defaultPartners;
  }

  try {
    const raw = fs.readFileSync(PARTNERS_FILE, "utf-8");
    return JSON.parse(raw) as PartnersData;
  } catch (e) {
    console.error("Hiba a partnerek betöltésekor:", e);
    return {};
  }
}

export function savePartners(partners: PartnersData): void {
  if (isHosted) {
    memoryPartners = partners;
    return;
  }

  ensureConfigDir();
  const tmpFile = PARTNERS_FILE + ".tmp";
  fs.writeFileSync(tmpFile, JSON.stringify(partners, null, 2), { encoding: "utf-8", mode: 0o600 });
  fs.renameSync(tmpFile, PARTNERS_FILE);
}

export function generatePartnerId(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "partner";
}

export function upsertPartner(data: Omit<Partner, "id" | "createdAt" | "updatedAt"> & { id?: string }): Partner {
  const partners = loadPartners();
  const id = data.id || generatePartnerId(data.name);
  const now = new Date().toISOString();

  const existing = partners[id];
  const updated: Partner = {
    id,
    name: data.name,
    zip: data.zip ?? existing?.zip,
    city: data.city ?? existing?.city,
    address: data.address ?? existing?.address,
    email: data.email ?? existing?.email,
    taxNumber: data.taxNumber ?? existing?.taxNumber,
    taxSubject: data.taxSubject ?? existing?.taxSubject,
    notes: data.notes ?? existing?.notes,
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now,
  };

  partners[id] = updated;
  savePartners(partners);
  return updated;
}

export function deletePartner(id: string): boolean {
  const partners = loadPartners();
  if (!partners[id]) return false;
  delete partners[id];
  savePartners(partners);
  return true;
}

export function findPartners(query?: string): Partner[] {
  const partners = loadPartners();
  const list = Object.values(partners);
  if (!query || !query.trim()) return list;

  const q = query.toLowerCase().trim();
  return list.filter((p) =>
    p.name.toLowerCase().includes(q) ||
    (p.email && p.email.toLowerCase().includes(q)) ||
    (p.taxNumber && p.taxNumber.includes(q)) ||
    (p.city && p.city.toLowerCase().includes(q))
  );
}
