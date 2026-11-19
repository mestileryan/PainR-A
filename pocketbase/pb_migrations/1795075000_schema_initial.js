/// <reference path="../pb_data/types.d.ts" />

// Schéma initial du livret de recettes.
//
// recettes  : une recette et sa version en vigueur.
// versions  : contenu figé d'une recette (v1, v2, …). Jamais modifiée après création.
// essais    : modification proposée sur une version. Validé, il devient une nouvelle version.
// fournees  : une réalisation de la recette (ou d'un essai), avec notes et photos.
//
// Les transitions métier (création d'une recette, validation ou refus d'un essai)
// passent par les routes de pb_hooks/painrd.pb.js : les règles ci-dessous
// empêchent de les contourner par l'API générique.

migrate((app) => {
  const connecte = "@request.auth.id != ''"

  // Inscription publique fermée : les comptes sont créés depuis l'administration.
  const users = app.findCollectionByNameOrId("users")
  users.createRule = null
  app.save(users)

  const recettes = new Collection({
    type: "base",
    name: "recettes",
    listRule: connecte,
    viewRule: connecte,
    createRule: null,
    updateRule: connecte + " && @request.body.version_courante:isset = false",
    deleteRule: connecte,
    fields: [
      { name: "nom", type: "text", required: true, max: 200 },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
  })
  app.save(recettes)

  const versions = new Collection({
    type: "base",
    name: "versions",
    listRule: connecte,
    viewRule: connecte,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "recette", type: "relation", required: true, collectionId: recettes.id, maxSelect: 1, cascadeDelete: true },
      { name: "numero", type: "number", required: true, onlyInt: true, min: 1 },
      // [{ nom, quantite, unite }]
      { name: "ingredients", type: "json", maxSize: 200000 },
      // [{ texte }]
      { name: "etapes", type: "json", maxSize: 200000 },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_versions_recette_numero ON versions (recette, numero)"],
  })
  app.save(versions)

  recettes.fields.add(new Field({
    name: "version_courante",
    type: "relation",
    collectionId: versions.id,
    maxSelect: 1,
  }))
  app.save(recettes)

  const essais = new Collection({
    type: "base",
    name: "essais",
    listRule: connecte,
    viewRule: connecte,
    createRule: connecte,
    // Tant qu'il est en cours, on peut retoucher le contenu d'un essai,
    // mais pas son statut ni ce qui est rempli à la décision.
    updateRule: connecte + " && statut = 'en_cours'"
      + " && @request.body.statut:isset = false"
      + " && @request.body.recette:isset = false"
      + " && @request.body.version_base:isset = false"
      + " && @request.body.numero:isset = false"
      + " && @request.body.raison_refus:isset = false"
      + " && @request.body.date_decision:isset = false"
      + " && @request.body.version_creee:isset = false",
    deleteRule: connecte + " && statut = 'en_cours'",
    fields: [
      { name: "recette", type: "relation", required: true, collectionId: recettes.id, maxSelect: 1, cascadeDelete: true },
      { name: "version_base", type: "relation", required: true, collectionId: versions.id, maxSelect: 1 },
      { name: "numero", type: "number", onlyInt: true, min: 0 },
      { name: "titre", type: "text", required: true, max: 200 },
      { name: "objectif", type: "text", max: 2000 },
      { name: "ingredients", type: "json", maxSize: 200000 },
      { name: "etapes", type: "json", maxSize: 200000 },
      { name: "statut", type: "select", required: true, maxSelect: 1, values: ["en_cours", "valide", "refuse"] },
      { name: "raison_refus", type: "text", max: 2000 },
      { name: "date_decision", type: "date" },
      { name: "version_creee", type: "relation", collectionId: versions.id, maxSelect: 1 },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
  })
  app.save(essais)

  const fournees = new Collection({
    type: "base",
    name: "fournees",
    listRule: connecte,
    viewRule: connecte,
    createRule: connecte,
    updateRule: connecte
      + " && @request.body.recette:isset = false"
      + " && @request.body.version:isset = false"
      + " && @request.body.essai:isset = false",
    deleteRule: connecte,
    fields: [
      { name: "recette", type: "relation", required: true, collectionId: recettes.id, maxSelect: 1, cascadeDelete: true },
      // Exactement une des deux : la fournée suit une version, ou teste un essai.
      { name: "version", type: "relation", collectionId: versions.id, maxSelect: 1 },
      { name: "essai", type: "relation", collectionId: essais.id, maxSelect: 1, cascadeDelete: true },
      { name: "date", type: "date", required: true },
      { name: "notes", type: "text", max: 5000 },
      {
        name: "photos",
        type: "file",
        maxSelect: 30,
        maxSize: 15 * 1024 * 1024,
        mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
        thumbs: ["300x300", "800x0"],
        // Photos accessibles uniquement avec un jeton de fichier (utilisateur connecté).
        protected: true,
      },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
  })
  app.save(fournees)
}, (app) => {
  app.delete(app.findCollectionByNameOrId("fournees"))
  app.delete(app.findCollectionByNameOrId("essais"))

  // recettes et versions se référencent : on casse la relation circulaire d'abord.
  const recettes = app.findCollectionByNameOrId("recettes")
  recettes.fields.removeByName("version_courante")
  app.save(recettes)
  app.delete(app.findCollectionByNameOrId("versions"))
  app.delete(recettes)

  const users = app.findCollectionByNameOrId("users")
  users.createRule = ""
  app.save(users)
})
