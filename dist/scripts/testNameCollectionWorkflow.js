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
exports.testNameCollectionWorkflow = main;
const databaseService_1 = require("../services/databaseService");
const logger_1 = require("../utils/logger");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
async function main() {
    let databaseService = null;
    try {
        console.log('\n' + '='.repeat(80));
        console.log('TEST WORKFLOW COLLECTE DE NOM');
        console.log('='.repeat(80) + '\n');
        databaseService = new databaseService_1.DatabaseService();
        await databaseService.initialize();
        const testPhone = '+237690000999';
        console.log('Numéro de test:', testPhone);
        console.log('');
        console.log('1. Nettoyage - Supprimer utilisateur test...');
        try {
            await databaseService['runQuery']('DELETE FROM users WHERE phone_number = ?', [testPhone]);
            console.log('   OK Utilisateur test supprimé\n');
        }
        catch (error) {
            console.log('   INFO Pas utilisateur existant\n');
        }
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
        console.log('4. Transition - Passer à name_collection...');
        await databaseService.updateUserState(existingUser.id, 'name_collection');
        const userAfterUpdate = await databaseService.getOrCreateUser(testPhone);
        console.log('   OK État mis à jour:');
        console.log('      État:', userAfterUpdate.conversationState);
        if (userAfterUpdate.conversationState !== 'name_collection') {
            console.log('   ERREUR: État devrait être "name_collection"');
            process.exit(1);
        }
        console.log('   OK État correct: name_collection\n');
        console.log('5. Collecte nom - Enregistrer "Kevin"...');
        await databaseService.updateUserState(existingUser.id, 'active', 'Kevin');
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
        console.log('6. Validation - Créer second utilisateur...');
        const testPhone2 = '+237690000888';
        await databaseService['runQuery']('DELETE FROM users WHERE phone_number = ?', [testPhone2]);
        const newUser2 = await databaseService.getOrCreateUser(testPhone2);
        console.log('   OK Second utilisateur:');
        console.log('      État:', newUser2.conversationState);
        if (newUser2.conversationState !== 'greeting') {
            console.log('   ERREUR: Nouvel utilisateur devrait être en "greeting"');
            process.exit(1);
        }
        console.log('   OK Nouvel utilisateur démarre bien en greeting\n');
        console.log('7. Nettoyage final...');
        await databaseService['runQuery']('DELETE FROM users WHERE phone_number IN (?, ?)', [testPhone, testPhone2]);
        console.log('   OK Utilisateurs test supprimés\n');
        console.log('='.repeat(80));
        console.log('TOUS LES TESTS RÉUSSIS!');
        console.log('='.repeat(80));
        console.log('\nLe workflow de collecte de nom fonctionne correctement!\n');
    }
    catch (error) {
        logger_1.logger.error('Erreur lors des tests', {
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
        process.exit(0);
    })
        .catch((error) => {
        logger_1.logger.error('Échec du script:', { error });
        process.exit(1);
    });
}
//# sourceMappingURL=testNameCollectionWorkflow.js.map