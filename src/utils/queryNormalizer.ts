/**
 * QueryNormalizer - Normalisation et expansion des requêtes de recherche
 *
 * Fonctionnalités :
 * - Normalisation (accents, casse, espaces)
 * - Stemming français (racinisation des mots)
 * - Expansion par synonymes
 * - Support pluriels et variations
 */

import natural from 'natural';
import { logger } from './logger';

// Stemmer français de natural
const FrenchStemmer = natural.PorterStemmerFr;

export class QueryNormalizer {
  // Dictionnaire de synonymes pour le domaine Takaful/Assurance
  private synonyms: Map<string, string[]> = new Map([
    // Takaful et assurance islamique
    ['takaful', ['assurance islamique', 'assurance halal', 'assurance charia', 'protection islamique']],
    ['islamique', ['halal', 'charia', 'sharia', 'conforme']],
    ['halal', ['islamique', 'charia', 'licite', 'conforme']],
    ['charia', ['sharia', 'islamique', 'fiqh', 'loi islamique']],

    // Termes techniques Takaful
    ['wakalah', ['wakala', 'wakalat', 'agence', 'mandat']],
    ['moudharaba', ['mudaraba', 'moudaraba', 'mudarabah', 'partenariat']],
    ['tabarru', ['donation', 'contribution', 'cotisation solidaire']],

    // Assurance générale
    ['assurance', ['couverture', 'protection', 'garantie', 'securite']],
    ['couverture', ['assurance', 'protection', 'garantie']],
    ['garantie', ['assurance', 'couverture', 'protection']],
    ['protection', ['assurance', 'couverture', 'garantie', 'securite']],

    // Types d'assurance
    ['automobile', ['auto', 'vehicule', 'voiture', 'transport']],
    ['auto', ['automobile', 'vehicule', 'voiture']],
    ['sante', ['medical', 'maladie', 'hospitalisation', 'soins']],
    ['medical', ['sante', 'maladie', 'hospitalisation']],
    ['voyage', ['deplacement', 'expatriation', 'sejour']],
    ['habitation', ['logement', 'maison', 'residence', 'domicile']],

    // Services
    ['service', ['prestation', 'offre', 'produit']],
    ['produit', ['service', 'prestation', 'offre', 'solution']],
    ['offre', ['service', 'produit', 'prestation', 'solution']],

    // Contact et localisation
    ['contact', ['coordonnees', 'telephone', 'email', 'joindre']],
    ['agence', ['bureau', 'guichet', 'point de vente', 'succursale']],
    ['douala', ['dla', 'capitale economique']],
    ['yaounde', ['yde', 'capitale']],

    // Religion et spiritualité
    ['hajj', ['hadj', 'pelerinage', 'mecque']],
    ['muslim', ['musulman', 'islamique']],
    ['musulman', ['muslim', 'islamique']],

    // Entreprise
    ['roi', ['royal onyx', 'royal onyx insurance']],
    ['entreprise', ['compagnie', 'societe', 'organisation']],
    ['compagnie', ['entreprise', 'societe', 'organisation']],

    // Questions courantes
    ['quest ce que', ['definition', 'explication', 'cest quoi']],
    ['comment', ['mode', 'fonctionnement', 'procedure']],
    ['pourquoi', ['raison', 'motif', 'cause']],
    ['ou', ['adresse', 'localisation', 'emplacement']],

    // Actions
    ['souscrire', ['adherer', 'contracter', 'prendre']],
    ['demander', ['obtenir', 'avoir', 'solliciter']],
  ]);

