# 🏥 RdivExport

**Gestion de réquisitions pharmaceutiques** — Application web mobile-first pour la gestion des demandes de produits pharmaceutiques entre les pharmacies et le dépôt central de distribution.

---

## 📋 Fonctionnalités

### Pour les pharmaciens (`pharmacy_user`)
- 📊 **Tableau de bord** : statistiques en temps réel (en attente, livrées, articles)
- ✏️ **Création de réquisitions** : recherche de produits avec autocomplétion, définition des quantités
- 📄 **Détail des réquisitions** : suivi complet du statut, actions contextuelles
- 📜 **Historique** : filtrage par statut, consultation de toutes les réquisitions passées
- 💬 **Envoi via WhatsApp** : génération automatique du message formaté et ouverture de WhatsApp
- 👤 **Profil utilisateur** : informations personnelles et déconnexion

### Pour le réquisitionniste principal (`main_requisitionist`)
- 📈 **Tableau de bord admin** : vue d'ensemble de toutes les réquisitions avec filtres avancés (pharmacie, statut, dates)
- 📦 **Consolidation** : vue agrégée par produit à travers toutes les pharmacies
- 🚚 **Bordereaux de livraison** : cochage des articles, saisie des quantités livrées, validation
- ✅ **Validation et suivi** : changement de statut des réquisitions

### Fonctionnalités transversales
- 🔐 **Authentification sécurisée** via Supabase Auth
- 📱 **PWA** : installation sur l'écran d'accueil, fonctionnement hors-ligne
- 🎨 **Interface mobile-first** : optimisée pour les smartphones avec navigation par barre inférieure
- 🔍 **Recherche floue** des produits (trigram/pg_trgm)
- 📝 **Journal d'audit** : traçabilité complète des actions

---

## 🛠️ Stack technique

| Technologie | Usage |
|---|---|
| **React 19** | Framework frontend |
| **TypeScript 5** | Typage statique |
| **Vite 6** | Build tool (dev & production) |
| **Tailwind CSS 4** | Styling utility-first |
| **React Router v7** | Routage SPA |
| **Supabase** | Authentification + Base de données PostgreSQL |
| **PWA** | Service Worker + Manifest |

---

## 📋 Prérequis

