/// <reference path="../pb_data/types.d.ts" />

// Routes et hooks du livret. La logique est dans metier.js.

routerAdd("POST", "/api/painrd/recettes", (e) => {
  return require(`${__hooks}/metier.js`).creerRecette(e)
}, $apis.requireAuth())

routerAdd("POST", "/api/painrd/recettes/{id}/corriger", (e) => {
  return require(`${__hooks}/metier.js`).corrigerRecette(e)
}, $apis.requireAuth())

routerAdd("POST", "/api/painrd/essais/{id}/valider", (e) => {
  return require(`${__hooks}/metier.js`).validerEssai(e)
}, $apis.requireAuth())

routerAdd("POST", "/api/painrd/essais/{id}/refuser", (e) => {
  return require(`${__hooks}/metier.js`).refuserEssai(e)
}, $apis.requireAuth())

onRecordCreateRequest((e) => {
  require(`${__hooks}/metier.js`).avantCreationEssai(e)
  e.next()
}, "essais")

onRecordUpdateRequest((e) => {
  require(`${__hooks}/metier.js`).avantModificationEssai(e)
  e.next()
}, "essais")

onRecordCreateRequest((e) => {
  require(`${__hooks}/metier.js`).avantCreationFournee(e)
  e.next()
}, "fournees")
