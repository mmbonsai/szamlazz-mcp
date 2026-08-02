import { z } from "zod";
import { findPartners, upsertPartner, deletePartner, loadPartners } from "../partners.js";

export const listPartnersSchema = z.object({
  query: z.string().optional().describe("Keresési kifejezés (név, email, adószám, település)"),
});

export function listPartners(params: z.infer<typeof listPartnersSchema>): string {
  const partners = findPartners(params.query);
  if (partners.length === 0) {
    return params.query
      ? `Nincs a "${params.query}" keresésnek megfelelő partner.`
      : "Még nincsenek elmentett partnerek.";
  }

  const result = partners.map((p) => ({
    id: p.id,
    name: p.name,
    zip: p.zip || "",
    city: p.city || "",
    address: p.address || "",
    email: p.email || "",
    taxNumber: p.taxNumber || "",
    taxSubject: p.taxSubject ?? null,
    notes: p.notes || "",
  }));

  return JSON.stringify({ partners: result, totalCount: result.length }, null, 2);
}

export const addPartnerSchema = z.object({
  id: z.string().optional().describe("Egyedi partner azonosító (opcionális, automatikusan generálódik a névből ha nincs megadva)"),
  name: z.string().describe("Vevő / Partner neve"),
  zip: z.string().optional().describe("Irányítószám"),
  city: z.string().optional().describe("Település"),
  address: z.string().optional().describe("Cím (utca, házszám)"),
  email: z.string().optional().describe("Email cím"),
  taxNumber: z.string().optional().describe("Adószám"),
  taxSubject: z.number().optional().describe("Adóalanyiság: 7=nem magánszemély, 1=belföldi adószámmal rendelkező, 0=nem tudjuk"),
  notes: z.string().optional().describe("Megjegyzés"),
});

export function addPartner(params: z.infer<typeof addPartnerSchema>): string {
  const partner = upsertPartner({
    id: params.id,
    name: params.name,
    zip: params.zip,
    city: params.city,
    address: params.address,
    email: params.email,
    taxNumber: params.taxNumber,
    taxSubject: params.taxSubject,
    notes: params.notes,
  });

  return `Partner sikeresen mentve: "${partner.name}" (azonosító: "${partner.id}")`;
}

export const removePartnerSchema = z.object({
  id: z.string().describe("Partner azonosítója (id)"),
});

export function removePartner(params: z.infer<typeof removePartnerSchema>): string {
  const success = deletePartner(params.id);
  if (!success) {
    throw new Error(`A "${params.id}" azonosítójú partner nem található.`);
  }
  return `Partner ("${params.id}") sikeresen eltávolítva.`;
}

export const getPartnerSchema = z.object({
  id: z.string().describe("Partner azonosítója vagy pontos neve"),
});

export function getPartner(params: z.infer<typeof getPartnerSchema>): string {
  const partners = loadPartners();
  const partner = partners[params.id] || Object.values(partners).find((p) => p.name.toLowerCase() === params.id.toLowerCase());
  if (!partner) {
    throw new Error(`A "${params.id}" azonosítójú partner nem található.`);
  }
  return JSON.stringify(partner, null, 2);
}
