# First Bank Connect Bot

Bot bancaire intelligent utilisant WhatsApp Business API et DeepSeek AI pour fournir une assistance bancaire automatisée.

## 🚀 Fonctionnalités

- **Intégration WhatsApp Business API** : Réception et envoi de messages via WhatsApp
- **Intelligence Artificielle** : Utilisation de DeepSeek AI pour générer des réponses intelligentes
- **Sécurité** : Validation des webhooks, rate limiting, et gestion des erreurs
- **Monitoring** : Logs détaillés et health checks
- **Scalabilité** : Architecture modulaire et extensible

## 📋 Prérequis

- Node.js >= 18.0.0
- npm ou yarn
- Compte WhatsApp Business API
- Clé API DeepSeek

## 🛠️ Installation

1. **Cloner le projet**
```bash
git clone <repository-url>
cd whatsapp-banking-bot
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer les variables d'environnement**

Copiez le fichier `.env` et remplissez vos clés :

```bash
# Configuration du serveur
PORT=3000
NODE_ENV=development

# Configuration WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id_here
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_webhook_verify_token_here
WHATSAPP_APP_SECRET=your_app_secret_here

# Configuration DeepSeek AI
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# Configuration de sécurité
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_encryption_key_here
```

4. **Compiler le TypeScript**
```bash
npm run build
```

## 🚀 Utilisation

### Développement
```bash
npm run dev
```

### Production
```bash
npm start
```

### Tests
```bash
npm test
```

## 📡 Configuration du Webhook

1. **URL du webhook** : `https://votre-domaine.com/webhook`
2. **Token de vérification** : Utilisez la valeur de `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
3. **Événements à souscrire** : `messages`

## 🔧 API Endpoints

### Webhook WhatsApp
- `GET /webhook` - Vérification du webhook
- `POST /webhook` - Réception des messages

### Monitoring
- `GET /health` - Health check complet
- `GET /ping` - Ping simple
- `GET /admin/stats` - Statistiques des messages

### Administration (Développement)
- `POST /admin/send-test` - Envoyer un message de test
- `GET /admin/profile` - Informations du profil WhatsApp Business

## 🏗️ Architecture

```
src/
├── app.ts                    # Point d'entrée Express
├── config/                   # Configuration et variables d'environnement
├── controllers/              # Logique de traitement des messages
├── services/                 # Services externes (WhatsApp, DeepSeek)
├── middlewares/             # Validation, sécurité, rate limiting
├── utils/                    # Utilitaires (logs, validation)
├── types/                    # Types TypeScript
└── webhooks/                # Webhooks WhatsApp
```

## 🔒 Sécurité

- **Validation des signatures** : Vérification des webhooks WhatsApp
- **Rate limiting** : Protection contre les abus
- **Validation des données** : Validation stricte des messages entrants
- **Logs sécurisés** : Pas de logs des données sensibles

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:3000/health
```

### Logs
Les logs sont formatés en JSON et incluent :
- Timestamp
- Niveau (info, warn, error, debug)
- Message
- Métadonnées contextuelles

## 🚦 Rate Limiting

- **Général** : 100 requêtes par 15 minutes
- **Webhook** : 50 messages par minute par utilisateur
- **IA** : 10 appels par minute par utilisateur
- **Admin** : 20 requêtes par 15 minutes

## 🔄 Workflow des Messages

1. **Réception** : Message reçu via webhook WhatsApp
2. **Validation** : Vérification de la signature et structure
3. **Rate Limiting** : Vérification des limites utilisateur
4. **Traitement** : Envoi du message à DeepSeek AI
5. **Réponse** : Envoi de la réponse via WhatsApp
6. **Logging** : Enregistrement de toutes les étapes

## 🛠️ Développement

### Structure des commits
```
feat: nouvelle fonctionnalité
fix: correction de bug
docs: documentation
style: formatage
refactor: refactoring
test: tests
chore: maintenance
```

### Tests
```bash
# Tests unitaires
npm test

# Tests avec couverture
npm run test:coverage

# Tests en mode watch
npm run test:watch
```

## 📝 TODO

- [ ] Intégration base de données pour le contexte utilisateur
- [ ] Authentification bancaire sécurisée
- [ ] API bancaire pour les opérations réelles
- [ ] Interface d'administration web
- [ ] Métriques et analytics avancées
- [ ] Support multilingue
- [ ] Tests end-to-end

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 📞 Support

Pour toute question ou problème :
- Créer une issue sur GitHub
- Contacter l'équipe de développement

## 🔗 Liens utiles

- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp)
- [DeepSeek API Documentation](https://platform.deepseek.com/api-docs/)
- [Express.js Documentation](https://expressjs.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/)