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
exports.testKnowledgeSearch = main;
const databaseService_1 = require("../services/databaseService");
const knowledgeService_1 = require("../services/knowledgeService");
const logger_1 = require("../utils/logger");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
async function main() {
    let databaseService = null;
    try {
        logger_1.logger.info('🔍 Test de recherche dans la base de connaissances');
        databaseService = new databaseService_1.DatabaseService();
        await databaseService.initialize();
        logger_1.logger.info('✅ Base de données initialisée');
        const knowledgeService = new knowledgeService_1.KnowledgeService(databaseService);
        logger_1.logger.info('✅ KnowledgeService initialisé');
        const testQueries = [
            'takaful',
            'assurance islamique',
            'roi',
            'contact',
            'agences douala',
            'hajj',
            'sharia board',
            'services',
            'définition takaful',
            'qu\'est-ce que le takaful'
        ];
        logger_1.logger.info('📊 Début des tests de recherche...\n');
        for (const query of testQueries) {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`🔎 Recherche: "${query}"`);
            console.log('='.repeat(60));
            const startTime = Date.now();
            const results = await knowledgeService.search(query);
            const endTime = Date.now();
            const duration = endTime - startTime;
            if (results.length > 0) {
                console.log(`✅ ${results.length} résultats trouvés en ${duration}ms`);
                results.slice(0, 3).forEach((result, index) => {
                    console.log(`\n  ${index + 1}. ${result.title}`);
                    console.log(`     Catégorie: ${result.category}`);
                    console.log(`     Contenu: ${result.content.substring(0, 100)}...`);
                });
            }
            else {
                console.log(`❌ Aucun résultat trouvé (${duration}ms)`);
            }
            const startTime2 = Date.now();
            await knowledgeService.getContextForQuery(query);
            const endTime2 = Date.now();
            const duration2 = endTime2 - startTime2;
            console.log(`\n  📊 Contexte généré en ${duration2}ms`);
            const startTime3 = Date.now();
            await knowledgeService.getContextForQuery(query);
            const endTime3 = Date.now();
            const duration3 = endTime3 - startTime3;
            console.log(`  ⚡ Cache HIT en ${duration3}ms (${Math.round((1 - duration3 / duration2) * 100)}% plus rapide)`);
        }
        console.log(`\n\n${'='.repeat(60)}`);
        console.log('📈 STATISTIQUES DU CACHE');
        console.log('='.repeat(60));
        const cacheStats = knowledgeService.getCacheStats();
        const hitRate = cacheStats.hits + cacheStats.misses > 0
            ? ((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(2)
            : '0';
        console.log(`  Clés en cache: ${cacheStats.keys}`);
        console.log(`  Hits: ${cacheStats.hits}`);
        console.log(`  Misses: ${cacheStats.misses}`);
        console.log(`  Taux de succès: ${hitRate}%`);
        logger_1.logger.info('✅ Tests terminés avec succès!');
    }
    catch (error) {
        logger_1.logger.error('❌ Erreur lors des tests:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        process.exit(1);
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
        process.exit(0);
    })
        .catch((error) => {
        logger_1.logger.error('💥 Échec du script:', { error });
        process.exit(1);
    });
}
//# sourceMappingURL=testKnowledgeSearch.js.map