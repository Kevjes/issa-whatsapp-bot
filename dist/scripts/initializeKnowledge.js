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
exports.initializeKnowledgeBase = main;
const databaseService_1 = require("../services/databaseService");
const knowledgeService_1 = require("../services/knowledgeService");
const logger_1 = require("../utils/logger");
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
dotenv.config();
async function main() {
    let databaseService = null;
    try {
        logger_1.logger.info('🚀 Initialisation de la base de connaissances...');
        databaseService = new databaseService_1.DatabaseService();
        await databaseService.initialize();
        logger_1.logger.info('✅ Base de données initialisée');
        const knowledgeService = new knowledgeService_1.KnowledgeService(databaseService);
        await knowledgeService.initializeKnowledgeBase();
        logger_1.logger.info('✅ Base de connaissances initialisée');
        const roiEntries = await knowledgeService.search('roi');
        const takafulEntries = await knowledgeService.search('takaful');
        logger_1.logger.info('📊 Statistiques de chargement:', {
            'Entrées ROI': roiEntries.length,
            'Entrées Takaful': takafulEntries.length,
            'Total': roiEntries.length + takafulEntries.length
        });
        if (roiEntries.length > 0) {
            logger_1.logger.info('📋 Exemples d\'entrées ROI:', {
                categories: roiEntries.map(e => e.category).slice(0, 3),
                titres: roiEntries.map(e => e.title).slice(0, 3)
            });
        }
        if (takafulEntries.length > 0) {
            logger_1.logger.info('📋 Exemples d\'entrées Takaful:', {
                categories: takafulEntries.map(e => e.category).slice(0, 3),
                titres: takafulEntries.map(e => e.title).slice(0, 3)
            });
        }
        logger_1.logger.info('🎉 Initialisation terminée avec succès!');
    }
    catch (error) {
        logger_1.logger.error('❌ Erreur lors de l\'initialisation:', {
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
function checkDataFiles() {
    const fs = require('fs');
    const roiFile = path.join(process.cwd(), 'docs', 'presentation_ROI.txt');
    const takafulFile = path.join(process.cwd(), 'docs', 'presentation_ROI_takaful.txt');
    const issaFile = path.join(process.cwd(), 'docs', 'issa.txt');
    const glossaireFile = path.join(process.cwd(), 'docs', 'GLOSSAIRE GENERAL ROI TAKAFUL.txt');
    const noticeFile = path.join(process.cwd(), 'docs', 'NOTICE DINFORMATION ROI TAKAFUL.txt');
    const autoFile = path.join(process.cwd(), 'docs', 'ROI TAKAFUL AUTOMOBILE.txt');
    const requiredFiles = [
        { path: roiFile, name: 'presentation_ROI.txt' },
        { path: takafulFile, name: 'presentation_ROI_takaful.txt' },
        { path: issaFile, name: 'issa.txt' },
        { path: glossaireFile, name: 'GLOSSAIRE GENERAL ROI TAKAFUL.txt' },
        { path: noticeFile, name: 'NOTICE DINFORMATION ROI TAKAFUL.txt' },
        { path: autoFile, name: 'ROI TAKAFUL AUTOMOBILE.txt' }
    ];
    let allFilesFound = true;
    for (const file of requiredFiles) {
        if (!fs.existsSync(file.path)) {
            logger_1.logger.error(`❌ Fichier manquant: ${file.name}`);
            allFilesFound = false;
        }
    }
    if (allFilesFound) {
        logger_1.logger.info('✅ Fichiers de données trouvés');
    }
    return allFilesFound;
}
if (require.main === module) {
    logger_1.logger.info('📚 Script d\'initialisation de la base de connaissances ISSA');
    if (!checkDataFiles()) {
        logger_1.logger.error('❌ Fichiers de données manquants, arrêt du script');
        process.exit(1);
    }
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
//# sourceMappingURL=initializeKnowledge.js.map