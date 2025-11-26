"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productPurchaseWorkflow = void 0;
exports.productPurchaseWorkflow = {
    id: 'product_purchase',
    name: 'Souscription Produit Takaful',
    description: 'Workflow guidé pour la souscription à un produit d\'assurance Takaful',
    version: '1.0.0',
    initialState: 'welcome',
    isActive: true,
    states: [
        {
            id: 'welcome',
            name: 'Message de bienvenue',
            type: 'output',
            prompt: `Parfait ! Je vais vous guider dans la souscription à un produit Takaful.

Ce processus ne prendra que quelques minutes. Nous allons collecter les informations nécessaires pour votre souscription.

Êtes-vous prêt(e) à commencer ?
Répondez par *Oui* pour continuer ou *Non* pour annuler.`,
            nextState: 'await_confirmation'
        },
        {
            id: 'await_confirmation',
            name: 'Attente de confirmation',
            type: 'decision',
            validation: [
                {
                    field: 'start_confirmation',
                    type: 'regex',
                    pattern: '^(oui|non|yes|no)$',
                    message: 'Veuillez répondre par *Oui* ou *Non*'
                }
            ],
            metadata: {
                acceptValues: ['oui', 'yes'],
                rejectValues: ['non', 'no']
            }
        },
        {
            id: 'select_product',
            name: 'Sélection du produit',
            type: 'input',
            prompt: `Quel produit Takaful souhaitez-vous souscrire ?

1️⃣ *Takaful Auto* - Assurance automobile conforme à la Charia
2️⃣ *Takaful Santé* - Couverture santé et hospitalisation
3️⃣ *Takaful Habitation* - Protection de votre domicile
4️⃣ *Takaful Vie* - Protection de votre famille

Répondez avec le numéro (1, 2, 3 ou 4)`,
            validation: [
                {
                    field: 'product_type',
                    type: 'enum',
                    options: ['1', '2', '3', '4'],
                    message: 'Veuillez choisir un numéro entre 1 et 4'
                }
            ],
            nextState: 'collect_full_name'
        },
        {
            id: 'collect_full_name',
            name: 'Collecte nom complet',
            type: 'input',
            prompt: `Excellent choix !

Pour continuer, quel est votre *nom complet* ?`,
            validation: [
                {
                    field: 'full_name',
                    type: 'string',
                    required: true,
                    min: 3,
                    max: 100,
                    message: 'Veuillez entrer votre nom complet (minimum 3 caractères)'
                }
            ],
            nextState: 'collect_phone'
        },
        {
            id: 'collect_phone',
            name: 'Collecte téléphone',
            type: 'input',
            prompt: `Merci *{{full_name}}* !

Quel est votre *numéro de téléphone* ?
(Format: +237XXXXXXXXX ou 6XXXXXXXX)`,
            validation: [
                {
                    field: 'phone_number',
                    type: 'phone',
                    message: 'Veuillez entrer un numéro de téléphone valide (ex: +237691100575 ou 691100575)'
                }
            ],
            nextState: 'collect_email'
        },
        {
            id: 'collect_email',
            name: 'Collecte email',
            type: 'input',
            prompt: `Quelle est votre *adresse email* ?`,
            validation: [
                {
                    field: 'email',
                    type: 'email',
                    message: 'Veuillez entrer une adresse email valide'
                }
            ],
            nextState: 'collect_address'
        },
        {
            id: 'collect_address',
            name: 'Collecte adresse',
            type: 'input',
            prompt: `Quelle est votre *adresse complète* ?
(Ville, quartier, rue)`,
            validation: [
                {
                    field: 'address',
                    type: 'string',
                    required: true,
                    min: 10,
                    max: 200,
                    message: 'Veuillez entrer votre adresse complète (minimum 10 caractères)'
                }
            ],
            nextState: 'generate_summary'
        },
        {
            id: 'generate_summary',
            name: 'Génération du récapitulatif',
            type: 'processing',
            handler: 'generate_purchase_summary',
            nextState: 'show_summary'
        },
        {
            id: 'show_summary',
            name: 'Affichage du récapitulatif',
            type: 'output',
            prompt: `📋 *RÉCAPITULATIF DE VOTRE DEMANDE*

✅ Produit: {{product_name}}
👤 Nom: {{full_name}}
📱 Téléphone: {{phone_number}}
📧 Email: {{email}}
📍 Adresse: {{address}}

---

Veuillez vérifier ces informations attentivement.

Confirmez-vous ces informations ?
Répondez par *Oui* pour confirmer ou *Non* pour recommencer`,
            nextState: 'final_confirmation'
        },
        {
            id: 'final_confirmation',
            name: 'Confirmation finale',
            type: 'decision',
            validation: [
                {
                    field: 'final_confirmation',
                    type: 'regex',
                    pattern: '^(oui|non|yes|no)$',
                    message: 'Veuillez répondre par *Oui* ou *Non*'
                }
            ]
        },
        {
            id: 'process_subscription',
            name: 'Traitement de la souscription',
            type: 'processing',
            handler: 'process_subscription',
            nextState: 'success'
        },
        {
            id: 'success',
            name: 'Souscription réussie',
            type: 'output',
            prompt: `🎉 *SOUSCRIPTION ENREGISTRÉE AVEC SUCCÈS !*

Merci *{{full_name}}* pour votre confiance !

📄 Votre demande de souscription a été enregistrée. Un conseiller ROI Takaful vous contactera dans les *24 heures* pour finaliser votre dossier.

📞 En cas d'urgence, contactez-nous :
• Téléphone: +237 691 100 575
• Email: contact@roitakaful.com

🌙 Bienvenue dans la famille ROI Takaful !`,
            nextState: 'completed'
        },
        {
            id: 'cancelled',
            name: 'Annulation',
            type: 'output',
            prompt: `❌ *Souscription annulée*

Aucun problème ! Si vous changez d'avis, n'hésitez pas à me recontacter.

Comment puis-je vous aider autrement ?`
        },
        {
            id: 'completed',
            name: 'Workflow terminé',
            type: 'completed'
        }
    ],
    transitions: [
        {
            from: 'await_confirmation',
            to: 'select_product',
            condition: "data.start_confirmation === 'oui' || data.start_confirmation === 'yes'",
            priority: 10
        },
        {
            from: 'await_confirmation',
            to: 'cancelled',
            condition: "data.start_confirmation === 'non' || data.start_confirmation === 'no'",
            priority: 10
        },
        {
            from: 'final_confirmation',
            to: 'process_subscription',
            condition: "data.final_confirmation === 'oui' || data.final_confirmation === 'yes'",
            priority: 10
        },
        {
            from: 'final_confirmation',
            to: 'select_product',
            condition: "data.final_confirmation === 'non' || data.final_confirmation === 'no'",
            priority: 10
        }
    ],
    metadata: {
        category: 'sales',
        estimatedDuration: '5-10 minutes',
        requiredData: ['product_type', 'full_name', 'phone_number', 'email', 'address']
    }
};
//# sourceMappingURL=productPurchaseWorkflow.js.map