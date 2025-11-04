# 📚 Architecture Technique ISSA - Chatbot WhatsApp ROI Takaful

**Version:** 1.0.0
**Date:** Octobre 2025
**Auteurs:** Équipe ROI Takaful & Claude AI

---

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture globale](#architecture-globale)
3. [Schéma de base de données](#schéma-de-base-de-données)
4. [Flux de traitement des messages](#flux-de-traitement-des-messages)
5. [Système de connaissances](#système-de-connaissances)
6. [Système de workflows](#système-de-workflows)
7. [Modules et services](#modules-et-services)
8. [Injection de dépendances](#injection-de-dépendances)
9. [Intégrations externes](#intégrations-externes)

---

## 🎯 Vue d'ensemble

### Description

ISSA (Intelligent System for Support & Assistance) est un chatbot conversationnel intelligent développé pour ROI Takaful, première compagnie d'assurance conforme à la Charia au Cameroun.

### Technologies principales

- **Runtime:** Node.js 20+ avec TypeScript
- **Framework:** Express.js
- **Base de données:** SQLite avec extensions FTS5 (Full-Text Search)
- **IA:** Google Gemini 2.5 Flash (multi-provider: OpenAI, DeepSeek, Gemini)
- **Messagerie:** WhatsApp Business API
- **Embeddings:** Xenova/distiluse-base-multilingual-cased-v2 (768 dimensions)
- **Architecture:** Clean Architecture avec Dependency Injection

### Fonctionnalités clés

✅ **Conversation intelligente** avec mémoire contextuelle
✅ **Recherche hybride** (FTS5 + Recherche vectorielle)
✅ **Workflows conversationnels** (onboarding, souscription)
✅ **Classification d'intentions** automatique
✅ **Support multilingue** (Français)
✅ **Rate limiting** par utilisateur
✅ **Gestion d'état** conversationnel avancée

---

## 🏗️ Architecture globale

### Diagramme de l'architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ISSA CHATBOT ARCHITECTURE                    │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│  WhatsApp User   │
└────────┬─────────┘
         │ Message
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          WEBHOOK LAYER                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  POST /webhook                                               │   │
│  │  - Rate Limiting (50 msg/min)                               │   │
│  │  - Signature Validation                                     │   │
│  │  - Header Validation                                        │   │
│  └─────────────────────────┬───────────────────────────────────┘   │
└────────────────────────────┼───────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       CONTROLLER LAYER                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  ConversationController                                      │   │
│  │  - Extract message data                                     │   │
│  │  - User rate limiting (50 msg/min)                         │   │
│  │  - Mark message as read                                     │   │
│  │  - Async message processing                                │   │
│  └─────────────────────────┬───────────────────────────────────┘   │
└────────────────────────────┼───────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   CONVERSATION SERVICE LAYER                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  ConversationService (Orchestrator)                          │   │
│  │                                                              │   │
│  │  1. Get/Create User                                         │   │
│  │  2. Save user message                                       │   │
│  │  3. Check active workflow ──────┐                          │   │
│  │                                  │                          │   │
│  │  ┌──────────────────────────────┼──────────────────────┐  │   │
│  │  │ Has Active Workflow?         │                      │  │   │
│  │  └──────────────────────────────┼──────────────────────┘  │   │
│  │           YES ▼                  NO ▼                       │   │
│  │  ┌─────────────────────┐  ┌──────────────────────────┐   │   │
│  │  │ handleWorkflowStep  │  │ handleNoActiveWorkflow   │   │   │
│  │  │ - Continue workflow │  │ - Classify intent        │   │   │
│  │  │ - Process handlers  │  │ - Detect new workflow    │   │   │
│  │  │ - Update state      │  │ - Search knowledge       │   │   │
│  │  │                     │  │ - Generate AI response   │   │   │
│  │  └─────────────────────┘  └──────────────────────────┘   │   │
│  │                   │                  │                     │   │
│  │                   └──────────┬───────┘                     │   │
│  │                              ▼                              │   │
│  │  4. Clean Markdown formatting                              │   │
│  │  5. Save bot response                                      │   │
│  │  6. Return response                                        │   │
│  └────────────────────────────┬────────────────────────────────┘   │
└────────────────────────────────┼───────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         SERVICES LAYER                               │
│                                                                      │
│  ┌──────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ WorkflowEngine   │  │ IntentClassifier│  │ KnowledgeService│  │
│  │ - Execute states │  │ - Keyword match │  │ - FTS5 search   │  │
│  │ - Run handlers   │  │ - Pattern match │  │ - Vector search │  │
│  │ - Manage context │  │ - AI classify   │  │ - Hybrid search │  │
│  └──────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                      │
│  ┌──────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ AIService        │  │ WhatsAppService │  │ DatabaseService │  │
│  │ - Gemini API     │  │ - Send messages │  │ - SQLite CRUD   │  │
│  │ - Context build  │  │ - Typing indica.│  │ - Transactions  │  │
│  │ - Token tracking │  │ - Read receipts │  │ - Migrations    │  │
│  └──────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                   │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  SQLite Database (issa.db)                                    │ │
│  │                                                                │ │
│  │  ┌──────────────┐  ┌─────────────────┐  ┌─────────────────┐ │ │
│  │  │ users        │  │ conv_messages   │  │ knowledge_base  │ │ │
│  │  └──────────────┘  └─────────────────┘  └─────────────────┘ │ │
│  │                                                                │ │
│  │  ┌──────────────┐  ┌─────────────────┐  ┌─────────────────┐ │ │
│  │  │ workflows    │  │ embeddings      │  │ knowledge_fts   │ │ │
│  │  └──────────────┘  └─────────────────┘  └─────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL INTEGRATIONS                           │
│                                                                      │
│  ┌──────────────────┐          ┌───────────────────────────────┐  │
│  │ WhatsApp API     │          │ Google Gemini API             │  │
│  │ (Meta)           │          │ (Generative AI)               │  │
│  └──────────────────┘          └───────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Schéma de base de données

### Diagramme ERD (Entity Relationship Diagram)

```
┌────────────────────────────────────────────────────────────────────┐
│                     ISSA DATABASE SCHEMA                            │
└────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────┐
│ users                                │
├─────────────────────────────────────┤
│ • id (PK)                            │
│ • phone_number (UNIQUE)             │◄──────────┐
│ • name                               │           │
│ • first_name                         │           │
│ • last_name                          │           │
│ • created_at                         │           │
│ • updated_at                         │           │
│ • last_interaction                   │           │
│ • is_active                          │           │
│ • conversation_state                 │           │
│   (greeting|name_collection|active)  │           │
│ • pending_message                    │           │
└─────────────────────────────────────┘           │
                                                   │
         ┌─────────────────────────────────────────┤
         │                                         │
         │                                         │
┌────────▼──────────────────────────┐   ┌──────────▼──────────────────────┐
│ conversation_messages              │   │ workflow_contexts                │
├────────────────────────────────────┤   ├──────────────────────────────────┤
│ • id (PK)                          │   │ • id (PK)                        │
│ • user_id (FK → users.id)         │   │ • user_id (FK → users.id)       │
│ • phone_number                     │   │ • workflow_id                    │
│ • message_id                       │   │ • current_state                  │
│ • content                          │   │ • data (JSON)                    │
│ • message_type (user|bot)         │   │ • history (JSON)                 │
│ • timestamp                        │   │ • metadata (JSON)                │
│ • ai_provider (gemini|openai)     │   │ • status (active|completed|...)  │
│ • metadata (JSON)                  │   │ • started_at                     │
└────────────────────────────────────┘   │ • updated_at                     │
                                          │ • completed_at                   │
                                          │ • error_message                  │
                                          └──────────────────────────────────┘

┌─────────────────────────────────────┐
│ knowledge_base                       │
├─────────────────────────────────────┤
│ • id (PK)                            │◄──────────┐
│ • category                           │           │
│ • title                              │           │
│ • content (TEXT)                     │           │
│ • keywords (JSON array)              │           │
│ • created_at                         │           │
│ • updated_at                         │           │
│ • is_active                          │           │
└─────────────────────────────────────┘           │
                                                   │
         ┌─────────────────────────────────────────┤
         │                                         │
         │                                         │
┌────────▼──────────────────────────┐   ┌──────────▼──────────────────────┐
│ knowledge_embeddings               │   │ knowledge_fts (FTS5 VIRTUAL)     │
├────────────────────────────────────┤   ├──────────────────────────────────┤
│ • id (PK)                          │   │ • rowid → knowledge_base.id      │
│ • knowledge_id (FK → kb.id) UNIQ  │   │ • category (indexed)             │
│ • embedding (BLOB)                 │   │ • title (indexed)                │
│ • model_name                       │   │ • content (indexed)              │
│ • vector_dimension (768)           │   │ • keywords (indexed)             │
│ • created_at                       │   │                                  │
│ • updated_at                       │   │ Tokenizer: porter unicode61      │
└────────────────────────────────────┘   │ Remove diacritics: Yes           │
                                          └──────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ INDEXES                                                               │
├──────────────────────────────────────────────────────────────────────┤
│ • idx_users_phone_number ON users(phone_number)                      │
│ • idx_users_last_interaction ON users(last_interaction)              │
│ • idx_conversation_messages_user_id ON conversation_messages(user_id)│
│ • idx_conversation_messages_timestamp ON conv_messages(timestamp)    │
│ • idx_knowledge_base_category ON knowledge_base(category)            │
│ • idx_knowledge_base_keywords ON knowledge_base(keywords)            │
│ • idx_workflow_contexts_user_id ON workflow_contexts(user_id)        │
│ • idx_workflow_contexts_status ON workflow_contexts(status)          │
│ • idx_knowledge_embeddings_knowledge_id ON embeddings(knowledge_id)  │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ TRIGGERS (Auto-sync knowledge_fts)                                   │
├──────────────────────────────────────────────────────────────────────┤
│ • knowledge_fts_insert: Sync on INSERT into knowledge_base           │
│ • knowledge_fts_update: Sync on UPDATE of knowledge_base             │
│ • knowledge_fts_delete: Sync on DELETE from knowledge_base           │
└──────────────────────────────────────────────────────────────────────┘
```

### Tables détaillées

#### 📌 Table `users`
Stocke les informations des utilisateurs WhatsApp.

| Colonne              | Type     | Description                                           |
|---------------------|----------|-------------------------------------------------------|
| id                  | INTEGER  | Clé primaire auto-incrémentée                        |
| phone_number        | TEXT     | Numéro WhatsApp (UNIQUE, format: 237XXXXXXXX)       |
| name                | TEXT     | Nom complet de l'utilisateur                         |
| first_name          | TEXT     | Prénom                                               |
| last_name           | TEXT     | Nom de famille                                       |
| created_at          | DATETIME | Date de première interaction                         |
| updated_at          | DATETIME | Dernière mise à jour                                 |
| last_interaction    | DATETIME | Timestamp de la dernière conversation               |
| is_active           | INTEGER  | 1=actif, 0=inactif                                   |
| conversation_state  | TEXT     | État conversationnel (greeting, name_collection, active, idle) |
| pending_message     | TEXT     | Message en attente de traitement                     |

**États conversationnels:**
- `greeting`: Nouvel utilisateur, salutation initiale
- `name_collection`: En cours de collecte du nom (workflow onboarding)
- `active`: Conversation active, prêt à répondre
- `idle`: Inactif depuis >24h

#### 📌 Table `conversation_messages`
Historique complet des conversations.

| Colonne         | Type     | Description                                    |
|----------------|----------|------------------------------------------------|
| id             | INTEGER  | Clé primaire                                   |
| user_id        | INTEGER  | FK → users.id                                 |
| phone_number   | TEXT     | Numéro WhatsApp (dénormalisé pour performance)|
| message_id     | TEXT     | ID unique WhatsApp du message                 |
| content        | TEXT     | Contenu textuel du message                    |
| message_type   | TEXT     | 'user' ou 'bot'                              |
| timestamp      | DATETIME | Timestamp du message                          |
| ai_provider    | TEXT     | Provider IA utilisé (gemini, openai, deepseek)|
| metadata       | TEXT     | JSON avec données additionnelles              |

**Limite de mémoire:** Les 10 derniers messages sont chargés pour le contexte IA.

#### 📌 Table `knowledge_base`
Base de connaissances ROI Takaful.

| Colonne      | Type     | Description                                      |
|-------------|----------|--------------------------------------------------|
| id          | INTEGER  | Clé primaire                                     |
| category    | TEXT     | Catégorie (roi_general, takaful_services, etc.) |
| title       | TEXT     | Titre de l'entrée                               |
| content     | TEXT     | Contenu complet (peut être très long)           |
| keywords    | TEXT     | JSON array de mots-clés pour recherche          |
| created_at  | DATETIME | Date de création                                |
| updated_at  | DATETIME | Dernière modification                           |
| is_active   | INTEGER  | 1=actif, 0=désactivé                            |

**Catégories disponibles:**
- `roi_general`: Présentation ROI
- `roi_services`: Services Royal Onyx Insurance
- `roi_takaful`: Présentation ROI Takaful
- `takaful_services`: Services Takaful
- `takaful_definitions`: Définitions et concepts
- `takaful_sharia`: Sharia Board
- `takaful_auto`: Takaful Automobile
- `takaful_sante_groupe`: Takaful Santé Groupe
- `takaful_fonctionnement`: Fonctionnement Takaful
- `issa_identity`: Identité et rôle d'ISSA

#### 📌 Table `knowledge_embeddings`
Embeddings vectoriels pour recherche sémantique.

| Colonne           | Type     | Description                                    |
|------------------|----------|------------------------------------------------|
| id               | INTEGER  | Clé primaire                                   |
| knowledge_id     | INTEGER  | FK → knowledge_base.id (UNIQUE)              |
| embedding        | BLOB     | Vecteur encodé (Float32Array → BLOB)         |
| model_name       | TEXT     | Nom du modèle (Xenova/distiluse-base-...)    |
| vector_dimension | INTEGER  | Dimension du vecteur (768)                    |
| created_at       | DATETIME | Date de génération                            |
| updated_at       | DATETIME | Dernière régénération                         |

**Format d'embedding:** Float32Array de 768 dimensions converti en Buffer pour stockage BLOB.

#### 📌 Table `knowledge_fts` (FTS5 Virtual Table)
Table virtuelle FTS5 pour recherche full-text ultra-rapide.

**Configuration:**
- **Tokenizer:** `porter unicode61 remove_diacritics 2`
- **Content source:** `knowledge_base` (content_rowid='id')
- **Indexation automatique:** Via triggers

**Colonnes indexées:**
- category
- title
- content
- keywords

**Recherche:** Supporte les requêtes BM25 avec opérateurs booléens (OR, AND, NOT).

#### 📌 Table `workflow_contexts`
Gestion des workflows conversationnels.

| Colonne         | Type     | Description                                    |
|----------------|----------|------------------------------------------------|
| id             | INTEGER  | Clé primaire                                   |
| user_id        | INTEGER  | FK → users.id                                 |
| workflow_id    | TEXT     | ID du workflow (name_collection, product_purchase) |
| current_state  | TEXT     | État actuel du workflow                       |
| data           | TEXT     | JSON avec données collectées                  |
| history        | TEXT     | JSON array des étapes parcourues              |
| metadata       | TEXT     | JSON avec métadonnées                         |
| status         | TEXT     | active, paused, completed, cancelled, failed  |
| started_at     | DATETIME | Début du workflow                             |
| updated_at     | DATETIME | Dernière mise à jour                          |
| completed_at   | DATETIME | Date de complétion (si terminé)              |
| error_message  | TEXT     | Message d'erreur (si failed)                 |

---

## 🔄 Flux de traitement des messages

### Schéma détaillé du flux complet

```
┌──────────────────────────────────────────────────────────────────────┐
│           FLUX COMPLET DE TRAITEMENT D'UN MESSAGE WHATSAPP           │
└──────────────────────────────────────────────────────────────────────┘

[1] RÉCEPTION DU MESSAGE WHATSAPP
════════════════════════════════════
    ┌─────────────────┐
    │ Utilisateur     │
    │ WhatsApp        │
    └────────┬────────┘
             │ POST Webhook
             ▼
    ┌─────────────────────────────────┐
    │ WhatsApp Cloud API (Meta)       │
    │ - Validation de signature       │
    │ - Envoi webhook POST            │
    └────────┬────────────────────────┘
             │
             ▼
    POST https://issa-bot.roi-takaful.cm/webhook
    {
      "object": "whatsapp_business_account",
      "entry": [{
        "changes": [{
          "value": {
            "messages": [{
              "from": "237691231554",
              "id": "wamid.xxx",
              "text": { "body": "Bonjour ISSA" }
            }]
          }
        }]
      }]
    }

             │
             ▼
[2] MIDDLEWARES EXPRESS
═══════════════════════
    ┌─────────────────────────────────┐
    │ webhookRateLimit                │
    │ Limite: 50 requêtes/minute      │
    │ ✓ PASS                          │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │ validateHeaders                 │
    │ - Content-Type: application/json│
    │ - X-Hub-Signature présent       │
    │ ✓ PASS                          │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │ validateWhatsAppWebhook         │
    │ - Vérification signature HMAC   │
    │ - Validation schéma message     │
    │ ✓ PASS                          │
    └────────┬────────────────────────┘
             │
             ▼
[3] WEBHOOK HANDLER
═══════════════════
    whatsappWebhook.ts: POST /webhook

    ┌─────────────────────────────────┐
    │ Extract message type            │
    │ - Messages entrants?            │
    │ - Statuts (read/delivered)?     │
    │ - Autres événements?            │
    └────────┬────────────────────────┘
             │
             ▼ Messages entrants détectés
    ┌─────────────────────────────────┐
    │ Resolve DI Container            │
    │ container.resolve(              │
    │   TOKENS.CONVERSATION_CONTROLLER│
    │ )                               │
    └────────┬────────────────────────┘
             │
             ▼
[4] CONVERSATION CONTROLLER
═══════════════════════════
    ConversationController.handleIncomingMessage()

    ┌─────────────────────────────────┐
    │ 4.1 Extract message data        │
    │ - from: "237691231554"          │
    │ - messageId: "wamid.xxx"        │
    │ - text: "Bonjour ISSA"          │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │ 4.2 User rate limiting          │
    │ userRateLimiter.check(from)     │
    │ Limite: 50 messages/min         │
    │ ✓ Allowed                       │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │ 4.3 Mark message as read        │
    │ whatsappService.markAsRead()    │
    │ ✓ Read receipt sent             │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │ 4.4 Return HTTP 200 OK          │
    │ Response immédiate à WhatsApp   │
    │ (traitement asynchrone après)   │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │ 4.5 Async processing            │
    │ processMessageAsync()           │
    │ (Non-bloquant)                  │
    └────────┬────────────────────────┘
             │
             ▼
[5] CONVERSATION SERVICE
════════════════════════
    ConversationService.processMessage()

    ┌─────────────────────────────────┐
    │ 5.1 Get/Create User             │
    │ databaseService.getOrCreateUser()│
    │                                 │
    │ Query: SELECT * FROM users      │
    │ WHERE phone_number = ?          │
    │                                 │
    │ Si nouveau: INSERT INTO users   │
    │ État initial: 'greeting'        │
    └────────┬────────────────────────┘
             │
             │ User: { id: 1, name: "Kévin", state: "active" }
             ▼
    ┌─────────────────────────────────┐
    │ 5.2 Save user message           │
    │ databaseService.saveMessage()   │
    │                                 │
    │ INSERT INTO conversation_messages│
    │ (user_id, content, type, ...)   │
    │ VALUES (1, "Bonjour ISSA",      │
    │         "user", ...)            │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │ 5.3 Check active workflow       │
    │ workflowEngine.getActiveWorkflow│
    │                                 │
    │ Query: SELECT * FROM            │
    │ workflow_contexts               │
    │ WHERE user_id = 1               │
    │ AND status = 'active'           │
    └────────┬────────────────────────┘
             │
             ├─────► HAS WORKFLOW? ──► [6] WORKFLOW PATH
             │
             └─────► NO WORKFLOW ───► [7] AI GENERATION PATH

[6] WORKFLOW PATH
═════════════════
    ConversationService.handleWorkflowStep()

    ┌─────────────────────────────────┐
    │ 6.1 Load workflow context       │
    │ - workflow_id: "name_collection"│
    │ - current_state: "await_name"   │
    │ - data: { user_name: null }     │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │ 6.2 Execute workflow step       │
    │ workflowEngine.executeStep()    │
    │                                 │
    │ State Types:                    │
    │ - output: Afficher message      │
    │ - input: Attendre saisie user   │
    │ - processing: Exécuter handler  │
    │ - decision: Condition branching │
    │ - completed: Fin du workflow    │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │ 6.3 Run workflow handler        │
    │ (si state type = processing)    │
    │                                 │
    │ Ex: validate_user_name          │
    │ - Nettoyer input                │
    │ - Valider format                │
    │ - Retourner résultat            │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │ 6.4 Update workflow context     │
    │ - Transition vers next_state    │
    │ - Sauvegarder data collectée    │
    │ - Ajouter step à history        │
    │                                 │
    │ UPDATE workflow_contexts        │
    │ SET current_state = 'save_name',│
    │     data = '{"user_name":"Kevin"}'│
    │ WHERE id = ?                    │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │ 6.5 Return workflow response    │
    │ "Ravi de vous connaître Kevin!" │
    └────────┬────────────────────────┘
             │
             └─────► [9] SEND RESPONSE

[7] AI GENERATION PATH (No Active Workflow)
═══════════════════════════════════════════
    ConversationService.handleNoActiveWorkflow()

    ┌─────────────────────────────────┐
    │ 7.1 Classify user intent        │
    │ intentClassifier.classify()     │
    │                                 │
    │ Message: "Parle moi de takaful  │
    │          santé"                 │
    │                                 │
    │ Methods:                        │
    │ ┌─────────────────────────────┐ │
    │ │ • Keyword matching          │ │
    │ │ • Pattern matching          │ │
    │ │ • AI classification (opt)   │ │
    │ └─────────────────────────────┘ │
    │                                 │
    │ Result: {                       │
    │   intent: "product_info",       │
    │   confidence: 0.85,             │
    │   entities: ["takaful", "santé"]│
    │ }                               │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │ 7.2 Detect new workflow trigger │
    │ workflowEngine.detectWorkflow() │
    │                                 │
    │ Patterns:                       │
    │ - "je veux souscrire"           │
    │ - "acheter assurance"           │
    │ - "nouveau contrat"             │
    │                                 │
    │ → No workflow detected          │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │ 7.3 KNOWLEDGE SEARCH            │
    │ enhancedKnowledgeService.search()│
    │                                 │
    │ ┌─────────────────────────────┐ │
    │ │ HYBRID SEARCH STRATEGY      │ │
    │ ├─────────────────────────────┤ │
    │ │ Strategy 1: FTS5 Keyword    │ │
    │ │ Weight: 30%                 │ │
    │ │ ┌─────────────────────────┐ │ │
    │ │ │ Extract keywords        │ │ │
    │ │ │ ["takaful", "santé"]    │ │ │
    │ │ │                         │ │ │
    │ │ │ Query FTS5:             │ │ │
    │ │ │ SELECT * FROM           │ │ │
    │ │ │ knowledge_fts           │ │ │
    │ │ │ WHERE knowledge_fts     │ │ │
    │ │ │ MATCH 'takaful OR santé'│ │ │
    │ │ │ ORDER BY bm25()         │ │ │
    │ │ │                         │ │ │
    │ │ │ Results: 5 entries      │ │ │
    │ │ └─────────────────────────┘ │ │
    │ │                             │ │
    │ │ Strategy 2: Fuzzy Match     │ │
    │ │ Weight: 20%                 │ │
    │ │ ┌─────────────────────────┐ │ │
    │ │ │ Calculate Levenshtein   │ │ │
    │ │ │ distance for all entries│ │ │
    │ │ │ Threshold: 0.7          │ │ │
    │ │ │ Results: 3 entries      │ │ │
    │ │ └─────────────────────────┘ │ │
    │ │                             │ │
    │ │ Strategy 3: Intent-based    │ │
    │ │ Weight: 20%                 │ │
    │ │ ┌─────────────────────────┐ │ │
    │ │ │ Map intent → categories │ │ │
    │ │ │ "product_info" →        │ │ │
    │ │ │ [takaful_services,      │ │ │
    │ │ │  takaful_definitions]   │ │ │
    │ │ │ Results: 4 entries      │ │ │
    │ │ └─────────────────────────┘ │ │
    │ │                             │ │
    │ │ Strategy 4: Semantic Vector │ │
    │ │ Weight: 30%                 │ │
    │ │ ┌─────────────────────────┐ │ │
    │ │ │ Generate query embedding│ │ │
    │ │ │ Model: distiluse-base   │ │ │
    │ │ │ Dimension: 768          │ │ │
    │ │ │                         │ │ │
    │ │ │ Compute cosine similarity│ │ │
    │ │ │ with all embeddings     │ │ │
    │ │ │ Threshold: 0.3          │ │ │
    │ │ │ Results: 6 entries      │ │ │
    │ │ └─────────────────────────┘ │ │
    │ └─────────────────────────────┘ │
    │                                 │
    │ Merge & Score Results:          │
    │ ┌─────────────────────────────┐ │
    │ │ Entry 1: Score 0.92         │ │
    │ │ "ROI Takaful Santé Groupe"  │ │
    │ │                             │ │
    │ │ Entry 2: Score 0.78         │ │
    │ │ "Services Takaful"          │ │
    │ │                             │ │
    │ │ Entry 3: Score 0.65         │ │
    │ │ "Définitions Takaful"       │ │
    │ └─────────────────────────────┘ │
    │                                 │
    │ Build AI Context:               │
    │ Top 5 entries combined          │
    │ Max context length: 25000 chars │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │ 7.4 Build AI Prompt             │
    │                                 │
    │ System Prompt:                  │
    │ ┌─────────────────────────────┐ │
    │ │ Tu es ISSA, assistant ROI   │ │
    │ │ Takaful. Ton rôle: ...      │ │
    │ │                             │ │
    │ │ CONTEXTE PERTINENT:         │ │
    │ │ [5 knowledge entries]       │ │
    │ │                             │ │
    │ │ RÈGLES:                     │ │
    │ │ - Utilise le contexte       │ │
    │ │ - Ton amical et pro         │ │
    │ │ - Conforme Charia           │ │
    │ └─────────────────────────────┘ │
    │                                 │
    │ Conversation History:           │
    │ ┌─────────────────────────────┐ │
    │ │ [Last 10 messages]          │ │
    │ │ User: "Bonjour"             │ │
    │ │ Bot: "Salam! Je suis ISSA..." │
    │ │ User: "Parle moi takaful santé"│
    │ └─────────────────────────────┘ │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │ 7.5 Call AI Service             │
    │ aiService.generateResponse()    │
    │                                 │
    │ Provider: Gemini 2.5 Flash      │
    │ Model: gemini-2.5-flash         │
    │                                 │
    │ ┌─────────────────────────────┐ │
    │ │ Google Gemini API           │ │
    │ │ POST /v1beta/models/        │ │
    │ │      gemini-2.5-flash:      │ │
    │ │      generateContent        │ │
    │ │                             │ │
    │ │ Headers:                    │ │
    │ │ - x-goog-api-key: AIza...   │ │
    │ │                             │ │
    │ │ Body: {                     │ │
    │ │   systemInstruction: "...", │ │
    │ │   contents: [{messages}]    │ │
    │ │ }                           │ │
    │ └────────┬────────────────────┘ │
    │          │                       │
    │          ▼                       │
    │ ┌─────────────────────────────┐ │
    │ │ Gemini AI Processing        │ │
    │ │ - Context understanding     │ │
    │ │ - Knowledge synthesis       │ │
    │ │ - Response generation       │ │
    │ └────────┬────────────────────┘ │
    │          │                       │
    │          ▼                       │
    │ Response: {                     │
    │   success: true,                │
    │   content: "Le Takaful Santé... │
    │             conformément à la   │
    │             Charia...",          │
    │   provider: "gemini",           │
    │   tokensUsed: 2234              │
    │ }                               │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │ 7.6 Clean Markdown formatting   │
    │ cleanMarkdownForWhatsApp()      │
    │                                 │
    │ Transformations:                │
    │ - **bold** → *bold*             │
    │ - ## Heading → *Heading*        │
    │ - Remove triple backticks       │
    │ - Preserve WhatsApp formatting  │
    └────────┬────────────────────────┘
             │
             └─────► [8] SAVE & SEND

[8] SAVE BOT RESPONSE
═════════════════════
    ┌─────────────────────────────────┐
    │ 8.1 Save to database            │
    │ databaseService.saveMessage()   │
    │                                 │
    │ INSERT INTO conversation_messages│
    │ (user_id, content, type,        │
    │  ai_provider, timestamp)        │
    │ VALUES (1, "Le Takaful Santé...",│
    │         "bot", "gemini", ...)   │
    └────────┬────────────────────────┘
             │
             ▼

[9] SEND WHATSAPP RESPONSE
══════════════════════════
    whatsappService.sendTextMessage()

    ┌─────────────────────────────────┐
    │ 9.1 Show typing indicator       │
    │ (Optional, si configuré)        │
    │                                 │
    │ POST /v1/messages               │
    │ {                               │
    │   messaging_product: "whatsapp",│
    │   to: "237691231554",           │
    │   type: "typing",               │
    │   typing: { state: "on" }       │
    │ }                               │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │ 9.2 Send text message           │
    │                                 │
    │ POST https://graph.facebook.com │
    │      /v21.0/{phone_id}/messages │
    │                                 │
    │ Headers:                        │
    │ - Authorization: Bearer {token} │
    │ - Content-Type: application/json│
    │                                 │
    │ Body:                           │
    │ {                               │
    │   messaging_product: "whatsapp",│
    │   to: "237691231554",           │
    │   type: "text",                 │
    │   text: {                       │
    │     body: "Le Takaful Santé..." │
    │   }                             │
    │ }                               │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │ 9.3 WhatsApp Cloud API          │
    │ - Validation du message         │
    │ - Envoi au destinataire         │
    │ - Retour message_id             │
    │                                 │
    │ Response: {                     │
    │   messages: [{                  │
    │     id: "wamid.HBgL..."         │
    │   }]                            │
    │ }                               │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │ 9.4 Log success                 │
    │ logger.info("Message sent")     │
    │                                 │
    │ Metrics:                        │
    │ - Response time: 2.3s           │
    │ - Tokens used: 2234             │
    │ - Message length: 543 chars     │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │ Utilisateur WhatsApp            │
    │ Reçoit la réponse d'ISSA        │
    └─────────────────────────────────┘

[10] STATUS WEBHOOKS (Asynchrone)
══════════════════════════════════
    WhatsApp envoie des webhooks de statut

    ┌─────────────────────────────────┐
    │ Status: "sent"                  │
    │ → Message envoyé au serveur     │
    │   WhatsApp                      │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │ Status: "delivered"             │
    │ → Message reçu sur le téléphone │
    │   de l'utilisateur              │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │ Status: "read"                  │
    │ → Utilisateur a lu le message   │
    │   (Double coche bleue)          │
    └─────────────────────────────────┘

    Ces statuts sont loggés mais
    n'affectent pas le flux principal
```

### Temps de traitement typiques

| Étape                          | Temps moyen  | Notes                                    |
|-------------------------------|--------------|------------------------------------------|
| Webhook → Controller          | 10-20ms      | Validation et routing                    |
| User rate limiting            | 1-2ms        | Vérification en mémoire                  |
| Database: Get/Create user     | 5-15ms       | SQLite local, très rapide                |
| Database: Save message        | 3-8ms        | INSERT simple                            |
| Workflow detection            | 2-5ms        | Query + comparaison                      |
| Intent classification         | 10-50ms      | Selon méthode (keyword vs AI)            |
| Knowledge search (FTS5)       | 20-100ms     | Dépend de la complexité de la requête    |
| Knowledge search (Vector)     | 100-300ms    | Calcul de similarité sur embeddings      |
| AI generation (Gemini)        | 1000-3000ms  | API externe, variable selon charge       |
| WhatsApp API: Send message    | 200-500ms    | API Meta, dépend de la latence réseau    |
| **TOTAL (AI path)**           | **1.5-4.0s** | De réception à envoi de la réponse       |
| **TOTAL (Workflow path)**     | **0.5-1.5s** | Plus rapide car pas d'IA généralement    |

---

## 🧠 Système de connaissances

### Architecture de recherche hybride

Le système de connaissances d'ISSA combine 4 stratégies de recherche complémentaires pour maximiser la pertinence des résultats.

```
┌──────────────────────────────────────────────────────────────────────┐
│           ENHANCED KNOWLEDGE SERVICE - HYBRID SEARCH                 │
└──────────────────────────────────────────────────────────────────────┘

Input: "Parle moi de takaful santé en quelques phrases"
│
├─► Extract Keywords: ["takaful", "santé", "quelques", "phrases"]
│
├─► Clean stopwords: ["takaful", "santé"]
│
└─► Execute 4 parallel search strategies:

┌─────────────────────────────────────────────────────────────────────┐
│ STRATEGY 1: KEYWORD SEARCH (Weight: 30%)                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ Method: FTS5 Full-Text Search                                      │
│                                                                      │
│ SQL Query:                                                          │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ SELECT kb.*, bm25(knowledge_fts) as score                    │   │
│ │ FROM knowledge_fts                                           │   │
│ │ JOIN knowledge_base kb ON kb.id = knowledge_fts.rowid       │   │
│ │ WHERE knowledge_fts MATCH 'takaful OR santé'                │   │
│ │ AND kb.is_active = 1                                        │   │
│ │ ORDER BY bm25(knowledge_fts)                                │   │
│ │ LIMIT 10                                                     │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│ BM25 Algorithm:                                                     │
│ - Term Frequency (TF): Fréquence du mot dans le document           │
│ - Inverse Document Frequency (IDF): Rareté du mot                  │
│ - Document Length Normalization                                     │
│                                                                      │
│ Results:                                                            │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ 1. "ROI Takaful Santé Groupe" (BM25: 15.2)                  │   │
│ │ 2. "Services ROI Takaful" (BM25: 8.7)                       │   │
│ │ 3. "Définitions Takaful" (BM25: 6.3)                        │   │
│ │ 4. "Présentation ROI Takaful" (BM25: 5.1)                   │   │
│ │ 5. "Glossaire Takaful" (BM25: 4.8)                          │   │
│ └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ STRATEGY 2: FUZZY MATCHING (Weight: 20%)                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ Method: Levenshtein Distance + Jaro-Winkler                        │
│                                                                      │
│ Process:                                                            │
│ 1. Load all active knowledge entries                               │
│ 2. For each entry:                                                 │
│    - Calculate fuzzy score for title                               │
│    - Calculate fuzzy score for keywords                            │
│    - Combine scores with weighted average                          │
│ 3. Filter: score >= 0.7 (configurable threshold)                   │
│                                                                      │
│ Formula:                                                            │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ fuzzyScore = (                                               │   │
│ │   titleScore * 0.6 +                                        │   │
│ │   keywordsScore * 0.4                                       │   │
│ │ )                                                            │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│ Results:                                                            │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ 1. "ROI Takaful Santé Groupe" (score: 0.92)                 │   │
│ │ 2. "Services Takaful" (score: 0.78)                         │   │
│ │ 3. "Notice Takaful Santé" (score: 0.74)                     │   │
│ └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ STRATEGY 3: INTENT-BASED SEARCH (Weight: 20%)                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ Method: Intent → Category Mapping                                  │
│                                                                      │
│ Intent Classification Result:                                       │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ Intent: "product_info"                                       │   │
│ │ Confidence: 0.85                                             │   │
│ │ Entities: ["takaful", "santé"]                              │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│ Intent → Category Map:                                              │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ "product_info" → [                                           │   │
│ │   "takaful_services",                                        │   │
│ │   "takaful_definitions",                                     │   │
│ │   "takaful_auto",                                            │   │
│ │   "takaful_sante_groupe"                                     │   │
│ │ ]                                                            │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│ SQL Query:                                                          │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ SELECT * FROM knowledge_base                                 │   │
│ │ WHERE category IN (                                          │   │
│ │   'takaful_services',                                        │   │
│ │   'takaful_definitions',                                     │   │
│ │   'takaful_sante_groupe'                                     │   │
│ │ )                                                            │   │
│ │ AND is_active = 1                                           │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│ Category Boost Weights:                                            │
│ - takaful_sante_groupe: 1.5x (exact match avec "santé")           │
│ - takaful_services: 1.2x                                           │
│ - takaful_definitions: 1.0x                                        │
│                                                                      │
│ Results:                                                            │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ 1. "ROI Takaful Santé Groupe" (boost: 1.5, score: 0.95)     │   │
│ │ 2. "Services Takaful" (boost: 1.2, score: 0.88)             │   │
│ │ 3. "Définitions Takaful" (boost: 1.0, score: 0.72)          │   │
│ └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ STRATEGY 4: SEMANTIC VECTOR SEARCH (Weight: 30%)                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ Method: Cosine Similarity on Embeddings                            │
│                                                                      │
│ Step 1: Generate Query Embedding                                   │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ Model: Xenova/distiluse-base-multilingual-cased-v2           │   │
│ │ Input: "Parle moi de takaful santé en quelques phrases"      │   │
│ │                                                              │   │
│ │ Pipeline:                                                    │   │
│ │ 1. Tokenization                                              │   │
│ │ 2. BERT encoding                                             │   │
│ │ 3. Mean pooling                                              │   │
│ │ 4. L2 normalization                                          │   │
│ │                                                              │   │
│ │ Output: Float32Array[768]                                    │   │
│ │ [0.023, -0.145, 0.089, ..., 0.234]                          │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│ Step 2: Load All Embeddings from DB                                │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ SELECT ke.knowledge_id, ke.embedding, kb.title               │   │
│ │ FROM knowledge_embeddings ke                                 │   │
│ │ JOIN knowledge_base kb ON kb.id = ke.knowledge_id           │   │
│ │ WHERE kb.is_active = 1                                      │   │
│ │                                                              │   │
│ │ Results: 15 embeddings loaded                                │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│ Step 3: Compute Cosine Similarity                                  │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ Formula:                                                     │   │
│ │                                                              │   │
│ │ similarity(A, B) = (A · B) / (||A|| × ||B||)                │   │
│ │                                                              │   │
│ │ Where:                                                       │   │
│ │ - A · B = dot product                                       │   │
│ │ - ||A|| = L2 norm of vector A                              │   │
│ │ - ||B|| = L2 norm of vector B                              │   │
│ │                                                              │   │
│ │ Range: [-1, 1] (higher = more similar)                     │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│ Step 4: Filter and Sort                                            │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ Threshold: 0.3 (minimum similarity)                          │   │
│ │ Sort: Descending by similarity                               │   │
│ │ Limit: Top 10 results                                        │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│ Results:                                                            │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ 1. "ROI Takaful Santé Groupe" (similarity: 0.87)            │   │
│ │ 2. "Services ROI Takaful" (similarity: 0.76)                │   │
│ │ 3. "Définitions Takaful" (similarity: 0.68)                 │   │
│ │ 4. "Notice Takaful Santé" (similarity: 0.64)                │   │
│ │ 5. "Présentation ROI Takaful" (similarity: 0.58)            │   │
│ └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ RESULTS MERGING & SCORING                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ Combine all strategy results with weighted averaging:              │
│                                                                      │
│ Formula:                                                            │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ finalScore = (                                               │   │
│ │   keywordScore × 0.30 +                                     │   │
│ │   fuzzyScore × 0.20 +                                       │   │
│ │   intentScore × 0.20 +                                      │   │
│ │   semanticScore × 0.30                                      │   │
│ │ )                                                            │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│ Deduplication:                                                      │
│ - Group by knowledge entry ID                                      │
│ - Take max score from all strategies                               │
│                                                                      │
│ Final Ranking:                                                      │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ Rank │ Title                        │ Score  │ Strategies    │   │
│ │──────┼──────────────────────────────┼────────┼──────────────│   │
│ │  1   │ ROI Takaful Santé Groupe     │ 0.945  │ All 4        │   │
│ │  2   │ Services ROI Takaful         │ 0.812  │ All 4        │   │
│ │  3   │ Définitions et Concepts      │ 0.687  │ 1,2,3,4      │   │
│ │  4   │ Notice Takaful Santé         │ 0.654  │ 2,4          │   │
│ │  5   │ Présentation ROI Takaful     │ 0.589  │ 1,3,4        │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│ Context Building for AI:                                           │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ Select top 5 entries                                         │   │
│ │ Concatenate: title + "\n\n" + content                        │   │
│ │ Max total length: 25,000 characters                          │   │
│ │ Truncate if necessary (preserve complete entries)            │   │
│ │                                                              │   │
│ │ Output Context:                                              │   │
│ │ ──────────────────────────────────────                       │   │
│ │ ROI Takaful Santé Groupe                                     │   │
│ │                                                              │   │
│ │ [Full content of entry...]                                   │   │
│ │                                                              │   │
│ │ ──────────────────────────────────────                       │   │
│ │ Services ROI Takaful                                         │   │
│ │                                                              │   │
│ │ [Full content of entry...]                                   │   │
│ │ ...                                                          │   │
│ └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Cache de connaissances

Pour optimiser les performances, un système de cache LRU (Least Recently Used) est implémenté :

```typescript
Cache Configuration:
- Max size: 100 entries
- Expiration: 3600 seconds (1 hour)
- Strategy: LRU eviction

Pre-loaded queries (warm cache on startup):
1. "roi takaful"
2. "takaful auto"
3. "assurance islamique"
4. "agences douala"
5. "sharia board"
6. "hajj"
7. "wakalah"
8. "définition takaful"
9. "contact roi"
10. "tarifs takaful"
```

---

## 🔄 Système de workflows

### Architecture des workflows

Les workflows permettent de gérer des conversations structurées multi-étapes (onboarding, souscription, etc.).

```
┌──────────────────────────────────────────────────────────────────────┐
│                    WORKFLOW ENGINE ARCHITECTURE                       │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ WORKFLOW DEFINITION STRUCTURE                                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ WorkflowDefinition {                                                │
│   id: string                    // Unique identifier               │
│   name: string                  // Display name                    │
│   description: string           // Description                     │
│   version: string               // Semantic version               │
│   initialState: string          // Starting state ID              │
│   isActive: boolean             // Can be triggered?              │
│                                                                      │
│   states: WorkflowState[] {                                         │
│     id: string                  // Unique state ID                 │
│     name: string                // Display name                    │
│     type: StateType             // output|input|processing|decision│
│     prompt?: string             // Message to display              │
│     handler?: string            // Handler function name           │
│     validation?: Validation[]   // Input validation rules          │
│     nextState?: string          // Next state (simple flow)        │
│     transitions?: Transition[]  // Conditional branching           │
│     metadata?: object           // Additional config               │
│   }                                                                 │
│                                                                      │
│   transitions?: Transition[] {                                      │
│     from: string                // Source state                    │
│     to: string                  // Target state                    │
│     condition?: Condition       // When to transition              │
│   }                                                                 │
│                                                                      │
│   metadata: object {                                                │
│     category: string                                                │
│     priority: number                                                │
│     mandatory: boolean                                              │
│     estimatedDuration: string                                       │
│     requiredData: string[]                                          │
│   }                                                                 │
│ }                                                                    │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ STATE TYPES                                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ ┌─────────────────┐                                                 │
│ │ OUTPUT          │  Display message to user, no input required    │
│ │                 │  - Show prompt                                  │
│ │                 │  - Transition to next state                     │
│ │                 │  Example: Welcome message                       │
│ └─────────────────┘                                                 │
│                                                                      │
│ ┌─────────────────┐                                                 │
│ │ INPUT           │  Wait for user input and validate              │
│ │                 │  - Show prompt (optional)                       │
│ │                 │  - Receive user message                         │
│ │                 │  - Validate against rules                       │
│ │                 │  - Store in workflow data                       │
│ │                 │  Example: "Enter your name"                     │
│ └─────────────────┘                                                 │
│                                                                      │
│ ┌─────────────────┐                                                 │
│ │ PROCESSING      │  Execute handler function                      │
│ │                 │  - Run business logic                           │
│ │                 │  - Transform data                               │
│ │                 │  - Call external services                       │
│ │                 │  - No user interaction                          │
│ │                 │  Example: Save name to database                 │
│ └─────────────────┘                                                 │
│                                                                      │
│ ┌─────────────────┐                                                 │
│ │ DECISION        │  Conditional branching                         │
│ │                 │  - Evaluate condition                           │
│ │                 │  - Choose next state based on result            │
│ │                 │  Example: If age > 18 → adult_path             │
│ └─────────────────┘                                                 │
│                                                                      │
│ ┌─────────────────┐                                                 │
│ │ COMPLETED       │  Terminal state, workflow finished             │
│ │                 │  - Mark workflow as completed                   │
│ │                 │  - Save final state                             │
│ │                 │  - Return to normal conversation                │
│ └─────────────────┘                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Workflow: Name Collection (Onboarding)

```
┌──────────────────────────────────────────────────────────────────────┐
│           WORKFLOW: NAME COLLECTION (Onboarding)                     │
│           ID: name_collection                                        │
│           Priority: 100 (Mandatory for new users)                    │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┐
│ [1] greeting_new_user                │
│ Type: OUTPUT                         │
├──────────────────────────────────────┤
│ Prompt:                              │
│ "Salam 👋 Je suis ISSA, votre       │
│  compagnon digital chez ROI Takaful │
│  ...                                 │
│  Comment puis-je vous appeler?"      │
│                                      │
│ Action:                              │
│ - Display welcome message            │
│ - Explain ISSA's role                │
│ - Ask for user's name                │
└────────────┬─────────────────────────┘
             │
             │ Auto transition
             ▼
┌──────────────────────────────────────┐
│ [2] await_name_input                 │
│ Type: INPUT                          │
├──────────────────────────────────────┤
│ Validation:                          │
│ - field: "user_name"                 │
│ - type: string                       │
│ - required: true                     │
│ - min: 2 chars                       │
│ - max: 50 chars                      │
│                                      │
│ User Input: "Kevin"                  │
│                                      │
│ Action:                              │
│ - Wait for user message              │
│ - Validate input length              │
│ - Store in workflow.data.user_name   │
└────────────┬─────────────────────────┘
             │
             │ If valid
             ▼
┌──────────────────────────────────────┐
│ [3] validate_name                    │
│ Type: PROCESSING                     │
│ Handler: validate_user_name          │
├──────────────────────────────────────┤
│ Handler Logic:                       │
│ ┌────────────────────────────────┐   │
│ │ 1. Clean name:                 │   │
│ │    - Remove special chars      │   │
│ │    - Trim whitespace           │   │
│ │    - Capitalize first letter   │   │
│ │                                │   │
│ │ 2. Check invalid patterns:     │   │
│ │    - No numbers                │   │
│ │    - No profanity              │   │
│ │    - No "test", "bot", etc.    │   │
│ │                                │   │
│ │ 3. Return result:              │   │
│ │    {                           │   │
│ │      success: true,            │   │
│ │      data: {                   │   │
│ │        cleaned_name: "Kevin"   │   │
│ │      }                          │   │
│ │    }                           │   │
│ └────────────────────────────────┘   │
└────────────┬─────────────────────────┘
             │
             │ If success
             ▼
┌──────────────────────────────────────┐
│ [4] save_name                        │
│ Type: PROCESSING                     │
│ Handler: save_user_name              │
├──────────────────────────────────────┤
│ Handler Logic:                       │
│ ┌────────────────────────────────┐   │
│ │ 1. Extract name from data      │   │
│ │    name = data.user_name       │   │
│ │                                │   │
│ │ 2. Update database:            │   │
│ │    UPDATE users                │   │
│ │    SET name = ?                │   │
│ │    WHERE id = ?                │   │
│ │                                │   │
│ │ 3. Update conversation state:  │   │
│ │    UPDATE users                │   │
│ │    SET conversation_state =    │   │
│ │        'active'                │   │
│ │    WHERE id = ?                │   │
│ │                                │   │
│ │ 4. Return success              │   │
│ └────────────────────────────────┘   │
└────────────┬─────────────────────────┘
             │
             │ If success
             ▼
┌──────────────────────────────────────┐
│ [5] welcome_message                  │
│ Type: OUTPUT                         │
├──────────────────────────────────────┤
│ Prompt (with template):              │
│ "Ravi de faire votre connaissance    │
│  *{{user_name}}* ! 🤝                │
│                                      │
│  Bienvenue dans la famille ROI       │
│  Takaful...                          │
│                                      │
│  🌙 Ce que je peux faire pour vous:  │
│  - Takaful Auto 🚗                   │
│  - Takaful Santé 🏥                  │
│  - ..."                              │
│                                      │
│ Template Variables:                  │
│ - {{user_name}}: "Kevin"             │
│                                      │
│ Action:                              │
│ - Render template with data          │
│ - Display personalized welcome       │
└────────────┬─────────────────────────┘
             │
             │ Auto transition
             ▼
┌──────────────────────────────────────┐
│ [6] completed                        │
│ Type: COMPLETED                      │
├──────────────────────────────────────┤
│ Action:                              │
│ - Mark workflow as completed         │
│ - Update workflow_contexts:          │
│   SET status = 'completed',          │
│       completed_at = NOW()           │
│ - Return to normal conversation      │
│                                      │
│ User can now:                        │
│ - Ask questions                      │
│ - Get AI responses                   │
│ - Trigger other workflows            │
└──────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ WORKFLOW CONTEXT STORAGE                                             │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ workflow_contexts table:                                            │
│ {                                                                    │
│   id: 1,                                                            │
│   user_id: 123,                                                     │
│   workflow_id: "name_collection",                                   │
│   current_state: "completed",                                       │
│   data: {                                                           │
│     user_name: "Kevin",                                             │
│     cleaned_name: "Kevin"                                           │
│   },                                                                │
│   history: [                                                        │
│     {                                                               │
│       stateId: "greeting_new_user",                                │
│       timestamp: "2025-10-10T10:00:00Z",                           │
│       result: { success: true }                                     │
│     },                                                              │
│     {                                                               │
│       stateId: "await_name_input",                                 │
│       timestamp: "2025-10-10T10:00:15Z",                           │
│       input: "Kevin",                                               │
│       result: { success: true }                                     │
│     },                                                              │
│     {                                                               │
│       stateId: "validate_name",                                    │
│       timestamp: "2025-10-10T10:00:16Z",                           │
│       result: { success: true, data: { cleaned_name: "Kevin" } }   │
│     },                                                              │
│     {                                                               │
│       stateId: "save_name",                                        │
│       timestamp: "2025-10-10T10:00:17Z",                           │
│       result: { success: true }                                     │
│     },                                                              │
│     {                                                               │
│       stateId: "welcome_message",                                  │
│       timestamp: "2025-10-10T10:00:18Z",                           │
│       result: { success: true }                                     │
│     },                                                              │
│     {                                                               │
│       stateId: "completed",                                        │
│       timestamp: "2025-10-10T10:00:19Z",                           │
│       result: { success: true }                                     │
│     }                                                               │
│   ],                                                                │
│   status: "completed",                                              │
│   started_at: "2025-10-10T10:00:00Z",                              │
│   completed_at: "2025-10-10T10:00:19Z"                             │
│ }                                                                    │
└──────────────────────────────────────────────────────────────────────┘
```

### Workflow Detection

```
┌──────────────────────────────────────────────────────────────────────┐
│                    WORKFLOW DETECTION LOGIC                          │
└──────────────────────────────────────────────────────────────────────┘

When user has no active workflow:

1. Check user conversation state:
   ┌──────────────────────────────────┐
   │ IF state = 'greeting'            │
   │ OR state = 'name_collection'     │
   │ → Trigger name_collection        │
   │   workflow                        │
   └──────────────────────────────────┘

2. Pattern matching on user message:
   ┌──────────────────────────────────┐
   │ Patterns:                        │
   │ - "je veux souscrire"            │
   │ - "acheter assurance"            │
   │ - "nouveau contrat"              │
   │ - "m'assurer"                    │
   │ - "souscription"                 │
   │                                  │
   │ → Trigger product_purchase       │
   │   workflow                        │
   └──────────────────────────────────┘

3. Intent-based detection:
   ┌──────────────────────────────────┐
   │ IF intent = 'purchase_intent'    │
   │ → Trigger product_purchase       │
   │   workflow                        │
   └──────────────────────────────────┘

4. No workflow detected:
   ┌──────────────────────────────────┐
   │ → Continue with AI generation    │
   │   (knowledge search + Gemini)    │
   └──────────────────────────────────┘
```

---

## 🧩 Modules et services

### Architecture en couches

```
┌──────────────────────────────────────────────────────────────────────┐
│                     CLEAN ARCHITECTURE LAYERS                        │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ PRESENTATION LAYER (Interfaces externes)                            │
├─────────────────────────────────────────────────────────────────────┤
│ • whatsappWebhook.ts           Webhooks WhatsApp                    │
│ • routes/                       Routing Express                     │
│ • middlewares/                  Validation, Rate limiting, Security │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ CONTROLLER LAYER (Orchestration)                                    │
├─────────────────────────────────────────────────────────────────────┤
│ • ConversationController        Gère le flux de conversation        │
│   - handleIncomingMessage()     Réception messages                  │
│   - handleMessageStatus()       Statuts messages                    │
│   - processMessageAsync()       Traitement asynchrone               │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ APPLICATION LAYER (Business Logic)                                  │
├─────────────────────────────────────────────────────────────────────┤
│ • ConversationService           Orchestrateur principal              │
│   - processMessage()            Traite les messages                 │
│   - handleWorkflowStep()        Gère les workflows                  │
│   - handleNoActiveWorkflow()    Génération IA                       │
│                                                                      │
│ • WorkflowEngine                Moteur de workflows                 │
│   - executeStep()               Exécute une étape                   │
│   - getActiveWorkflow()         Récupère workflow actif             │
│   - detectWorkflow()            Détecte déclencheurs                │
│                                                                      │
│ • IntentClassifier              Classification d'intentions         │
│   - classify()                  Classifie le message                │
│   - extractEntities()           Extrait les entités                 │
│                                                                      │
│ • EnhancedKnowledgeService      Recherche de connaissances          │
│   - search()                    Recherche hybride                   │
│   - keywordSearch()             FTS5                                │
│   - semanticSearch()            Vecteurs                            │
│   - fuzzySearch()               Fuzzy matching                      │
│   - intentBasedSearch()         Par intention                       │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ DOMAIN LAYER (Services métier)                                      │
├─────────────────────────────────────────────────────────────────────┤
│ • AIService                     Intégration IA                      │
│   - generateResponse()          Génère réponse IA                   │
│   - callGemini()                API Gemini                          │
│   - buildContext()              Construction contexte               │
│                                                                      │
│ • WhatsAppService               Intégration WhatsApp                │
│   - sendTextMessage()           Envoie message                      │
│   - markMessageAsRead()         Marque comme lu                     │
│   - sendErrorMessage()          Envoie message d'erreur             │
│                                                                      │
│ • DatabaseService               Accès données                       │
│   - getOrCreateUser()           Gère utilisateurs                   │
│   - saveConversationMessage()   Sauvegarde messages                 │
│   - searchKnowledgeBase()       Recherche connaissances             │
│                                                                      │
│ • VectorSearchService           Recherche vectorielle               │
│   - generateEmbedding()         Génère embeddings                   │
│   - computeSimilarity()         Calcule similarité                  │
│                                                                      │
│ • KnowledgeService              Gestion connaissances               │
│   - initializeKnowledgeBase()   Initialise la base                  │
│   - loadDocuments()             Charge documents                    │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ INFRASTRUCTURE LAYER (Implémentations techniques)                   │
├─────────────────────────────────────────────────────────────────────┤
│ • core/http/HttpClient          Client HTTP réutilisable            │
│ • core/errors/ErrorHandler      Gestion centralisée erreurs         │
│ • core/di/Container             Injection de dépendances            │
│ • utils/logger                  Logging Winston                     │
│ • utils/phoneUtils              Utilitaires téléphone               │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ DATA LAYER (Persistence)                                            │
├─────────────────────────────────────────────────────────────────────┤
│ • SQLite Database               Base de données locale              │
│ • FTS5 Virtual Tables           Recherche full-text                 │
│ • BLOB Storage                  Embeddings vectoriels               │
└─────────────────────────────────────────────────────────────────────┘
```

### Services détaillés

#### ConversationService

**Responsabilités:**
- Orchestration du flux conversationnel
- Gestion des workflows actifs
- Coordination entre classification d'intentions, recherche de connaissances et génération IA

**Méthodes principales:**
```typescript
class ConversationService {
  async processMessage(
    phoneNumber: string,
    messageId: string,
    userMessage: string
  ): Promise<{ response: string; shouldContinue: boolean }>

  private async handleWorkflowStep(
    user: User,
    workflow: WorkflowContext,
    userInput: string,
    messageId: string
  ): Promise<string>

  private async handleNoActiveWorkflow(
    user: User,
    userMessage: string,
    messageId: string
  ): Promise<string>

  private cleanMarkdownForWhatsApp(text: string): string
}
```

#### WorkflowEngine

**Responsabilités:**
- Exécution des workflows conversationnels
- Gestion des états et transitions
- Persistance du contexte workflow

**Méthodes principales:**
```typescript
class WorkflowEngine {
  async executeStep(
    workflow: WorkflowDefinition,
    context: WorkflowContext,
    userInput: string
  ): Promise<WorkflowStepResult>

  async getActiveWorkflow(userId: number): Promise<WorkflowContext | null>

  detectWorkflow(message: string, intent?: Intent): WorkflowDefinition | null

  registerWorkflow(workflow: WorkflowDefinition): void

  registerHandler(handler: WorkflowHandler): void
}
```

#### EnhancedKnowledgeService

**Responsabilités:**
- Recherche hybride dans la base de connaissances
- Fusion et scoring des résultats de multiples stratégies
- Cache LRU pour optimisation performances

**Configuration:**
```typescript
interface SearchStrategy {
  name: string;
  method: 'keyword' | 'fuzzy' | 'intent_based' | 'semantic';
  weight: number;      // 0.0 - 1.0
  enabled: boolean;
}

const defaultStrategies: SearchStrategy[] = [
  { name: 'keyword', method: 'keyword', weight: 0.3, enabled: true },
  { name: 'fuzzy', method: 'fuzzy', weight: 0.2, enabled: true },
  { name: 'intent_based', method: 'intent_based', weight: 0.2, enabled: true },
  { name: 'semantic', method: 'semantic', weight: 0.3, enabled: true }
];
```

#### AIService

**Responsabilités:**
- Intégration avec providers IA (Gemini, OpenAI, DeepSeek)
- Construction du contexte conversationnel
- Tracking de l'utilisation de tokens

**Configuration:**
```typescript
interface AIConfig {
  provider: 'gemini' | 'openai' | 'deepseek';
  apiKey: string;
  model: string;
  baseUrl?: string;
}

// Prompts système
const SYSTEM_PROMPT = `
Tu es ISSA (Intelligent System for Support & Assistance),
l'assistant virtuel officiel de ROI Takaful...

RÈGLES IMPORTANTES:
- Tu dois TOUJOURS utiliser le contexte fourni pour répondre
- Ton ton doit être amical, professionnel et empathique
- Tu ne dois jamais inventer d'informations
- Tu es expert en assurance Takaful conforme à la Charia
...
`;
```

---

## 💉 Injection de dépendances

### Container DI

ISSA utilise un container d'injection de dépendances custom pour gérer les services.

```typescript
┌──────────────────────────────────────────────────────────────────────┐
│                    DEPENDENCY INJECTION CONTAINER                    │
└──────────────────────────────────────────────────────────────────────┘

TOKENS (Service Identifiers):
├─ WHATSAPP_HTTP_CLIENT          HttpClient pour WhatsApp API
├─ AI_HTTP_CLIENT                HttpClient pour Gemini API
├─ HTTP_CLIENT                   HttpClient générique
├─ WHATSAPP_SERVICE              IWhatsAppService
├─ DATABASE_SERVICE              DatabaseService
├─ AI_SERVICE                    AIService
├─ KNOWLEDGE_SERVICE             KnowledgeService (legacy)
├─ ENHANCED_KNOWLEDGE_SERVICE    EnhancedKnowledgeService
├─ VECTOR_SEARCH_SERVICE         VectorSearchService
├─ VALIDATION_SERVICE            ValidationService
├─ INTENT_CLASSIFIER             IntentClassifier
├─ WORKFLOW_ENGINE               WorkflowEngine
├─ CONVERSATION_SERVICE          ConversationService
├─ CONVERSATION_CONTROLLER       ConversationController
└─ INITIALIZATION_SERVICE        InitializationService

Registration Flow:
1. ServiceConfig.initialize()
2. setupErrorHandling()
3. registerHttpClients()
4. registerServices()
5. All services registered in container

Resolution Flow:
container.resolve(TOKENS.CONVERSATION_SERVICE)
  → Resolves dependencies recursively:
    ├─ DatabaseService
    ├─ AIService
    │  └─ AI_HTTP_CLIENT
    ├─ WorkflowEngine
    │  └─ DatabaseService
    ├─ IntentClassifier
    └─ EnhancedKnowledgeService
       ├─ DatabaseService
       └─ VectorSearchService

Lifecycle:
- Singleton: Services are instantiated once and reused
- Lazy: Services are created on first resolve()
- Reset: container.clear() removes all registrations
```

### Exemple d'enregistrement

```typescript
// src/core/config/ServiceConfig.ts

container.register(TOKENS.CONVERSATION_SERVICE, async () => {
  const databaseService = await container.resolve(TOKENS.DATABASE_SERVICE);
  const aiService = await container.resolve(TOKENS.AI_SERVICE);
  const workflowEngine = await container.resolve(TOKENS.WORKFLOW_ENGINE);
  const intentClassifier = await container.resolve(TOKENS.INTENT_CLASSIFIER);
  const knowledgeService = await container.resolve(TOKENS.ENHANCED_KNOWLEDGE_SERVICE);

  return new ConversationService(
    databaseService,
    aiService,
    workflowEngine,
    intentClassifier,
    knowledgeService
  );
});
```

---

## 🌐 Intégrations externes

### WhatsApp Business API

```
┌──────────────────────────────────────────────────────────────────────┐
│                    WHATSAPP CLOUD API INTEGRATION                    │
└──────────────────────────────────────────────────────────────────────┘

Base URL: https://graph.facebook.com/v21.0

Authentication:
  Header: Authorization: Bearer {ACCESS_TOKEN}

Endpoints utilisés:

1. Send Message
   POST /{phone_number_id}/messages
   Body: {
     messaging_product: "whatsapp",
     to: "237XXXXXXXX",
     type: "text",
     text: { body: "Message content" }
   }

2. Mark Message as Read
   POST /{phone_number_id}/messages
   Body: {
     messaging_product: "whatsapp",
     status: "read",
     message_id: "wamid.xxx"
   }

3. Send Typing Indicator
   POST /{phone_number_id}/messages
   Body: {
     messaging_product: "whatsapp",
     to: "237XXXXXXXX",
     type: "typing",
     typing: { state: "on" }  // or "off"
   }

Webhooks reçus:
├─ messages              Messages entrants
├─ statuses              Statuts (sent, delivered, read)
├─ errors                Erreurs d'envoi
└─ customer_identity     Changements de profil

Rate Limits:
- 1000 messages/seconde par phone_number_id
- 80 messages/seconde par destinataire
- Application: 50 webhooks/min (configuré)
```

### Google Gemini API

```
┌──────────────────────────────────────────────────────────────────────┐
│                    GOOGLE GEMINI 2.5 FLASH API                       │
└──────────────────────────────────────────────────────────────────────┘

Base URL: https://generativelanguage.googleapis.com/v1beta

Authentication:
  Header: x-goog-api-key: {API_KEY}

Model: gemini-2.5-flash

Endpoint:
  POST /models/gemini-2.5-flash:generateContent

Request Body:
{
  systemInstruction: "System prompt...",
  contents: [{
    role: "user",
    parts: [{ text: "User message" }]
  }, {
    role: "model",
    parts: [{ text: "Bot response" }]
  }]
}

Response:
{
  candidates: [{
    content: {
      parts: [{ text: "Generated response" }]
    }
  }],
  usageMetadata: {
    promptTokenCount: 123,
    candidatesTokenCount: 456,
    totalTokenCount: 579
  }
}

Features utilisées:
- systemInstruction: Contexte et personnalité d'ISSA
- Multi-turn conversation: Historique des messages
- Long context: Jusqu'à 25k caractères de contexte
- Fast inference: < 3s de génération

Rate Limits:
- 10 requests/second
- 4M tokens/minute
```

---

## 📊 Métriques et monitoring

### Logs

```
Winston Logger Configuration:
├─ Console transport (development)
│  Level: debug
│  Format: colorized + timestamp
│
├─ File transport (combined.log)
│  Level: info
│  Max size: 10MB
│  Max files: 5
│  Format: JSON
│
└─ File transport (error.log)
   Level: error
   Max size: 10MB
   Max files: 5
   Format: JSON

Custom log methods:
- logger.logWhatsAppMessage(direction, phone, message)
- logger.info(message, metadata)
- logger.error(message, errorObject)
- logger.debug(message, metadata)
```

### Métriques clés

```
Conversation Metrics:
├─ Response time: Temps total de traitement
├─ AI tokens used: Nombre de tokens consommés
├─ Knowledge results: Nombre de résultats trouvés
├─ Workflow completion rate: Taux de succès workflows
└─ Error rate: Taux d'erreurs par type

Performance Metrics:
├─ FTS5 search time: < 100ms (95th percentile)
├─ Vector search time: < 300ms (95th percentile)
├─ AI generation time: < 3s (95th percentile)
└─ Total response time: < 4s (95th percentile)

User Metrics:
├─ Active users (24h)
├─ New users (24h)
├─ Messages per user (avg)
├─ Conversation state distribution
└─ Workflow completion stats
```

---

## 🔐 Sécurité

### Mesures de sécurité

```
1. Webhook Validation
   ├─ HMAC signature verification
   ├─ Verify token validation
   └─ Request origin validation

2. Rate Limiting
   ├─ Global: 100 req/15min
   ├─ Webhook: 50 req/min
   ├─ User: 50 msg/min
   └─ Admin: 20 req/15min

3. Input Validation
   ├─ Schema validation (Joi/Zod)
   ├─ Phone number sanitization
   ├─ XSS prevention
   └─ SQL injection prevention (prepared statements)

4. API Security
   ├─ HTTPS only
   ├─ Helmet.js security headers
   ├─ CORS configuration
   └─ Body size limits (10MB)

5. Data Protection
   ├─ Environment variables (.env)
   ├─ No secrets in code
   ├─ Database encryption at rest (optional)
   └─ Secure API key storage
```

---

## 🚀 Déploiement

### Architecture de déploiement

```
┌──────────────────────────────────────────────────────────────────────┐
│                     DEPLOYMENT ARCHITECTURE                          │
└──────────────────────────────────────────────────────────────────────┘

Production Server: VPS Ubuntu 22.04
IP: 51.178.80.188
Domain: issa-bot.roi-takaful.cm (exemple)

Process Manager: PM2
├─ App name: issa
├─ Instances: 1
├─ Mode: fork
├─ Auto-restart: enabled
└─ Log management: enabled

Directory Structure:
/var/www/html/issa/
├─ src/                Source TypeScript
├─ dist/               Compiled JavaScript
├─ data/               SQLite database
├─ logs/               Application logs
├─ node_modules/       Dependencies
├─ .env                Environment variables
└─ package.json        NPM configuration

Deployment Flow:
1. Local: npm run build
2. Local: git commit && git push
3. Server: git pull origin chat-review
4. Server: npm run build
5. Server: pm2 restart issa
6. Server: pm2 logs issa (verification)

Environment Variables (.env):
PORT=3005
NODE_ENV=production
AI_PROVIDER=gemini
AI_API_KEY=AIzaSy...
AI_MODEL=gemini-2.5-flash
WHATSAPP_PHONE_NUMBER_ID=753901164463279
WHATSAPP_ACCESS_TOKEN=EAAP...
WHATSAPP_WEBHOOK_VERIFY_TOKEN=...
DB_PATH=./data/issa.db
```

---

## 📝 Conclusion

Cette documentation technique couvre l'intégralité du système ISSA, du webhook WhatsApp à la génération de réponses IA. L'architecture modulaire basée sur Clean Architecture et l'injection de dépendances permet une maintenance facile et une évolutivité future.

**Points clés:**
- ✅ Recherche hybride ultra-performante (FTS5 + Vecteurs)
- ✅ Workflows conversationnels extensibles
- ✅ Intégration IA multi-provider
- ✅ Architecture propre et testable
- ✅ Sécurité et rate limiting robustes

**Prochaines évolutions possibles:**
- Support multilingue (Anglais)
- Webhooks pour intégrations tierces
- Dashboard analytics
- A/B testing de prompts IA
- Amélioration des workflows (paiement, claims, etc.)

---

**Généré avec ❤️ par Claude Code**
**© 2025 ROI Takaful - Tous droits réservés**
