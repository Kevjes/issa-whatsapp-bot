# 📋 SYNTHÈSE DES WORKFLOWS - ISSA TAKAFUL

## 🎯 Workflows Implémentés

### ✅ **2 Workflows Actifs**

---

## 1️⃣ **`name_collection`** - Collecte du Nom (Onboarding)

**🔥 PRIORITÉ MAXIMALE - Workflow Obligatoire**

### Informations Générales
- **ID** : `name_collection`
- **Fichier** : `src/workflows/nameCollectionWorkflow.ts`
- **Priorité** : 100 (Maximum)
- **Statut** : ✅ Actif
- **Type** : Onboarding obligatoire
- **Durée estimée** : 30 secondes

### Description
Workflow de bienvenue pour **tout nouvel utilisateur** qui n'a pas encore de nom enregistré dans la base de données. Ce workflow est **automatiquement déclenché** lors de la première interaction.

### Déclenchement
- **Automatique** : Dès qu'un utilisateur sans nom envoie un message
- **Condition** : `user.name === null || user.name === undefined`
- **Pas d'intention requise** : Prioritaire sur tout autre workflow

### États du Workflow (6 étapes)

```
1. greeting_new_user
   ↓
2. await_name_input (validation 2-50 chars)
   ↓
3. validate_name (handler: validate_user_name)
   ↓
4. save_name (handler: save_user_name)
   ↓
5. welcome_message (message personnalisé)
   ↓
6. completed
```

### Messages Utilisés

**Message Initial (statique)** :
```
Salam 👋 Je suis ISSA, votre compagnon digital chez ROI Takaful 🌙

Je suis là pour vous écouter, vous guider et répondre à vos questions
sur nos produits d'assurance conformes à la Charia.

Avant de commencer, comment puis-je vous appeler ? ✍️
(J'aime bien savoir avec qui je discute, ça rend la conversation plus conviviale 😉)
```

**Message de Bienvenue (après collecte)** :
```
Ravi de faire votre connaissance {{user_name}} ! 🤝

Bienvenue dans la famille ROI Takaful, où l'assurance rime avec
transparence et conformité à la Charia islamique.

🌙 Ce que je peux faire pour vous :

📋 Vous informer sur nos produits Takaful :
   • Takaful Auto 🚗
   • Takaful Santé 🏥
   • Takaful Habitation 🏠
   • Takaful Vie 👨‍👩‍👧‍👦

💼 Vous accompagner dans vos souscriptions
📞 Vous orienter vers nos conseillers
💬 Répondre à toutes vos questions

Comment puis-je vous aider aujourd'hui ?
```

### Validation du Nom

Le handler `validate_user_name` **rejette automatiquement** :
- ❌ Nombres uniquement (ex: "123")
- ❌ Symboles uniquement (ex: "!@#$")
- ❌ Salutations (ex: "bonjour", "salam", "hello")
- ❌ Mots courants (ex: "ok", "oui", "non", "merci")
- ❌ Questions (contenant "?", "quoi", "comment", "pourquoi")
- ❌ Moins de 2 caractères
- ❌ Plus de 50 caractères

✅ **Accepte** : Prénoms, noms, pseudos valides (ex: "Ahmed", "Marie", "Jean-Paul")

### Handlers

1. **`ValidateUserNameHandler`**
   - Valide que le nom n'est pas une salutation/question
   - Nettoie et formate le nom (capitalisation)
   - Retourne à `await_name_input` si invalide

2. **`SaveUserNameHandler`**
   - Prépare la sauvegarde du nom
   - Marque `save_to_database: true`
   - Le ConversationService sauvegarde effectivement en base

### Données Collectées
```typescript
{
  user_name: string,           // Nom nettoyé et formaté
  name_validated: boolean,     // true
  save_to_database: boolean    // true
}
```

---

## 2️⃣ **`product_purchase`** - Souscription Produit Takaful

### Informations Générales
- **ID** : `product_purchase`
- **Fichier** : `src/workflows/productPurchaseWorkflow.ts`
- **Priorité** : 50
- **Statut** : ✅ Actif
- **Type** : Souscription commerciale
- **Durée estimée** : 5-10 minutes

### Description
Workflow guidé pour la **souscription à un produit d'assurance Takaful**. Collecte toutes les informations nécessaires et génère une demande de souscription.

### Déclenchement
- **Par intention** : `product_purchase`
- **Mots-clés détectés** : "acheter", "souscrire", "commander", "prendre assurance", "je veux"
- **Condition** : Utilisateur doit avoir un nom enregistré

### États du Workflow (14 étapes)

```
1. welcome
   ↓
2. await_confirmation (Oui/Non)
   ↓
3. select_product (1-4)
   ↓
4. collect_full_name
   ↓
5. collect_phone
   ↓
6. collect_email
   ↓
7. collect_address
   ↓
8. generate_summary (handler)
   ↓
9. show_summary
   ↓
10. final_confirmation (Oui/Non)
   ↓
11. process_subscription (handler)
   ↓
12. success / cancelled
   ↓
13. completed
```

