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

// Quantité affichée, éventuellement multipliée par un coefficient.
// Une quantité en texte (« 1 pincée ») n'est jamais recalculée.
export function quantiteTexte(ingredient: Ingredient, coefficient = 1): string {
  const { quantite, unite } = ingredient
  let texte = ""
  if (typeof quantite === "number") {
    const valeur = quantite * coefficient
    texte = coefficient === 1 ? nombre(valeur) : nombre(valeur, decimalesAjustees(valeur))
  } else if (typeof quantite === "string") {
    texte = quantite.trim()
  }
  return [texte, unite?.trim() ?? ""].filter(Boolean).join(" ")
}

// Coefficient lu dans l'adresse (?coef=1.5) ou saisi : « 1,5 » et « 1.5 » sont acceptés.
export function lireCoefficient(saisie: string | null): number | null {
  if (!saisie) return null
  const valeur = Number(saisie.trim().replace(",", "."))
  return Number.isFinite(valeur) && valeur > 0 && valeur <= 100 ? valeur : null
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
