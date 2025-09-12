import { KnowledgeBase } from '../types';
import { DatabaseService } from './databaseService';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

export class KnowledgeService {
  private databaseService: DatabaseService;

  constructor(databaseService: DatabaseService) {
    this.databaseService = databaseService;
  }

  /**
   * Initialiser la base de connaissances avec les données ROI
   */
  async initializeKnowledgeBase(): Promise<void> {
    try {
      // Vérifier si des données existent déjà
      const existingEntries = await this.databaseService.searchKnowledgeBase('ROI');
      if (existingEntries.length > 0) {
        logger.info('Base de connaissances déjà initialisée', { entriesCount: existingEntries.length });
        return;
      }

      logger.info('Initialisation de la base de connaissances...');

      // Charger les données ROI et ROI Takaful
      await this.loadROIData();
      await this.loadROITakafulData();

      logger.info('Base de connaissances initialisée avec succès');
    } catch (error) {
      logger.error('Erreur lors de l\'initialisation de la base de connaissances', { error });
      throw error;
    }
  }

  /**
   * Charger les données générales de ROI
   */
  private async loadROIData(): Promise<void> {
    try {
      const roiFilePath = path.join(process.cwd(), 'docs', 'presentation_ROI.txt');
      
      if (!fs.existsSync(roiFilePath)) {
        logger.warn('Fichier presentation_ROI.txt introuvable', { path: roiFilePath });
        return;
      }

      const content = fs.readFileSync(roiFilePath, 'utf8');
      
      // Ajouter l'entrée principale ROI
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

      // Extraire et ajouter des entrées spécifiques
      await this.addROISpecificEntries(content);

      logger.info('Données ROI chargées avec succès');
    } catch (error) {
      logger.error('Erreur lors du chargement des données ROI', { error });
      throw error;
    }
  }

  /**
   * Charger les données ROI Takaful
   */
  private async loadROITakafulData(): Promise<void> {
    try {
      const takafulFilePath = path.join(process.cwd(), 'docs', 'presentation_ROI_takaful.txt');
      
      if (!fs.existsSync(takafulFilePath)) {
        logger.warn('Fichier presentation_ROI_takaful.txt introuvable', { path: takafulFilePath });
        return;
      }

      const content = fs.readFileSync(takafulFilePath, 'utf8');
      
      // Ajouter l'entrée principale ROI Takaful
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

      // Extraire et ajouter des entrées spécifiques Takaful
      await this.addTakafulSpecificEntries(content);

      logger.info('Données ROI Takaful chargées avec succès');
    } catch (error) {
      logger.error('Erreur lors du chargement des données ROI Takaful', { error });
      throw error;
    }
  }

  /**
   * Ajouter des entrées spécifiques pour ROI
   */
  private async addROISpecificEntries(content: string): Promise<void> {
    // Services ROI
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

    // Agences ROI
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

    // Contact ROI
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

  /**
   * Ajouter des entrées spécifiques pour ROI Takaful
   */
  private async addTakafulSpecificEntries(content: string): Promise<void> {
    // Services Takaful
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

    // Sharia Board
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

    // Fonctionnement Takaful
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

    // Contact Takaful
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

  /**
   * Rechercher dans la base de connaissances
   */
  async search(query: string): Promise<KnowledgeBase[]> {
    return await this.databaseService.searchKnowledgeBase(query);
  }

  /**
   * Ajouter une nouvelle entrée à la base de connaissances
   */
  async addEntry(entry: Omit<KnowledgeBase, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    return await this.databaseService.addKnowledgeEntry(entry);
  }

  /**
   * Obtenir le contexte de connaissance pour une requête
   */
  async getContextForQuery(query: string): Promise<string> {
    try {
      const results = await this.search(query.toLowerCase());
      
      if (results.length === 0) {
        return 'Aucune information spécifique trouvée dans la base de connaissances.';
      }

      // Limiter à 3 résultats les plus pertinents
      const topResults = results.slice(0, 3);
      
      let context = 'Informations pertinentes :\n\n';
      for (const result of topResults) {
        context += `**${result.title}**\n${result.content}\n\n`;
      }

      return context;
    } catch (error) {
      logger.error('Erreur lors de la recherche de contexte', { error, query });
      return 'Erreur lors de la récupération des informations.';
    }
  }

  /**
   * Identifier les mots-clés dans une requête utilisateur
   */
  identifyRelevantKeywords(query: string): string[] {
    const keywords = [
      // ROI général
      'roi', 'royal onyx', 'assurance', 'automobile', 'santé', 'habitation',
      'voyage', 'responsabilité', 'multirisques', 'agences', 'contact',
      
      // ROI Takaful
      'takaful', 'islamique', 'halal', 'charia', 'hajj', 'wakalah',
      'moudharaba', 'sharia board', 'conformité',
      
      // Services
      'accidents', 'evacuation', 'incendie', 'chantier', 'crédit',
      'bétail', 'agricole', 'marchandises', 'équipements',
      
      // Localisation
      'douala', 'yaoundé', 'cameroun', 'bafoussam', 'maroua', 'garoua'
    ];

    const queryLower = query.toLowerCase();
    return keywords.filter(keyword => queryLower.includes(keyword));
  }

  /**
   * Déterminer si la requête concerne ROI Takaful
   */
  isTakafulQuery(query: string): boolean {
    const takafulKeywords = [
      'takaful', 'islamique', 'halal', 'charia', 'hajj', 'wakalah',
      'moudharaba', 'sharia', 'religieux', 'conforme', 'islam'
    ];

    const queryLower = query.toLowerCase();
    return takafulKeywords.some(keyword => queryLower.includes(keyword));
  }
}