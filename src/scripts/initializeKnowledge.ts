#!/usr/bin/env ts-node

/**
 * Script d'initialisation de la base de connaissances
 * Ce script charge les données ROI et ROI Takaful dans la base de données
 */

import { DatabaseService } from '../services/databaseService';
import { KnowledgeService } from '../services/knowledgeService';
import { logger } from '../utils/logger';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Charger les variables d'environnement
dotenv.config();

async function main(): Promise<void> {
  let databaseService: DatabaseService | null = null;
  
  try {
    logger.info('🚀 Initialisation de la base de connaissances...');

    // Initialiser la base de données
    databaseService = new DatabaseService();
    await databaseService.initialize();
    logger.info('✅ Base de données initialisée');

    // Initialiser le service de base de connaissances
    const knowledgeService = new KnowledgeService(databaseService);
    
    // Charger les données de connaissance
    await knowledgeService.initializeKnowledgeBase();
    logger.info('✅ Base de connaissances initialisée');

    // Vérifier le contenu chargé
    const roiEntries = await knowledgeService.search('roi');
    const takafulEntries = await knowledgeService.search('takaful');
    
    logger.info('📊 Statistiques de chargement:', {
      'Entrées ROI': roiEntries.length,
      'Entrées Takaful': takafulEntries.length,
      'Total': roiEntries.length + takafulEntries.length
    });

    // Afficher quelques exemples
    if (roiEntries.length > 0) {
      logger.info('📋 Exemples d\'entrées ROI:', {
        categories: roiEntries.map(e => e.category).slice(0, 3),
        titres: roiEntries.map(e => e.title).slice(0, 3)
      });
    }

    if (takafulEntries.length > 0) {
      logger.info('📋 Exemples d\'entrées Takaful:', {
        categories: takafulEntries.map(e => e.category).slice(0, 3),
        titres: takafulEntries.map(e => e.title).slice(0, 3)
      });
    }

    logger.info('🎉 Initialisation terminée avec succès!');

  } catch (error) {
    logger.error('❌ Erreur lors de l\'initialisation:', {
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

// Vérifier que les fichiers de données existent
function checkDataFiles(): boolean {
  const fs = require('fs');
  const roiFile = path.join(process.cwd(), 'docs', 'presentation_ROI.txt');
  const takafulFile = path.join(process.cwd(), 'docs', 'presentation_ROI_takaful.txt');
  const issaFile = path.join(process.cwd(), 'docs', 'issa.txt');
  
  if (!fs.existsSync(roiFile)) {
    logger.error(`❌ Fichier manquant: ${roiFile}`);
    return false;
  }
  
  if (!fs.existsSync(takafulFile)) {
    logger.error(`❌ Fichier manquant: ${takafulFile}`);
    return false;
  }
  
  if (!fs.existsSync(issaFile)) {
    logger.error(`❌ Fichier manquant: ${issaFile}`);
    return false;
  }
  
  logger.info('✅ Fichiers de données trouvés');
  return true;
}

// Script principal
if (require.main === module) {
  logger.info('📚 Script d\'initialisation de la base de connaissances ISSA');
  
  if (!checkDataFiles()) {
    logger.error('❌ Fichiers de données manquants, arrêt du script');
    process.exit(1);
  }
  
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

export { main as initializeKnowledgeBase };