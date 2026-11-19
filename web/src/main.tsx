import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "@fontsource-variable/inter"
import "@fontsource-variable/bricolage-grotesque"
import "@fontsource/jetbrains-mono/500.css"
import "./styles.css"
import App from "./App"

createRoot(document.getElementById("racine")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
