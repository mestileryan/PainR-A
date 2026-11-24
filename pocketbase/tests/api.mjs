// Tests de bout en bout de l'API PocketBase du livret.
//
// À lancer contre une instance de TEST vide (jamais la vraie : le test crée et supprime des données) :
//   pocketbase migrate up --dir test_data --migrationsDir pb_migrations --hooksDir pb_hooks
//   pocketbase superuser upsert admin@test.local MotDePasseTest123 --dir test_data
//   pocketbase serve --http 127.0.0.1:8091 --dir test_data --migrationsDir pb_migrations --hooksDir pb_hooks
//   node tests/api.mjs
//
// Variables possibles : PB_URL, PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD.
const BASE = process.env.PB_URL ?? "http://127.0.0.1:8091"
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL ?? "admin@test.local"
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD ?? "MotDePasseTest123"
let echecs = 0
const ok = (cond, msg) => { console.log((cond ? "OK   " : "ECHEC") + " " + msg); if (!cond) echecs++ }

async function api(method, path, { token, body, form } = {}) {
  const headers = {}
  if (token) headers.Authorization = token
  let payload
  if (form) payload = form
  else if (body !== undefined) { headers["Content-Type"] = "application/json"; payload = JSON.stringify(body) }
  const res = await fetch(BASE + path, { method, headers, body: payload })
  const text = await res.text()
  let data; try { data = JSON.parse(text) } catch { data = text }
  return { status: res.status, data }
}

for (let i = 0; i < 50; i++) {
  try { if ((await fetch(BASE + "/api/health")).ok) break } catch {}
  await new Promise((r) => setTimeout(r, 200))
}

const su = await api("POST", "/api/collections/_superusers/auth-with-password", { body: { identity: ADMIN_EMAIL, password: ADMIN_PASSWORD } })
ok(su.status === 200, "connexion superutilisateur")
const suToken = su.data.token

const inscription = await api("POST", "/api/collections/users/records", { body: { email: "pirate@test.local", password: "azertyuiop12", passwordConfirm: "azertyuiop12" } })
ok(inscription.status >= 400, `inscription publique refusée (${inscription.status})`)

const cree = await api("POST", "/api/collections/users/records", { token: suToken, body: { email: "moi@test.local", password: "azertyuiop12", passwordConfirm: "azertyuiop12" } })
ok(cree.status === 200, "création d'un utilisateur par le superutilisateur")
const auth = await api("POST", "/api/collections/users/auth-with-password", { body: { identity: "moi@test.local", password: "azertyuiop12" } })
ok(auth.status === 200, "connexion utilisateur")
const T = auth.data.token

ok((await api("POST", "/api/painrd/recettes", { body: { nom: "X" } })).status === 401, "création de recette sans connexion refusée")
ok((await api("GET", "/api/collections/recettes/records")).data.items?.length === 0, "liste anonyme : rien de visible")

ok((await api("POST", "/api/painrd/recettes", { token: T, body: { nom: " " } })).status === 400, "recette sans nom refusée")
const mauvais = await api("POST", "/api/painrd/recettes", { token: T, body: { nom: "Pain", ingredients: [{ quantite: 3 }] } })
ok(mauvais.status === 400, "ingrédient sans nom refusé : " + mauvais.data.message)

const ingredients = [{ nom: "Farine T80", quantite: 1000, unite: "g" }, { nom: "Eau", quantite: 700, unite: "g" }]
const etapes = [{ texte: "Autolyse 1 h" }, { texte: "Pointage 4 h" }]
const rc = await api("POST", "/api/painrd/recettes", { token: T, body: { nom: "Pain de campagne", ingredients, etapes } })
ok(rc.status === 201, "création recette + v1")
const recetteId = rc.data.recette, v1 = rc.data.version

let recette = (await api("GET", `/api/collections/recettes/records/${recetteId}?expand=version_courante`, { token: T })).data
ok(recette.version_courante === v1 && recette.expand.version_courante.numero === 1, "version en vigueur = v1")
ok(recette.expand.version_courante.ingredients[1].quantite === 700, "contenu de v1 enregistré")

