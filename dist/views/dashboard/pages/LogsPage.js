"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogsPage = void 0;
const DashboardLayout_1 = require("../components/DashboardLayout");
const DataTable_1 = require("../components/DataTable");
const StatsCard_1 = require("../components/StatsCard");
const ChartComponent_1 = require("../components/ChartComponent");
class LogsPage {
    constructor(data) {
        this.data = data;
    }
    generateStatsSection() {
        const { stats } = this.data;
        const statsCards = [
            {
                title: 'Total des Logs',
                value: stats.totalLogs.toLocaleString(),
                icon: 'description',
                color: 'primary',
                subtitle: 'Toutes les entrées'
            },
            {
                title: 'Erreurs',
                value: stats.errorCount.toLocaleString(),
                icon: 'error',
                color: 'danger',
                subtitle: 'Logs d\'erreur'
            },
            {
                title: 'Avertissements',
                value: stats.warningCount.toLocaleString(),
                icon: 'warning',
                color: 'warning',
                subtitle: 'Logs d\'avertissement'
            },
            {
                title: 'Informations',
                value: stats.infoCount.toLocaleString(),
                icon: 'info',
                color: 'info',
                subtitle: 'Logs d\'information'
            }
        ];
        const statsGrid = new StatsCard_1.StatsGrid(statsCards);
        return `
      <section class="page-section">
        <div class="section-header">
          <h2 class="section-title">Statistiques des Logs</h2>
        </div>
        <div class="section-content">
          ${statsGrid.render()}
        </div>
      </section>
    `;
    }
    generateAnalyticsSection() {
        const { analytics } = this.data;
        const hourlyChart = ChartComponent_1.ChartFactory.createSessionsChart({
            labels: analytics.hourlyDistribution.map(d => d.hour),
            values: analytics.hourlyDistribution.map(d => d.count)
        });
        hourlyChart.id = 'logs-hourly-chart';
        hourlyChart.title = 'Distribution Horaire des Logs';
        const levelChart = ChartComponent_1.ChartFactory.createErrorsChart({
            labels: analytics.levelDistribution.map(d => d.level),
            values: analytics.levelDistribution.map(d => d.count)
        });
        levelChart.id = 'logs-level-chart';
        levelChart.title = 'Répartition par Niveau';
        return `
      <section class="page-section">
        <div class="section-header">
          <h2 class="section-title">Analyses des Logs</h2>
          <div class="section-actions">
            <select class="time-range-select" onchange="changeLogsTimeRange(this.value)">
              <option value="1h">Dernière heure</option>
              <option value="24h" selected>Dernières 24h</option>
              <option value="7d">7 derniers jours</option>
              <option value="30d">30 derniers jours</option>
            </select>
          </div>
        </div>
        <div class="section-content">
          <div class="charts-grid" style="grid-template-columns: 1fr 1fr;">
            <div class="chart-grid-item">
              ${new ChartComponent_1.ChartComponent(hourlyChart).render()}
            </div>
            <div class="chart-grid-item">
              ${new ChartComponent_1.ChartComponent(levelChart).render()}
            </div>
          </div>
        </div>
      </section>
    `;
    }
    generateFiltersSection() {
        const { filters } = this.data;
        return `
      <section class="page-section">
        <div class="section-header">
          <h2 class="section-title">Filtres Avancés</h2>
          <div class="section-actions">
            <button class="btn btn-secondary" onclick="resetLogsFilters()">
              <i class="material-icons">clear</i>
              Réinitialiser
            </button>
            <button class="btn btn-primary" onclick="applyLogsFilters()">
              <i class="material-icons">filter_list</i>
              Appliquer
            </button>
          </div>
        </div>
        <div class="section-content">
          <div class="filters-form">
            <div class="filter-group">
              <label for="level-filter">Niveau de Log</label>
              <select id="level-filter" class="form-control">
                <option value="">Tous les niveaux</option>
                <option value="info" ${filters.level === 'info' ? 'selected' : ''}>Information</option>
                <option value="warning" ${filters.level === 'warning' ? 'selected' : ''}>Avertissement</option>
                <option value="error" ${filters.level === 'error' ? 'selected' : ''}>Erreur</option>
              </select>
            </div>
            <div class="filter-group">
              <label for="date-from-filter">Date de début</label>
              <input type="datetime-local" id="date-from-filter" class="form-control" value="${filters.dateFrom || ''}">
            </div>
            <div class="filter-group">
              <label for="date-to-filter">Date de fin</label>
              <input type="datetime-local" id="date-to-filter" class="form-control" value="${filters.dateTo || ''}">
            </div>
            <div class="filter-group">
              <label for="user-filter">Utilisateur</label>
              <input type="text" id="user-filter" class="form-control" placeholder="ID utilisateur" value="${filters.userId || ''}">
            </div>
            <div class="filter-group">
              <label for="search-filter">Recherche dans le message</label>
              <input type="text" id="search-filter" class="form-control" placeholder="Rechercher..." value="${filters.search || ''}">
            </div>
          </div>
        </div>
      </section>
    `;
    }
    generateLogsTableSection() {
        const { logs, pagination } = this.data;
        const columns = [
            {
                key: 'timestamp',
                label: 'Date/Heure',
                type: 'date',
                sortable: true,
                width: '180px',
                formatter: (value) => new Date(value).toLocaleString('fr-FR')
            },
            {
                key: 'level',
                label: 'Niveau',
                type: 'badge',
                width: '100px',
                formatter: (value) => {
                    const badgeClasses = {
                        'info': 'badge-info',
                        'warning': 'badge-warning',
                        'error': 'badge-danger'
                    };
                    const badgeClass = badgeClasses[value] || 'badge-info';
                    return `<span class="badge ${badgeClass}">${value.toUpperCase()}</span>`;
                }
            },
            {
                key: 'message',
                label: 'Message',
                type: 'text',
                formatter: (value) => {
                    if (value.length > 100) {
                        return `${value.substring(0, 100)}... <button class="expand-btn" onclick="expandLogMessage(this)">Voir plus</button>`;
                    }
                    return value;
                }
            },
            {
                key: 'userId',
                label: 'Utilisateur',
                type: 'text',
                width: '120px',
                formatter: (value) => value || 'Système'
            },
            {
                key: 'source',
                label: 'Source',
                type: 'text',
                width: '120px',
                formatter: (value) => value || 'N/A'
            },
            {
                key: 'actions',
                label: 'Actions',
                type: 'actions',
                width: '120px',
                align: 'center'
            }
        ];
        const actions = [
            {
                id: 'view',
                label: 'Voir détails',
                icon: 'visibility',
                color: 'info',
                onClick: 'viewLogDetails'
            },
            {
                id: 'export',
                label: 'Exporter',
                icon: 'download',
                color: 'primary',
                onClick: 'exportSingleLog'
            },
            {
                id: 'delete',
                label: 'Supprimer',
                icon: 'delete',
                color: 'danger',
                onClick: 'deleteLog',
                condition: (row) => row.level !== 'error'
            }
        ];
        const tableProps = {
            id: 'logs-table',
            title: 'Journaux Système',
            columns,
            data: logs,
            actions,
            pagination,
            searchable: true,
            exportable: true,
            filters: [
                {
                    key: 'level',
                    label: 'Niveau',
                    type: 'select',
                    options: [
                        { value: 'info', label: 'Information' },
                        { value: 'warning', label: 'Avertissement' },
                        { value: 'error', label: 'Erreur' }
                    ]
                }
            ]
        };
        return `
      <section class="page-section">
        <div class="section-header">
          <h2 class="section-title">Liste des Logs</h2>
          <div class="section-actions">
            <button class="btn btn-warning" onclick="cleanupOldLogs()">
              <i class="material-icons">delete_sweep</i>
              Nettoyer les anciens logs
            </button>
            <button class="btn btn-primary" onclick="exportAllLogs()">
              <i class="material-icons">download</i>
              Exporter tout
            </button>
          </div>
        </div>
        <div class="section-content">
          ${new DataTable_1.DataTable(tableProps).render()}
        </div>
      </section>
    `;
    }
    generateMainContent() {
        return `
      <div class="logs-page">
        <div class="page-header">
          <h1 class="page-title">
            <i class="material-icons">description</i>
            Gestion des Logs
          </h1>
          <div class="page-actions">
            <button class="btn btn-secondary" onclick="refreshLogsPage()">
              <i class="material-icons">refresh</i>
              Actualiser
            </button>
          </div>
        </div>
        
        ${this.generateStatsSection()}
        ${this.generateAnalyticsSection()}
        ${this.generateFiltersSection()}
        ${this.generateLogsTableSection()}
      </div>
      
      <!-- Modal pour les détails du log -->
      <div id="logDetailsModal" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Détails du Log</h3>
            <button class="modal-close" onclick="closeLogDetailsModal()">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body" id="logDetailsContent">
            <!-- Contenu dynamique -->
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeLogDetailsModal()">Fermer</button>
            <button class="btn btn-primary" onclick="exportCurrentLog()">Exporter</button>
          </div>
        </div>
      </div>
      
      <script>
        // Fonctions JavaScript pour la gestion des logs
        function viewLogDetails(logId) {
          // Afficher les détails du log dans une modal
          fetch('/dashboard/api/logs/' + logId)
            .then(response => response.json())
            .then(log => {
              let content = '<div class="log-details">';
              content += '<div class="detail-group"><label>ID:</label><span>' + log.id + '</span></div>';
              content += '<div class="detail-group"><label>Timestamp:</label><span>' + new Date(log.timestamp).toLocaleString('fr-FR') + '</span></div>';
              content += '<div class="detail-group"><label>Niveau:</label><span class="badge badge-' + log.level + '">' + log.level.toUpperCase() + '</span></div>';
              content += '<div class="detail-group"><label>Message:</label><pre>' + log.message + '</pre></div>';
              content += '<div class="detail-group"><label>Utilisateur:</label><span>' + (log.userId || 'Système') + '</span></div>';
              content += '<div class="detail-group"><label>Source:</label><span>' + (log.source || 'N/A') + '</span></div>';
              
              if (log.metadata) {
                content += '<div class="detail-group"><label>Métadonnées:</label><pre>' + JSON.stringify(log.metadata, null, 2) + '</pre></div>';
              }
              
              content += '</div>';
              document.getElementById('logDetailsContent').innerHTML = content;
              document.getElementById('logDetailsModal').style.display = 'block';
            })
            .catch(error => {
              console.error('Erreur lors du chargement des détails:', error);
              alert('Erreur lors du chargement des détails du log');
            });
        }
        
        function closeLogDetailsModal() {
          document.getElementById('logDetailsModal').style.display = 'none';
        }
        
        function deleteLog(logId) {
          if (confirm('Êtes-vous sûr de vouloir supprimer ce log ?')) {
            fetch('/dashboard/api/logs/' + logId, { method: 'DELETE' })
              .then(response => response.json())
              .then(result => {
                if (result.success) {
                  location.reload();
                } else {
                  alert('Erreur lors de la suppression');
                }
              });
          }
        }
        
        function cleanupOldLogs() {
          if (confirm('Supprimer tous les logs de plus de 30 jours ?')) {
            fetch('/dashboard/api/logs/cleanup', { method: 'POST' })
              .then(response => response.json())
              .then(result => {
                alert(result.deletedCount + ' logs supprimés');
                location.reload();
              });
          }
        }
        
        function applyLogsFilters() {
          const filters = {
            level: document.getElementById('level-filter').value,
            dateFrom: document.getElementById('date-from-filter').value,
            dateTo: document.getElementById('date-to-filter').value,
            userId: document.getElementById('user-filter').value,
            search: document.getElementById('search-filter').value
          };
          
          const params = new URLSearchParams();
          Object.entries(filters).forEach(([key, value]) => {
            if (value) params.append(key, value);
          });
          
          window.location.href = '/dashboard/logs?' + params.toString();
        }
        
        function resetLogsFilters() {
          window.location.href = '/dashboard/logs';
        }
        
        function refreshLogsPage() {
          window.location.reload();
        }
        
        function expandLogMessage(button) {
          const cell = button.closest('td');
          const fullMessage = cell.dataset.fullMessage;
          if (fullMessage) {
            cell.innerHTML = fullMessage;
          }
        }
      </script>
    `;
    }
    render() {
        const layout = new DashboardLayout_1.DashboardLayout({
            user: this.data.user,
            currentPage: 'logs',
            children: this.generateMainContent()
        });
        return layout.render();
    }
}
exports.LogsPage = LogsPage;
exports.default = LogsPage;
//# sourceMappingURL=LogsPage.js.map