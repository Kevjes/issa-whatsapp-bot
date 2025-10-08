# Architecture ISSA - Assistant Virtuel Conversationnel

## Vue d'ensemble

ISSA (Intelligent Support System Assistant) est maintenant un assistant virtuel conversationnel humanisé qui utilise l'Intelligence Artificielle pour offrir une expérience naturelle aux clients de Royal Onyx Insurance et ROI Takaful.

## Changements Principaux

### 🔄 Transformation du Système

**Avant :**
- Menu interactif avec boutons
- Flux prédéfini et rigide
- Pas de mémoire conversationnelle
- Réponses automatisées basiques

**Après :**
- Conversations naturelles humanisées
- IA configurable (OpenAI/DeepSeek)
- Sauvegarde complète des conversations
- Base de connaissances évolutive
- Gestion personnalisée des utilisateurs

## Architecture des Services

### 1. Service de Conversation (`ConversationService`)
**Rôle :** Orchestrateur principal des interactions
**Responsabilités :**
- Gestion des états de conversation
- Coordination entre IA, base de données et connaissances
- Traitement des messages selon le contexte utilisateur

### 2. Service IA (`AIService`) 
**Rôle :** Interface unifiée pour les fournisseurs d'IA
**Fonctionnalités :**
- Support OpenAI et DeepSeek configurable via `.env`
- Génération de réponses contextuelles
- Prompts système personnalisés
- Gestion des erreurs et fallback

### 3. Service Base de Connaissances (`KnowledgeService`)
**Rôle :** Gestion des informations ROI et ROI Takaful
**Caractéristiques :**
- Chargement automatique des données depuis `docs/`
- Recherche intelligente par mots-clés
- Catégorisation flexible (roi_general, roi_takaful, services, etc.)
- Système évolutif pour nouveaux contenus

### 4. Service Base de Données Étendu (`DatabaseService`)
**Nouvelles tables :**
- `users` : Gestion des utilisateurs et états conversationnels
- `conversation_messages` : Historique complet des conversations
- `knowledge_base` : Stockage évolutif des connaissances

## Flux Conversationnel

### 1. Premier Contact (État : `greeting`)
```
Utilisateur: "Bonjour"
ISSA: "Bonjour ! Je suis ISSA, votre assistant virtuel Royal Onyx Insurance. 
       Comment allez-vous aujourd'hui ? Pour mieux vous accompagner, 
       comment puis-je vous appeler ?"
État: greeting → name_collection
```

### 2. Collecte du Nom (État : `name_collection`)
```
Utilisateur: "Je m'appelle Marie"
ISSA: "Ravi de faire votre connaissance, Marie ! 😊 
       Je suis là pour vous renseigner sur nos produits d'assurance 
       classiques et notre fenêtre ROI Takaful conforme à la Charia. 
       Comment puis-je vous aider aujourd'hui ?"
État: name_collection → active
```

### 3. Conversation Active (État : `active`)
```
Utilisateur: "Je veux des informations sur ROI Takaful"
ISSA: [Recherche dans la base de connaissances]
      [Génère réponse avec contexte via IA]
      "Marie, ROI Takaful est notre fenêtre d'assurance islamique..."
État: active (maintenu)
```

## Configuration

### Variables d'Environnement Ajoutées

```bash
# Configuration IA (OpenAI ou DeepSeek)
AI_PROVIDER=deepseek              # ou 'openai'
AI_API_KEY=your_api_key_here
AI_MODEL=deepseek-chat           # ou 'gpt-3.5-turbo'
AI_BASE_URL=https://api.deepseek.com/v1  # optionnel
```

### Initialisation du Système

```bash
# Installation et setup complet
npm install
npm run setup                    # Build + initialisation base de connaissances

# Ou séparément
npm run build
npm run init-knowledge          # Charge les données ROI/Takaful
```

## Gestion des Données

### Base de Connaissances
- **Source :** `docs/presentation_ROI.txt` et `docs/presentation_ROI_takaful.txt`
- **Chargement :** Automatique au premier démarrage
- **Recherche :** Mots-clés, titre, contenu avec scoring
- **Extension :** Ajout facile de nouvelles catégories

### Conversations
- **Persistance :** Tous les messages sauvegardés avec métadonnées
- **Contexte :** Historique disponible pour l'IA (limité aux 20 derniers)
- **États :** Suivi précis de l'état conversationnel par utilisateur

## API Endpoints Mis à Jour

### Nouveaux Endpoints
- `GET /admin/stats` - Statistiques système ISSA
- `POST /admin/reset-conversation` - Réinitialiser une conversation
- `GET /admin/user/:phoneNumber` - Contexte utilisateur

### Endpoints Modifiés
- `POST /webhook` - Utilise maintenant `ConversationController`
- `GET /health` - Inclut vérifications IA et base de connaissances

## Monitoring et Observabilité

### Logs Enrichis
```javascript
// Exemple de log conversationnel
{
  "level": "info",
  "message": "Asynchronous message processing started",
  "phoneNumber": "237691100575",
  "messageId": "wamid.xxx",
  "textPreview": "Bonjour, je voudrais des informations sur...",
  "aiProvider": "deepseek",
  "conversationState": "active",
  "userName": "Marie"
}
```

### Health Checks
- Base de données : Connectivité et tables
- IA : Configuration et accessibilité API
- Base de connaissances : Nombre d'entrées chargées
- WhatsApp : Status API

## Sécurité et Performance

### Améliorations TypeScript
- Élimination des types `any`
- Interfaces strictes pour tous les services
- Validation des données d'entrée

### Rate Limiting Adapté
- Conservation des limites existantes
- Ajout de protection spécifique aux appels IA

### Gestion d'Erreurs
- Fallback automatique si IA indisponible
- Messages d'erreur humanisés
- Redirection vers site web si information non disponible

## Migration et Compatibilité

### Rétrocompatibilité
- Ancien système de menu conservé (optionnel)
- Endpoints existants maintenus
- Base de données étendue sans perte

### Migration Douce
1. Nouveau système activé par défaut
2. Ancien système disponible via configuration
3. Données utilisateur préservées

## Évolutivité

### Ajout de Nouvelles Connaissances
```typescript
await knowledgeService.addEntry({
  category: 'nouveau_produit',
  title: 'Assurance Voyage Premium',
  content: '...',
  keywords: ['voyage', 'premium', 'international'],
  isActive: true
});
```

### Support Nouveaux Fournisseurs IA
- Architecture modulaire permettant ajout facile
- Interface `AIService` extensible
- Configuration centralisée

Cette architecture transforme fondamentalement l'expérience utilisateur tout en conservant la robustesse et l'évolutivité du système existant.