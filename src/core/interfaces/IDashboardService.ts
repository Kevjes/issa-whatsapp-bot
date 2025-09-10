import {
  DashboardStats,
  LogAnalytics,
  SessionAnalytics,
  SystemHealth,
  TransferAnalytics,
  UserActivity,
  DatabaseStats,
  DashboardAlert,
  LogEntry,
  PaginationParams,
  PaginatedResponse,
  DashboardFilter
} from '../../types/dashboard';

/**
 * Interface pour le service Dashboard
 * Définit le contrat pour toutes les opérations du dashboard administratif
 */
export interface IDashboardService {
  /**
   * Obtenir les statistiques générales du dashboard
   */
  getDashboardStats(): Promise<DashboardStats>;

  /**
   * Obtenir l'analyse des logs
   */
  getLogAnalytics(filter?: DashboardFilter): Promise<LogAnalytics>;

  /**
   * Obtenir l'analyse des sessions
   */
  getSessionAnalytics(filter?: DashboardFilter): Promise<SessionAnalytics>;

  /**
   * Obtenir la santé du système
   */
  getSystemHealth(): Promise<SystemHealth>;

  /**
   * Obtenir l'analyse des transferts
   */
  getTransferAnalytics(filter?: DashboardFilter): Promise<TransferAnalytics>;

  /**
   * Obtenir les activités des utilisateurs
   */
  getUserActivities(params: PaginationParams): Promise<PaginatedResponse<UserActivity>>;

  /**
   * Obtenir les statistiques de la base de données
   */
  getDatabaseStats(): Promise<DatabaseStats>;

  /**
   * Obtenir les alertes du dashboard
   */
  getDashboardAlerts(params: PaginationParams): Promise<PaginatedResponse<DashboardAlert>>;

  /**
   * Obtenir les logs avec pagination et filtres
   */
  getLogs(params: PaginationParams, filter?: DashboardFilter): Promise<PaginatedResponse<LogEntry>>;

  /**
   * Marquer une alerte comme lue
   */
  markAlertAsRead(alertId: string): Promise<boolean>;

  /**
   * Nettoyer les anciens logs
   */
  cleanupOldLogs(daysToKeep: number): Promise<{ deletedCount: number; sizeFreed: number }>;

  /**
   * Nettoyer les sessions expirées
   */
  cleanupExpiredSessions(): Promise<{ deletedCount: number }>;

  /**
   * Exporter les données
   */
  exportData(type: 'logs' | 'sessions' | 'transfers', filter?: DashboardFilter): Promise<Buffer>;

  /**
   * Obtenir les métriques en temps réel
   */
  getRealTimeMetrics(): Promise<{
    activeUsers: number;
    activeSessions: number;
    systemLoad: number;
    memoryUsage: number;
  }>;

  /**
   * Créer une alerte personnalisée
   */
  createAlert(alert: Omit<DashboardAlert, 'id' | 'timestamp'>): Promise<DashboardAlert>;

  /**
   * Supprimer une alerte
   */
  deleteAlert(alertId: string): Promise<boolean>;

  /**
   * Obtenir les tendances des erreurs
   */
  getErrorTrends(days: number): Promise<any[]>;

  /**
   * Obtenir les métriques de performance
   */
  getPerformanceMetrics(): Promise<{
    averageResponseTime: number;
    requestsPerMinute: number;
    errorRate: number;
    uptime: number;
  }>;
}