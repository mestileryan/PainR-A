import PocketBase, { ClientResponseError } from "pocketbase"

// L'app est servie par PocketBase lui-même (ou via le proxy Vite en dev) : même origine.
export const pb = new PocketBase("/")
pb.autoCancellation(false)

export function messageErreur(err: unknown): string {
  if (err instanceof ClientResponseError) {
    if (err.status === 0) return "Pas de connexion au serveur. Vérifie ton réseau."
    const champs = err.response?.data as Record<string, { message?: string }> | undefined
    const detail = champs && Object.values(champs).find((c) => c?.message)?.message
    return detail || err.response?.message || err.message
  }
  return "Quelque chose s'est mal passé. Réessaie."
}
