"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardPage = void 0;
const DashboardLayout_1 = require("../components/DashboardLayout");
const StatsCard_1 = require("../components/StatsCard");
const ChartComponent_1 = require("../components/ChartComponent");
const DataTable_1 = require("../components/DataTable");
class DashboardPage {
    constructor(data) {
        this.data = data;
    }
    generateStatsSection() {
        const { stats, systemHealth } = this.data;
        const statsCards = [
            StatsCard_1.StatsCardFactory.createActiveSessionsCard(stats.activeSessions, { value: 12, direction: 'up' }),
            StatsCard_1.StatsCardFactory.createDailyTransfersCard(stats.totalTransfers, stats.successfulTransfers),
            StatsCard_1.StatsCardFactory.createErrorsCard(stats.totalErrors, { value: 5, direction: 'down' }),
            StatsCard_1.StatsCardFactory.createSystemHealthCard(systemHealth.status, systemHealth.uptime.toString())
        ];
        const statsGrid = new StatsCard_1.StatsGrid(statsCards);
        return `
      <section class="dashboard-section">
        <div class="section-header">
          <h2 class="section-title">Vue d'ensemble</h2>
          <div class="section-actions">
            <button class="refresh-btn" onclick="refreshStats()">
              <i class="material-icons">refresh</i>
              Actualiser
            </button>
          </div>
        </div>
        <div class="section-content">
          ${statsGrid.render()}
        </div>
      </section>
    `;
    }
    generateChartsSection() {
        const { logAnalytics, sessionAnalytics, transferAnalytics, systemHealth } = this.data;
        const charts = [
            ChartComponent_1.ChartFactory.createSessionsChart({
                labels: sessionAnalytics.sessionsByHour.map(d => d.hour.toString()),
                values: sessionAnalytics.sessionsByHour.map(d => d.count)
            }),
            ChartComponent_1.ChartFactory.createTransfersChart({
                labels: transferAnalytics.transfersByDay.map(d => d.date),
                values: transferAnalytics.transfersByDay.map(d => d.count),
                amounts: transferAnalytics.transfersByDay.map(d => d.amount)
            }),
            ChartComponent_1.ChartFactory.createErrorsChart({
                labels: logAnalytics.errorTrends.map(d => d.date),
                values: logAnalytics.errorTrends.map(d => d.count)
            }),
            ChartComponent_1.ChartFactory.createSystemPerformanceChart({
                labels: ['Maintenant'],
                cpu: [systemHealth.cpuUsage],
                memory: [systemHealth.memoryUsage.percentage],
                disk: [systemHealth.diskUsage.percentage]
            })
        ];
        const chartsGrid = new ChartComponent_1.ChartsGrid(charts, 2);
        return `
      <section class="dashboard-section">
        <div class="section-header">
          <h2 class="section-title">Analyses Graphiques</h2>
          <div class="section-actions">
            <select class="time-range-select" onchange="changeTimeRange(this.value)">
              <option value="1h">Dernière heure</option>
              <option value="24h" selected>Dernières 24h</option>
              <option value="7d">7 derniers jours</option>
              <option value="30d">30 derniers jours</option>
            </select>
          </div>
        </div>
        <div class="section-content">
          ${chartsGrid.render()}
        </div>
      </section>
    `;
    }
    generateTablesSection() {
        const { recentLogs, activeSessions, recentTransfers } = this.data;
        const logsTable = DataTable_1.DataTableFactory.createLogsTable(recentLogs.slice(0, 10), { page: 1, limit: 10, total: recentLogs.length });
        const sessionsTable = DataTable_1.DataTableFactory.createSessionsTable(activeSessions.slice(0, 10), { page: 1, limit: 10, total: activeSessions.length });
        const transfersTable = DataTable_1.DataTableFactory.createTransfersTable(recentTransfers.slice(0, 10), { page: 1, limit: 10, total: recentTransfers.length });
        return `
      <section class="dashboard-section">
        <div class="section-header">
          <h2 class="section-title">Données Récentes</h2>
        </div>
        <div class="section-content">
          <div class="tables-tabs">
            <div class="tabs-header">
              <button class="tab-btn active" onclick="switchTab('logs')">
                <i class="material-icons">description</i>
                Journaux Récents
              </button>
              <button class="tab-btn" onclick="switchTab('sessions')">
                <i class="material-icons">people</i>
                Sessions Actives
              </button>
              <button class="tab-btn" onclick="switchTab('transfers')">
                <i class="material-icons">swap_horiz</i>
                Transferts Récents
              </button>
            </div>
            <div class="tabs-content">
              <div class="tab-panel active" id="logs-panel">
                ${new DataTable_1.DataTable(logsTable).render()}
                <div class="table-footer">
                  <a href="/dashboard/logs" class="view-all-link">
                    Voir tous les journaux
                    <i class="material-icons">arrow_forward</i>
                  </a>
                </div>
              </div>
              <div class="tab-panel" id="sessions-panel">
                ${new DataTable_1.DataTable(sessionsTable).render()}
                <div class="table-footer">
                  <a href="/dashboard/sessions" class="view-all-link">
                    Voir toutes les sessions
                    <i class="material-icons">arrow_forward</i>
                  </a>
                </div>
              </div>
              <div class="tab-panel" id="transfers-panel">
                ${new DataTable_1.DataTable(transfersTable).render()}
                <div class="table-footer">
                  <a href="/dashboard/transfers" class="view-all-link">
                    Voir tous les transferts
                    <i class="material-icons">arrow_forward</i>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
    }
    generateAlertsSection() {
        const { systemHealth } = this.data;
        const alerts = [];
        if (alerts.length === 0) {
            return `
        <section class="dashboard-section">
          <div class="section-header">
            <h2 class="section-title">Alertes Système</h2>
          </div>
          <div class="section-content">
            <div class="no-alerts">
              <i class="material-icons">check_circle</i>
              <p>Aucune alerte active</p>
            </div>
          </div>
        </section>
      `;
        }
        const alertsHtml = alerts.slice(0, 5).map((alert) => {
            const severityClass = `alert-${alert.severity}`;
            const severityIcons = {
                low: 'info',
                medium: 'warning',
                high: 'error',
                critical: 'dangerous'
            };
            const severityIcon = severityIcons[alert.severity] || 'info';
            return `
        <div class="alert-item ${severityClass}">
          <div class="alert-icon">
            <i class="material-icons">${severityIcon}</i>
          </div>
          <div class="alert-content">
            <h4 class="alert-title">${alert.title}</h4>
            <p class="alert-message">${alert.message}</p>
            <span class="alert-time">${new Date(alert.timestamp).toLocaleString('fr-FR')}</span>
          </div>
          <div class="alert-actions">
            <button class="alert-action-btn" onclick="markAlertAsRead('${alert.id}')" title="Marquer comme lu">
              <i class="material-icons">check</i>
            </button>
            <button class="alert-action-btn" onclick="dismissAlert('${alert.id}')" title="Ignorer">
              <i class="material-icons">close</i>
            </button>
          </div>
        </div>
      `;
        }).join('');
        return `
      <section class="dashboard-section">
        <div class="section-header">
          <h2 class="section-title">Alertes Système</h2>
          <div class="section-actions">
            <a href="/dashboard/alerts" class="view-all-btn">
              Voir toutes les alertes
              <i class="material-icons">arrow_forward</i>
            </a>
          </div>
        </div>
        <div class="section-content">
          <div class="alerts-list">
            ${alertsHtml}
          </div>
        </div>
      </section>
    `;
    }
    generateMainContent() {
        return `
      <div class="dashboard-main">
        <div class="dashboard-header">
          <h1 class="dashboard-title">Tableau de Bord</h1>
          <div class="dashboard-meta">
            <span class="last-update">Dernière mise à jour: ${new Date().toLocaleString('fr-FR')}</span>
            <button class="auto-refresh-toggle" onclick="toggleAutoRefresh()">
              <i class="material-icons">autorenew</i>
              Actualisation auto
            </button>
          </div>
        </div>
        
        ${this.generateStatsSection()}
        ${this.generateChartsSection()}
        ${this.generateAlertsSection()}
        ${this.generateTablesSection()}
      </div>
      
      <script>
        // Auto-refresh des données toutes les 30 secondes
        let autoRefreshInterval;
        let autoRefreshEnabled = false;
        
        function toggleAutoRefresh() {
          autoRefreshEnabled = !autoRefreshEnabled;
          const btn = document.querySelector('.auto-refresh-toggle');
          
          if (autoRefreshEnabled) {
            btn.classList.add('active');
            autoRefreshInterval = setInterval(refreshDashboard, 30000);
          } else {
            btn.classList.remove('active');
            clearInterval(autoRefreshInterval);
          }
        }
        
        function refreshDashboard() {
          // Recharger les données du dashboard
          window.location.reload();
        }
        
        function switchTab(tabName) {
          // Gérer les onglets
          document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
          document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
          
          document.querySelector('[onclick="switchTab(\'' + tabName + '\')"').classList.add('active');
          document.getElementById(tabName + '-panel').classList.add('active');
        }
        
        function changeTimeRange(range) {
          // Changer la plage de temps pour les graphiques
          console.log('Changing time range to:', range);
          // Implémenter la logique de changement de plage
        }
      </script>
    `;
    }
    render() {
        const layout = new DashboardLayout_1.DashboardLayout({
            user: this.data.user,
            currentPage: 'dashboard',
            children: this.generateMainContent()
        });
        return layout.render();
    }
}
exports.DashboardPage = DashboardPage;
exports.default = DashboardPage;
//# sourceMappingURL=DashboardPage.js.map