  // Stop words français (mots vides à ignorer)
  private stopWords: Set<string> = new Set([
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

  /**
   * Normaliser une chaîne de caractères
   * - Convertir en minuscules
   * - Enlever les accents
   * - Nettoyer les espaces multiples
   */
  normalize(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')                    // Décomposer les caractères accentués
      .replace(/[\u0300-\u036f]/g, '')    // Enlever les marques diacritiques
      .replace(/[^\w\s]/g, ' ')           // Remplacer caractères spéciaux par espaces
      .replace(/\s+/g, ' ')               // Nettoyer espaces multiples
      .trim();
  }

  /**
   * Extraire les mots significatifs (sans stop words)
   */
  extractKeywords(text: string): string[] {
    const normalized = this.normalize(text);
    const words = normalized.split(/\s+/);

    return words.filter(word =>
      word.length > 2 &&                   // Mots de plus de 2 caractères
      !this.stopWords.has(word)           // Pas un stop word
    );
  }

  /**
   * Appliquer le stemming français
   */
  stem(word: string): string {
    try {
      return FrenchStemmer.stem(word);
    } catch (error) {
      logger.debug('Erreur stemming', { word, error });
      return word;
    }
  }

  /**
   * Obtenir les synonymes d'un mot
   */
  getSynonyms(word: string): string[] {
    const normalized = this.normalize(word);

    // Chercher les synonymes directs
    const directSynonyms = this.synonyms.get(normalized) || [];

    // Chercher aussi les mots dont le mot courant est synonyme
    const reverseSynonyms: string[] = [];
    for (const [key, values] of this.synonyms.entries()) {
      if (values.includes(normalized) && key !== normalized) {
        reverseSynonyms.push(key);
      }
    }

    return [...new Set([...directSynonyms, ...reverseSynonyms])];
  }

  /**
   * Expander une requête avec stems et synonymes
   * Retourne une liste de termes de recherche élargis
   */
  expand(query: string): string[] {
    const keywords = this.extractKeywords(query);
    const expanded = new Set<string>(keywords);

    for (const word of keywords) {
      // Ajouter le stem
      const stemmed = this.stem(word);
      if (stemmed !== word) {
        expanded.add(stemmed);
      }

      // Ajouter les synonymes
      const synonyms = this.getSynonyms(word);
      synonyms.forEach(syn => {
        expanded.add(syn);
        // Ajouter aussi le stem du synonyme
        const synStem = this.stem(syn);
        if (synStem !== syn) {
          expanded.add(synStem);
        }
      });
    }

    return Array.from(expanded);
  }

  /**
   * Créer une requête FTS5 optimisée
   * Utilise uniquement les termes clés sans expansion excessive
   */
  toFTS5Query(query: string): string {
    // Utiliser seulement les mots-clés extraits et leurs stems
    const keywords = this.extractKeywords(query);
    const stems = keywords.map(w => this.stem(w));

    // Combiner keywords et stems, enlever les doublons
    const terms = [...new Set([...keywords, ...stems])];

    // Limiter à 10 termes pour recherche plus ciblée
    const limitedTerms = terms.slice(0, 10);

    // Retourner les termes séparés par des espaces (recherche AND implicite)
    return limitedTerms.join(' ');
  }

  /**
   * Créer une requête SQL LIKE optimisée
   * Pour le fallback quand FTS5 n'est pas disponible
   */
  toLikePatterns(query: string): string[] {
    const keywords = this.extractKeywords(query);
    const patterns = new Set<string>();

    for (const word of keywords) {
      patterns.add(`%${word}%`);

      // Ajouter synonymes principaux seulement (limité)
      const synonyms = this.getSynonyms(word).slice(0, 3);
      synonyms.forEach(syn => patterns.add(`%${syn}%`));
    }

    return Array.from(patterns).slice(0, 10); // Limiter à 10 patterns
  }

  /**
   * Détecter la langue de la requête (français vs autres)
   */
  detectLanguage(query: string): 'fr' | 'other' {
    const frenchIndicators = ['le', 'la', 'les', 'un', 'une', 'des', 'est', 'sont', 'que', 'qui'];
    const normalized = this.normalize(query);
    const words = normalized.split(/\s+/);

    const frenchCount = words.filter(w => frenchIndicators.includes(w)).length;

    return frenchCount > 0 ? 'fr' : 'other';
  }

  /**
   * Analyser une requête et retourner les informations enrichies
   */
  analyze(query: string): {
    original: string;
    normalized: string;
    keywords: string[];
    stems: string[];
    synonyms: string[];
    expanded: string[];
    language: 'fr' | 'other';
    fts5Query: string;
    likePatterns: string[];
  } {
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
