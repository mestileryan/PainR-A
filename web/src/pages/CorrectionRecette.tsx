import { useEffect, useState, type FormEvent } from "react"
import { useNavigate, useParams } from "react-router"
import { Chargement, Erreur, LienRetour, Page, classeBoutonPrincipal, classeChamp } from "../components/Commun"
import EditeurContenu, { contenuDepuis, lignesDepuis, verifierLignes, type Lignes } from "../components/EditeurContenu"
import { pluriel } from "../lib/format"
import { messageErreur, pb } from "../lib/pb"
import type { Recette, Version } from "../lib/types"

// Corriger la version en vigueur sur place (coquille, oubli), sans passer par un essai.
export default function CorrectionRecette() {
  const { id = "" } = useParams()
  const naviguer = useNavigate()
  const [recette, setRecette] = useState<Recette | null>(null)
  const [version, setVersion] = useState<Version | null>(null)
  const [essaisEnCours, setEssaisEnCours] = useState(0)
  const [nom, setNom] = useState("")
  const [lignes, setLignes] = useState<Lignes | null>(null)
  const [erreur, setErreur] = useState("")
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => {
    let annule = false
    Promise.all([
      pb.collection("recettes").getOne<Recette>(id, { expand: "version_courante" }),
      pb.collection("essais").getList(1, 1, { filter: pb.filter('recette = {:id} && statut = "en_cours"', { id }) }),
    ])
      .then(([r, essais]) => {
        if (annule) return
        const v = r.expand?.version_courante
        if (!v) throw new Error("Version en vigueur introuvable.")
        setRecette(r)
        setVersion(v)
        setNom(r.nom)
        setLignes(lignesDepuis(v))
        setEssaisEnCours(essais.totalItems)
      })
      .catch((err) => !annule && setErreur(messageErreur(err)))
    return () => {
      annule = true
    }
  }, [id])

  if (!recette || !version || !lignes) {
    return (
      <Page>
        <LienRetour vers={`/recettes/${id}`}>Recette</LienRetour>
        {erreur ? <Erreur message={erreur} /> : <Chargement />}
      </Page>
    )
  }

  async function enregistrer(ev: FormEvent) {
    ev.preventDefault()
    const probleme = verifierLignes(lignes!)
    if (probleme) {
      setErreur(probleme)
      return
    }
    setErreur("")
    setEnvoi(true)
    try {
      await pb.send(`/api/painrd/recettes/${id}/corriger`, {
        method: "POST",
        body: { nom: nom.trim(), ...contenuDepuis(lignes!) },
      })
      naviguer(`/recettes/${id}`, { replace: true })
    } catch (err) {
      setErreur(messageErreur(err))
      setEnvoi(false)
    }
  }

  return (
    <Page>
      <LienRetour vers={`/recettes/${id}`}>{recette.nom}</LienRetour>
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold tracking-[0.06em] text-seigle uppercase">
          Corriger la version {version.numero}
        </span>
        <h1 className="m-0 font-titre text-[30px] leading-tight font-bold">Corriger la recette</h1>
        <p className="m-0 text-[15px] leading-relaxed text-encre-douce">
          Pour une coquille ou un oubli : la version {version.numero} est modifiée sur place, sans nouvelle
          version ni trace dans l'historique. Pour tester un vrai changement, fais plutôt un essai.
        </p>
      </div>

      {essaisEnCours > 0 && (
        <p role="note" className="m-0 rounded-2xl bg-essai-fond px-4 py-3.5 text-[15px] leading-relaxed">
          {pluriel(essaisEnCours, "essai en cours part", "essais en cours partent")} de cette version. La correction
          ne leur sera pas appliquée : elle apparaîtra dans leurs différences avec la version.
        </p>
      )}

      <form onSubmit={enregistrer} className="flex flex-col gap-7">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="nom" className="text-sm font-medium text-sourdine">Nom de la recette</label>
          <input id="nom" required value={nom} onChange={(e) => setNom(e.target.value)} className={classeChamp} />
        </div>

        <EditeurContenu lignes={lignes} onChange={setLignes} />

        <Erreur message={erreur} />
        <button type="submit" disabled={envoi} className={classeBoutonPrincipal}>
          {envoi ? "Enregistrement…" : "Enregistrer la correction"}
        </button>
      </form>
    </Page>
  )
}
