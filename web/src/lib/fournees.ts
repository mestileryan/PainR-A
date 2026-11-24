import { aujourdhui, jourVersPocketBase } from "./format"
import { pb } from "./pb"
import type { Etape, Fournee, Ingredient } from "./types"

// Démarre une fournée en cours (mode cuisine) et renvoie son identifiant.
export async function demarrerFournee(
  recetteId: string,
  rattachement: { version: string } | { essai: string },
  coefficient: number,
): Promise<string> {
  const fournee = await pb.collection("fournees").create<Fournee>({
    recette: recetteId,
    ...rattachement,
    date: jourVersPocketBase(aujourdhui()),
    en_cours: true,
    etapes_faites: [],
    coefficient,
  })
  return fournee.id
}

// Contenu suivi par la fournée : celui de l'essai testé, sinon celui de la version.
export function contenuFournee(f: Fournee): { ingredients: Ingredient[]; etapes: Etape[] } {
  const source = f.expand?.essai ?? f.expand?.version
  return { ingredients: source?.ingredients ?? [], etapes: source?.etapes ?? [] }
}

export const coefficientFournee = (f: Fournee) => (f.coefficient > 0 ? f.coefficient : 1)

export function progression(f: Fournee): { faites: number; total: number; courante: number } {
  const total = contenuFournee(f).etapes.length
  const faites = new Set((f.etapes_faites ?? []).filter((i) => i < total))
  let courante = 0
  while (courante < total && faites.has(courante)) courante++
  return { faites: faites.size, total, courante }
}

export function libelleProgression(f: Fournee): string {
  const { faites, total, courante } = progression(f)
  if (total === 0) return "Pas d'étapes"
  if (faites >= total) return "Toutes les étapes sont faites"
  return `Étape ${courante + 1} sur ${total}`
}
