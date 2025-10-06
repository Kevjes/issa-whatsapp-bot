"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryNormalizer = void 0;
const natural_1 = __importDefault(require("natural"));
const logger_1 = require("./logger");
const FrenchStemmer = natural_1.default.PorterStemmerFr;
class QueryNormalizer {
    constructor() {
        this.synonyms = new Map([
            ['takaful', ['assurance islamique', 'assurance halal', 'assurance charia', 'protection islamique']],
            ['islamique', ['halal', 'charia', 'sharia', 'conforme']],
            ['halal', ['islamique', 'charia', 'licite', 'conforme']],
            ['charia', ['sharia', 'islamique', 'fiqh', 'loi islamique']],
            ['wakalah', ['wakala', 'wakalat', 'agence', 'mandat']],
            ['moudharaba', ['mudaraba', 'moudaraba', 'mudarabah', 'partenariat']],
            ['tabarru', ['donation', 'contribution', 'cotisation solidaire']],
            ['assurance', ['couverture', 'protection', 'garantie', 'securite']],
            ['couverture', ['assurance', 'protection', 'garantie']],
            ['garantie', ['assurance', 'couverture', 'protection']],
            ['protection', ['assurance', 'couverture', 'garantie', 'securite']],
            ['automobile', ['auto', 'vehicule', 'voiture', 'transport']],
            ['auto', ['automobile', 'vehicule', 'voiture']],
            ['sante', ['medical', 'maladie', 'hospitalisation', 'soins']],
            ['medical', ['sante', 'maladie', 'hospitalisation']],
            ['voyage', ['deplacement', 'expatriation', 'sejour']],
            ['habitation', ['logement', 'maison', 'residence', 'domicile']],
            ['service', ['prestation', 'offre', 'produit']],
            ['produit', ['service', 'prestation', 'offre', 'solution']],
            ['offre', ['service', 'produit', 'prestation', 'solution']],
            ['contact', ['coordonnees', 'telephone', 'email', 'joindre']],
            ['agence', ['bureau', 'guichet', 'point de vente', 'succursale']],
            ['douala', ['dla', 'capitale economique']],
            ['yaounde', ['yde', 'capitale']],
            ['hajj', ['hadj', 'pelerinage', 'mecque']],
            ['muslim', ['musulman', 'islamique']],
            ['musulman', ['muslim', 'islamique']],
            ['roi', ['royal onyx', 'royal onyx insurance']],
            ['entreprise', ['compagnie', 'societe', 'organisation']],
            ['compagnie', ['entreprise', 'societe', 'organisation']],
            ['quest ce que', ['definition', 'explication', 'cest quoi']],
            ['comment', ['mode', 'fonctionnement', 'procedure']],
            ['pourquoi', ['raison', 'motif', 'cause']],
            ['ou', ['adresse', 'localisation', 'emplacement']],
            ['souscrire', ['adherer', 'contracter', 'prendre']],
            ['demander', ['obtenir', 'avoir', 'solliciter']],
        ]);
        this.stopWords = new Set([
            'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'au', 'aux',
            'et', 'ou', 'mais', 'donc', 'or', 'ni', 'car',
            'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles',
            'ce', 'cet', 'cette', 'ces',
            'mon', 'ton', 'son', 'ma', 'ta', 'sa', 'mes', 'tes', 'ses',
            'qui', 'que', 'quoi', 'dont', 'où', 'quand',
            'quel', 'quelle', 'quels', 'quelles',
            'a', 'ai', 'as', 'ont', 'est', 'sont', 'être', 'avoir',
            'dans', 'sur', 'sous', 'pour', 'par', 'avec', 'sans',
            'plus', 'moins', 'très', 'trop', 'assez',
            'fait', 'faire', 'dit', 'dire', 'peut', 'puis', 'suis', 'sera',
            'cest', 'qu', 'offre', 'offrir', 'donne'
        ]);
    }
    normalize(text) {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
    extractKeywords(text) {
        const normalized = this.normalize(text);
        const words = normalized.split(/\s+/);
        return words.filter(word => word.length > 2 &&
            !this.stopWords.has(word));
    }
    stem(word) {
        try {
            return FrenchStemmer.stem(word);
        }
        catch (error) {
            logger_1.logger.debug('Erreur stemming', { word, error });
            return word;
        }
    }
    getSynonyms(word) {
        const normalized = this.normalize(word);
        const directSynonyms = this.synonyms.get(normalized) || [];
        const reverseSynonyms = [];
        for (const [key, values] of this.synonyms.entries()) {
            if (values.includes(normalized) && key !== normalized) {
                reverseSynonyms.push(key);
            }
        }
        return [...new Set([...directSynonyms, ...reverseSynonyms])];
    }
    expand(query) {
        const keywords = this.extractKeywords(query);
        const expanded = new Set(keywords);
        for (const word of keywords) {
            const stemmed = this.stem(word);
            if (stemmed !== word) {
                expanded.add(stemmed);
            }
            const synonyms = this.getSynonyms(word);
            synonyms.forEach(syn => {
                expanded.add(syn);
                const synStem = this.stem(syn);
                if (synStem !== syn) {
                    expanded.add(synStem);
                }
            });
        }
        return Array.from(expanded);
    }
    toFTS5Query(query) {
        const keywords = this.extractKeywords(query);
        const stems = keywords.map(w => this.stem(w));
        const terms = [...new Set([...keywords, ...stems])];
        const limitedTerms = terms.slice(0, 10);
        return limitedTerms.join(' ');
    }
    toLikePatterns(query) {
        const keywords = this.extractKeywords(query);
        const patterns = new Set();
        for (const word of keywords) {
            patterns.add(`%${word}%`);
            const synonyms = this.getSynonyms(word).slice(0, 3);
            synonyms.forEach(syn => patterns.add(`%${syn}%`));
        }
        return Array.from(patterns).slice(0, 10);
    }
    detectLanguage(query) {
        const frenchIndicators = ['le', 'la', 'les', 'un', 'une', 'des', 'est', 'sont', 'que', 'qui'];
        const normalized = this.normalize(query);
        const words = normalized.split(/\s+/);
        const frenchCount = words.filter(w => frenchIndicators.includes(w)).length;
        return frenchCount > 0 ? 'fr' : 'other';
    }
    analyze(query) {
        const normalized = this.normalize(query);
        const keywords = this.extractKeywords(query);
        const stems = keywords.map(w => this.stem(w));
        const allSynonyms = keywords.flatMap(w => this.getSynonyms(w));
        const expanded = this.expand(query);
        const language = this.detectLanguage(query);
        const fts5Query = this.toFTS5Query(query);
        const likePatterns = this.toLikePatterns(query);
        return {
            original: query,
            normalized,
            keywords,
            stems,
            synonyms: allSynonyms,
            expanded,
            language,
            fts5Query,
            likePatterns
        };
    }
}
exports.QueryNormalizer = QueryNormalizer;
//# sourceMappingURL=queryNormalizer.js.map