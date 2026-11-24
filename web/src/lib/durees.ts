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

// Durées écrites dans le texte d'une étape, reconnues comme des chronos :
//   « 1h30 », « 12h05 », « 1 h 30 »  → heures + minutes (00 à 59)
//   « 1:30 », « 125:00 »             → heures:minutes, exactement 2 chiffres après « : »
//   « 4h », « 4 heures », « 45 min », « 1,5 h », « 30 s »
const motifTexte = new RegExp([
  // 1h30, 1 h 30 (minutes sur 1 ou 2 chiffres, non suivies d'un autre chiffre ni d'une unité)
  String.raw`(?<![\d.,])(\d+)\s*h\s*(\d{1,2})(?!\d)(?!\s*(?:min|mn|s\b|sec))`,
  // 1:30, 125:00 — « : » suivi d'exactement deux chiffres
  String.raw`(?<![\d.,:])(\d+):(\d{2})(?![\d:])`,
  // 4h, 4 heures, 45 min, 1,5 h, 30 s — l'unité n'est pas le début d'un mot (« 2 sachets »)
  String.raw`(?<![\d.,])(\d+(?:[.,]\d+)?)\s*(heures?|h|minutes?|min|mn|secondes?|sec|s)(?![a-zà-ÿ])`,
].join("|"), "gi")

export interface DureeTrouvee {
  secondes: number
  libelle: string
  debut: number
  fin: number
}

export function dureesDansTexte(texte: string): DureeTrouvee[] {
  const trouvees: DureeTrouvee[] = []
  for (const m of texte.matchAll(motifTexte)) {
    let secondes = 0
    if (m[1] !== undefined) {
      if (Number(m[2]) > 59) continue
      secondes = Number(m[1]) * 3600 + Number(m[2]) * 60
    } else if (m[3] !== undefined) {
      if (Number(m[4]) > 59) continue
      secondes = Number(m[3]) * 3600 + Number(m[4]) * 60
    } else {
      const valeur = Number(m[5].replace(",", "."))
      const unite = m[6].toLowerCase()
      secondes = unite.startsWith("h") ? valeur * 3600 : unite.startsWith("s") ? valeur : valeur * 60
    }
    const debut = m.index ?? 0
    if (secondes > 0) trouvees.push({ secondes: Math.round(secondes), libelle: m[0], debut, fin: debut + m[0].length })
  }
  return trouvees
}
