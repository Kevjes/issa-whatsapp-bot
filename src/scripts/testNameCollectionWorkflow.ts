#!/usr/bin/env ts-node

/**
 * Script de test pour le workflow de collecte de nom
 */

import { DatabaseService } from '../services/databaseService';
import { logger } from '../utils/logger';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  let databaseService: DatabaseService | null = null;

  try {
    console.log('\n' + '='.repeat(80));
    console.log('TEST WORKFLOW COLLECTE DE NOM');
    console.log('='.repeat(80) + '\n');

    // Initialiser database
    databaseService = new DatabaseService();
    await databaseService.initialize();

    const testPhone = '+237690000999'; // Numéro de test

    console.log('Numéro de test:', testPhone);
    console.log('');

    // Étape 1: Supprimer utilisateur test
    console.log('1. Nettoyage - Supprimer utilisateur test...');
    try {
      await databaseService['runQuery'](
        'DELETE FROM users WHERE phone_number = ?',
        [testPhone]
      );
      console.log('   OK Utilisateur test supprimé\n');
    } catch (error) {
      console.log('   INFO Pas utilisateur existant\n');
    }

    // Étape 2: Créer un nouvel utilisateur (premier message)
    console.log('2. Premier message - Créer utilisateur...');
    const newUser = await databaseService.getOrCreateUser(testPhone);
    console.log('   OK Utilisateur créé:');
    console.log('      ID:', newUser.id);
    console.log('      Phone:', newUser.phoneNumber);
    console.log('      Nom:', newUser.name || '(vide)');
    console.log('      État:', newUser.conversationState);

    if (newUser.conversationState !== 'greeting') {
      console.log('   ERREUR: État devrait être "greeting" mais est "' + newUser.conversationState + '"');
      process.exit(1);
    }
    console.log('   OK État correct: greeting\n');

    // Étape 3: Relire utilisateur depuis BDD
    console.log('3. Second message - Relire utilisateur depuis BDD...');
    const existingUser = await databaseService.getOrCreateUser(testPhone);
    console.log('   OK Utilisateur relu:');
    console.log('      ID:', existingUser.id);
    console.log('      Phone:', existingUser.phoneNumber);
    console.log('      Nom:', existingUser.name || '(vide)');
    console.log('      État:', existingUser.conversationState);

    if (existingUser.conversationState !== 'greeting') {
      console.log('   ERREUR: État devrait être "greeting" mais est "' + existingUser.conversationState + '"');
      console.log('   BUG DÉTECTÉ: État ne persiste pas en BDD!');
      process.exit(1);
    }
    console.log('   OK État correct: greeting (persisté en BDD)\n');

    // Étape 4: Passer à name_collection
    console.log('4. Transition - Passer à name_collection...');
    await databaseService.updateUserState(existingUser.id!, 'name_collection');
    const userAfterUpdate = await databaseService.getOrCreateUser(testPhone);
    console.log('   OK État mis à jour:');
    console.log('      État:', userAfterUpdate.conversationState);

    if (userAfterUpdate.conversationState !== 'name_collection') {
      console.log('   ERREUR: État devrait être "name_collection"');
      process.exit(1);
    }
    console.log('   OK État correct: name_collection\n');

    // Étape 5: Enregistrer le nom
    console.log('5. Collecte nom - Enregistrer "Kevin"...');
    await databaseService.updateUserState(existingUser.id!, 'active', 'Kevin');
    const userWithName = await databaseService.getOrCreateUser(testPhone);
    console.log('   OK Utilisateur avec nom:');
    console.log('      Nom:', userWithName.name);
    console.log('      État:', userWithName.conversationState);

    if (!userWithName.name || userWithName.name !== 'Kevin') {
      console.log('   ERREUR: Nom devrait être "Kevin"');
      process.exit(1);
    }
    if (userWithName.conversationState !== 'active') {
      console.log('   ERREUR: État devrait être "active"');
      process.exit(1);
    }
    console.log('   OK Nom et état corrects\n');

    // Étape 6: Vérifier nouvel utilisateur
    console.log('6. Validation - Créer second utilisateur...');
    const testPhone2 = '+237690000888';
    await databaseService['runQuery'](
      'DELETE FROM users WHERE phone_number = ?',
      [testPhone2]
    );
    const newUser2 = await databaseService.getOrCreateUser(testPhone2);
    console.log('   OK Second utilisateur:');
    console.log('      État:', newUser2.conversationState);

    if (newUser2.conversationState !== 'greeting') {
      console.log('   ERREUR: Nouvel utilisateur devrait être en "greeting"');
      process.exit(1);
    }
    console.log('   OK Nouvel utilisateur démarre bien en greeting\n');

    // Nettoyage
    console.log('7. Nettoyage final...');
    await databaseService['runQuery'](
      'DELETE FROM users WHERE phone_number IN (?, ?)',
      [testPhone, testPhone2]
    );
    console.log('   OK Utilisateurs test supprimés\n');

    console.log('='.repeat(80));
    console.log('TOUS LES TESTS RÉUSSIS!');
    console.log('='.repeat(80));
    console.log('\nLe workflow de collecte de nom fonctionne correctement!\n');

  } catch (error) {
    logger.error('Erreur lors des tests', {
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
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Échec du script:', { error });
      process.exit(1);
    });
}

export { main as testNameCollectionWorkflow };
