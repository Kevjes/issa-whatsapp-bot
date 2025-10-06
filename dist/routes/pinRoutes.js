"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Container_1 = require("../core/di/Container");
const logger_1 = require("../utils/logger");
const path_1 = __importDefault(require("path"));
const router = (0, express_1.Router)();
router.get('/pin/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const pinSessionService = await Container_1.container.resolve(Container_1.TOKENS.PIN_SESSION_SERVICE);
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
        return res.sendFile(path_1.default.join(__dirname, '../../public/pin.html'));
    }
    catch (error) {
        logger_1.logger.error('Error displaying PIN page:', error);
        return res.status(500).send('Internal server error');
    }
});
router.get('/api/pin/validate/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const pinSessionService = await Container_1.container.resolve(Container_1.TOKENS.PIN_SESSION_SERVICE);
        const session = await pinSessionService.getPinSession(sessionId);
        const isValid = session && !session.isExpired && !session.isCompleted && !session.isLinkUsed;
        return res.json({
            valid: isValid,
            message: isValid ? 'Session valid' : 'Session invalid or expired'
        });
    }
    catch (error) {
        logger_1.logger.error('Error validating session:', error);
        return res.status(500).json({
            valid: false,
            message: 'Error validating session'
        });
    }
});
router.post('/api/pin/submit', async (req, res) => {
    try {
        const { sessionId, pin } = req.body;
        if (!sessionId || !pin) {
            return res.status(400).json({
                success: false,
                message: 'Session ID and PIN are required'
            });
        }
        if (!/^\d{4,6}$/.test(pin)) {
            return res.status(400).json({
                success: false,
                message: 'The PIN must contain between 4 and 6 digits'
            });
        }
        const pinSessionService = await Container_1.container.resolve(Container_1.TOKENS.PIN_SESSION_SERVICE);
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
        const result = await pinSessionService.submitPin(sessionId, pin);
        if (result.success) {
            return res.json({
                success: true,
                message: 'PIN validated successfully! Return to WhatsApp to see your accounts.'
            });
        }
        else {
            return res.status(401).json({
                success: false,
                message: result.message || 'PIN incorrect'
            });
        }
    }
    catch (error) {
        logger_1.logger.error('Error submitting PIN:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
router.post('/api/pin/cleanup', async (req, res) => {
    try {
        const pinSessionService = await Container_1.container.resolve(Container_1.TOKENS.PIN_SESSION_SERVICE);
        await pinSessionService.cleanupExpiredSessions();
        return res.json({
            success: true,
            message: 'Sessions expired cleaned'
        });
    }
    catch (error) {
        logger_1.logger.error('Error cleaning up sessions:', error);
        return res.status(500).json({
            success: false,
            message: 'Error cleaning up sessions'
        });
    }
});
exports.default = router;
//# sourceMappingURL=pinRoutes.js.map