- **Node.js** 18+ (recommandé : 20+)
- **npm** 9+ (ou pnpm/yarn)
- **Compte Supabase** ([supabase.com](https://supabase.com))
- **Python 3.8+** avec `openpyxl` (uniquement pour l'import des produits)

---

## 🚀 Installation

### 1. Cloner le dépôt

```bash
git clone <url-du-dépôt>
cd rdivexport
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer les variables d'environnement

Créer un fichier `.env` à la racine du projet :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-clef-anon-public
```

> Récupérez ces valeurs dans **Supabase Dashboard > Settings > API**.

---

## 🗄️ Configuration Supabase

### 1. Créer le projet

1. Connectez-vous à [Supabase Dashboard](https://app.supabase.com)
2. Créez un nouveau projet
3. Notez l'URL du projet et la clef `anon` publique

### 2. Exécuter le schéma de base de données

1. Ouvrez **SQL Editor** dans le Dashboard Supabase
2. Copiez le contenu de `supabase/schema.sql`
3. Collez-le dans l'éditeur et cliquez sur **Run**
4. Vérifiez que toutes les tables, indexes, triggers et politiques RLS sont créés

### 3. Importer les produits

1. Assurez-vous d'avoir Python et openpyxl installés :
   ```bash
   pip install openpyxl
   ```
2. Exécutez le script d'import :
   ```bash
   python supabase/seed-products.py "/chemin/vers/liste de produit.xlsx"
   ```
3. Ouvrez le fichier généré `supabase/seed-products.sql`
4. Copiez son contenu dans le **SQL Editor** de Supabase et exécutez-le

> **Note** : Par défaut, le script cherche le fichier à `/home/z/my-project/upload/liste de produit.xlsx`.

### 4. Créer les utilisateurs

Dans **Supabase Dashboard > Authentication > Users** :

#### Utilisateur pharmacien (pharmacy_user)
1. Cliquez **Add user > Create new user**
2. Entrez email et mot de passe
3. Sous **User metadata**, ajoutez :
   ```json
   {
     "full_name": "Jean Dupont",
     "role": "pharmacy_user"
   }
   ```
4. Après création, allez dans **Table Editor > profiles**
5. Mettez à jour le profil avec le `pharmacy_id` correspondant

#### Utilisateur réquisitionniste (main_requisitionist)
1. Même procédure avec le rôle `main_requisitionist` dans les métadonnées
2. Laissez `pharmacy_id` à `NULL`

---

## 🔑 Variables d'environnement

| Variable | Description | Exemple |
|---|---|---|
| `VITE_SUPABASE_URL` | URL de votre projet Supabase | `https://abc123.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Clef publique anon | `eyJhbGciOiJI...` |

---

## 💻 Développement

```bash
# Lancer le serveur de développement
npm run dev

# Ouvrir http://localhost:5173
```

---

## 🏗️ Build production

```bash
# Créer le build optimisé
npm run build

# Prévisualiser le build localement
npm run preview
```

---

## 🌐 Déploiement sur Cloudflare Pages

### Configuration recommandée

| Paramètre | Valeur |
|---|---|
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Node.js version** | `20` |
| **Framework preset** | `None` (Vite auto-détecté) |

### Variables d'environnement

Dans **Cloudflare Pages > Settings > Environment variables**, ajoutez :

```
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-clef-anon
```

### Étapes

1. Connectez votre dépôt GitHub/GitLab à Cloudflare Pages
2. Configurez les paramètres ci-dessus
3. Déployez automatiquement à chaque push sur `main`

> **Note PWA** : Le service worker (`sw.js`) est dans le dossier `public/` et sera copié tel quel dans `dist/` lors du build.

---

## 📁 Structure du projet

```
rdivexport/
├── public/
│   ├── manifest.json          # Manifest PWA
│   ├── sw.js                  # Service Worker (PWA)
│   ├── favicon.svg             # Icône du site
│   └── icons/                 # Icônes PWA (192x192, 512x512)
├── src/
│   ├── main.tsx               # Point d'entrée React
│   ├── App.tsx                # Composant racine
│   ├── index.css              # Styles globaux (Tailwind)
│   ├── routes/
│   │   └── AppRouter.tsx      # Configuration du routeur
│   ├── components/
│   │   ├── Layout.tsx          # Layout principal (header + nav)
│   │   ├── ProtectedRoute.tsx  # Guard d'authentification
│   │   ├── LoadingSpinner.tsx  # Spinner de chargement
│   │   ├── EmptyState.tsx      # État vide
│   │   ├── BackButton.tsx      # Bouton retour
│   │   ├── StatusBadge.tsx     # Badge de statut
│   │   ├── ConfirmDialog.tsx   # Dialogue de confirmation
│   │   ├── SearchBar.tsx       # Barre de recherche
│   │   ├── RequisitionCard.tsx  # Carte réquisition
│   │   └── RequisitionItemRow.tsx # Ligne article réquisition
│   ├── pages/
│   │   ├── LoginPage.tsx              # Page de connexion
│   │   ├── PharmacyDashboard.tsx      # Dashboard pharmacien
│   │   ├── CreateRequisitionPage.tsx  # Création réquisition
│   │   ├── RequisitionDetailPage.tsx   # Détail réquisition
│   │   ├── RequisitionHistoryPage.tsx # Historique
│   │   ├── ProfilePage.tsx            # Profil utilisateur
│   │   ├── AdminDashboard.tsx          # Dashboard admin
│   │   ├── ConsolidationPage.tsx       # Consolidation
│   │   └── DeliveryChecklistPage.tsx   # Bordereau livraison
│   ├── hooks/
│   │   ├── useAuth.ts          # Context auth + hook
│   │   ├── useRequisitions.ts  # Hook réquisitions
│   │   ├── useProducts.ts      # Hook produits
│   │   ├── useDeliveryChecklist.tsx # Hook bordereau
│   │   └── useVoiceSearch.ts   # Recherche vocale
│   ├── services/
│   │   ├── auth.service.ts      # Service authentification
│   │   ├── requisitions.service.ts # Service réquisitions
│   │   ├── products.service.ts  # Service produits
│   │   ├── pharmacies.service.ts # Service pharmacies
│   │   └── audit.service.ts     # Service audit
│   ├── lib/
│   │   └── supabase.ts          # Client Supabase
│   ├── types/
│   │   ├── index.ts             # Types métier
│   │   └── database.ts           # Types Supabase générés
│   └── utils/
│       ├── constants.ts         # Constantes app
│       ├── formatters.ts        # Fonctions de formatage
│       └── sw-register.ts       # Enregistrement SW
├── supabase/
│   ├── schema.sql              # Schéma complet de la BDD
│   ├── seed-products.py        # Script import produits (Excel → SQL)
│   └── seed-products.sql       # Données produits (généré)
├── index.html                  # HTML entry point
├── vite.config.ts              # Configuration Vite
├── tsconfig.json               # Configuration TypeScript
├── package.json                # Dépendances npm
├── .env                        # Variables d'environnement (local)
└── README.md                   # Ce fichier
```

---

## 👥 Gestion des pharmacies et utilisateurs

### Ajouter une pharmacie

```sql
INSERT INTO public.pharmacies (name, code, address, phone, whatsapp_number, email)
VALUES ('Nouvelle Pharmacie', 'NP', 'Adresse', '+24399XXXXXX', '+24381XXXXXX', 'email@exemple.com');
```

### Associer un utilisateur à une pharmacie

```sql
UPDATE public.profiles
SET pharmacy_id = 'uuid-de-la-pharmacie'
WHERE id = 'uuid-de-l-utilisateur';
```

### Changer le rôle d'un utilisateur

```sql
UPDATE public.profiles
SET role = 'main_requisitionist'
WHERE id = 'uuid-de-l-utilisateur';
```

---

## 📱 Configuration WhatsApp

Pour activer l'envoi de réquisitions via WhatsApp :

1. **Sur chaque pharmacie**, assurez-vous que le champ `whatsapp_number` est renseigné
2. Le format doit être le numéro international complet : `+243XXXXXXXXX`
3. Le lien WhatsApp est généré automatiquement au format : `https://wa.me/243XXXXXXXXX?text=...`

Le numéro WhatsApp peut être configuré dans la table `pharmacies` ou directement dans le profil du réquisitionniste.

---

## 📄 Licence

Ce projet est propriétaire. Tous droits réservés.

---

## 🤝 Support

Pour toute question ou problème, contactez l'administrateur du système.
