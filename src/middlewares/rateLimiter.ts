import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * Rate limiter général pour toutes les routes
 */
export const generalRateLimit = rateLimit({
  windowMs: config.rateLimit.windowMs, // 15 minutes par défaut
  max: config.rateLimit.maxRequests, // 100 requêtes par défaut
  message: {
    error: 'Too many requests, please try again later.',
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      url: req.url,
      userAgent: req.get('User-Agent')
    });
    
    res.status(429).json({
      error: 'Too many requests, please try again later.',
      retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
    });
  },
  skip: (req: Request) => {
    // Ne pas appliquer le rate limiting aux health checks
    return req.url === '/health' || req.url === '/ping';
  }
});

/**
 * Rate limiter strict pour les webhooks WhatsApp
 * Plus permissif car les messages légitimes peuvent arriver en rafale
 */
export const webhookRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // 50 messages par minute par IP
  message: {
    error: 'Too many messages received, slow down.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    // Utiliser l'IP et le numéro de téléphone pour le rate limiting
    const phoneNumber = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;
    return phoneNumber ? `${req.ip}-${phoneNumber}` : req.ip || 'unknown';
  },
  handler: (req: Request, res: Response) => {
    const phoneNumber = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;
    
    logger.warn('Rate limit webhook exceeded', {
      ip: req.ip,
      phoneNumber,
      url: req.url
    });
    
    res.status(429).json({
      error: 'Too many messages received, slow down.'
    });
  }
});

/**
 * Rate limiter pour les appels à l'IA (plus restrictif)
 */
export const aiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 appels IA par minute par utilisateur
  message: {
    error: 'You are using our AI assistant too frequently. Please wait.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    // Rate limiting par numéro de téléphone pour l'IA
    const phoneNumber = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;
    return phoneNumber || req.ip || 'unknown';
  },
  handler: (req: Request, res: Response) => {
    const phoneNumber = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;
    
    logger.warn('Rate limit IA exceeded', {
      ip: req.ip,
      phoneNumber
    });
    
    // Répondre directement via WhatsApp si possible
    if (phoneNumber) {
      // Note: Ici on pourrait envoyer un message WhatsApp directement
      // mais pour simplifier, on retourne juste une réponse HTTP
    }
    
    res.status(429).json({
      error: 'Rate limit IA exceeded'
    });
  }
});

/**
 * Rate limiter pour les endpoints administratifs
 */
export const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requêtes par 15 minutes
  message: {
    error: 'Too many admin requests, please try again later.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit admin exceeded', {
      ip: req.ip,
      url: req.url,
      userAgent: req.get('User-Agent')
    });
    
    res.status(429).json({
      error: 'Too many admin requests, please try again later.'
    });
  }
});

/**
 * Middleware personnalisé pour le rate limiting par utilisateur
 */
class UserRateLimiter {
  private userLimits: Map<string, { count: number; resetTime: number }> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 5, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    
    // Nettoyer les anciens enregistrements toutes les 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  check(userId: string): { allowed: boolean; resetTime?: number } {
    const now = Date.now();
    const userLimit = this.userLimits.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      // Nouveau utilisateur ou fenêtre expirée
      this.userLimits.set(userId, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return { allowed: true };
    }

    if (userLimit.count >= this.maxRequests) {
      return { 
        allowed: false, 
        resetTime: userLimit.resetTime 
      };
    }

    // Incrémenter le compteur
    userLimit.count++;
    return { allowed: true };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [userId, limit] of this.userLimits.entries()) {
      if (now > limit.resetTime) {
        this.userLimits.delete(userId);
      }
    }
  }
}

// Instance globale pour le rate limiting par utilisateur
export const userRateLimiter = new UserRateLimiter(5, 60000); // 5 messages par minute