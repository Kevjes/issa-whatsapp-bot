#!/usr/bin/env ts-node

/**
 * Script de test pour la recherche optimisée FTS5
 */

import { DatabaseService } from '../services/databaseService';
import { KnowledgeService } from '../services/knowledgeService';
import { logger } from '../utils/logger';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

async function main(): Promise<void> {
  let databaseService: DatabaseService | null = null;

  try {
    logger.info('🔍 Test de recherche dans la base de connaissances');

    // Initialiser la base de données
    databaseService = new DatabaseService();
    await databaseService.initialize();
    logger.info('✅ Base de données initialisée');

    // Initialiser KnowledgeService
    const knowledgeService = new KnowledgeService(databaseService);
    logger.info('✅ KnowledgeService initialisé');

    // Tests de recherche
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

    logger.info('📊 Début des tests de recherche...\n');

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
      } else {
        console.log(`❌ Aucun résultat trouvé (${duration}ms)`);
      }

      // Test avec cache (2ème requête identique)
      const startTime2 = Date.now();
      await knowledgeService.getContextForQuery(query);
      const endTime2 = Date.now();
      const duration2 = endTime2 - startTime2;

      console.log(`\n  📊 Contexte généré en ${duration2}ms`);

      // 3ème appel pour tester le cache
      const startTime3 = Date.now();
      await knowledgeService.getContextForQuery(query);
      const endTime3 = Date.now();
      const duration3 = endTime3 - startTime3;

      console.log(`  ⚡ Cache HIT en ${duration3}ms (${Math.round((1 - duration3/duration2) * 100)}% plus rapide)`);
    }

    // Statistiques du cache
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

    logger.info('✅ Tests terminés avec succès!');

  } catch (error) {
    logger.error('❌ Erreur lors des tests:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  } finally {
    // Fermer la connexion à la base de données
    if (databaseService) {
      await databaseService.close();
    }
  }
}

// Script principal
if (require.main === module) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Échec du script:', { error });
      process.exit(1);
    });
}

export { main as testKnowledgeSearch };
