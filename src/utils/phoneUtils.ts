/**
 * Utilitaires pour la gestion des numéros de téléphone
 */

/**
 * Normalise un numéro de téléphone camerounais
 * Ajoute le chiffre '6' si le numéro n'a que 9 chiffres après l'indicatif pays
 * 
 * @param phoneNumber - Le numéro de téléphone à normaliser
 * @returns Le numéro de téléphone normalisé
 * 
 * @example
 * normalizeCameroonianPhoneNumber('23791231554') // '237691231554'
 * normalizeCameroonianPhoneNumber('237691231554') // '237691231554' (déjà correct)
 * normalizeCameroonianPhoneNumber('237123456789') // '237123456789' (déjà 10 chiffres)
 */
export function normalizeCameroonianPhoneNumber(phoneNumber: string): string {
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  
  if (!cleanNumber.startsWith('237')) {
    return cleanNumber;
  }
  const numberWithoutCountryCode = cleanNumber.substring(3);
  if (numberWithoutCountryCode.length === 8) {
    return `237${6}${numberWithoutCountryCode}`;
  }
  return cleanNumber;
}

/**
 * Valide si un numéro de téléphone camerounais est au bon format
 * 
 * @param phoneNumber - Le numéro de téléphone à valider
 * @returns true si le numéro est valide, false sinon
 */
export function isValidCameroonianPhoneNumber(phoneNumber: string): boolean {
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  
  return cleanNumber.startsWith('237') && 
         (cleanNumber.length === 12 || cleanNumber.length === 13);
}

/**
 * Formate un numéro de téléphone pour l'affichage
 * 
 * @param phoneNumber - Le numéro de téléphone à formater
 * @returns Le numéro formaté
 * 
 * @example
 * formatPhoneNumber('237691231554') // '+237 6 91 23 15 54'
 */
export function formatPhoneNumber(phoneNumber: string): string {
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  
  if (cleanNumber.startsWith('237') && cleanNumber.length >= 12) {
    const countryCode = cleanNumber.substring(0, 3);
    const firstDigit = cleanNumber.substring(3, 4);
    const remaining = cleanNumber.substring(4);
    
    const formattedRemaining = remaining.match(/.{1,2}/g)?.join(' ') || remaining;
    
    return `+${countryCode} ${firstDigit} ${formattedRemaining}`;
  }
  
  return phoneNumber;
}