ok((await api("PATCH", `/api/collections/recettes/records/${recetteId}`, { token: T, body: { version_courante: "" } })).status >= 400, "changer version_courante à la main refusé")
ok((await api("PATCH", `/api/collections/recettes/records/${recetteId}`, { token: T, body: { nom: "Pain de campagne au levain" } })).status === 200, "renommer la recette autorisé")
ok((await api("POST", "/api/collections/versions/records", { token: T, body: { recette: recetteId, numero: 9 } })).status >= 400, "création directe de version refusée")
ok((await api("PATCH", `/api/collections/versions/records/${v1}`, { token: T, body: { numero: 5 } })).status >= 400, "modification d'une version refusée")
ok((await api("DELETE", `/api/collections/versions/records/${v1}`, { token: T })).status >= 400, "suppression d'une version refusée")

const e1 = await api("POST", "/api/collections/essais/records", { token: T, body: { recette: recetteId, version_base: v1, titre: "Plus d'eau", statut: "valide", version_creee: v1 } })
ok(e1.status === 200, "création essai 1")
ok(e1.data.statut === "en_cours" && e1.data.version_creee === "" && e1.data.numero === 1, "essai forcé en cours, n° 1")
ok(e1.data.ingredients?.[0]?.nom === "Farine T80", "essai reprend le contenu de v1")
const essai1 = e1.data.id

ok((await api("PATCH", `/api/collections/essais/records/${essai1}`, { token: T, body: { statut: "valide" } })).status >= 400, "changer le statut à la main refusé")
const modif = await api("PATCH", `/api/collections/essais/records/${essai1}`, { token: T, body: { ingredients: [{ nom: "Farine T80", quantite: 1000, unite: "g" }, { nom: "Eau", quantite: 750, unite: "g" }] } })
ok(modif.status === 200 && modif.data.ingredients[1].quantite === 750, "retoucher le contenu d'un essai en cours")
ok((await api("PATCH", `/api/collections/essais/records/${essai1}`, { token: T, body: { etapes: [{ texte: "" }] } })).status === 400, "étape vide refusée sur un essai")

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64")
const form = new FormData()
form.append("recette", recetteId); form.append("essai", essai1); form.append("date", "2026-11-17 10:00:00.000Z"); form.append("notes", "Mie ouverte")
form.append("photos", new Blob([png], { type: "image/png" }), "mie.png")
const f1 = await api("POST", "/api/collections/fournees/records", { token: T, form })
ok(f1.status === 200 && f1.data.photos.length === 1, "fournée d'essai avec photo")

const fichier = `/api/files/fournees/${f1.data.id}/${f1.data.photos?.[0]}`
ok((await api("GET", fichier)).status >= 400, "photo inaccessible sans jeton")
const jeton = (await api("POST", "/api/files/token", { token: T })).data.token
ok((await api("GET", `${fichier}?token=${jeton}`)).status === 200, "photo accessible avec jeton")

ok((await api("POST", "/api/collections/fournees/records", { token: T, body: { recette: recetteId, date: "2026-11-18 10:00:00.000Z" } })).status === 400, "fournée sans version ni essai refusée")
ok((await api("POST", "/api/collections/fournees/records", { token: T, body: { recette: recetteId, version: v1, essai: essai1, date: "2026-11-18 10:00:00.000Z" } })).status === 400, "fournée avec version ET essai refusée")
ok((await api("POST", "/api/collections/fournees/records", { token: T, body: { recette: recetteId, version: v1, date: "2026-11-18 10:00:00.000Z" } })).status === 200, "fournée de la version en vigueur")

const e2 = await api("POST", "/api/collections/essais/records", { token: T, body: { recette: recetteId, version_base: v1, titre: "Cuisson cocotte" } })
ok(e2.status === 200 && e2.data.numero === 2, "essai 2, n° 2")
const essai2 = e2.data.id

const val = await api("POST", `/api/painrd/essais/${essai1}/valider`, { token: T })
ok(val.status === 200 && val.data.numero === 2, "valider essai 1 → version 2")
recette = (await api("GET", `/api/collections/recettes/records/${recetteId}?expand=version_courante`, { token: T })).data
ok(recette.version_courante === val.data.version && recette.expand.version_courante.ingredients[1].quantite === 750, "v2 en vigueur avec le contenu de l'essai")
const essai1Apres = (await api("GET", `/api/collections/essais/records/${essai1}`, { token: T })).data
ok(essai1Apres.statut === "valide" && essai1Apres.version_creee === val.data.version && essai1Apres.date_decision !== "", "essai 1 marqué validé")
ok((await api("POST", `/api/painrd/essais/${essai1}/valider`, { token: T })).status === 400, "valider deux fois refusé")

