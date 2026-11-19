import type { Ingredient } from "./types"

// PocketBase renvoie les dates sous la forme « 2026-11-17 12:00:00.000Z ».
export function versDate(valeur: string): Date {
  return new Date(valeur.replace(" ", "T"))
}

const formatCourt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" })
const formatLong = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" })

export const dateCourte = (valeur: string) => (valeur ? formatCourt.format(versDate(valeur)) : "")
export const dateLongue = (valeur: string) => (valeur ? formatLong.format(versDate(valeur)) : "")

// Date du jour au format des champs <input type="date"> (heure locale).
export function aujourdhui(): string {
  const d = new Date()
  const deux = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`
}

// Un jour choisi dans un <input type="date">, à midi UTC pour ne pas changer de jour selon le fuseau.
export const jourVersPocketBase = (jour: string) => `${jour} 12:00:00.000Z`

export function quantiteTexte(ingredient: Ingredient): string {
  return [ingredient.quantite, ingredient.unite]
    .filter((v) => v !== undefined && v !== null && String(v).trim() !== "")
    .join(" ")
}

// « 1,5 » ou « 1.5 » → 1.5 ; tout ce qui n'est pas un nombre reste du texte (« 1 pincée »).
export function lireQuantite(saisie: string): number | string | undefined {
  const texte = saisie.trim()
  if (!texte) return undefined
  const nombre = Number(texte.replace(",", "."))
  return Number.isFinite(nombre) ? nombre : texte
}

export const pluriel = (n: number, singulier: string, plurielForme: string) =>
  `${n} ${n > 1 ? plurielForme : singulier}`

export const sansAccents = (texte: string) =>
  texte.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
