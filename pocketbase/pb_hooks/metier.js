/// <reference path="../pb_data/types.d.ts" />

// Règles métier du livret, appelées depuis painrd.pb.js.
// (Les handlers PocketBase s'exécutent chacun dans leur propre contexte :
// le code partagé doit vivre dans un module chargé par require.)

function trouver(app, collection, id, message) {
  try {
    return app.findRecordById(collection, id)
  } catch (err) {
    throw new NotFoundError(message)
  }
}

function lireJson(record, champ) {
  const brut = toString(record.get(champ))
  if (!brut || brut === "null") return null
  return JSON.parse(brut)
}

// Vérifie une liste d'objets ayant chacun un texte non vide sous `cle`.
function verifierListe(valeur, cle, libelle) {
  if (typeof valeur === "string") {
    try {
      valeur = JSON.parse(valeur)
    } catch (err) {
      throw new BadRequestError(libelle + " : JSON invalide.")
    }
  }
  if (!Array.isArray(valeur)) {
    throw new BadRequestError(libelle + " : une liste est attendue.")
  }
  valeur.forEach((element, i) => {
    if (!element || typeof element !== "object" || typeof element[cle] !== "string" || !element[cle].trim()) {
      throw new BadRequestError(libelle + " n° " + (i + 1) + " : « " + cle + " » est obligatoire.")
    }
  })
  return valeur
}

const verifierIngredients = (valeur) => verifierListe(valeur, "nom", "Ingrédient")
const verifierEtapes = (valeur) => verifierListe(valeur, "texte", "Étape")

// POST /api/painrd/recettes { nom, ingredients, etapes }
// Crée la recette et sa version 1 d'un seul tenant.
function creerRecette(e) {
  const body = e.requestInfo().body
  const nom = typeof body.nom === "string" ? body.nom.trim() : ""
  if (!nom) throw new BadRequestError("Le nom de la recette est obligatoire.")
  const ingredients = verifierIngredients(body.ingredients || [])
  const etapes = verifierEtapes(body.etapes || [])

  let resultat = null
  e.app.runInTransaction((tx) => {
    const recette = new Record(tx.findCollectionByNameOrId("recettes"))
    recette.set("nom", nom)
    tx.save(recette)

    const version = new Record(tx.findCollectionByNameOrId("versions"))
    version.set("recette", recette.id)
    version.set("numero", 1)
    version.set("ingredients", ingredients)
    version.set("etapes", etapes)
    tx.save(version)

    recette.set("version_courante", version.id)
    tx.save(recette)

    resultat = { recette: recette.id, version: version.id }
  })
  return e.json(201, resultat)
}

// POST /api/painrd/recettes/{id}/corriger { nom, ingredients, etapes }
// Corrige la version en vigueur sur place (coquille, oubli) : pas de nouvelle version,
// le numéro ne change pas ; la date de correction est gardée.
function corrigerRecette(e) {
  const id = e.request.pathValue("id")
  const body = e.requestInfo().body
  const nom = typeof body.nom === "string" ? body.nom.trim() : ""
  if (!nom) throw new BadRequestError("Le nom de la recette est obligatoire.")
  const ingredients = verifierIngredients(body.ingredients || [])
  const etapes = verifierEtapes(body.etapes || [])

  let resultat = null
  e.app.runInTransaction((tx) => {
    const recette = trouver(tx, "recettes", id, "Recette introuvable.")
    const version = trouver(tx, "versions", recette.getString("version_courante"), "Version en vigueur introuvable.")

    recette.set("nom", nom)
    tx.save(recette)

    version.set("ingredients", ingredients)
    version.set("etapes", etapes)
    version.set("corrigee_le", new DateTime())
    tx.save(version)

    resultat = { version: version.id, numero: version.getInt("numero") }
  })
  return e.json(200, resultat)
}