### Produits Disponibles
1. **Takaful Auto** 🚗 - Assurance automobile conforme à la Charia
2. **Takaful Santé** 🏥 - Couverture santé et hospitalisation
3. **Takaful Habitation** 🏠 - Protection de votre domicile
4. **Takaful Vie** 👨‍👩‍👧‍👦 - Protection de votre famille

### Validations

| Champ | Type | Validation |
|-------|------|------------|
| Confirmation démarrage | Enum | "oui" ou "non" |
| Produit | Enum | "1", "2", "3", "4" |
| Nom complet | String | 3-100 caractères |
| Téléphone | Phone | Format camerounais (+237...) |
| Email | Email | Format email valide |
| Adresse | String | 10-200 caractères |
| Confirmation finale | Enum | "oui" ou "non" |

### Handlers

1. **`GeneratePurchaseSummaryHandler`**
   - Convertit le numéro de produit en nom
   - Génère le récapitulatif formaté

2. **`ProcessSubscriptionHandler`**
   - Traite la souscription finale
   - Génère un numéro de dossier unique
   - Format : `TKF-{timestamp}-{userId}`
   - Enregistre dans les logs

### Transitions Conditionnelles

```typescript
await_confirmation:
  - si "oui" → select_product
  - si "non" → cancelled

final_confirmation:
  - si "oui" → process_subscription
  - si "non" → select_product (recommencer)
```

### Données Collectées
```typescript
{
  product_type: '1' | '2' | '3' | '4',
  product_name: string,
  full_name: string,
  phone_number: string,
  email: string,
  address: string,
  dossier_number: string,
  processed_at: string (ISO)
}
```

---

## 📊 Récapitulatif

| Aspect | name_collection | product_purchase |
|--------|-----------------|------------------|
| **Priorité** | 🔴 100 (Maximum) | 🟡 50 (Normale) |
| **Type** | Onboarding | Commercial |
| **Déclenchement** | Automatique | Par intention |
| **Obligatoire** | ✅ Oui | ❌ Non |
| **États** | 6 | 14 |
| **Handlers** | 2 | 2 |
| **Validations** | 1 | 7 |
| **Durée** | 30s | 5-10min |
| **Données** | Nom uniquement | Infos complètes |

---

## 🔄 Ordre d'Exécution

### Scénario : Nouvel Utilisateur

```
1. Utilisateur envoie : "Bonjour"
   ↓
2. Système détecte : user.name === null
   ↓
3. Déclenche : name_collection (priorité 100)
   ↓
4. Collecte le nom : "Ahmed"
   ↓
5. Sauvegarde en base
   ↓
6. Affiche message de bienvenue
   ↓
7. Workflow terminé → utilisateur peut utiliser autres workflows
```

### Scénario : Utilisateur Existant

```
1. Utilisateur envoie : "Je veux souscrire"
   ↓
2. IntentClassifier détecte : product_purchase
   ↓
3. Vérifie : user.name existe ✅
   ↓
4. Déclenche : product_purchase workflow
   ↓
5. Guide l'utilisateur étape par étape
   ↓
6. Génère dossier de souscription
```

---

## 🚀 Workflows à Ajouter (Recommandés)

### Phase 2
1. **`product_inquiry`** - Demande d'information produit
2. **`pricing_inquiry`** - Obtenir un devis
3. **`complaint_handling`** - Gérer une réclamation
4. **`contact_request`** - Demande de rappel

### Phase 3
5. **`claim_submission`** - Déclarer un sinistre
6. **`contract_modification`** - Modifier un contrat
7. **`payment_inquiry`** - Informations paiement

---

## 💡 Comment Ajouter un Nouveau Workflow

### Étapes

1. **Créer le fichier workflow**
   ```typescript
   // src/workflows/myNewWorkflow.ts
   export const myNewWorkflow: WorkflowDefinition = {
     id: 'my_new_workflow',
     name: 'Mon Nouveau Workflow',
     // ... définition complète
   };
   ```

2. **Créer les handlers (si nécessaire)**
   ```typescript
   // src/workflows/handlers/myHandlers.ts
   export class MyCustomHandler implements WorkflowHandler {
     name = 'my_handler';
     async execute(context) { /* ... */ }
   }
   ```

3. **Enregistrer dans index.ts**
   ```typescript
   // src/workflows/index.ts
   export const workflows = [
     nameCollectionWorkflow,
     productPurchaseWorkflow,
     myNewWorkflow  // ← Ajouter ici
   ];
   ```

4. **Configurer l'intention (optionnel)**
   ```typescript
   // IntentClassifier enregistrera automatiquement
   intentClassifier.registerIntent({
     name: 'my_new_intent',
     workflowId: 'my_new_workflow',
     keywords: [['keyword1'], ['keyword2']],
     // ...
   });
   ```

---

## 📞 Support

Pour toute question sur les workflows :
- Consulter le code dans `src/workflows/`
- Lire `REFONTE_CHAT_REVIEW.md` pour l'architecture complète
- Voir `src/types/workflow.ts` pour les types disponibles

---

**Dernière mise à jour** : 2025-10-07
**Branche** : `chat-review`
**Status** : ✅ Production Ready
