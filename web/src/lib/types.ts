import type { RecordModel } from "pocketbase"

export interface Ingredient {
  nom: string
  quantite?: number | string
  unite?: string
}

export interface Etape {
  texte: string
}

export interface Version extends RecordModel {
  recette: string
  numero: number
  ingredients: Ingredient[] | null
  etapes: Etape[] | null
  created: string
  // Renseignée quand la version a été corrigée sur place (sans nouvelle version).
  corrigee_le: string
}

export interface Recette extends RecordModel {
  nom: string
  version_courante: string
  created: string
  updated: string
  expand?: { version_courante?: Version }
}

export type StatutEssai = "en_cours" | "valide" | "refuse"

export interface Essai extends RecordModel {
  recette: string
  version_base: string
  numero: number
  titre: string
  objectif: string
  ingredients: Ingredient[] | null
  etapes: Etape[] | null
  statut: StatutEssai
  raison_refus: string
  date_decision: string
  version_creee: string
  created: string
  expand?: { recette?: Recette; version_base?: Version; version_creee?: Version }
}

export interface Fournee extends RecordModel {
  recette: string
  version: string
  essai: string
  date: string
  notes: string
  photos: string[]
  // Fournée en cours de réalisation (mode cuisine) ; false une fois terminée.
  en_cours: boolean
  etapes_faites: number[] | null
  coefficient: number
  minuteurs: Minuteur[] | null
  expand?: { version?: Version; essai?: Essai; recette?: Recette }
}

// Minuteur d'une étape : en marche (fin renseignée) ou en pause (restant renseigné).
export interface Minuteur {
  id: string
  etape: number
  libelle: string
  duree: number
  fin: string | null
  restant: number | null
}
