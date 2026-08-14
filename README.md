# Marelle à trois pions — PWA

Jeu de la marelle à trois pions (*Tapatan* / *Achi* / *Three Men's Morris* / jeu du char) en
React, jouable :
- **en local**, à deux sur le même écran ;
- **en ligne**, via un salon Firebase (compte joueur, avatar, chat texte en temps réel) ;
- installable comme **application (PWA)** sur mobile et desktop.

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
  game/engine.js         logique pure du jeu (pose, déplacement, victoire, blocage)
  components/            Board, StatusBar, Chat, Avatar, RequireAuth
  hooks/useAuth.jsx       contexte d'authentification (utilisateur + profil Firestore)
  firebase/config.js      initialisation Firebase (app, Firestore, Auth)
  firebase/auth.js        inscription, connexion, déconnexion, profil utilisateur
  firebase/cloudinary.js  upload d'avatar (upload non signé) + miniatures
  firebase/rooms.js       création/jonction de salon, sync de partie, chat (Firestore)
  pages/
    Home.jsx              choix du mode + état de connexion
    Local.jsx              mode local (pass-and-play)
    Login.jsx / Signup.jsx création de compte / connexion
    Profile.jsx            pseudo + avatar (upload Cloudinary)
    OnlineLobby.jsx         créer / rejoindre un salon (compte requis)
    OnlineRoom.jsx          salon en ligne : plateau synchronisé + chat + avatars
firestore.rules            règles de sécurité à publier sur Firebase
```

### Comment fonctionne le mode en ligne

Chaque salon est un document Firestore (`rooms/{code}`) qui contient l'état complet de
la partie (plateau, tour, phase, vainqueur) et le pseudo/avatar de chaque joueur. Quand
un joueur joue un coup, on calcule le nouvel état localement avec `game/engine.js`, puis
on l'écrit dans Firestore : l'autre joueur le reçoit en temps réel via `onSnapshot`. Le
chat est une sous-collection (`rooms/{code}/messages`) avec le même principe. Il n'y a
pas de serveur de jeu à héberger : Firestore fait office de "source de vérité" partagée.

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

## À propos du Bluetooth

Le Web Bluetooth (utilisable depuis un navigateur) est conçu pour connecter un navigateur
à un *périphérique* Bluetooth (capteur, manette, etc.), pas pour faire discuter deux
navigateurs entre eux d'égal à égal. Un vrai mode "Bluetooth pur" entre deux téléphones,
sans passer par Internet, n'est donc pas réalisable proprement en PWA web standard.

Le mode vocal ci-dessus (WebRTC) fonctionne d'ailleurs très bien en Wi-Fi local, ce qui
couvre le cas d'usage "jouer à distance sans vraie connexion mobile" sans dépendre du
Bluetooth.

## Feuille de route

- [x] Moteur de jeu (pose, déplacement, victoire, blocage)
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

Le projet est une **SPA** (React Router gère les routes côté client, ex. `/online/ABCDE`) :
sans configuration, Vercel renvoie une 404 sur ces routes car aucun fichier réel n'existe
à ce chemin. Le fichier `vercel.json` à la racine du projet corrige ça en renvoyant
toujours `index.html`, quelle que soit l'URL demandée — il est déjà inclus, rien à faire
de plus. En important le projet sur [vercel.com](https://vercel.com), choisis le preset
**Vite** ; le build (`npm run build`) et le dossier de sortie (`dist`) sont détectés
automatiquement.

N'oublie pas de renseigner tes variables d'environnement (`VITE_FIREBASE_...`,
`VITE_CLOUDINARY_...`) dans **Project Settings > Environment Variables** sur Vercel — le
fichier `.env` local n'est jamais déployé.
