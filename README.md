# PainR-A

## Ce que ça fait

Un livret de recettes qu'on fait évoluer en testant.

- **Recettes versionnées** : chaque recette a une version en vigueur (v1, v2, v3…) avec ses ingrédients et ses étapes. Une version n'est jamais modifiée après coup.
- **Essais** : pour changer une recette, on propose un essai (par exemple « Eau 700 g → 750 g »). Il reste un essai tant qu'on le teste.
  - **Validé**, il devient la version suivante de la recette.
  - **Refusé**, la recette ne change pas et l'essai reste dans l'historique avec la raison du refus.
- **Fournées** : chaque fois qu'on fait la recette, ou qu'on teste un essai, on enregistre une fournée avec sa date, ses notes et ses photos.

L'application s'installe sur le téléphone comme une app (PWA). Les données et les photos restent sur ton serveur, et les photos ne sont visibles qu'une fois connecté.

## Installation

### Ce qu'il faut

- Un serveur Linux avec Docker et Docker Compose.
- Un nom de domaine géré par Cloudflare (offre gratuite), pour accéder au livret depuis l'extérieur sans ouvrir de port sur la box.

### 1. Créer le tunnel Cloudflare

1. Dans le tableau de bord Cloudflare, ouvre **Cloudflare One (Zero Trust) › Networks › Tunnels** et crée un tunnel de type **Cloudflared**.
2. Copie le **jeton** du tunnel. C'est la longue chaîne qui suit `--token` dans la commande proposée.
3. Ajoute une **route publique** (Public hostname) :
   - sous-domaine et domaine : par exemple `recettes.mondomaine.fr` ;
   - service : `HTTP`, URL : `painrd:8090`.

### 2. Lancer le livret sur le serveur

```bash
git clone https://github.com/mestileryan/PainR-A.git
cd PainR-A
cp .env.example .env        # puis colle le jeton du tunnel dans TUNNEL_TOKEN
docker compose up -d --build
```

### 3. Créer les comptes

Crée d'abord le compte d'administration de PocketBase :

```bash
docker compose exec painrd /pb/pocketbase superuser upsert ton@email.fr 'un-mot-de-passe-solide' --dir /pb/pb_data
```

Ensuite, ouvre `https://recettes.mondomaine.fr/_/`, connecte-toi avec ce compte, et crée ton compte utilisateur dans la collection **users**. C'est avec lui que tu te connecteras au livret. L'inscription publique est fermée.

### 4. Activer les sauvegardes

Dans l'administration (`/_/`), va dans **Settings › Backups** :

- active les sauvegardes automatiques (par exemple tous les jours) ;
- renseigne un stockage S3 externe (Cloudflare R2, Backblaze B2…), pour qu'une panne du serveur n'emporte pas les photos.

### 5. Installer l'app sur le téléphone

Ouvre `https://recettes.mondomaine.fr` sur le téléphone, puis choisis **Ajouter à l'écran d'accueil**.

### Mettre à jour

```bash
git pull
docker compose up -d --build
```

Les migrations de base de données s'appliquent toutes seules au démarrage.

### Développer en local

Il faut Node.js 24 et le binaire PocketBase 0.40.6 ([releases](https://github.com/pocketbase/pocketbase/releases/tag/v0.40.6)).

```bash
# Terminal 1 : PocketBase sur le port 8090
cd pocketbase
pocketbase serve --dir pb_data --migrationsDir pb_migrations --hooksDir pb_hooks

# Terminal 2 : l'interface, avec rechargement à chaud
cd web
npm install
npm run dev
```

Les tests de l'API (`pocketbase/tests/api.mjs`) se lancent sur une instance de test vide. Les instructions sont en tête du fichier.
