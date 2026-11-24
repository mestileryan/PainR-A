// Durées des étapes, stockées en secondes dans le texte : #[5400] = 1 h 30.

export const motifDuree = () => /#\[(\d+)\]/g

export const jetonDuree = (secondes: number) => `#[${Math.round(secondes)}]`

// « 1 h 30 », « 1h30 », « 45 min », « 90 », « 30 s », « 1:30 » (h:mm) → secondes ; null si illisible.
export function lireDuree(saisie: string): number | null {
  const t = saisie.toLowerCase().replace(/\s+/g, "").replace(",", ".")
  if (!t) return null
  const hm = t.match(/^(\d+):(\d{1,2})$/)
  if (hm) return Number(hm[1]) * 3600 + Number(hm[2]) * 60 || null
  const m = t.match(/^(?:(\d+(?:\.\d+)?)(?:h|heures?))?(?:(\d+(?:\.\d+)?)(?:min|minutes?|mn|m)?)?(?:(\d+)(?:s|sec|secondes?))?$/)
  if (!m || (!m[1] && !m[2] && !m[3])) return null
  const total = Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0)
  return total > 0 ? Math.round(total) : null
}

// 5400 → « 1 h 30 », 7200 → « 2 h », 2700 → « 45 min », 90 → « 1 min 30 s ».
export function formatDuree(secondes: number): string {
  const s = Math.max(0, Math.round(secondes))
  const h = Math.floor(s / 3600)
  const min = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return min > 0 ? `${h} h ${String(min).padStart(2, "0")}` : `${h} h`
  if (min > 0) return sec > 0 ? `${min} min ${sec} s` : `${min} min`
  return `${sec} s`
}

// Décompte : 3:59:12 ou 12:05.
export function formatChrono(secondes: number): string {
  const s = Math.max(0, Math.ceil(secondes))
  const h = Math.floor(s / 3600)
  const min = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const deux = (n: number) => String(n).padStart(2, "0")
  return h > 0 ? `${h}:${deux(min)}:${deux(sec)}` : `${min}:${deux(sec)}`
}

// Durées écrites en toutes lettres dans un texte (« Cuire 45 min », « Pointage 3 h 30 »).
const motifTexte = /(\d+(?:[.,]\d+)?)\s*(h|heures?|min|minutes?|mn|s|sec|secondes?)\b(?:\s*(\d{1,2})(?!\s*(?:h|min|mn|s)\b)(?=\D|$))?/gi

export function dureesDansTexte(texte: string): { secondes: number; libelle: string }[] {
  const trouvees: { secondes: number; libelle: string }[] = []
  for (const m of texte.matchAll(motifTexte)) {
    const valeur = Number(m[1].replace(",", "."))
    const unite = m[2].toLowerCase()
    let secondes = unite.startsWith("h") ? valeur * 3600 : unite.startsWith("s") ? valeur : valeur * 60
    if (unite.startsWith("h") && m[3]) secondes += Number(m[3]) * 60
    if (secondes > 0) trouvees.push({ secondes: Math.round(secondes), libelle: m[0].trim() })
  }
  return trouvees
}
