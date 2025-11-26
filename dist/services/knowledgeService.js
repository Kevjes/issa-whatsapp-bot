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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeService = void 0;
const vectorSearchService_1 = require("./vectorSearchService");
const logger_1 = require("../utils/logger");
const queryNormalizer_1 = require("../utils/queryNormalizer");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const node_cache_1 = __importDefault(require("node-cache"));
class KnowledgeService {
    constructor(databaseService) {
        this.useVectorSearch = false;
        this.databaseService = databaseService;
        this.cache = new node_cache_1.default({
            stdTTL: 3600,
            checkperiod: 600,
            useClones: false,
            maxKeys: 1000
        });
        this.queryNormalizer = new queryNormalizer_1.QueryNormalizer();
        this.vectorSearch = new vectorSearchService_1.VectorSearchService();
        logger_1.logger.info('KnowledgeService initialisé avec cache, normalisation et vectors', {
            ttl: '3600s',
            maxKeys: 1000,
            normalizer: 'QueryNormalizer avec stemming français',
            vectorSearch: 'VectorSearchService (lazy init)'
        });
    }
    async initializeKnowledgeBase() {
        try {
            const existingEntries = await this.databaseService.searchKnowledgeBase('ROI');
            if (existingEntries.length > 0) {
                logger_1.logger.info('Base de connaissances déjà initialisée', { entriesCount: existingEntries.length });
                return;
            }
            logger_1.logger.info('Initialisation de la base de connaissances...');
            await this.loadISSAIdentityData();
            await this.loadTakafulDefinitionData();
            await this.loadROIData();
            await this.loadROITakafulData();
            await this.loadGlossaireGeneralData();
            await this.loadNoticeInformationData();
            await this.loadTakafulAutomobileData();
            await this.loadSanteGroupeData();
            logger_1.logger.info('Base de connaissances initialisée avec succès');
        }
        catch (error) {
            logger_1.logger.error('Erreur lors de l\'initialisation de la base de connaissances', { error });
            throw error;
        }
    }
    async loadROIData() {
        try {
            const roiFilePath = path.join(process.cwd(), 'docs', 'presentation_ROI.txt');
            if (!fs.existsSync(roiFilePath)) {
                logger_1.logger.warn('Fichier presentation_ROI.txt introuvable', { path: roiFilePath });
                return;
            }
            const content = fs.readFileSync(roiFilePath, 'utf8');
            await this.databaseService.addKnowledgeEntry({
                category: 'roi_general',
                title: 'Présentation Générale Royal Onyx Insurance',
                content: content,
                keywords: [
                    'royal onyx insurance', 'roi', 'assurance', 'cameroun', 'cima',
                    'automobile', 'santé', 'habitation', 'voyage', 'responsabilité civile',
                    'multirisques', 'microassurance', 'douala', 'yaoundé', 'agences'
                ],
                isActive: true
            });
            await this.addROISpecificEntries(content);
            logger_1.logger.info('Données ROI chargées avec succès');
        }
        catch (error) {
            logger_1.logger.error('Erreur lors du chargement des données ROI', { error });
            throw error;
        }
    }
    async loadROITakafulData() {
        try {
            const takafulFilePath = path.join(process.cwd(), 'docs', 'presentation_ROI_takaful.txt');
            if (!fs.existsSync(takafulFilePath)) {
                logger_1.logger.warn('Fichier presentation_ROI_takaful.txt introuvable', { path: takafulFilePath });
                return;
            }
            const content = fs.readFileSync(takafulFilePath, 'utf8');
            await this.databaseService.addKnowledgeEntry({
                category: 'roi_takaful',
                title: 'Présentation Générale ROI Takaful',
                content: content,
                keywords: [
                    'roi takaful', 'takaful', 'assurance islamique', 'halal', 'charia',
                    'wakalah', 'moudharaba', 'tabarru', 'sharia board', 'hajj',
                    'assurance conforme', 'principes islamiques', 'bonarpiso'
                ],
                isActive: true
            });
            await this.addTakafulSpecificEntries(content);
            logger_1.logger.info('Données ROI Takaful chargées avec succès');
        }
        catch (error) {
            logger_1.logger.error('Erreur lors du chargement des données ROI Takaful', { error });
            throw error;
        }
    }
    async loadTakafulDefinitionData() {
        try {
            const definitionFilePath = path.join(process.cwd(), 'docs', 'definition_takaful.tx');
            if (!fs.existsSync(definitionFilePath)) {
                logger_1.logger.warn('Fichier definition_takaful.tx introuvable', { path: definitionFilePath });
                return;
            }
            const content = fs.readFileSync(definitionFilePath, 'utf8');
            if (!content.trim()) {
                logger_1.logger.info('Fichier definition_takaful.tx vide, ignoré pour le moment');
                return;
            }
            await this.databaseService.addKnowledgeEntry({
                category: 'takaful_definition',
                title: 'Définitions et Concepts Takaful',
                content: content,
                keywords: [
                    'définition takaful', 'concepts takaful', 'principes takaful',
                    'assurance islamique', 'finance islamique', 'qu\'est-ce que takaful',
                    'fonctionnement takaful', 'différence assurance classique',
                    'termes techniques', 'vocabulaire takaful', 'glossaire'
                ],
                isActive: true
            });
            logger_1.logger.info('Définitions Takaful chargées avec succès');
        }
        catch (error) {
            logger_1.logger.error('Erreur lors du chargement des définitions Takaful', { error });
            throw error;
        }
    }
    async loadISSAIdentityData() {
        try {
            const issaFilePath = path.join(process.cwd(), 'docs', 'issa.txt');
            if (!fs.existsSync(issaFilePath)) {
                logger_1.logger.warn('Fichier issa.txt introuvable', { path: issaFilePath });
                return;
            }
            const content = fs.readFileSync(issaFilePath, 'utf8');
            await this.databaseService.addKnowledgeEntry({
                category: 'issa_identity',
                title: 'Identité et Rôle d\'ISSA',
                content: content,
                keywords: [
                    'issa', 'assistant virtuel', 'roi takaful', 'royal onyx insurance',
                    'royal takaful', 'entreprise mère', 'assurances islamiques',
                    'identité', 'présentation', 'qui est issa', 'rôle'
                ],
                isActive: true
            });
            logger_1.logger.info('Données d\'identité ISSA chargées avec succès');
        }
        catch (error) {
            logger_1.logger.error('Erreur lors du chargement des données d\'identité ISSA', { error });
            throw error;
        }
    }
    async addROISpecificEntries(content) {
        const servicesMatch = content.match(/Services\s*:\s*([\s\S]*?)(?=Actionnariat|$)/);
        if (servicesMatch) {
            await this.databaseService.addKnowledgeEntry({
                category: 'roi_services',
                title: 'Services Royal Onyx Insurance',
                content: `Services offerts par Royal Onyx Insurance :\n${servicesMatch[1].trim()}`,
                keywords: [
                    'services', 'assurance automobile', 'transport', 'responsabilité civile',
                    'santé', 'accidents', 'voyage', 'multirisques', 'habitation',
                    'commercial', 'professionnel', 'industriel', 'chantiers', 'cautions'
                ],
                isActive: true
            });
        }
        const agencesMatch = content.match(/Agences ROI\s*:\s*([\s\S]*?)(?=Service client|$)/);
        if (agencesMatch) {
            await this.databaseService.addKnowledgeEntry({
                category: 'roi_agences',
                title: 'Agences Royal Onyx Insurance',
                content: `Nos agences :\n${agencesMatch[1].trim()}`,
                keywords: [
                    'agences', 'douala', 'yaoundé', 'bafoussam', 'bafang', 'bagangté',
                    'kribi', 'maroua', 'bertoua', 'garoua', 'ngaoundéré', 'akwa',
                    'deido', 'bepanda', 'makepe', 'ndongbon', 'elig-essono', 'bastos'
                ],
                isActive: true
            });
        }
        const contactMatch = content.match(/Service client\s*:\s*([\s\S]*?)(?=CIMA|$)/);
        if (contactMatch) {
            await this.databaseService.addKnowledgeEntry({
                category: 'roi_contact',
                title: 'Contact Royal Onyx Insurance',
                content: `Nos coordonnées :\n${contactMatch[1].trim()}`,
                keywords: [
                    'contact', 'service client', 'téléphone', 'email', 'site web',
                    '+237 691 100 575', 'contact@royalonyx.cm', 'www.royalonyx.cm'
                ],
                isActive: true
            });
        }
    }
    async addTakafulSpecificEntries(content) {
        const servicesMatch = content.match(/Services\s*:\s*([\s\S]*?)(?=Gouvernance|$)/);
        if (servicesMatch) {
            await this.databaseService.addKnowledgeEntry({
                category: 'takaful_services',
                title: 'Services ROI Takaful',
                content: `Services ROI Takaful :\n${servicesMatch[1].trim()}`,
                keywords: [
                    'takaful accidents', 'takaful santé', 'takaful voyage', 'takaful hajj',
                    'takaful evacuation', 'takaful automobile', 'takaful habitation',
                    'takaful incendie', 'takaful multirisque', 'takaful équipements',
                    'takaful responsabilité', 'takaful chantier', 'takaful marchandises',
                    'takaful crédit', 'takaful bétail', 'takaful agricole'
                ],
                isActive: true
            });
        }
        const shariaMatch = content.match(/Gouvernance\s*:\s*Sharia Board[\s\S]*?(?=Autres Guichets|$)/);
        if (shariaMatch) {
            await this.databaseService.addKnowledgeEntry({
                category: 'takaful_gouvernance',
                title: 'Sharia Board ROI Takaful',
                content: shariaMatch[0],
                keywords: [
                    'sharia board', 'conseil charia', 'conformité islamique', 'fiqh',
                    'cheikh nsangou', 'el hadj moussa', 'el hadj mamadou', 'finance islamique'
                ],
                isActive: true
            });
        }
        const fonctionnementMatch = content.match(/FONCTIONNEMENT DE LA FENÊTRE ROI TAKAFUL[\s\S]*$/);
        if (fonctionnementMatch) {
            await this.databaseService.addKnowledgeEntry({
                category: 'takaful_fonctionnement',
                title: 'Fonctionnement ROI Takaful',
                content: fonctionnementMatch[0],
                keywords: [
                    'fonctionnement takaful', 'wakalah', 'moudharaba', 'tabarru', 'donation',
                    'excédents', 'déficits', 'modèle hybride', 'placement', 'wakil', 'moudhareb'
                ],
                isActive: true
            });
        }
        await this.databaseService.addKnowledgeEntry({
            category: 'takaful_contact',
            title: 'Contact ROI Takaful',
            content: `Nos coordonnées ROI Takaful :
Service client : +237 691 100 575
Email : contact@roitakaful.com
Site web : www.roitakaful.com
Guichet Principal : Douala Cameroun – Quartier Bonapriso, à côté de Total Bonjour`,
            keywords: [
                'contact takaful', 'service client', '+237 691 100 575',
                'contact@roitakaful.com', 'www.roitakaful.com', 'bonapriso'
            ],
            isActive: true
        });
    }
    async search(query) {
        const analysis = this.queryNormalizer.analyze(query);
        logger_1.logger.debug('Requête analysée', {
            original: analysis.original,
            normalized: analysis.normalized,
            keywordsCount: analysis.keywords.length,
            expandedCount: analysis.expanded.length,
            language: analysis.language
        });
        const fts5Query = analysis.fts5Query;
        const results = await this.databaseService.searchKnowledgeBase(fts5Query);
        logger_1.logger.debug('Résultats de recherche normalisée', {
            query: analysis.original,
            fts5Query,
            resultsCount: results.length
        });
        return results;
    }
    async addEntry(entry) {
        return await this.databaseService.addKnowledgeEntry(entry);
    }
    async getContextForQuery(query) {
        try {
            const searchQuery = query.toLowerCase().trim();
            const cacheKey = `context:${searchQuery}`;
            const cachedContext = this.cache.get(cacheKey);
            if (cachedContext) {
                logger_1.logger.info('Cache HIT pour la recherche', {
                    query: searchQuery,
                    cacheKey,
                    cacheStats: this.getCacheStats()
                });
                return cachedContext;
            }
            logger_1.logger.info('Cache MISS - Recherche dans la base de connaissances', {
                originalQuery: query,
                searchQuery,
                cacheStats: this.getCacheStats()
            });
            let results = await this.search(searchQuery);
            if (results.length === 0) {
                const words = searchQuery.split(/\s+/).filter(word => word.length > 2);
                logger_1.logger.info('Recherche avec mots individuels', { words });
                for (const word of words) {
                    const wordResults = await this.search(word);
                    results = results.concat(wordResults);
                    if (results.length > 0)
                        break;
                }
                const uniqueResults = results.filter((result, index, self) => index === self.findIndex(r => r.id === result.id));
                results = uniqueResults;
            }
            const keywords = this.queryNormalizer.extractKeywords(searchQuery);
            const rerankedResults = this.rerankByTitleMatch(results, keywords);
            logger_1.logger.info('Résultats de recherche', {
                query: searchQuery,
                resultCount: rerankedResults.length,
                resultTitles: rerankedResults.map(r => r.title)
            });
            let context;
            if (rerankedResults.length === 0) {
                logger_1.logger.warn('Aucun résultat trouvé', { query: searchQuery });
                context = 'Aucune information spécifique trouvée dans la base de connaissances.';
            }
            else {
                const topResults = rerankedResults.slice(0, 5);
                context = 'Informations pertinentes :\n\n';
                for (const result of topResults) {
                    context += `**${result.title}**\n${result.content}\n\n`;
                }
                logger_1.logger.info('Contexte généré', {
                    query: searchQuery,
                    contextLength: context.length,
                    resultTitles: topResults.map(r => r.title)
                });
            }
            this.cache.set(cacheKey, context);
            logger_1.logger.debug('Contexte mis en cache', {
                cacheKey,
                contextLength: context.length,
                cacheStats: this.getCacheStats()
            });
            return context;
        }
        catch (error) {
            logger_1.logger.error('Erreur lors de la recherche de contexte', { error, query });
            return 'Erreur lors de la récupération des informations.';
        }
    }
    rerankByTitleMatch(results, keywords) {
        return results.sort((a, b) => {
            const titleA = a.title.toLowerCase();
            const titleB = b.title.toLowerCase();
            const matchesA = keywords.filter(kw => titleA.includes(kw)).length;
            const matchesB = keywords.filter(kw => titleB.includes(kw)).length;
            return matchesB - matchesA;
        });
    }
    getCacheStats() {
        return this.cache.getStats();
    }
    clearCache() {
        this.cache.flushAll();
        logger_1.logger.info('Cache vidé', { stats: this.getCacheStats() });
    }
    async warmupCache() {
        const topQueries = [
            'services takaful',
            'contact roi',
            'qu\'est-ce que takaful',
            'agences douala',
            'assurance islamique',
            'roi takaful',
            'sharia board',
            'hajj',
            'wakalah',
            'définition takaful'
        ];
        logger_1.logger.info('Pré-chargement du cache avec les requêtes fréquentes', {
            queryCount: topQueries.length
        });
        for (const query of topQueries) {
            await this.getContextForQuery(query);
        }
        logger_1.logger.info('Cache pré-chargé avec succès', {
            stats: this.getCacheStats()
        });
    }
    async enableVectorSearch() {
        try {
            logger_1.logger.info('Activation de la recherche vectorielle...');
            await this.vectorSearch.initialize();
            const allEntries = await this.databaseService.searchKnowledgeBase('');
            if (allEntries.length > 0) {
                await this.vectorSearch.precomputeEmbeddings(allEntries);
                this.useVectorSearch = true;
                logger_1.logger.info('Recherche vectorielle activée', {
                    entriesIndexed: allEntries.length,
                    stats: this.vectorSearch.getStats()
                });
            }
            else {
                logger_1.logger.warn('Aucune entrée à indexer pour la recherche vectorielle');
            }
        }
        catch (error) {
            logger_1.logger.error('Erreur activation recherche vectorielle', { error });
            this.useVectorSearch = false;
        }
    }
    async searchHybrid(query, topK = 5) {
        try {
            const allEntries = await this.databaseService.searchKnowledgeBase('');
            const ftsResults = await this.search(query);
            let vectorResults = [];
            if (this.useVectorSearch && this.vectorSearch.isReady()) {
                vectorResults = await this.vectorSearch.searchSemantic(query, allEntries, topK * 2);
            }
            const combined = this.rerankResults(ftsResults, vectorResults, topK);
            logger_1.logger.debug('Recherche hybride terminée', {
                query,
                ftsCount: ftsResults.length,
                vectorCount: vectorResults.length,
                finalCount: combined.length
            });
            return combined;
        }
        catch (error) {
            logger_1.logger.error('Erreur recherche hybride', { error, query });
            return await this.search(query);
        }
    }
    rerankResults(ftsResults, vectorResults, topK) {
        const k = 60;
        const scores = new Map();
        ftsResults.forEach((entry, rank) => {
            if (entry.id) {
                const rrfScore = 1 / (k + rank + 1);
                scores.set(entry.id, (scores.get(entry.id) || 0) + rrfScore);
            }
        });
        vectorResults.forEach((result, rank) => {
            if (result.entry.id) {
                const rrfScore = 1 / (k + rank + 1);
                const similarityBoost = result.score;
                const combinedScore = rrfScore * (1 + similarityBoost);
                scores.set(result.entry.id, (scores.get(result.entry.id) || 0) + combinedScore);
            }
        });
        const entriesById = new Map();
        [...ftsResults, ...vectorResults.map(r => r.entry)].forEach(entry => {
            if (entry.id && !entriesById.has(entry.id)) {
                entriesById.set(entry.id, entry);
            }
        });
        const ranked = Array.from(scores.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, topK)
            .map(([id]) => entriesById.get(id))
            .filter((entry) => entry !== undefined);
        logger_1.logger.debug('Re-ranking terminé', {
            inputFts: ftsResults.length,
            inputVector: vectorResults.length,
            uniqueEntries: scores.size,
            output: ranked.length
        });
        return ranked;
    }
    getVectorSearchStats() {
        return this.vectorSearch.getStats();
    }
    identifyRelevantKeywords(query) {
        const keywords = [
            'roi', 'royal onyx', 'assurance', 'automobile', 'santé', 'habitation',
            'voyage', 'responsabilité', 'multirisques', 'agences', 'contact',
            'takaful', 'islamique', 'halal', 'charia', 'hajj', 'wakalah',
            'moudharaba', 'sharia board', 'conformité',
            'définition', 'concepts', 'principes', 'qu\'est-ce que',
            'fonctionnement', 'différence', 'termes', 'vocabulaire', 'glossaire',
            'finance islamique', 'assurance classique',
            'accidents', 'evacuation', 'incendie', 'chantier', 'crédit',
            'bétail', 'agricole', 'marchandises', 'équipements',
            'douala', 'yaoundé', 'cameroun', 'bafoussam', 'maroua', 'garoua'
        ];
        const queryLower = query.toLowerCase();
        return keywords.filter(keyword => queryLower.includes(keyword));
    }
    isTakafulQuery(query) {
        const takafulKeywords = [
            'takaful', 'islamique', 'halal', 'charia', 'hajj', 'wakalah',
            'moudharaba', 'sharia', 'religieux', 'conforme', 'islam',
            'définition takaful', 'qu\'est-ce que takaful', 'concepts takaful',
            'finance islamique', 'assurance islamique'
        ];
        const queryLower = query.toLowerCase();
        return takafulKeywords.some(keyword => queryLower.includes(keyword));
    }
    async loadGlossaireGeneralData() {
        try {
            const glossaireFilePath = path.join(process.cwd(), 'docs', 'GLOSSAIRE GENERAL ROI TAKAFUL.txt');
            if (!fs.existsSync(glossaireFilePath)) {
                logger_1.logger.warn('Fichier GLOSSAIRE GENERAL ROI TAKAFUL.txt introuvable', { path: glossaireFilePath });
                return;
            }
            const content = fs.readFileSync(glossaireFilePath, 'utf8');
            await this.databaseService.addKnowledgeEntry({
                category: 'takaful_glossaire',
                title: 'Glossaire Général ROI Takaful',
                content: content,
                keywords: [
                    'glossaire', 'définitions', 'termes', 'vocabulaire', 'takaful',
                    'actifs halal', 'comité conformité sharia', 'contribution', 'tabarru',
                    'événement dommageable', 'fatwas', 'fonds takaful', 'franchise',
                    'gharar', 'maysir', 'participant', 'qard hassan', 'riba',
                    'sharia', 'surplus', 'wakalah', 'wakalah fee', 'opérateur'
                ],
                isActive: true
            });
            logger_1.logger.info('Glossaire général ROI Takaful chargé avec succès');
        }
        catch (error) {
            logger_1.logger.error('Erreur lors du chargement du glossaire', { error });
            throw error;
        }
    }
    async loadNoticeInformationData() {
        try {
            const noticeFilePath = path.join(process.cwd(), 'docs', 'NOTICE DINFORMATION ROI TAKAFUL.txt');
            if (!fs.existsSync(noticeFilePath)) {
                logger_1.logger.warn('Fichier NOTICE DINFORMATION ROI TAKAFUL.txt introuvable', { path: noticeFilePath });
                return;
            }
            const content = fs.readFileSync(noticeFilePath, 'utf8');
            await this.databaseService.addKnowledgeEntry({
                category: 'takaful_notice',
                title: 'Notice d\'Information ROI Takaful',
                content: content,
                keywords: [
                    'notice information', 'comment fonctionne', 'takaful',
                    'approche solidaire', 'principe tabarru', 'don mutuel',
                    'absence riba', 'absence gharar', 'absence maysir',
                    'séparation fonds', 'rôle opérateur', 'wakiil',
                    'gouvernance sharia', 'comité conformité', 'ccs',
                    'convention takaful', 'contribution takaful', 'frais gestion',
                    'wakalah fee', 'excédents', 'surplus', 'déficits', 'qard hassan',
                    'obligations participant', 'réclamations', 'cima'
                ],
                isActive: true
            });
            logger_1.logger.info('Notice d\'information ROI Takaful chargée avec succès');
        }
        catch (error) {
            logger_1.logger.error('Erreur lors du chargement de la notice d\'information', { error });
            throw error;
        }
    }
    async loadTakafulAutomobileData() {
        try {
            const autoFilePath = path.join(process.cwd(), 'docs', 'ROI TAKAFUL AUTOMOBILE.txt');
            if (!fs.existsSync(autoFilePath)) {
                logger_1.logger.warn('Fichier ROI TAKAFUL AUTOMOBILE.txt introuvable', { path: autoFilePath });
                return;
            }
            const content = fs.readFileSync(autoFilePath, 'utf8');
            await this.databaseService.addKnowledgeEntry({
                category: 'takaful_automobile',
                title: 'ROI Takaful Automobile',
                content: content,
                keywords: [
                    'takaful automobile', 'assurance auto', 'véhicule', 'voiture',
                    'wakala-takaful', 'fonds takaful', 'contribution',
                    'responsabilité civile', 'rc', 'recours tiers', 'rti',
                    'dommages corporels', 'dommages matériels', 'collision',
                    'choc', 'renversement', 'ravin', 'accident',
                    'incendie', 'explosion', 'foudre',
                    'vol', 'braquage', 'tentative vol', 'accessoires',
                    'bris de glace', 'pare-brise', 'phares',
                    'individuelle personnes transportées', 'ipt',
                    'recours défense', 'assistance réparation', 'remorquage',
                    'prise en charge', 'sinistre', 'déclaration', 'expertise',
                    'plafond', 'franchise', 'cameroun', 'cima', 'zone cima'
                ],
                isActive: true
            });
            logger_1.logger.info('Données ROI Takaful Automobile chargées avec succès');
        }
        catch (error) {
            logger_1.logger.error('Erreur lors du chargement des données Takaful Automobile', { error });
            throw error;
        }
    }
    async loadSanteGroupeData() {
        try {
            const santeFilePath = path.join(process.cwd(), 'docs', 'ROI_TAKAFUL_SANTE_GROUPE_POUR_ISSA.txt');
            if (!fs.existsSync(santeFilePath)) {
                logger_1.logger.warn('Fichier ROI_TAKAFUL_SANTE_GROUPE_POUR_ISSA.txt introuvable', { path: santeFilePath });
                return;
            }
            const content = fs.readFileSync(santeFilePath, 'utf8');
            await this.databaseService.addKnowledgeEntry({
                category: 'takaful_sante_groupe',
                title: 'ROI Takaful Santé Groupe',
                content: content,
                keywords: [
                    'takaful santé', 'santé groupe', 'assurance santé', 'convention santé',
                    'prestations santé', 'couverture santé', 'personnel', 'employés',
                    'consultation', 'ambulatoire', 'hospitalisation', 'chirurgie',
                    'maternité', 'accouchement', 'grossesse', 'césarienne',
                    'pharmacie', 'médicaments', 'prescription',
                    'frais dentaires', 'soins dentaires', 'prothèses', 'extraction',
                    'optique', 'lunettes', 'verres correcteurs', 'montures',
                    'analyses', 'laboratoire', 'examens médicaux', 'biologie',
                    'rééducation', 'kinésithérapie', 'médecine traditionnelle',
                    'évacuation sanitaire', 'transfert', 'assistance',
                    'soins étranger', 'vih', 'sida', 'maladies opportunistes',
                    'prise en charge', 'remboursement', 'bon de prise en charge',
                    'prestataires', 'centres conventionnés', 'libre choix',
                    'plafond', 'franchise', 'contributeur', 'participant',
                    'sharia', 'charia', 'conforme', 'islamique'
                ],
                isActive: true
            });
            logger_1.logger.info('Données ROI Takaful Santé Groupe chargées avec succès');
        }
        catch (error) {
            logger_1.logger.error('Erreur lors du chargement des données Takaful Santé Groupe', { error });
            throw error;
        }
    }
}
exports.KnowledgeService = KnowledgeService;
//# sourceMappingURL=knowledgeService.js.map