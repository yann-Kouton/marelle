# Jeux de plateau — PWA

Un hub de jeux de stratégie traditionnels (sans hasard) en React, jouables :
- **en local**, à deux sur le même écran ;
- **en ligne**, via un salon Firebase (compte joueur, avatar, chat texte et vocal en
  temps réel) ;
- installable comme **application (PWA)** sur mobile et desktop.

Jeux disponibles aujourd'hui :
- **Carreau chinois** (*Tapatan* / *Achi* / *Three Men's Morris* / jeu du char)
- **Awalé** (*Awari* / *Awélé* / Mancala à 2×6 trous)

L'app est conçue pour qu'ajouter un nouveau jeu n'exige de toucher qu'un seul dossier
(voir [Ajouter un nouveau jeu](#ajouter-un-nouveau-jeu)) — tout le reste (comptes,
salons, chat, vocal, PWA) est déjà générique et partagé entre les jeux.

## Démarrer en local

```bash
npm install
cp .env.example .env   # puis renseigne tes clés Firebase et Cloudinary (voir plus bas)
npm run dev
```

Sans clés Firebase renseignées, le mode "Jouer en local" fonctionne quand même — seul le
mode en ligne (qui nécessite un compte) est désactivé.

## Configurer Firebase (comptes + salons)

1. Dans la [Console Firebase](https://console.firebase.google.com), ouvre ton projet.
2. **Authentication > Sign-in method** → active le fournisseur **E-mail/Mot de passe**.
   C'est ce qui permet aux joueurs de créer un compte (pseudo + avatar visibles par
   l'adversaire).
3. **Firestore Database** → crée une base (mode production).
4. Colle le contenu de `firestore.rules` (à la racine du projet) dans
   **Firestore Database > Règles**, puis publie. Ces règles limitent l'accès à un salon
   à ses deux joueurs, empêchent de lister tous les salons, et ne laissent chacun
   modifier que son propre profil (`users/{uid}`).
5. **Paramètres du projet > Général > Vos applications** → crée une appli Web, copie les
   clés dans `.env` (préfixe `VITE_FIREBASE_...`).

## Configurer Cloudinary (avatars)

1. Crée un compte sur [cloudinary.com](https://cloudinary.com) (le plan gratuit suffit).
2. Note ton **Cloud name** (visible sur le tableau de bord) → `VITE_CLOUDINARY_CLOUD_NAME`.
3. **Settings > Upload > Upload presets** → crée un nouveau preset, mode **Unsigned**
   (obligatoire : l'upload se fait depuis le navigateur, sans clé secrète exposée).
   Note son nom → `VITE_CLOUDINARY_UPLOAD_PRESET`.
4. (Optionnel) Dans ce preset, tu peux limiter le dossier, la taille max, ou activer la
   modération automatique des images.

Sans ces deux variables, la page de profil affiche simplement "Avatar indisponible" et le
reste de l'app fonctionne normalement (avatar de secours = initiales du pseudo).

## Structure du projet

```
src/
  games/
    registry.js           liste des jeux disponibles dans le hub
    marelle/
      engine.js            logique pure (pose, déplacement, victoire, blocage)
      Board.jsx             plateau SVG
      StatusBar.jsx          bandeau d'état (tour, victoire)
      index.js               descripteur du jeu (voir plus bas)
    awale/
      engine.js            logique pure (semis, capture, règle de la famine)
      Board.jsx             plateau (2×6 trous + scores)
      StatusBar.jsx          bandeau d'état
      index.js               descripteur du jeu
  components/            Chat, Avatar, VoiceCallBar, BackLink, RequireAuth
  hooks/
    useAuth.jsx            contexte d'authentification (utilisateur + profil Firestore)
    useVoiceCall.js        appel vocal WebRTC (générique, indépendant du jeu)
  firebase/
    config.js              initialisation Firebase (app, Firestore, Auth)
    auth.js                 inscription, connexion, déconnexion, profil utilisateur
    cloudinary.js           upload d'avatar (upload non signé) + miniatures
    rooms.js                création/jonction de salon, sync de partie, chat — générique,
                             paramétré par `gameId`
  pages/
    Home.jsx                hub : liste des jeux (à partir du registre)
    GameHome.jsx             menu d'un jeu : local / en ligne
    GameLocal.jsx            mode local (pass-and-play), générique
    GameOnlineLobby.jsx      créer / rejoindre un salon, générique
    GameOnlineRoom.jsx       salon en ligne : plateau synchronisé + chat + vocal, générique
    Login.jsx / Signup.jsx  création de compte / connexion
    Profile.jsx              pseudo + avatar (upload Cloudinary)
firestore.rules            règles de sécurité à publier sur Firebase
```

### Comment fonctionne le mode en ligne

Chaque salon est un document Firestore (`rooms/{code}`) avec un champ `gameId`
(`"marelle"` ou `"awale"`) et l'état de partie complet (spécifique au jeu). Quand un
joueur joue un coup, le nouvel état est calculé localement avec le moteur du jeu
concerné, puis écrit dans Firestore : l'autre joueur le reçoit en temps réel via
`onSnapshot`. Le chat (`rooms/{code}/messages`) et la signalisation vocale
(`rooms/{code}/voice/call`) sont entièrement indépendants du jeu — aucune modification
nécessaire pour ajouter un nouveau jeu. Il n'y a pas de serveur de jeu à héberger :
Firestore fait office de "source de vérité" partagée.

### Comptes et avatars

Les comptes utilisent Firebase Auth (e-mail + mot de passe). Chaque compte a un document
`users/{uid}` dans Firestore avec `displayName` et `avatarUrl`. L'avatar est envoyé
directement du navigateur vers Cloudinary (upload non signé, pas de backend nécessaire),
puis l'URL retournée est stockée dans Firestore et affichée partout (lobby, salon, chat)
via le composant `Avatar`, avec un recadrage carré automatique côté Cloudinary.

### Vocal (WebRTC)

L'appel vocal est un canal **WebRTC pair-à-pair** : l'audio circule directement entre les
deux navigateurs, pas via Firebase. Firestore ne sert qu'à la "poignée de main" initiale
(échange de l'offer/answer SDP et des candidats ICE), dans `rooms/{code}/voice/call` — un
document éphémère supprimé automatiquement à la fin de l'appel.

- P1 est toujours l'appelant, P2 toujours le répondeur (évite toute négociation sur "qui
  commence").
- Seuls des serveurs **STUN publics** sont utilisés (`stun.l.google.com`). Ça fonctionne
  sur la grande majorité des connexions domestiques, mais un appel peut échouer derrière
  un NAT symétrique strict ou certains réseaux d'entreprise. Si ça arrive souvent chez tes
  utilisateurs, il faut ajouter un serveur **TURN** (ex. [metered.ca](https://metered.ca),
  Twilio, ou ton propre coturn) dans `ICE_SERVERS` (`src/hooks/useVoiceCall.js`).
- Le micro n'est demandé qu'au clic sur "Appeler"/"Répondre" — jamais automatiquement.

## Ajouter un nouveau jeu

Toute la logique commune (comptes, salons, chat, vocal, PWA) est déjà générique. Pour
ajouter un jeu, il suffit de créer `src/games/<id>/` avec quatre fichiers :

1. **`engine.js`** — logique pure, sans aucun import React/Firebase :
   - `createInitialState(firstPlayer)` → l'état initial (doit inclure `turn` et
     `winner: null | "P1" | "P2" | "draw"`)
   - une fonction de coup, ex. `applyMove(state, payload)` → nouvel état (ou le même
     état si le coup est invalide — c'est ce qui permet à l'UI de savoir si le coup a
     été accepté)
   - `getPlayableCells(state)` → les coups actuellement valides (pour la mise en
     surbrillance)
2. **`Board.jsx`** — reçoit `{ state, playable, onCellClick, disabled }` et affiche le
   plateau. Libre à toi d'interpréter `state` comme tu veux (c'est l'objet retourné par
   ton moteur).
3. **`StatusBar.jsx`** — reçoit `{ state, names, youAre }` et affiche le tour en cours /
   le résultat.
4. **`index.js`** — le descripteur qui assemble le tout :

   ```js
   import * as engine from "./engine";
   import Board from "./Board";
   import StatusBar from "./StatusBar";

   export const monJeu = {
     id: "mon-jeu",
     label: "Mon Jeu",
     aka: "Autres noms",
     shortDescription: "Une phrase.",
     instructions: "Règles en une ou deux phrases, affichées en mode local.",
     createInitialState: engine.createInitialState,
     applyMove: engine.applyMove,
     getPlayableCells: engine.getPlayableCells,
     BoardComponent: Board,
     StatusBarComponent: StatusBar,
   };
   ```

Puis référence-le dans `src/games/registry.js` (`GAMES` et son icône dans
`ICONS` de `src/pages/Home.jsx`), et ajoute son `id` à la liste autorisée dans
`firestore.rules` (`gameId in [...]`). C'est tout — le hub, le mode local, les salons en
ligne, le chat et le vocal fonctionnent immédiatement pour le nouveau jeu.

## À propos du Bluetooth

Le Web Bluetooth (utilisable depuis un navigateur) est conçu pour connecter un navigateur
à un *périphérique* Bluetooth (capteur, manette, etc.), pas pour faire discuter deux
navigateurs entre eux d'égal à égal. Un vrai mode "Bluetooth pur" entre deux téléphones,
sans passer par Internet, n'est donc pas réalisable proprement en PWA web standard.

Le mode vocal ci-dessus (WebRTC) fonctionne d'ailleurs très bien en Wi-Fi local, ce qui
couvre le cas d'usage "jouer à distance sans vraie connexion mobile" sans dépendre du
Bluetooth.

## Feuille de route

- [x] Moteur de jeu Carreau chinois (pose, déplacement, victoire, blocage)
- [x] Moteur de jeu Awalé (semis, capture, règle de la famine)
- [x] Hub multi-jeux (architecture générique, extensible)
- [x] Mode local (pass-and-play)
- [x] Mode en ligne : salons Firebase, sync de partie, chat texte, revanche
- [x] Comptes joueurs (e-mail/mot de passe) + avatars Cloudinary
- [x] Vocal en temps réel (WebRTC, signalé via Firebase)
- [x] PWA installable (manifest + service worker)
- [ ] Serveur TURN pour fiabiliser le vocal derrière NAT strict
- [ ] Mode "réseau local / QR code" en remplacement du Bluetooth pur
- [ ] Historique des parties / classement

## Build & déploiement

```bash
npm run build       # génère dist/
npm run preview     # prévisualiser le build
```

Le projet peut être déployé sur **Firebase Hosting** (cohérent avec Firestore) :

```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # dossier public = dist, SPA = oui
npm run build
firebase deploy
```

### Déployer sur Vercel

Le projet est une **SPA** (React Router gère les routes côté client, ex.
`/games/awale/online/ABCDE`) : sans configuration, Vercel renvoie une 404 sur ces routes
car aucun fichier réel n'existe à ce chemin. Le fichier `vercel.json` à la racine du
projet corrige ça en renvoyant toujours `index.html`, quelle que soit l'URL demandée — il
est déjà inclus, rien à faire de plus. En important le projet sur
[vercel.com](https://vercel.com), choisis le preset **Vite** ; le build
(`npm run build`) et le dossier de sortie (`dist`) sont détectés automatiquement.

N'oublie pas de renseigner tes variables d'environnement (`VITE_FIREBASE_...`,
`VITE_CLOUDINARY_...`) dans **Project Settings > Environment Variables** sur Vercel — le
fichier `.env` local n'est jamais déployé.

### Cadres de saison : fonction serverless `api/season-rollover.js`

La distribution des cadres Diamant/Or/Bronze en fin de saison ne se fait plus en écriture
Firestore directe depuis le client (n'importe qui pouvait sinon se l'auto-attribuer), mais
via une fonction serverless Vercel qui utilise le **Firebase Admin SDK** — la seule voie
autorisée à écrire le champ `frames` (voir `firestore.rules`). Elle est appelée :
- à la demande, par le client au chargement du classement (comportement inchangé) ;
- une fois par jour via le **Vercel Cron** défini dans `vercel.json` (gratuit sur le plan
  Hobby), pour se rapprocher du changement de saison à minuit sans dépendre d'une visite.

Pour que ça marche, il faut une clé de compte de service Firebase :

1. Console Firebase > ⚙️ Paramètres du projet > **Comptes de service** > *Générer une
   nouvelle clé privée* (télécharge un fichier `.json`).
2. Encode-le en base64 :
   ```bash
   base64 -i chemin/vers/serviceAccountKey.json | tr -d '\n'
   ```
3. Colle le résultat dans **Project Settings > Environment Variables** sur Vercel, sous le
   nom `FIREBASE_SERVICE_ACCOUNT` (ne jamais préfixer par `VITE_`, sinon Vite l'embarque
   côté client — cette variable ne doit exister que côté serveur).

⚠️ Ne commite jamais le fichier `.json` de la clé de service dans le dépôt.
