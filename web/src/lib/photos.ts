import { pb } from "./pb"
import type { Fournee } from "./types"

// Réduit une photo de téléphone (souvent 4 à 8 Mo) avant l'envoi.
// En cas de format non lisible par le navigateur, la photo part telle quelle.
export async function reduirePhoto(fichier: File, cote = 2000, qualite = 0.85): Promise<File> {
  if (!fichier.type.startsWith("image/")) return fichier
  try {
    const image = await createImageBitmap(fichier, { imageOrientation: "from-image" })
    const echelle = Math.min(1, cote / Math.max(image.width, image.height))
    if (echelle === 1 && fichier.size < 1_500_000) {
      image.close()
      return fichier
    }
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(image.width * echelle)
    canvas.height = Math.round(image.height * echelle)
    canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height)
    image.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", qualite))
    if (!blob) return fichier
    return new File([blob], fichier.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" })
  } catch {
    return fichier
  }
}

// Les photos sont privées : chaque adresse porte un jeton de fichier à durée courte.
export function urlPhoto(fournee: Fournee, fichier: string, jeton: string, miniature?: "300x300" | "800x0"): string {
  return pb.files.getURL(fournee, fichier, { token: jeton, ...(miniature ? { thumb: miniature } : {}) })
}
