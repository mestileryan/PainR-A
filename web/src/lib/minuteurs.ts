import type { Minuteur } from "./types"

export type EtatMinuteur = { etat: "marche" | "pause" | "fini"; reste: number }

export function etatMinuteur(m: Minuteur, maintenant = Date.now()): EtatMinuteur {
  if (m.restant !== null && m.restant !== undefined) return { etat: "pause", reste: m.restant }
  if (!m.fin) return { etat: "pause", reste: m.duree }
  const reste = (Date.parse(m.fin) - maintenant) / 1000
  return reste <= 0 ? { etat: "fini", reste: 0 } : { etat: "marche", reste }
}

const identifiant = () => Math.random().toString(36).slice(2, 10)
const finDans = (secondes: number) => new Date(Date.now() + secondes * 1000).toISOString()

export const nouveauMinuteur = (etape: number, libelle: string, duree: number): Minuteur =>
  ({ id: identifiant(), etape, libelle, duree, fin: finDans(duree), restant: null })

export function mettreEnPause(m: Minuteur): Minuteur {
  const { etat, reste } = etatMinuteur(m)
  return etat === "marche" ? { ...m, fin: null, restant: Math.ceil(reste) } : m
}

export const reprendre = (m: Minuteur): Minuteur =>
  m.restant !== null ? { ...m, fin: finDans(m.restant), restant: null } : m

export function ajouterMinute(m: Minuteur): Minuteur {
  const { etat, reste } = etatMinuteur(m)
  if (etat === "pause") return { ...m, restant: reste + 60 }
  return { ...m, fin: finDans(Math.max(reste, 0) + 60) }
}

// Prévient la surveillance des alarmes qu'un minuteur a changé.
export const signalerMinuteurs = () => window.dispatchEvent(new Event("painrd:minuteurs"))

// --- Sonnerie ---------------------------------------------------------------
// Le navigateur n'autorise le son qu'après un geste de l'utilisateur : on « déverrouille »
// l'audio au premier appui, puis on peut sonner à la fin d'un minuteur.

let audio: AudioContext | null = null

export function deverrouillerSon() {
  try {
    audio ??= new AudioContext()
    void audio.resume()
  } catch {
    audio = null
  }
}

export function sonner() {
  try {
    navigator.vibrate?.([400, 200, 400, 200, 400])
  } catch { /* vibration indisponible */ }
  if (!audio) return
  const debut = audio.currentTime
  for (let i = 0; i < 3; i++) {
    const t = debut + i * 0.45
    const oscillateur = audio.createOscillator()
    const volume = audio.createGain()
    oscillateur.frequency.value = 880
    oscillateur.connect(volume)
    volume.connect(audio.destination)
    volume.gain.setValueAtTime(0.0001, t)
    volume.gain.exponentialRampToValueAtTime(0.5, t + 0.02)
    volume.gain.exponentialRampToValueAtTime(0.0001, t + 0.3)
    oscillateur.start(t)
    oscillateur.stop(t + 0.35)
  }
}

export async function demanderNotifications() {
  try {
    if ("Notification" in window && Notification.permission === "default") await Notification.requestPermission()
  } catch { /* notifications indisponibles */ }
}

export async function notifier(titre: string, corps: string, etiquette: string) {
  try {
    if (!("Notification" in window) || Notification.permission !== "granted") return
    const enregistrement = await navigator.serviceWorker?.getRegistration()
    if (enregistrement) await enregistrement.showNotification(titre, { body: corps, tag: etiquette, requireInteraction: true })
    else new Notification(titre, { body: corps, tag: etiquette })
  } catch { /* notifications indisponibles */ }
}
