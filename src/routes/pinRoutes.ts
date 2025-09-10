import { Router, Request, Response } from 'express';
import { container, TOKENS } from '../core/di/Container';
import { IPinSessionService } from '../core/interfaces/IPinSessionService';
import { logger } from '../utils/logger';
import path from 'path';

const router = Router();

// Route pour afficher la page de saisie du PIN
router.get('/pin/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    // Vérifier si la session existe et est valide
    const pinSessionService = await container.resolve<IPinSessionService>(TOKENS.PIN_SESSION_SERVICE);
    const session = await pinSessionService.getPinSession(sessionId);
    
    if (!session || session.isExpired || session.isCompleted || session.isLinkUsed) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Expired Session - Afriland First Bank</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0;
              padding: 20px;
            }
            .container {
              background: white;
              border-radius: 20px;
              box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
              padding: 40px;
              max-width: 400px;
              width: 100%;
              text-align: center;
            }
            .error-icon {
              font-size: 64px;
              margin-bottom: 20px;
            }
            h1 {
              color: #e74c3c;
              margin-bottom: 20px;
            }
            p {
              color: #7f8c8d;
              line-height: 1.6;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error-icon">⏰</div>
            <h1>Expired Session</h1>
            <p>This PIN entry session has expired or is no longer valid.</p>
            <p>Please restart from WhatsApp.</p>
          </div>
        </body>
        </html>
      `);
    }
    
    // Servir la page HTML
    return res.sendFile(path.join(__dirname, '../../public/pin.html'));
    
  } catch (error) {
    logger.error('Error displaying PIN page:', error);
    return res.status(500).send('Internal server error');
  }
});

// Route API pour valider une session
router.get('/api/pin/validate/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    const pinSessionService = await container.resolve<IPinSessionService>(TOKENS.PIN_SESSION_SERVICE);
    const session = await pinSessionService.getPinSession(sessionId);
    const isValid = session && !session.isExpired && !session.isCompleted && !session.isLinkUsed;
    
    return res.json({
      valid: isValid,
      message: isValid ? 'Session valid' : 'Session invalid or expired'
    });
    
  } catch (error) {
    logger.error('Error validating session:', error);
    return res.status(500).json({
      valid: false,
      message: 'Error validating session'
    });
  }
});

// Route API pour soumettre le PIN
router.post('/api/pin/submit', async (req: Request, res: Response) => {
  try {
    const { sessionId, pin } = req.body;
    
    if (!sessionId || !pin) {
      return res.status(400).json({
        success: false,
        message: 'Session ID and PIN are required'
      });
    }
    
    // Validate PIN format
    if (!/^\d{4,6}$/.test(pin)) {
      return res.status(400).json({
        success: false,
        message: 'The PIN must contain between 4 and 6 digits'
      });
    }
    
    // Vérifier si la session existe et est valide
    const pinSessionService = await container.resolve<IPinSessionService>(TOKENS.PIN_SESSION_SERVICE);
    const session = await pinSessionService.getPinSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    if (session.isExpired) {
      return res.status(410).json({
        success: false,
        message: 'Session expired'
      });
    }
    
    if (session.isCompleted) {
      return res.status(409).json({
        success: false,
        message: 'Session already used'
      });
    }

    if (session.isLinkUsed) {
      return res.status(409).json({
        success: false,
        message: 'PIN link already used'
      });
    }
    
    // Traiter la soumission du PIN
    const result = await pinSessionService.submitPin(sessionId, pin);
    
    if (result.success) {
      return res.json({
        success: true,
        message: 'PIN validated successfully! Return to WhatsApp to see your accounts.'
      });
    } else {
      return res.status(401).json({
        success: false,
        message: result.message || 'PIN incorrect'
      });
    }
    
  } catch (error) {
    logger.error('Error submitting PIN:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Route pour nettoyer les sessions expirées (peut être appelée par un cron job)
router.post('/api/pin/cleanup', async (req: Request, res: Response) => {
  try {
    const pinSessionService = await container.resolve<IPinSessionService>(TOKENS.PIN_SESSION_SERVICE);
    await pinSessionService.cleanupExpiredSessions();
    return res.json({
      success: true,
      message: 'Sessions expired cleaned'
    });
  } catch (error) {
    logger.error('Error cleaning up sessions:', error);
    return res.status(500).json({
      success: false,
      message: 'Error cleaning up sessions'
    });
  }
});

export default router;