const val2 = await api("POST", `/api/painrd/essais/${essai2}/valider`, { token: T })
ok(val2.status === 400, "valider un essai parti d'une ancienne version refusé : " + val2.data.message)
ok((await api("POST", "/api/collections/essais/records", { token: T, body: { recette: recetteId, version_base: v1, titre: "Vieux" } })).status === 400, "nouvel essai sur une ancienne version refusé")

ok((await api("POST", `/api/painrd/essais/${essai2}/refuser`, { token: T, body: {} })).status === 400, "refus sans raison refusé")
ok((await api("POST", `/api/painrd/essais/${essai2}/refuser`, { token: T, body: { raison: "Croûte trop épaisse" } })).status === 200, "refus avec raison")
const essai2Apres = (await api("GET", `/api/collections/essais/records/${essai2}`, { token: T })).data
ok(essai2Apres.statut === "refuse" && essai2Apres.raison_refus === "Croûte trop épaisse", "essai 2 marqué refusé")
ok((await api("POST", "/api/collections/fournees/records", { token: T, body: { recette: recetteId, essai: essai2, date: "2026-11-19 10:00:00.000Z" } })).status === 400, "fournée sur essai refusé refusée")
ok((await api("DELETE", `/api/collections/essais/records/${essai2}`, { token: T })).status >= 400, "supprimer un essai tranché refusé")

const versions = (await api("GET", `/api/collections/versions/records?filter=${encodeURIComponent(`recette="${recetteId}"`)}&sort=numero`, { token: T })).data.items
ok(versions.map((v) => v.numero).join(",") === "1,2", "historique : v1, v2")

// Correction sur place de la version en vigueur (sans nouvelle version)
const v2 = val.data.version
ok((await api("POST", `/api/painrd/recettes/${recetteId}/corriger`, { body: { nom: "X" } })).status === 401, "correction sans connexion refusée")
ok((await api("POST", `/api/painrd/recettes/${recetteId}/corriger`, { token: T, body: { nom: "Pain", etapes: [{ texte: "" }] } })).status === 400, "correction avec étape vide refusée")
const corr = await api("POST", `/api/painrd/recettes/${recetteId}/corriger`, { token: T, body: {
  nom: "Pain de campagne corrigé",
  ingredients: [{ nom: "Farine T80", quantite: 1000, unite: "g" }, { nom: "Eau", quantite: 760, unite: "g" }],
  etapes: [{ texte: "Ajouter @[Eau|1/2], autolyse 1 h" }],
} })
ok(corr.status === 200 && corr.data.version === v2 && corr.data.numero === 2, "correction : même version, numéro 2 inchangé")
recette = (await api("GET", `/api/collections/recettes/records/${recetteId}?expand=version_courante`, { token: T })).data
ok(recette.nom === "Pain de campagne corrigé" && recette.version_courante === v2, "correction : nom changé, version en vigueur inchangée")
ok(recette.expand.version_courante.ingredients[1].quantite === 760 && recette.expand.version_courante.corrigee_le !== "", "correction : contenu remplacé, date de correction renseignée")
ok((await api("GET", `/api/collections/versions/records?filter=${encodeURIComponent(`recette="${recetteId}"`)}`, { token: T })).data.totalItems === 2, "correction : pas de nouvelle version")
ok((await api("POST", `/api/painrd/recettes/inconnue12345/corriger`, { token: T, body: { nom: "X" } })).status === 404, "correction d'une recette inconnue : 404")

ok((await api("DELETE", `/api/collections/recettes/records/${recetteId}`, { token: T })).status === 204, "supprimer la recette")
for (const c of ["versions", "essais", "fournees"]) {
  const n = (await api("GET", `/api/collections/${c}/records`, { token: T })).data.totalItems
  ok(n === 0, `suppression en cascade : ${c} vide (${n})`)
}

console.log(echecs === 0 ? "\nTous les tests passent." : `\n${echecs} échec(s).`)
process.exit(echecs ? 1 : 0)
