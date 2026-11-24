import { useEffect, useState } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router"
import { pb } from "./lib/pb"
import Connexion from "./pages/Connexion"
import CorrectionRecette from "./pages/CorrectionRecette"
import EditionEssai from "./pages/EditionEssai"
import Essai from "./pages/Essai"
import Historique from "./pages/Historique"
import Livret from "./pages/Livret"
import NouvelleRecette from "./pages/NouvelleRecette"
import Recette from "./pages/Recette"

function useConnecte() {
  const [connecte, setConnecte] = useState(pb.authStore.isValid)
  useEffect(() => pb.authStore.onChange(() => setConnecte(pb.authStore.isValid)), [])
  return connecte
}

export default function App() {
  const connecte = useConnecte()

  // Au lancement, on prolonge la session (ou on la ferme si le compte n'existe plus).
  useEffect(() => {
    if (pb.authStore.isValid) {
      pb.collection("users").authRefresh().catch(() => pb.authStore.clear())
    }
  }, [])

  if (!connecte) return <Connexion />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Livret />} />
        <Route path="/recettes/nouvelle" element={<NouvelleRecette />} />
        <Route path="/recettes/:id" element={<Recette />} />
        <Route path="/recettes/:id/historique" element={<Historique />} />
        <Route path="/recettes/:id/corriger" element={<CorrectionRecette />} />
        <Route path="/recettes/:id/essais/nouveau" element={<EditionEssai mode="nouveau" />} />
        <Route path="/essais/:id" element={<Essai />} />
        <Route path="/essais/:id/modifier" element={<EditionEssai mode="modifier" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
