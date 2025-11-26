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
exports.migrateFTS5 = main;
const databaseService_1 = require("../services/databaseService");
const logger_1 = require("../utils/logger");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
async function main() {
    let databaseService = null;
    try {
        logger_1.logger.info('🚀 Migration FTS5 - Début...');
        databaseService = new databaseService_1.DatabaseService();
        await databaseService.initialize();
        logger_1.logger.info('✅ Base de données initialisée');
        logger_1.logger.info('🔄 Reconstruction de l\'index FTS5...');
        await databaseService.runQuery('DELETE FROM knowledge_fts');
        logger_1.logger.info('✅ Table FTS5 vidée');
        await databaseService.runQuery(`
      INSERT INTO knowledge_fts(rowid, category, title, content, keywords)
      SELECT id, category, title, content, keywords
      FROM knowledge_base
      WHERE is_active = 1
    `);
        logger_1.logger.info('✅ Index FTS5 reconstruit avec succès');
        const testResults = await databaseService.allQuery(`
      SELECT COUNT(*) as count FROM knowledge_fts
    `);
        logger_1.logger.info('📊 Statistiques FTS5:', {
            entriesIndexed: testResults[0].count
        });
        logger_1.logger.info('🎉 Migration FTS5 terminée avec succès!');
    }
    catch (error) {
        logger_1.logger.error('❌ Erreur lors de la migration FTS5:', {
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
    logger_1.logger.info('📚 Script de migration FTS5');
    main()
        .then(() => {
        logger_1.logger.info('✨ Script terminé avec succès');
        process.exit(0);
    })
        .catch((error) => {
        logger_1.logger.error('💥 Échec du script:', { error });
        process.exit(1);
    });
}
//# sourceMappingURL=migrateFTS5.js.map