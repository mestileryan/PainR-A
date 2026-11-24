import { useEffect, useRef, useState } from "react"
import { Link } from "react-router"
import { formatDuree } from "../lib/durees"
import { deverrouillerSon, etatMinuteur, notifier, sonner } from "../lib/minuteurs"
import { pb } from "../lib/pb"
import type { Fournee } from "../lib/types"
import { IconeChrono } from "./Icones"

interface Alerte {
  cle: string
  fournee: string
  titre: string
  corps: string
}

const CLE_STOCKAGE = "painrd:alarmes-sonnees"

function dejaSonnees(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(CLE_STOCKAGE) ?? "[]") as string[])
  } catch {
    return new Set()
  }
}

function marquerSonnee(cle: string) {
  try {
    const liste = [...dejaSonnees(), cle].slice(-200)
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(liste))
  } catch { /* stockage indisponible : l'alarme pourra resonner au rechargement */ }
}

// Surveille les minuteurs de toutes les fournées en cours, sur tous les écrans de l'app :
// sonnerie, vibration, notification et bandeau quand un minuteur arrive à zéro.
export default function AlarmesMinuteurs() {
  const [alertes, setAlertes] = useState<Alerte[]>([])
  const enAttente = useRef<number[]>([])

  useEffect(() => {
    const deverrouiller = () => deverrouillerSon()
    document.addEventListener("pointerdown", deverrouiller)
    return () => document.removeEventListener("pointerdown", deverrouiller)
  }, [])

  useEffect(() => {
    let fini = false

    function declencher(alerte: Alerte) {
      if (dejaSonnees().has(alerte.cle)) return
      marquerSonnee(alerte.cle)
      setAlertes((a) => (a.some((x) => x.cle === alerte.cle) ? a : [...a, alerte]))
      sonner()
      void notifier(alerte.titre, alerte.corps, alerte.cle)
    }

    async function planifier() {
      enAttente.current.forEach(clearTimeout)
      enAttente.current = []
      let fournees: Fournee[]
      try {
        fournees = await pb.collection("fournees").getFullList<Fournee>({
          filter: "en_cours = true",
          expand: "recette",
          fields: "id,minuteurs,expand.recette.nom",
        })
      } catch {
        return
      }
      if (fini) return
      const sonnees = dejaSonnees()
      for (const f of fournees) {
        for (const m of f.minuteurs ?? []) {
          if (!m.fin || m.restant !== null) continue
          const cle = `${f.id}:${m.id}:${m.fin}`
          if (sonnees.has(cle)) continue
          const alerte = {
            cle,
            fournee: f.id,
            titre: `${f.expand?.recette?.nom ?? "Recette"} : c'est l'heure !`,
            corps: `${m.libelle} (${formatDuree(m.duree)}) est terminé.`,
          }
          const { etat, reste } = etatMinuteur(m)
          // Terminé pendant que l'app était fermée (depuis moins de 12 h) : on prévient tout de suite.
          if (etat === "fini") {
            if (Date.now() - Date.parse(m.fin) < 12 * 3600 * 1000) declencher(alerte)
          } else {
            enAttente.current.push(window.setTimeout(() => declencher(alerte), reste * 1000 + 250))
          }
        }
      }
    }

    void planifier()
    const regulier = window.setInterval(planifier, 60_000)
    const auRetour = () => document.visibilityState === "visible" && void planifier()
    window.addEventListener("painrd:minuteurs", planifier)
    document.addEventListener("visibilitychange", auRetour)
    return () => {
      fini = true
      enAttente.current.forEach(clearTimeout)
      window.clearInterval(regulier)
      window.removeEventListener("painrd:minuteurs", planifier)
      document.removeEventListener("visibilitychange", auRetour)
    }
  }, [])

  // Tant qu'une alarme n'est pas acquittée, on resonne régulièrement (3 minutes au plus).
  useEffect(() => {
    if (alertes.length === 0) return
    const debut = Date.now()
    const rappel = window.setInterval(() => {
      if (Date.now() - debut > 180_000) window.clearInterval(rappel)
      else sonner()
    }, 5000)
    return () => window.clearInterval(rappel)
  }, [alertes.length])

  if (alertes.length === 0) return null
  const fermer = (cle: string) => setAlertes((a) => a.filter((x) => x.cle !== cle))

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex flex-col gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
      {alertes.map((a) => (
        <div key={a.cle} role="alert"
          className="mx-auto flex w-full max-w-xl items-center gap-3 rounded-2xl bg-essai px-4 py-3 text-white shadow-lg">
          <IconeChrono taille={24} className="shrink-0" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-semibold">{a.titre}</span>
            <span className="text-sm">{a.corps}</span>
          </span>
          <Link to={`/fournees/${a.fournee}`} onClick={() => fermer(a.cle)}
            className="flex h-11 items-center rounded-xl px-2 text-sm font-semibold text-white underline">
            Voir
          </Link>
          <button type="button" onClick={() => fermer(a.cle)}
            className="h-11 rounded-xl border-0 bg-white px-3 text-sm font-semibold text-essai">
            OK
          </button>
        </div>
      ))}
    </div>
  )
}
