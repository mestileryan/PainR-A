import { ClientResponseError } from "pocketbase"
import { useState, type FormEvent } from "react"
import { Erreur, classeBoutonPrincipal, classeChamp } from "../components/Commun"
import { messageErreur, pb } from "../lib/pb"

export default function Connexion() {
  const [email, setEmail] = useState("")
  const [motDePasse, setMotDePasse] = useState("")
  const [erreur, setErreur] = useState("")
  const [envoi, setEnvoi] = useState(false)

  async function seConnecter(ev: FormEvent) {
    ev.preventDefault()
    setErreur("")
    setEnvoi(true)
    try {
      await pb.collection("users").authWithPassword(email.trim(), motDePasse)
    } catch (err) {
      setErreur(err instanceof ClientResponseError && err.status === 400
        ? "E-mail ou mot de passe incorrect."
        : messageErreur(err))
      setEnvoi(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 px-5 py-10">
      <div className="flex flex-col gap-1">
        <span className="text-[13px] font-semibold tracking-[0.08em] text-seigle uppercase">PainR&amp;D</span>
        <h1 className="m-0 font-titre text-[34px] leading-tight font-bold">Mon livret</h1>
      </div>
      <form onSubmit={seConnecter} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-sourdine">E-mail</label>
          <input id="email" type="email" autoComplete="username" required value={email}
            onChange={(e) => setEmail(e.target.value)} className={classeChamp} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="mdp" className="text-sm font-medium text-sourdine">Mot de passe</label>
          <input id="mdp" type="password" autoComplete="current-password" required value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)} className={classeChamp} />
        </div>
        <Erreur message={erreur} />
        <button type="submit" disabled={envoi} className={classeBoutonPrincipal}>
          {envoi ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </main>
  )
}
