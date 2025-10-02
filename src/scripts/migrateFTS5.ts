#!/usr/bin/env ts-node

/**
 * Script de migration FTS5
 * Reconstruit la table FTS5 avec les données existantes
 */

import { DatabaseService } from '../services/databaseService';
import { logger } from '../utils/logger';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

async function main(): Promise<void> {
  let databaseService: DatabaseService | null = null;

  try {
    logger.info('🚀 Migration FTS5 - Début...');

    // Initialiser la base de données
    databaseService = new DatabaseService();
    await databaseService.initialize();
    logger.info('✅ Base de données initialisée');

    // Reconstruire l'index FTS5
    logger.info('🔄 Reconstruction de l\'index FTS5...');

    // Vider la table FTS5 existante
    await (databaseService as any).runQuery('DELETE FROM knowledge_fts');
    logger.info('✅ Table FTS5 vidée');

    // Réinsérer toutes les données dans FTS5
    await (databaseService as any).runQuery(`
      INSERT INTO knowledge_fts(rowid, category, title, content, keywords)
      SELECT id, category, title, content, keywords
      FROM knowledge_base
      WHERE is_active = 1
    `);

    logger.info('✅ Index FTS5 reconstruit avec succès');

    // Vérifier le résultat
    const testResults = await (databaseService as any).allQuery(`
      SELECT COUNT(*) as count FROM knowledge_fts
    `);

    logger.info('📊 Statistiques FTS5:', {
      entriesIndexed: testResults[0].count
    });

    logger.info('🎉 Migration FTS5 terminée avec succès!');

  } catch (error) {
    logger.error('❌ Erreur lors de la migration FTS5:', {
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
  logger.info('📚 Script de migration FTS5');

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

export { main as migrateFTS5 };
