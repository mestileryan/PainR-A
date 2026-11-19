import { useId, useState, type FormEvent } from "react"
import { aujourdhui, jourVersPocketBase, pluriel } from "../lib/format"
import { messageErreur, pb } from "../lib/pb"
import { reduirePhoto } from "../lib/photos"
import { Erreur, classeBoutonPrincipal, classeBoutonSecondaire, classeChamp } from "./Commun"
import { IconePhoto } from "./Icones"

interface Props {
  recetteId: string
  // La fournée suit soit une version, soit un essai en cours.
  rattachement: { version: string } | { essai: string }
  onAjoutee: () => void
  onAnnuler: () => void
}

export default function NouvelleFournee({ recetteId, rattachement, onAjoutee, onAnnuler }: Props) {
  const id = useId()
  const [jour, setJour] = useState(aujourdhui)
  const [notes, setNotes] = useState("")
  const [photos, setPhotos] = useState<File[]>([])
  const [erreur, setErreur] = useState("")
  const [etape, setEtape] = useState<"" | "reduction" | "envoi">("")

  async function enregistrer(ev: FormEvent) {
    ev.preventDefault()
    setErreur("")
    try {
      setEtape("reduction")
      const reduites = await Promise.all(photos.map((p) => reduirePhoto(p)))
      setEtape("envoi")
      const donnees = new FormData()
      donnees.append("recette", recetteId)
      if ("version" in rattachement) donnees.append("version", rattachement.version)
      else donnees.append("essai", rattachement.essai)
      donnees.append("date", jourVersPocketBase(jour))
      donnees.append("notes", notes.trim())
      for (const photo of reduites) donnees.append("photos", photo)
      await pb.collection("fournees").create(donnees)
      onAjoutee()
    } catch (err) {
      setErreur(messageErreur(err))
      setEtape("")
    }
  }

  return (
    <form onSubmit={enregistrer} className="flex flex-col gap-4 rounded-2xl border-2 border-encre bg-carte p-4">
      <span className="text-[17px] font-semibold">Nouvelle fournée</span>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-jour`} className="text-sm font-medium text-sourdine">Faite le</label>
        <input id={`${id}-jour`} type="date" required value={jour} max={aujourdhui()}
          onChange={(e) => setJour(e.target.value)} className={classeChamp} />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-sourdine">Photos</span>
        <label className="relative flex h-[52px] cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-pointille text-base font-semibold focus-within:outline-2 focus-within:outline-encre">
          <IconePhoto />
          {photos.length ? pluriel(photos.length, "photo choisie", "photos choisies") : "Prendre ou choisir des photos"}
          <input type="file" accept="image/*" multiple className="absolute h-px w-px opacity-0"
            onChange={(e) => setPhotos(Array.from(e.target.files ?? []))} />
        </label>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-notes`} className="text-sm font-medium text-sourdine">Ce que j'ai constaté</label>
        <textarea id={`${id}-notes`} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Mie, croûte, goût, tenue de la pâte…"
          className="box-border resize-y rounded-xl border border-trait-fort bg-fond px-3.5 py-3 leading-snug" />
      </div>
      <Erreur message={erreur} />
      <div className="grid grid-cols-2 gap-2.5">
        <button type="button" onClick={onAnnuler} disabled={etape !== ""} className={classeBoutonSecondaire}>Annuler</button>
        <button type="submit" disabled={etape !== ""} className={classeBoutonPrincipal}>
          {etape === "reduction" ? "Préparation…" : etape === "envoi" ? "Envoi…" : "Enregistrer"}
        </button>
      </div>
    </form>
  )
}
