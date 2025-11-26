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
exports.testVectorSearch = main;
const databaseService_1 = require("../services/databaseService");
const knowledgeService_1 = require("../services/knowledgeService");
const logger_1 = require("../utils/logger");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
async function main() {
    let databaseService = null;
    try {
        console.log('\n' + '='.repeat(80));
        console.log('🧪 PHASE 3 - TEST RECHERCHE VECTORIELLE SÉMANTIQUE');
        console.log('='.repeat(80) + '\n');
        databaseService = new databaseService_1.DatabaseService();
        await databaseService.initialize();
        const knowledgeService = new knowledgeService_1.KnowledgeService(databaseService);
        logger_1.logger.info('✅ Services initialisés');
        console.log('\n📦 Activation de la recherche vectorielle...');
        console.log('⏳ Chargement du modèle multilingue (peut prendre 1-2 min)...\n');
        await knowledgeService.enableVectorSearch();
        const vectorStats = knowledgeService.getVectorSearchStats();
        console.log('\n✅ Recherche vectorielle activée!');
        console.log(`   Modèle: ${vectorStats.model}`);
        console.log(`   Embeddings: ${vectorStats.cachedEmbeddings}`);
        console.log(`   Dimension: ${vectorStats.vectorDimension}\n`);
        const testCases = [
            {
                title: '🔬 Test 1: Questions Naturelles',
                queries: [
                    'Comment fonctionne le takaful',
                    'Expliquez-moi ce qu\'est l\'assurance islamique',
                    'Quelle est la différence entre assurance classique et takaful'
                ]
            },
            {
                title: '🔬 Test 2: Concepts Vagues',
                queries: [
                    'protection pour ma famille',
                    'sécurité financière halal',
                    'couverture conforme à la religion'
                ]
            },
            {
                title: '🔬 Test 3: Intentions (pas de mots-clés exacts)',
                queries: [
                    'Je veux assurer mon véhicule',
                    'Besoin d\'aide pour mes soins médicaux',
                    'Protection pour mon voyage à la Mecque'
                ]
            },
            {
                title: '🔬 Test 4: Synonymes et Paraphrases',
                queries: [
                    'bureau dans la ville économique',
                    'conseil religieux',
                    'donation solidaire'
                ]
            }
        ];
        for (const testCase of testCases) {
            console.log('\n' + '━'.repeat(80));
            console.log(testCase.title);
            console.log('━'.repeat(80));
            for (const query of testCase.queries) {
                console.log(`\n  🔍 "${query}"`);
                const startHybrid = Date.now();
                const hybridResults = await knowledgeService.searchHybrid(query, 3);
                const durationHybrid = Date.now() - startHybrid;
                console.log(`\n     🎯 HYBRIDE (Phase 1+2+3): ${hybridResults.length} résultats en ${durationHybrid}ms`);
                hybridResults.slice(0, 2).forEach((r, i) => {
                    console.log(`        ${i + 1}. ${r.title}`);
                });
                const startNormal = Date.now();
                const normalResults = await knowledgeService.search(query);
                const durationNormal = Date.now() - startNormal;
                console.log(`\n     📊 NORMAL (Phase 1+2): ${normalResults.length} résultats en ${durationNormal}ms`);
                normalResults.slice(0, 2).forEach((r, i) => {
                    console.log(`        ${i + 1}. ${r.title}`);
                });
                const improvement = hybridResults.length - normalResults.length;
                if (improvement > 0) {
                    console.log(`\n     📈 Amélioration: +${improvement} résultats`);
                }
                else if (improvement < 0) {
                    console.log(`\n     📉 Différence: ${improvement} résultats`);
                }
                const hybridTitles = new Set(hybridResults.map(r => r.title));
                const normalTitles = new Set(normalResults.map(r => r.title));
                const onlyInHybrid = hybridResults.filter(r => !normalTitles.has(r.title));
                if (onlyInHybrid.length > 0) {
                    console.log(`\n     ✨ Résultats sémantiques uniques:`);
                    onlyInHybrid.slice(0, 2).forEach(r => {
                        console.log(`        • ${r.title}`);
                    });
                }
            }
        }
        console.log('\n\n' + '='.repeat(80));
        console.log('📊 STATISTIQUES FINALES');
        console.log('='.repeat(80));
        const cacheStats = knowledgeService.getCacheStats();
        const vectorStatsF = knowledgeService.getVectorSearchStats();
        console.log(`\n  Cache:`);
        console.log(`    Clés: ${cacheStats.keys}`);
        console.log(`    Hits: ${cacheStats.hits}`);
        console.log(`    Misses: ${cacheStats.misses}`);
        console.log(`\n  Recherche Vectorielle:`);
        console.log(`    Modèle: ${vectorStatsF.model}`);
        console.log(`    Embeddings: ${vectorStatsF.cachedEmbeddings}`);
        console.log(`    Dimension: ${vectorStatsF.vectorDimension}`);
        console.log(`    Status: ${vectorStatsF.initialized ? '✅ Actif' : '❌ Inactif'}`);
        console.log('\n✅ Tests Phase 3 terminés!\n');
    }
    catch (error) {
        logger_1.logger.error('❌ Erreur lors des tests', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
    }
    finally {
        if (databaseService) {
            await databaseService.close();
        }
    }
}
if (require.main === module) {
    main()
        .then(() => {
        console.log('\n✨ Script terminé avec succès!\n');
        process.exit(0);
    })
        .catch((error) => {
        logger_1.logger.error('💥 Échec du script:', { error });
        process.exit(1);
    });
}
//# sourceMappingURL=testVectorSearch.js.map