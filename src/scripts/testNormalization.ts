#!/usr/bin/env ts-node

/**
 * Script de test pour QueryNormalizer
 * Teste la normalisation, stemming, synonymes et expansion de requêtes
 */

import { QueryNormalizer } from '../utils/queryNormalizer';
import { logger } from '../utils/logger';
import { DatabaseService } from '../services/databaseService';
import { KnowledgeService } from '../services/knowledgeService';
import * as dotenv from 'dotenv';

dotenv.config();

async function testNormalizerOnly() {
  console.log('\n' + '='.repeat(80));
  console.log('🔬 TESTS QUERYNORMALIZER - Analyse de Requêtes');
  console.log('='.repeat(80) + '\n');

  const normalizer = new QueryNormalizer();

  const testQueries = [
    // Test accents et casse
    'ASSURANCE',
    'Assurances',
    'assurancé',
    'assuré',

    // Test pluriels
    'takaful',
    'takafuls',
    'services',
    'service',

    // Test synonymes
    'assurance islamique',
    'halal',
    'protection',
    'couverture',

    // Test termes composés
    'qu\'est-ce que le takaful',
    'comment souscrire',
    'agences à Douala',

    // Test termes techniques
    'wakalah',
    'moudharaba',
    'sharia board',

    // Test variations
    'véhicule',
    'automobile',
    'auto',
    'voiture',

    // Test requêtes complexes
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

  let databaseService: DatabaseService | null = null;

  try {
    // Initialiser services
    databaseService = new DatabaseService();
    await databaseService.initialize();
    const knowledgeService = new KnowledgeService(databaseService);

    logger.info('✅ Services initialisés pour tests');

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
        } else {
          console.log(`     ❌ Aucun résultat`);
        }
      }
    }

    // Test comparatif : Avant/Après normalisation
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 COMPARAISON AVANT/APRÈS NORMALISATION');
    console.log('='.repeat(80) + '\n');

    const compareQueries = [
      'assurances islamiques',  // Pluriel + accent
      'véhicule',               // Synonyme de auto
      'qu\'est ce que takaful', // Question complexe
      'agence douala'           // Sans accent sur Douala
    ];

    for (const query of compareQueries) {
      console.log(`\n🔬 Requête: "${query}"`);

      // Avec normalisation (actuel)
      const startNormalized = Date.now();
      const resultsNormalized = await knowledgeService.search(query);
      const durationNormalized = Date.now() - startNormalized;

      console.log(`  ✅ Avec normalisation: ${resultsNormalized.length} résultats en ${durationNormalized}ms`);

      // Sans normalisation (requête brute)
      const startRaw = Date.now();
      const resultsRaw = await databaseService.searchKnowledgeBase(query);
      const durationRaw = Date.now() - startRaw;

      console.log(`  ⚪ Sans normalisation: ${resultsRaw.length} résultats en ${durationRaw}ms`);

      const improvement = resultsNormalized.length - resultsRaw.length;
      if (improvement > 0) {
        console.log(`  📈 Amélioration: +${improvement} résultats (+${Math.round((improvement / Math.max(resultsRaw.length, 1)) * 100)}%)`);
      } else if (improvement < 0) {
        console.log(`  📉 Moins de résultats: ${improvement}`);
      } else {
        console.log(`  ➡️  Résultats identiques`);
      }
    }

    console.log('\n✅ Tests terminés avec succès!');

  } catch (error) {
    logger.error('❌ Erreur lors des tests', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  } finally {
    if (databaseService) {
      await databaseService.close();
    }
  }
}

async function main() {
  try {
    // Test 1: QueryNormalizer uniquement
    await testNormalizerOnly();

    // Test 2: Avec base de données
    await testWithDatabase();

  } catch (error) {
    logger.error('💥 Échec des tests', { error });
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
      logger.error('💥 Erreur fatale:', { error });
      process.exit(1);
    });
}

export { main as testNormalization };
