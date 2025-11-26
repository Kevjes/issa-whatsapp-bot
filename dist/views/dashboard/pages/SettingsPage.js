"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsPage = void 0;
const DashboardLayout_1 = require("../components/DashboardLayout");
class SettingsPage {
    constructor() {
        this.layout = new DashboardLayout_1.DashboardLayout({
            user: { id: '1', username: 'admin', role: 'admin', isActive: true },
            currentPage: 'settings',
            children: ''
        });
    }
    render(data) {
        const content = `
      <div class="page-content">
        <!-- En-tête de page -->
        <div class="page-header">
          <div class="page-header-content">
            <h1 class="page-title">
              <i class="fas fa-cog"></i>
              Paramètres du Système
            </h1>
            <p class="page-description">
              Configurez les paramètres de la plateforme WhatsApp Banking
            </p>
          </div>
          <div class="page-actions">
            <button class="btn btn-success" data-action="save-settings">
              <i class="fas fa-save"></i>
              Sauvegarder
            </button>
            <button class="btn btn-secondary" data-action="reset-settings">
              <i class="fas fa-undo"></i>
              Réinitialiser
            </button>
          </div>
        </div>
        
        <!-- Onglets de paramètres -->
        <div class="settings-tabs">
          <nav class="nav nav-tabs" id="settingsTab" role="tablist">
            <button class="nav-link active" id="system-tab" data-bs-toggle="tab" data-bs-target="#system" type="button" role="tab">
              <i class="fas fa-server"></i>
              Système
            </button>
            <button class="nav-link" id="whatsapp-tab" data-bs-toggle="tab" data-bs-target="#whatsapp" type="button" role="tab">
              <i class="fab fa-whatsapp"></i>
              WhatsApp
            </button>
            <button class="nav-link" id="security-tab" data-bs-toggle="tab" data-bs-target="#security" type="button" role="tab">
              <i class="fas fa-shield-alt"></i>
              Sécurité
            </button>
            <button class="nav-link" id="notifications-tab" data-bs-toggle="tab" data-bs-target="#notifications" type="button" role="tab">
              <i class="fas fa-bell"></i>
              Notifications
            </button>
          </nav>
          
          <div class="tab-content" id="settingsTabContent">
            <!-- Paramètres Système -->
            <div class="tab-pane fade show active" id="system" role="tabpanel">
              <div class="settings-section">
                <h3 class="settings-section-title">
                  <i class="fas fa-server"></i>
                  Configuration Système
                </h3>
                
                <div class="settings-grid">
                  <div class="setting-item">
                    <label class="setting-label">
                      <input type="checkbox" id="auto-cleanup" ${data.systemSettings.autoCleanup ? 'checked' : ''}>
                      <span class="setting-title">Nettoyage Automatique</span>
                    </label>
                    <p class="setting-description">Active le nettoyage automatique des logs et sessions expirées</p>
                  </div>
                  
                  <div class="setting-item">
                    <label class="setting-label" for="cleanup-interval">
                      <span class="setting-title">Intervalle de Nettoyage (heures)</span>
                    </label>
                    <input type="number" id="cleanup-interval" class="form-control" value="${data.systemSettings.cleanupInterval}" min="1" max="168">
                    <p class="setting-description">Fréquence d'exécution du nettoyage automatique</p>
                  </div>
                  
                  <div class="setting-item">
                    <label class="setting-label" for="logs-retention">
                      <span class="setting-title">Rétention des Logs (jours)</span>
                    </label>
                    <input type="number" id="logs-retention" class="form-control" value="${data.systemSettings.logsRetention}" min="1" max="365">
                    <p class="setting-description">Durée de conservation des logs avant suppression</p>
                  </div>
                  
                  <div class="setting-item">
                    <label class="setting-label" for="sessions-retention">
                      <span class="setting-title">Rétention des Sessions (jours)</span>
                    </label>
                    <input type="number" id="sessions-retention" class="form-control" value="${data.systemSettings.sessionsRetention}" min="1" max="30">
                    <p class="setting-description">Durée de conservation des sessions avant suppression</p>
                  </div>
                  
                  <div class="setting-item">
                    <label class="setting-label" for="max-sessions">
                      <span class="setting-title">Sessions Max par Utilisateur</span>
                    </label>
                    <input type="number" id="max-sessions" class="form-control" value="${data.systemSettings.maxSessionsPerUser}" min="1" max="10">
                    <p class="setting-description">Nombre maximum de sessions simultanées par utilisateur</p>
                  </div>
                  
                  <div class="setting-item">
                    <label class="setting-label" for="session-timeout">
                      <span class="setting-title">Timeout de Session (minutes)</span>
                    </label>
                    <input type="number" id="session-timeout" class="form-control" value="${data.systemSettings.sessionTimeout}" min="5" max="60">
                    <p class="setting-description">Durée d'inactivité avant expiration de session</p>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Paramètres WhatsApp -->
            <div class="tab-pane fade" id="whatsapp" role="tabpanel">
              <div class="settings-section">
                <h3 class="settings-section-title">
                  <i class="fab fa-whatsapp"></i>
                  Configuration WhatsApp Business API
                </h3>
                
                <div class="settings-grid">
                  <div class="setting-item">
                    <label class="setting-label" for="phone-number-id">
                      <span class="setting-title">Phone Number ID</span>
                    </label>
                    <input type="text" id="phone-number-id" class="form-control" value="${data.whatsappSettings.phoneNumberId}" readonly>
                    <p class="setting-description">Identifiant du numéro de téléphone WhatsApp Business</p>
                  </div>
                  
                  <div class="setting-item">
                    <label class="setting-label" for="business-name">
                      <span class="setting-title">Nom de l'Entreprise</span>
                    </label>
                    <input type="text" id="business-name" class="form-control" value="${data.whatsappSettings.businessName}">
                    <p class="setting-description">Nom affiché dans les conversations WhatsApp</p>
                  </div>
                  
                  <div class="setting-item">
                    <label class="setting-label" for="webhook-url">
                      <span class="setting-title">URL du Webhook</span>
                    </label>
                    <input type="url" id="webhook-url" class="form-control" value="${data.whatsappSettings.webhookUrl}" readonly>
                    <p class="setting-description">URL de réception des messages WhatsApp</p>
                  </div>
                  
                  <div class="setting-item">
                    <label class="setting-label" for="verify-token">
                      <span class="setting-title">Token de Vérification</span>
                    </label>
                    <input type="password" id="verify-token" class="form-control" value="${data.whatsappSettings.verifyToken}" readonly>
                    <p class="setting-description">Token utilisé pour vérifier le webhook</p>
                  </div>
                  
                  <div class="setting-item">
                    <button class="btn btn-primary" data-action="test-whatsapp-connection">
                      <i class="fas fa-plug"></i>
                      Tester la Connexion
                    </button>
                    <p class="setting-description">Vérifier la connectivité avec l'API WhatsApp</p>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Paramètres Sécurité -->
            <div class="tab-pane fade" id="security" role="tabpanel">
              <div class="settings-section">
                <h3 class="settings-section-title">
                  <i class="fas fa-shield-alt"></i>
                  Configuration de Sécurité
                </h3>
                
                <div class="settings-grid">
                  <div class="setting-item">
                    <label class="setting-label" for="jwt-expiration">
                      <span class="setting-title">Expiration JWT</span>
                    </label>
                    <select id="jwt-expiration" class="form-control">
                      <option value="1h" ${data.securitySettings.jwtExpiration === '1h' ? 'selected' : ''}>1 heure</option>
                      <option value="4h" ${data.securitySettings.jwtExpiration === '4h' ? 'selected' : ''}>4 heures</option>
                      <option value="8h" ${data.securitySettings.jwtExpiration === '8h' ? 'selected' : ''}>8 heures</option>
                      <option value="24h" ${data.securitySettings.jwtExpiration === '24h' ? 'selected' : ''}>24 heures</option>
                    </select>
                    <p class="setting-description">Durée de validité des tokens JWT</p>
                  </div>
                  
                  <div class="setting-item">
                    <label class="setting-label" for="refresh-token-expiration">
                      <span class="setting-title">Expiration Refresh Token</span>
                    </label>
                    <select id="refresh-token-expiration" class="form-control">
                      <option value="7d" ${data.securitySettings.refreshTokenExpiration === '7d' ? 'selected' : ''}>7 jours</option>
                      <option value="30d" ${data.securitySettings.refreshTokenExpiration === '30d' ? 'selected' : ''}>30 jours</option>
                      <option value="90d" ${data.securitySettings.refreshTokenExpiration === '90d' ? 'selected' : ''}>90 jours</option>
                    </select>
                    <p class="setting-description">Durée de validité des refresh tokens</p>
                  </div>
                  
                  <div class="setting-item">
                    <label class="setting-label" for="rate-limit-window">
                      <span class="setting-title">Fenêtre Rate Limiting (minutes)</span>
                    </label>
                    <input type="number" id="rate-limit-window" class="form-control" value="${data.securitySettings.rateLimitWindow}" min="1" max="60">
                    <p class="setting-description">Durée de la fenêtre pour le rate limiting</p>
                  </div>
                  
                  <div class="setting-item">
                    <label class="setting-label" for="rate-limit-max">
                      <span class="setting-title">Requêtes Max (utilisateurs)</span>
                    </label>
                    <input type="number" id="rate-limit-max" class="form-control" value="${data.securitySettings.rateLimitMax}" min="10" max="1000">
                    <p class="setting-description">Nombre maximum de requêtes par fenêtre pour les utilisateurs</p>
                  </div>
                  
                  <div class="setting-item">
                    <label class="setting-label" for="admin-rate-limit-max">
                      <span class="setting-title">Requêtes Max (admin)</span>
                    </label>
                    <input type="number" id="admin-rate-limit-max" class="form-control" value="${data.securitySettings.adminRateLimitMax}" min="10" max="500">
                    <p class="setting-description">Nombre maximum de requêtes par fenêtre pour les administrateurs</p>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Paramètres Notifications -->
            <div class="tab-pane fade" id="notifications" role="tabpanel">
              <div class="settings-section">
                <h3 class="settings-section-title">
                  <i class="fas fa-bell"></i>
                  Configuration des Notifications
                </h3>
                
                <div class="settings-grid">
                  <div class="setting-item">
                    <label class="setting-label">
                      <input type="checkbox" id="email-notifications" ${data.notificationSettings.emailNotifications ? 'checked' : ''}>
                      <span class="setting-title">Notifications Email</span>
                    </label>
                    <p class="setting-description">Envoyer des alertes par email</p>
                  </div>
                  
                  <div class="setting-item">
                    <label class="setting-label">
                      <input type="checkbox" id="sms-notifications" ${data.notificationSettings.smsNotifications ? 'checked' : ''}>
                      <span class="setting-title">Notifications SMS</span>
                    </label>
                    <p class="setting-description">Envoyer des alertes par SMS</p>
                  </div>
                  
                  <div class="setting-item">
                    <label class="setting-label">
                      <input type="checkbox" id="webhook-notifications" ${data.notificationSettings.webhookNotifications ? 'checked' : ''}>
                      <span class="setting-title">Notifications Webhook</span>
                    </label>
                    <p class="setting-description">Envoyer des alertes via webhook</p>
                  </div>
                  
                  <div class="setting-item">
                    <label class="setting-label" for="error-rate-threshold">
                      <span class="setting-title">Seuil Taux d'Erreur (%)</span>
                    </label>
                    <input type="number" id="error-rate-threshold" class="form-control" value="${data.notificationSettings.alertThresholds.errorRate}" min="1" max="100">
                    <p class="setting-description">Déclencher une alerte si le taux d'erreur dépasse ce seuil</p>
                  </div>
                  
                  <div class="setting-item">
                    <label class="setting-label" for="response-time-threshold">
                      <span class="setting-title">Seuil Temps de Réponse (ms)</span>
                    </label>
                    <input type="number" id="response-time-threshold" class="form-control" value="${data.notificationSettings.alertThresholds.responseTime}" min="100" max="10000">
                    <p class="setting-description">Déclencher une alerte si le temps de réponse dépasse ce seuil</p>
                  </div>
                  
                  <div class="setting-item">
                    <label class="setting-label" for="memory-usage-threshold">
                      <span class="setting-title">Seuil Utilisation Mémoire (%)</span>
                    </label>
                    <input type="number" id="memory-usage-threshold" class="form-control" value="${data.notificationSettings.alertThresholds.memoryUsage}" min="50" max="95">
                    <p class="setting-description">Déclencher une alerte si l'utilisation mémoire dépasse ce seuil</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Actions de sauvegarde -->
        <div class="settings-actions">
          <div class="alert alert-info">
            <i class="fas fa-info-circle"></i>
            <strong>Information:</strong> Certains paramètres nécessitent un redémarrage du serveur pour prendre effet.
          </div>
          
          <div class="actions-buttons">
            <button class="btn btn-success btn-lg" data-action="save-settings">
              <i class="fas fa-save"></i>
              Sauvegarder les Paramètres
            </button>
            <button class="btn btn-warning btn-lg" data-action="restart-server">
              <i class="fas fa-power-off"></i>
              Redémarrer le Serveur
            </button>
            <button class="btn btn-danger btn-lg" data-action="reset-to-defaults">
              <i class="fas fa-undo-alt"></i>
              Réinitialiser par Défaut
            </button>
          </div>
        </div>
      </div>
    `;
        const layout = new DashboardLayout_1.DashboardLayout({
            user: { id: '1', username: 'admin', role: 'admin', isActive: true },
            currentPage: 'settings',
            children: content
        });
        return layout.render();
    }
    getPageScripts() {
        return `
      <script>
        // Gestion des événements de la page des paramètres
        document.addEventListener('DOMContentLoaded', function() {
          // Sauvegarde des paramètres
          const saveButtons = document.querySelectorAll('[data-action="save-settings"]');
          saveButtons.forEach(button => {
            button.addEventListener('click', function() {
              const settings = {
                system: {
                  autoCleanup: document.getElementById('auto-cleanup')?.checked || false,
                  cleanupInterval: parseInt(document.getElementById('cleanup-interval')?.value) || 24,
                  logsRetention: parseInt(document.getElementById('logs-retention')?.value) || 30,
                  sessionsRetention: parseInt(document.getElementById('sessions-retention')?.value) || 7,
                  maxSessionsPerUser: parseInt(document.getElementById('max-sessions')?.value) || 3,
                  sessionTimeout: parseInt(document.getElementById('session-timeout')?.value) || 30
                },
                whatsapp: {
                  businessName: document.getElementById('business-name')?.value || ''
                },
                security: {
                  jwtExpiration: document.getElementById('jwt-expiration')?.value || '8h',
                  refreshTokenExpiration: document.getElementById('refresh-token-expiration')?.value || '30d',
                  rateLimitWindow: parseInt(document.getElementById('rate-limit-window')?.value) || 15,
                  rateLimitMax: parseInt(document.getElementById('rate-limit-max')?.value) || 100,
                  adminRateLimitMax: parseInt(document.getElementById('admin-rate-limit-max')?.value) || 50
                },
                notifications: {
                  emailNotifications: document.getElementById('email-notifications')?.checked || false,
                  smsNotifications: document.getElementById('sms-notifications')?.checked || false,
                  webhookNotifications: document.getElementById('webhook-notifications')?.checked || false,
                  alertThresholds: {
                    errorRate: parseInt(document.getElementById('error-rate-threshold')?.value) || 10,
                    responseTime: parseInt(document.getElementById('response-time-threshold')?.value) || 5000,
                    memoryUsage: parseInt(document.getElementById('memory-usage-threshold')?.value) || 80
                  }
                }
              };
              
              window.dashboardApp.saveSettings(settings);
            });
          });
          
          // Réinitialisation des paramètres
          const resetButton = document.querySelector('[data-action="reset-settings"]');
          if (resetButton) {
            resetButton.addEventListener('click', function() {
              if (confirm('Êtes-vous sûr de vouloir réinitialiser tous les paramètres ?')) {
                window.dashboardApp.loadSettingsPage();
              }
            });
          }
          
          // Test de connexion WhatsApp
          const testConnectionBtn = document.querySelector('[data-action="test-whatsapp-connection"]');
          if (testConnectionBtn) {
            testConnectionBtn.addEventListener('click', function() {
              window.dashboardApp.testWhatsAppConnection();
            });
          }
          
          // Redémarrage du serveur
          const restartButton = document.querySelector('[data-action="restart-server"]');
          if (restartButton) {
            restartButton.addEventListener('click', function() {
              if (confirm('Êtes-vous sûr de vouloir redémarrer le serveur ? Cela interrompra temporairement le service.')) {
                window.dashboardApp.restartServer();
              }
            });
          }
          
          // Réinitialisation par défaut
          const resetToDefaultsBtn = document.querySelector('[data-action="reset-to-defaults"]');
          if (resetToDefaultsBtn) {
            resetToDefaultsBtn.addEventListener('click', function() {
              if (confirm('Êtes-vous sûr de vouloir réinitialiser tous les paramètres aux valeurs par défaut ? Cette action est irréversible.')) {
                window.dashboardApp.resetToDefaults();
              }
            });
          }
          
          // Validation en temps réel des champs numériques
          const numericInputs = document.querySelectorAll('input[type="number"]');
          numericInputs.forEach(input => {
            input.addEventListener('input', function() {
              const min = parseInt(this.getAttribute('min'));
              const max = parseInt(this.getAttribute('max'));
              const value = parseInt(this.value);
              
              if (value < min) {
                this.value = min;
              } else if (value > max) {
                this.value = max;
              }
            });
          });
        });
      </script>
    `;
    }
}
exports.SettingsPage = SettingsPage;
exports.default = SettingsPage;
//# sourceMappingURL=SettingsPage.js.map