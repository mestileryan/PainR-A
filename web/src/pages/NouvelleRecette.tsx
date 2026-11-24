import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router"
import { Erreur, LienRetour, Page, classeBoutonPrincipal, classeChamp } from "../components/Commun"
import EditeurContenu, { contenuDepuis, lignesDepuis, verifierLignes } from "../components/EditeurContenu"
import { messageErreur, pb } from "../lib/pb"

export default function NouvelleRecette() {
  const naviguer = useNavigate()
  const [nom, setNom] = useState("")
  const [lignes, setLignes] = useState(() => lignesDepuis())
  const [erreur, setErreur] = useState("")
  const [envoi, setEnvoi] = useState(false)

  async function enregistrer(ev: FormEvent) {
    ev.preventDefault()
    const probleme = verifierLignes(lignes)
    if (probleme) {
      setErreur(probleme)
      return
    }
    setErreur("")
    setEnvoi(true)
    try {
      const reponse = await pb.send<{ recette: string }>("/api/painrd/recettes", {
        method: "POST",
        body: { nom: nom.trim(), ...contenuDepuis(lignes) },
      })
      naviguer(`/recettes/${reponse.recette}`, { replace: true })
    } catch (err) {
      setErreur(messageErreur(err))
      setEnvoi(false)
    }
  }

  return (
    <Page>
      <LienRetour vers="/">Livret</LienRetour>
      <h1 className="m-0 font-titre text-[32px] leading-tight font-bold">Nouvelle recette</h1>

      <form onSubmit={enregistrer} className="flex flex-col gap-7">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="nom" className="text-sm font-medium text-sourdine">Nom de la recette</label>
          <input id="nom" required value={nom} onChange={(e) => setNom(e.target.value)}
            placeholder="Pain de campagne au levain" className={classeChamp} />
        </div>

        <EditeurContenu lignes={lignes} onChange={setLignes} />

        <Erreur message={erreur} />
        <button type="submit" disabled={envoi} className={classeBoutonPrincipal}>
          {envoi ? "Enregistrement…" : "Enregistrer la version 1"}
        </button>
      </form>
    </Page>
  )
}
