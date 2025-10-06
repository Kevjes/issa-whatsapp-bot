#!/usr/bin/env ts-node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.testNormalization = main;
const queryNormalizer_1 = require("../utils/queryNormalizer");
const logger_1 = require("../utils/logger");
const databaseService_1 = require("../services/databaseService");
const knowledgeService_1 = require("../services/knowledgeService");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
async function testNormalizerOnly() {
    console.log('\n' + '='.repeat(80));
    console.log('🔬 TESTS QUERYNORMALIZER - Analyse de Requêtes');
    console.log('='.repeat(80) + '\n');
    const normalizer = new queryNormalizer_1.QueryNormalizer();
    const testQueries = [
        'ASSURANCE',
        'Assurances',
        'assurancé',
        'assuré',
        'takaful',
        'takafuls',
        'services',
        'service',
        'assurance islamique',
        'halal',
        'protection',
        'couverture',
        'qu\'est-ce que le takaful',
        'comment souscrire',
        'agences à Douala',
        'wakalah',
        'moudharaba',
        'sharia board',
        'véhicule',
        'automobile',
        'auto',
        'voiture',
        'Je veux une assurance santé islamique',
        'Quelles sont vos agences?',
        'Contact ROI Takaful'
    ];
    for (const query of testQueries) {
        console.log('\n' + '-'.repeat(80));
        console.log(`📝 Requête: "${query}"`);
        console.log('-'.repeat(80));
        const analysis = normalizer.analyze(query);
        console.log(`\n  🔤 Normalisé: "${analysis.normalized}"`);
        console.log(`  🎯 Mots-clés: [${analysis.keywords.join(', ')}]`);
        console.log(`  🌱 Stems: [${analysis.stems.join(', ')}]`);
        if (analysis.synonyms.length > 0) {
            console.log(`  🔄 Synonymes: [${analysis.synonyms.slice(0, 5).join(', ')}${analysis.synonyms.length > 5 ? '...' : ''}]`);
        }
        console.log(`  📊 Expansion: ${analysis.keywords.length} → ${analysis.expanded.length} termes`);
        console.log(`  🌍 Langue: ${analysis.language}`);
        console.log(`\n  🔍 Requête FTS5:`);
        console.log(`     ${analysis.fts5Query.substring(0, 150)}${analysis.fts5Query.length > 150 ? '...' : ''}`);
        if (analysis.likePatterns.length > 0) {
            console.log(`\n  💾 Patterns LIKE (fallback): [${analysis.likePatterns.slice(0, 3).join(', ')}...]`);
        }
    }
}
async function testWithDatabase() {
    console.log('\n\n' + '='.repeat(80));
    console.log('🔍 TESTS AVEC BASE DE DONNÉES - Recherche Améliorée');
    console.log('='.repeat(80) + '\n');
    let databaseService = null;
    try {
        databaseService = new databaseService_1.DatabaseService();
        await databaseService.initialize();
        const knowledgeService = new knowledgeService_1.KnowledgeService(databaseService);
        logger_1.logger.info('✅ Services initialisés pour tests');
        const testCases = [
            {
                title: 'Test Accents',
                queries: ['assurance', 'assurancé', 'assuré']
            },
            {
                title: 'Test Synonymes',
                queries: ['assurance islamique', 'halal', 'charia', 'protection islamique']
            },
            {
                title: 'Test Pluriels',
                queries: ['service', 'services', 'produit', 'produits']
            },
            {
                title: 'Test Variations Orthographiques',
                queries: ['wakalah', 'wakala', 'moudharaba', 'mudaraba']
            },
            {
                title: 'Test Termes Composés',
                queries: ['qu\'est-ce que takaful', 'définition takaful', 'explication takaful']
            },
            {
                title: 'Test Localisation',
                queries: ['Douala', 'agences Douala', 'bureau Douala']
            }
        ];
        for (const testCase of testCases) {
            console.log('\n' + '━'.repeat(80));
            console.log(`📋 ${testCase.title}`);
            console.log('━'.repeat(80));
            for (const query of testCase.queries) {
                const startTime = Date.now();
                const results = await knowledgeService.search(query);
                const duration = Date.now() - startTime;
                console.log(`\n  🔎 "${query}"`);
                console.log(`     ⏱️  ${duration}ms`);
                console.log(`     📊 ${results.length} résultats`);
                if (results.length > 0) {
                    console.log(`     ✅ ${results.slice(0, 2).map(r => r.title).join(', ')}`);
                }
                else {
                    console.log(`     ❌ Aucun résultat`);
                }
            }
        }
        console.log('\n\n' + '='.repeat(80));
        console.log('📊 COMPARAISON AVANT/APRÈS NORMALISATION');
        console.log('='.repeat(80) + '\n');
        const compareQueries = [
            'assurances islamiques',
            'véhicule',
            'qu\'est ce que takaful',
            'agence douala'
        ];
        for (const query of compareQueries) {
            console.log(`\n🔬 Requête: "${query}"`);
            const startNormalized = Date.now();
            const resultsNormalized = await knowledgeService.search(query);
            const durationNormalized = Date.now() - startNormalized;
            console.log(`  ✅ Avec normalisation: ${resultsNormalized.length} résultats en ${durationNormalized}ms`);
            const startRaw = Date.now();
            const resultsRaw = await databaseService.searchKnowledgeBase(query);
            const durationRaw = Date.now() - startRaw;
            console.log(`  ⚪ Sans normalisation: ${resultsRaw.length} résultats en ${durationRaw}ms`);
            const improvement = resultsNormalized.length - resultsRaw.length;
            if (improvement > 0) {
                console.log(`  📈 Amélioration: +${improvement} résultats (+${Math.round((improvement / Math.max(resultsRaw.length, 1)) * 100)}%)`);
            }
            else if (improvement < 0) {
                console.log(`  📉 Moins de résultats: ${improvement}`);
            }
            else {
                console.log(`  ➡️  Résultats identiques`);
            }
        }
        console.log('\n✅ Tests terminés avec succès!');
    }
    catch (error) {
        logger_1.logger.error('❌ Erreur lors des tests', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
    }
    finally {
        if (databaseService) {
            await databaseService.close();
        }
    }
}
async function main() {
    try {
        await testNormalizerOnly();
        await testWithDatabase();
    }
    catch (error) {
        logger_1.logger.error('💥 Échec des tests', { error });
        process.exit(1);
    }
}
if (require.main === module) {
    main()
        .then(() => {
        console.log('\n\n✨ Tous les tests terminés!\n');
        process.exit(0);
    })
        .catch((error) => {
        logger_1.logger.error('💥 Erreur fatale:', { error });
        process.exit(1);
    });
}
//# sourceMappingURL=testNormalization.js.map