#!/usr/bin/env ts-node

/**
 * Script de génération des embeddings vectoriels
 * Génère et sauvegarde les embeddings pour toute la base de connaissances
 */

import { DatabaseService } from '../services/databaseService';
import { VectorSearchService } from '../services/vectorSearchService';
import { logger } from '../utils/logger';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

async function main(): Promise<void> {
  let databaseService: DatabaseService | null = null;
  let vectorService: VectorSearchService | null = null;

  try {
    logger.info('🚀 Génération des embeddings - Début...');

    // Initialiser les services
    databaseService = new DatabaseService();
    await databaseService.initialize();
    logger.info('✅ Base de données initialisée');

    vectorService = new VectorSearchService();
    await vectorService.initialize();
    logger.info('✅ VectorSearchService initialisé');

    // Récupérer toutes les entrées de connaissance
    const allEntries = await databaseService.getAllKnowledgeEntries();
    logger.info(`📚 ${allEntries.length} entrées trouvées dans la base de connaissances`);

    if (allEntries.length === 0) {
      logger.warn('⚠️  Aucune entrée trouvée. Assurez-vous que la base est initialisée.');
      return;
    }

    // Vérifier combien d'embeddings existent déjà
    const stats = await databaseService.getEmbeddingsStats();
    logger.info(`📊 Embeddings existants: ${stats.total}/${allEntries.length}`);

    // Générer les embeddings manquants
    let generated = 0;
    let skipped = 0;
    let errors = 0;
    const startTime = Date.now();

    for (const entry of allEntries) {
      if (!entry.id) {
        logger.warn('Entrée sans ID ignorée', { title: entry.title });
        skipped++;
        continue;
      }

      try {
        // Vérifier si l'embedding existe déjà
        const exists = await databaseService.hasEmbedding(entry.id);

        if (exists) {
          logger.debug(`Embedding déjà existant pour: ${entry.title}`);
          skipped++;
          continue;
        }

        // Combiner titre et contenu pour embedding complet
        const text = `${entry.title}\n${entry.content}`;

        // Générer l'embedding
        const embedding = await vectorService.generateEmbedding(text);

        // Sauvegarder dans la base de données
        await databaseService.saveEmbedding(
          entry.id,
          embedding,
          vectorService.getStats().model
        );

        generated++;

        logger.info(`✅ [${generated}/${allEntries.length}] Embedding généré: ${entry.title}`, {
          id: entry.id,
          dimension: embedding.length
        });

      } catch (error) {
        errors++;
        logger.error(`❌ Erreur pour "${entry.title}"`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          entryId: entry.id
        });
      }
    }

    const duration = Date.now() - startTime;

    // Afficher les statistiques finales
    const finalStats = await databaseService.getEmbeddingsStats();

    logger.info('🎉 Génération des embeddings terminée!');
    logger.info('📊 Statistiques:', {
      total: allEntries.length,
      generated,
      skipped,
      errors,
      finalCount: finalStats.total,
      model: finalStats.modelName,
      dimension: finalStats.vectorDimension,
      duration: `${(duration / 1000).toFixed(2)}s`,
      avgPerEntry: generated > 0 ? `${(duration / generated).toFixed(0)}ms` : 'N/A'
    });

    if (errors > 0) {
      logger.warn(`⚠️  ${errors} erreur(s) rencontrée(s)`);
      process.exit(1);
    }

  } catch (error) {
    logger.error('❌ Erreur lors de la génération des embeddings:', {
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
  logger.info('📚 Script de génération des embeddings vectoriels');

  main()
    .then(() => {
      logger.info('✨ Script terminé avec succès');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Échec du script:', { error });
      process.exit(1);
    });
}

export { main as generateEmbeddings };
