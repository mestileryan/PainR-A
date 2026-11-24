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

// Nombre à la française (« 1,5 »), sans séparateur de milliers (« 1000 g » comme dans les recettes).
export function nombre(valeur: number, decimalesMax = 3): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: decimalesMax, useGrouping: false }).format(valeur)
}

// Arrondi lisible pour une quantité recalculée : 2 décimales sous 10, 1 sous 100, entier au-delà.
const decimalesAjustees = (valeur: number) => (valeur < 10 ? 2 : valeur < 100 ? 1 : 0)

// Fractions de cuisine affichées telles quelles (« ½ », « 1 ¾ »).
const fractions: [number, string][] = [[1 / 8, "⅛"], [1 / 4, "¼"], [1 / 3, "⅓"], [1 / 2, "½"], [2 / 3, "⅔"], [3 / 4, "¾"]]
const fractionsSaisies: Record<string, number> = { "½": 1 / 2, "⅓": 1 / 3, "⅔": 2 / 3, "¼": 1 / 4, "¾": 3 / 4, "⅛": 1 / 8 }

// 1.5 → « 1 ½ » ; null si la valeur n'est pas une fraction de cuisine (entier, 0,13…).
export function enFraction(valeur: number): string | null {
  const entier = Math.floor(valeur + 1e-9)
  const reste = valeur - entier
  if (reste < 1e-6) return null
  const f = fractions.find(([v]) => Math.abs(v - reste) < 1e-3)
  if (!f) return null
  return entier > 0 ? `${entier} ${f[1]}` : f[1]
}

// Grammes, litres… s'affichent en décimal ; cuillères, œufs, tasses… en fraction.
const unitesMetriques = new Set(["g", "kg", "mg", "l", "dl", "cl", "ml", "°c"])
const enDecimal = (unite?: string) => unitesMetriques.has((unite ?? "").trim().toLowerCase())

// Quantité affichée, éventuellement multipliée par un coefficient.
// Une quantité en texte (« 1 pincée ») n'est jamais recalculée.
export function quantiteTexte(ingredient: Ingredient, coefficient = 1): string {
  const { quantite, unite } = ingredient
  let texte = ""
  if (typeof quantite === "number") {
    const valeur = quantite * coefficient
    const fraction = enDecimal(unite) ? null : enFraction(valeur)
    texte = fraction ?? (coefficient === 1 ? nombre(valeur) : nombre(valeur, decimalesAjustees(valeur)))
  } else if (typeof quantite === "string") {
    texte = quantite.trim()
  }
  return [texte, unite?.trim() ?? ""].filter(Boolean).join(" ")
}

// Quantité telle qu'on la retrouve dans le formulaire (« 1 ½ », « 0,5 »).
export function quantiteSaisie(ingredient: Ingredient): string {
  const { quantite, unite } = ingredient
  if (quantite === undefined || quantite === null) return ""
  if (typeof quantite === "string") return quantite
  return (enDecimal(unite) ? null : enFraction(quantite)) ?? nombre(quantite, 6)
}

// Coefficient lu dans l'adresse (?coef=1.5) ou saisi : « 1,5 » et « 1.5 » sont acceptés.
export function lireCoefficient(saisie: string | null): number | null {
  if (!saisie) return null
  const valeur = Number(saisie.trim().replace(",", "."))
  return Number.isFinite(valeur) && valeur > 0 && valeur <= 100 ? valeur : null
}

// « 1,5 », « 1.5 », « 1/2 », « ½ », « 1 ½ », « 1 1/2 » → nombre ;
// tout le reste reste du texte (« 1 pincée »).
export function lireQuantite(saisie: string): number | string | undefined {
  const texte = saisie.trim()
  if (!texte) return undefined
  const t = texte.replace(",", ".")
  const unicode = t.match(/^(\d+)?\s*([½⅓⅔¼¾⅛])$/)
  if (unicode) return Number(unicode[1] ?? 0) + fractionsSaisies[unicode[2]]
  const barre = t.match(/^(?:(\d+)\s+)?(\d+)\s*\/\s*(\d+)$/)
  if (barre && Number(barre[3]) > 0) return Number(barre[1] ?? 0) + Number(barre[2]) / Number(barre[3])
  const valeur = Number(t)
  return Number.isFinite(valeur) ? valeur : texte
}

export const pluriel = (n: number, singulier: string, plurielForme: string) =>
  `${n} ${n > 1 ? plurielForme : singulier}`

export const sansAccents = (texte: string) =>
  texte.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
