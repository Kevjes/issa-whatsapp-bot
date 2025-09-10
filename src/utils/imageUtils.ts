import { config } from '../config';

/**
 * Sélectionne une image aléatoire parmi la liste des images de bienvenue
 * @returns URL de l'image sélectionnée
 */
export function getRandomWelcomeImage(): string {
  const images = config.welcome.images;
  
  if (!images || images.length === 0) {
    return 'https://i.ibb.co/60XL01BH/Chat-GPT-Image-Jul-23-2025-11-05-00-PM.png';
  }
  const randomIndex = Math.floor(Math.random() * images.length);
  return images[randomIndex];
}

/**
 * Valide qu'une URL d'image est correctement formatée
 * @param url URL à valider
 * @returns true si l'URL est valide
 */
export function isValidImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}