// POST /api/painrd/essais/{id}/valider
// L'essai devient la version suivante de la recette.
function validerEssai(e) {
  const id = e.request.pathValue("id")
  let resultat = null
  e.app.runInTransaction((tx) => {
    const essai = trouver(tx, "essais", id, "Essai introuvable.")
    if (essai.getString("statut") !== "en_cours") {
      throw new BadRequestError("Cet essai a déjà été tranché.")
    }
    const recette = trouver(tx, "recettes", essai.getString("recette"), "Recette introuvable.")
    const courante = trouver(tx, "versions", recette.getString("version_courante"), "Version en vigueur introuvable.")
    if (courante.id !== essai.getString("version_base")) {
      throw new BadRequestError(
        "La recette est passée en version " + courante.getInt("numero")
        + " depuis le début de cet essai : reprends-le sur la nouvelle version."
      )
    }

    const numero = courante.getInt("numero") + 1
    const version = new Record(tx.findCollectionByNameOrId("versions"))
    version.set("recette", recette.id)
    version.set("numero", numero)
    version.set("ingredients", lireJson(essai, "ingredients"))
    version.set("etapes", lireJson(essai, "etapes"))
    tx.save(version)

    essai.set("statut", "valide")
    essai.set("version_creee", version.id)
    essai.set("date_decision", new DateTime())
    tx.save(essai)

    recette.set("version_courante", version.id)
    tx.save(recette)

    resultat = { version: version.id, numero: numero }
  })
  return e.json(200, resultat)
}

// POST /api/painrd/essais/{id}/refuser { raison }
// La version en vigueur ne change pas ; l'essai reste dans l'historique.
function refuserEssai(e) {
  const id = e.request.pathValue("id")
  const body = e.requestInfo().body
  const raison = typeof body.raison === "string" ? body.raison.trim() : ""
  if (!raison) throw new BadRequestError("Indique pourquoi tu refuses cet essai.")

  e.app.runInTransaction((tx) => {
    const essai = trouver(tx, "essais", id, "Essai introuvable.")
    if (essai.getString("statut") !== "en_cours") {
      throw new BadRequestError("Cet essai a déjà été tranché.")
    }
    essai.set("statut", "refuse")
    essai.set("raison_refus", raison)
    essai.set("date_decision", new DateTime())
    tx.save(essai)
  })
  return e.json(200, { statut: "refuse" })
}

// Création d'un essai par l'API générique : il part toujours de la version
// en vigueur, démarre « en cours », et reprend le contenu de sa version de
// départ si on ne lui en donne pas.
function avantCreationEssai(e) {
  const essai = e.record
  const recetteId = essai.getString("recette")
  const baseId = essai.getString("version_base")

  const recette = trouver(e.app, "recettes", recetteId, "Recette introuvable.")
  const base = trouver(e.app, "versions", baseId, "Version de départ introuvable.")
  if (base.getString("recette") !== recetteId || recette.getString("version_courante") !== baseId) {
    throw new BadRequestError("Un essai doit partir de la version en vigueur de la recette.")
  }

  essai.set("statut", "en_cours")
  essai.set("raison_refus", "")
  essai.set("date_decision", "")
  essai.set("version_creee", "")
  essai.set("numero", e.app.countRecords("essais", $dbx.hashExp({ recette: recetteId })) + 1)

  const ingredients = lireJson(essai, "ingredients")
  essai.set("ingredients", ingredients === null ? lireJson(base, "ingredients") : verifierIngredients(ingredients))
  const etapes = lireJson(essai, "etapes")
  essai.set("etapes", etapes === null ? lireJson(base, "etapes") : verifierEtapes(etapes))
}

// Retouche d'un essai en cours : le contenu reste bien formé.
function avantModificationEssai(e) {
  const ingredients = lireJson(e.record, "ingredients")
  if (ingredients !== null) verifierIngredients(ingredients)
  const etapes = lireJson(e.record, "etapes")
  if (etapes !== null) verifierEtapes(etapes)
}

// Une fournée suit soit une version, soit un essai en cours, de la même recette.
function avantCreationFournee(e) {
  const fournee = e.record
  const recetteId = fournee.getString("recette")
  const versionId = fournee.getString("version")
  const essaiId = fournee.getString("essai")

  if ((versionId === "") === (essaiId === "")) {
    throw new BadRequestError("Une fournée suit soit une version, soit un essai (l'un des deux, pas les deux).")
  }
  if (versionId) {
    const version = trouver(e.app, "versions", versionId, "Version introuvable.")
    if (version.getString("recette") !== recetteId) {
      throw new BadRequestError("Cette version n'appartient pas à la recette.")
    }
  } else {
    const essai = trouver(e.app, "essais", essaiId, "Essai introuvable.")
    if (essai.getString("recette") !== recetteId) {
      throw new BadRequestError("Cet essai n'appartient pas à la recette.")
    }
    if (essai.getString("statut") !== "en_cours") {
      throw new BadRequestError("Cet essai est tranché : on ne peut plus lui ajouter de fournée.")
    }
  }
}

module.exports = {
  creerRecette,
  corrigerRecette,
  validerEssai,
  refuserEssai,
  avantCreationEssai,
  avantModificationEssai,
  avantCreationFournee,
}
