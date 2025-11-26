"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nameCollectionWorkflow = void 0;
exports.nameCollectionWorkflow = {
    id: 'name_collection',
    name: 'Collecte du Nom (Onboarding)',
    description: 'Workflow de bienvenue pour collecter le nom/pseudo de l\'utilisateur',
    version: '1.0.0',
    initialState: 'greeting_new_user',
    isActive: true,
    states: [
        {
            id: 'greeting_new_user',
            name: 'Salutation nouvel utilisateur',
            type: 'output',
            prompt: `Salam 👋 Je suis *ISSA*, votre compagnon digital chez *ROI Takaful* 🌙

Je suis là pour vous écouter, vous guider et répondre à vos questions sur nos produits d'assurance conformes à la Charia.

Avant de commencer, comment puis-je vous appeler ? ✍️
(J'aime bien savoir avec qui je discute, ça rend la conversation plus conviviale 😉)`,
            nextState: 'await_name_input',
            metadata: {
                skipValidation: true
            }
        },
        {
            id: 'await_name_input',
            name: 'Attente du nom',
            type: 'input',
            validation: [
                {
                    field: 'user_name',
                    type: 'string',
                    required: true,
                    min: 2,
                    max: 50,
                    message: 'Veuillez entrer un nom valide (minimum 2 caractères, maximum 50)'
                }
            ],
            nextState: 'validate_name',
            metadata: {
                retryOnFailure: true,
                maxRetries: 3
            }
        },
        {
            id: 'validate_name',
            name: 'Validation du nom',
            type: 'processing',
            handler: 'validate_user_name',
            nextState: 'save_name'
        },
        {
            id: 'save_name',
            name: 'Sauvegarde du nom',
            type: 'processing',
            handler: 'save_user_name',
            nextState: 'welcome_message'
        },
        {
            id: 'welcome_message',
            name: 'Message de bienvenue personnalisé',
            type: 'output',
            prompt: `Ravi de faire votre connaissance *{{user_name}}* ! 🤝

Bienvenue dans la famille ROI Takaful, où l'assurance rime avec transparence et conformité à la Charia islamique.

🌙 *Ce que je peux faire pour vous :*

📋 Vous informer sur nos produits Takaful :
   • Takaful Auto 🚗
   • Takaful Santé 🏥
   • Takaful Habitation 🏠
   • Takaful Vie 👨‍👩‍👧‍👦

💼 Vous accompagner dans vos souscriptions

📞 Vous orienter vers nos conseillers

💬 Répondre à toutes vos questions

Comment puis-je vous aider aujourd'hui ?`,
            nextState: 'completed'
        },
        {
            id: 'completed',
            name: 'Onboarding terminé',
            type: 'completed'
        }
    ],
    transitions: [],
    metadata: {
        category: 'onboarding',
        priority: 100,
        mandatory: true,
        estimatedDuration: '30 secondes',
        requiredData: ['user_name']
    }
};
//# sourceMappingURL=nameCollectionWorkflow.js.map