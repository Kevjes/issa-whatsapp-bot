#!/usr/bin/env ts-node

/**
 * Script de test pour la recherche vectorielle (Phase 3)
 */

import { DatabaseService } from '../services/databaseService';
import { KnowledgeService } from '../services/knowledgeService';
import { logger } from '../utils/logger';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  let databaseService: DatabaseService | null = null;

  try {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 PHASE 3 - TEST RECHERCHE VECTORIELLE SÉMANTIQUE');
    console.log('='.repeat(80) + '\n');

    // Initialiser services
    databaseService = new DatabaseService();
    await databaseService.initialize();

    const knowledgeService = new KnowledgeService(databaseService);

    logger.info('✅ Services initialisés');

    // Activer la recherche vectorielle
    console.log('\n📦 Activation de la recherche vectorielle...');
    console.log('⏳ Chargement du modèle multilingue (peut prendre 1-2 min)...\n');

    await knowledgeService.enableVectorSearch();

    const vectorStats = knowledgeService.getVectorSearchStats();
    console.log('\n✅ Recherche vectorielle activée!');
    console.log(`   Modèle: ${vectorStats.model}`);
    console.log(`   Embeddings: ${vectorStats.cachedEmbeddings}`);
    console.log(`   Dimension: ${vectorStats.vectorDimension}\n`);

    // Tests de recherche sémantique
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
          'bureau dans la ville économique',  // Douala
          'conseil religieux',                // Sharia board
          'donation solidaire'                // Tabarru
        ]
      }
    ];

    for (const testCase of testCases) {
      console.log('\n' + '━'.repeat(80));
      console.log(testCase.title);
      console.log('━'.repeat(80));

      for (const query of testCase.queries) {
        console.log(`\n  🔍 "${query}"`);

        // Recherche hybride (FTS5 + Normalisation + Vectors)
        const startHybrid = Date.now();
        const hybridResults = await knowledgeService.searchHybrid(query, 3);
        const durationHybrid = Date.now() - startHybrid;

        console.log(`\n     🎯 HYBRIDE (Phase 1+2+3): ${hybridResults.length} résultats en ${durationHybrid}ms`);
        hybridResults.slice(0, 2).forEach((r, i) => {
          console.log(`        ${i + 1}. ${r.title}`);
        });

        // Recherche normale (FTS5 + Normalisation seulement)
        const startNormal = Date.now();
        const normalResults = await knowledgeService.search(query);
        const durationNormal = Date.now() - startNormal;

        console.log(`\n     📊 NORMAL (Phase 1+2): ${normalResults.length} résultats en ${durationNormal}ms`);
        normalResults.slice(0, 2).forEach((r, i) => {
          console.log(`        ${i + 1}. ${r.title}`);
        });

        // Comparaison
        const improvement = hybridResults.length - normalResults.length;
        if (improvement > 0) {
          console.log(`\n     📈 Amélioration: +${improvement} résultats`);
        } else if (improvement < 0) {
          console.log(`\n     📉 Différence: ${improvement} résultats`);
        }

        // Vérifier pertinence sémantique
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

    // Statistiques finales
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

  } catch (error) {
    logger.error('❌ Erreur lors des tests', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  } finally {
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
      logger.error('💥 Échec du script:', { error });
      process.exit(1);
    });
}

export { main as testVectorSearch };
