"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionsPage = void 0;
const DashboardLayout_1 = require("../components/DashboardLayout");
const DataTable_1 = require("../components/DataTable");
const StatsCard_1 = require("../components/StatsCard");
const ChartComponent_1 = require("../components/ChartComponent");
class SessionsPage {
    constructor(data) {
        this.data = data;
    }
    generateStatsSection() {
        const { stats, analytics } = this.data;
        const statsCards = [
            {
                title: 'Total Sessions',
                value: stats.totalSessions.toLocaleString(),
                icon: 'people',
                color: 'primary',
                subtitle: 'Toutes les sessions'
            },
            {
                title: 'Sessions Actives',
                value: stats.activeSessions.toLocaleString(),
                icon: 'radio_button_checked',
                color: 'success',
                subtitle: 'En cours d\'exécution'
            },
            {
                title: 'Sessions PIN',
                value: stats.pinSessions.toLocaleString(),
                icon: 'lock',
                color: 'info',
                subtitle: 'Authentification PIN'
            },
            {
                title: 'Sessions Transfert',
                value: stats.transferSessions.toLocaleString(),
                icon: 'swap_horiz',
                color: 'warning',
                subtitle: 'Transferts d\'argent'
            },
            {
                title: 'Durée Moyenne',
                value: `${Math.round(analytics.averageSessionDuration / 60)}min`,
                icon: 'schedule',
                color: 'info',
                subtitle: 'Temps moyen par session'
            },
            {
                title: 'Sessions Expirées',
                value: stats.expiredSessions.toLocaleString(),
                icon: 'schedule_send',
                color: 'danger',
                subtitle: 'Sessions expirées'
            }
        ];
        const statsGrid = new StatsCard_1.StatsGrid(statsCards);
        return `
      <section class="page-section">
        <div class="section-header">
          <h2 class="section-title">Statistiques des Sessions</h2>
          <div class="section-actions">
            <button class="btn btn-warning" onclick="cleanupExpiredSessions()">
              <i class="material-icons">delete_sweep</i>
              Nettoyer les sessions expirées
            </button>
          </div>
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
            labels: analytics.sessionsByHour.map(d => d.hour),
            values: analytics.sessionsByHour.map(d => d.count)
        });
        hourlyChart.id = 'sessions-hourly-chart';
        hourlyChart.title = 'Sessions par Heure';
        const typeChart = {
            id: 'sessions-type-chart',
            title: 'Répartition par Type',
            type: 'doughnut',
            data: {
                labels: analytics.sessionsByType.map(d => d.type),
                datasets: [{
                        label: 'Nombre de sessions',
                        data: analytics.sessionsByType.map(d => d.count),
                        backgroundColor: ['#36A2EB', '#FF6384', '#FFCE56', '#4BC0C0']
                    }]
            },
            height: 300
        };
        const statusChart = {
            id: 'sessions-status-chart',
            title: 'Répartition par Statut',
            type: 'bar',
            data: {
                labels: analytics.sessionsByStatus.map(d => d.status),
                datasets: [{
                        label: 'Nombre de sessions',
                        data: analytics.sessionsByStatus.map(d => d.count),
                        backgroundColor: ['#4CAF50', '#FF9800', '#F44336', '#9E9E9E']
                    }]
            },
            height: 300
        };
        return `
      <section class="page-section">
        <div class="section-header">
          <h2 class="section-title">Analyses des Sessions</h2>
          <div class="section-actions">
            <select class="time-range-select" onchange="changeSessionsTimeRange(this.value)">
              <option value="1h">Dernière heure</option>
              <option value="24h" selected>Dernières 24h</option>
              <option value="7d">7 derniers jours</option>
              <option value="30d">30 derniers jours</option>
            </select>
          </div>
        </div>
        <div class="section-content">
          <div class="charts-grid" style="grid-template-columns: 1fr 1fr 1fr;">
            <div class="chart-grid-item">
              ${new ChartComponent_1.ChartComponent(hourlyChart).render()}
            </div>
            <div class="chart-grid-item">
              ${new ChartComponent_1.ChartComponent(typeChart).render()}
            </div>
            <div class="chart-grid-item">
              ${new ChartComponent_1.ChartComponent(statusChart).render()}
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
            <button class="btn btn-secondary" onclick="resetSessionsFilters()">
              <i class="material-icons">clear</i>
              Réinitialiser
            </button>
            <button class="btn btn-primary" onclick="applySessionsFilters()">
              <i class="material-icons">filter_list</i>
              Appliquer
            </button>
          </div>
        </div>
        <div class="section-content">
          <div class="filters-form">
            <div class="filter-group">
              <label for="type-filter">Type de Session</label>
              <select id="type-filter" class="form-control">
                <option value="">Tous les types</option>
                <option value="pin" ${filters.type === 'pin' ? 'selected' : ''}>PIN</option>
                <option value="transfer" ${filters.type === 'transfer' ? 'selected' : ''}>Transfert</option>
              </select>
            </div>
            <div class="filter-group">
              <label for="status-filter">Statut</label>
              <select id="status-filter" class="form-control">
                <option value="">Tous les statuts</option>
                <option value="active" ${filters.status === 'active' ? 'selected' : ''}>Active</option>
                <option value="completed" ${filters.status === 'completed' ? 'selected' : ''}>Terminée</option>
                <option value="expired" ${filters.status === 'expired' ? 'selected' : ''}>Expirée</option>
                <option value="failed" ${filters.status === 'failed' ? 'selected' : ''}>Échouée</option>
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
          </div>
        </div>
      </section>
    `;
    }
    generateSessionsTableSection() {
        const { sessions, pagination } = this.data;
        const columns = [
            {
                key: 'id',
                label: 'ID Session',
                type: 'text',
                width: '120px',
                formatter: (value) => `<code>${value.substring(0, 8)}...</code>`
            },
            {
                key: 'userId',
                label: 'Utilisateur',
                type: 'text',
                sortable: true,
                width: '150px'
            },
            {
                key: 'sessionType',
                label: 'Type',
                type: 'badge',
                width: '100px',
                formatter: (value) => {
                    const badgeClasses = {
                        'pin': 'badge-info',
                        'transfer': 'badge-warning'
                    };
                    const badgeClass = badgeClasses[value] || 'badge-secondary';
                    return `<span class="badge ${badgeClass}">${value.toUpperCase()}</span>`;
                }
            },
            {
                key: 'status',
                label: 'Statut',
                type: 'badge',
                width: '100px',
                formatter: (value) => {
                    const badgeClasses = {
                        'active': 'badge-success',
                        'completed': 'badge-primary',
                        'expired': 'badge-warning',
                        'failed': 'badge-danger'
                    };
                    const badgeClass = badgeClasses[value] || 'badge-secondary';
                    return `<span class="badge ${badgeClass}">${value}</span>`;
                }
            },
            {
                key: 'createdAt',
                label: 'Créée le',
                type: 'date',
                sortable: true,
                width: '180px',
                formatter: (value) => new Date(value).toLocaleString('fr-FR')
            },
            {
                key: 'lastActivity',
                label: 'Dernière activité',
                type: 'date',
                width: '180px',
                formatter: (value) => value ? new Date(value).toLocaleString('fr-FR') : 'N/A'
            },
            {
                key: 'duration',
                label: 'Durée',
                type: 'text',
                width: '100px',
                formatter: (value, row) => {
                    if (row.status === 'active') {
                        const duration = Date.now() - new Date(row.createdAt).getTime();
                        return `${Math.round(duration / 60000)}min`;
                    }
                    return value ? `${Math.round(value / 60000)}min` : 'N/A';
                }
            },
            {
                key: 'actions',
                label: 'Actions',
                type: 'actions',
                width: '150px',
                align: 'center'
            }
        ];
        const actions = [
            {
                id: 'view',
                label: 'Voir détails',
                icon: 'visibility',
                color: 'info',
                onClick: 'viewSessionDetails'
            },
            {
                id: 'terminate',
                label: 'Terminer',
                icon: 'stop',
                color: 'warning',
                onClick: 'terminateSession',
                condition: (row) => row.status === 'active'
            },
            {
                id: 'extend',
                label: 'Prolonger',
                icon: 'schedule',
                color: 'primary',
                onClick: 'extendSession',
                condition: (row) => row.status === 'active'
            },
            {
                id: 'delete',
                label: 'Supprimer',
                icon: 'delete',
                color: 'danger',
                onClick: 'deleteSession',
                condition: (row) => row.status !== 'active'
            }
        ];
        const tableProps = {
            id: 'sessions-table',
            title: 'Sessions Utilisateurs',
            columns,
            data: sessions,
            actions,
            pagination,
            searchable: true,
            exportable: true,
            filters: [
                {
                    key: 'sessionType',
                    label: 'Type',
                    type: 'select',
                    options: [
                        { value: 'pin', label: 'PIN' },
                        { value: 'transfer', label: 'Transfert' }
                    ]
                },
                {
                    key: 'status',
                    label: 'Statut',
                    type: 'select',
                    options: [
                        { value: 'active', label: 'Active' },
                        { value: 'completed', label: 'Terminée' },
                        { value: 'expired', label: 'Expirée' },
                        { value: 'failed', label: 'Échouée' }
                    ]
                }
            ]
        };
        return `
      <section class="page-section">
        <div class="section-header">
          <h2 class="section-title">Liste des Sessions</h2>
          <div class="section-actions">
            <button class="btn btn-warning" onclick="terminateAllExpiredSessions()">
              <i class="material-icons">stop</i>
              Terminer les sessions expirées
            </button>
            <button class="btn btn-primary" onclick="exportAllSessions()">
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
      <div class="sessions-page">
        <div class="page-header">
          <h1 class="page-title">
            <i class="material-icons">people</i>
            Gestion des Sessions
          </h1>
          <div class="page-actions">
            <button class="btn btn-secondary" onclick="refreshSessionsPage()">
              <i class="material-icons">refresh</i>
              Actualiser
            </button>
          </div>
        </div>
        
        ${this.generateStatsSection()}
        ${this.generateAnalyticsSection()}
        ${this.generateFiltersSection()}
        ${this.generateSessionsTableSection()}
      </div>
      
      <!-- Modal pour les détails de la session -->
      <div id="sessionDetailsModal" class="modal">
        <div class="modal-content large">
          <div class="modal-header">
            <h3>Détails de la Session</h3>
            <button class="modal-close" onclick="closeSessionDetailsModal()">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body" id="sessionDetailsContent">
            <!-- Contenu dynamique -->
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeSessionDetailsModal()">Fermer</button>
            <button class="btn btn-warning" onclick="terminateCurrentSession()" id="terminateBtn" style="display: none;">
              <i class="material-icons">stop</i>
              Terminer
            </button>
            <button class="btn btn-primary" onclick="exportCurrentSession()">Exporter</button>
          </div>
        </div>
      </div>
      
      <script>
        let currentSessionId = null;
        
        function viewSessionDetails(sessionId) {
          currentSessionId = sessionId;
          fetch('/dashboard/api/sessions/' + sessionId)
            .then(response => response.json())
            .then(session => {
              let content = '<div class="session-details"><div class="details-grid">';
              content += '<div class="detail-group"><label>ID Session:</label><span><code>' + session.id + '</code></span></div>';
              content += '<div class="detail-group"><label>Utilisateur:</label><span>' + session.userId + '</span></div>';
              content += '<div class="detail-group"><label>Type:</label><span class="badge badge-' + (session.sessionType === 'pin' ? 'info' : 'warning') + '">' + session.sessionType.toUpperCase() + '</span></div>';
              content += '<div class="detail-group"><label>Statut:</label><span class="badge badge-' + getStatusBadgeClass(session.status) + '">' + session.status + '</span></div>';
              content += '<div class="detail-group"><label>Créée le:</label><span>' + new Date(session.createdAt).toLocaleString('fr-FR') + '</span></div>';
              content += '<div class="detail-group"><label>Dernière activité:</label><span>' + (session.lastActivity ? new Date(session.lastActivity).toLocaleString('fr-FR') : 'N/A') + '</span></div>';
              content += '<div class="detail-group"><label>Expire le:</label><span>' + (session.expiresAt ? new Date(session.expiresAt).toLocaleString('fr-FR') : 'N/A') + '</span></div>';
              content += '<div class="detail-group"><label>Tentatives:</label><span>' + (session.attempts || 0) + '</span></div>';
              content += '</div>';
              
              if (session.sessionType === 'transfer') {
                content += '<div class="transfer-details"><h4>Détails du Transfert</h4><div class="details-grid">';
                content += '<div class="detail-group"><label>Compte source:</label><span>' + (session.fromAccount || 'N/A') + '</span></div>';
                content += '<div class="detail-group"><label>Compte destination:</label><span>' + (session.toAccount || 'N/A') + '</span></div>';
                content += '<div class="detail-group"><label>Montant:</label><span>' + (session.amount ? session.amount.toLocaleString() + ' USD' : 'N/A') + '</span></div>';
                content += '<div class="detail-group"><label>Étape actuelle:</label><span>' + (session.currentStep || 'N/A') + '</span></div>';
                content += '</div></div>';
              }
              
              if (session.metadata) {
                content += '<div class="metadata-details"><h4>Métadonnées</h4><pre>' + JSON.stringify(session.metadata, null, 2) + '</pre></div>';
              }
              
              content += '</div>';
              
              document.getElementById('sessionDetailsContent').innerHTML = content;
              
              // Afficher le bouton terminer si la session est active
              const terminateBtn = document.getElementById('terminateBtn');
              if (session.status === 'active') {
                terminateBtn.style.display = 'inline-block';
              } else {
                terminateBtn.style.display = 'none';
              }
              
              document.getElementById('sessionDetailsModal').style.display = 'block';
            })
            .catch(error => {
              console.error('Erreur lors du chargement des détails:', error);
              alert('Erreur lors du chargement des détails de la session');
            });
        }
        
        function getStatusBadgeClass(status) {
          const classes = {
            'active': 'success',
            'completed': 'primary',
            'expired': 'warning',
            'failed': 'danger'
          };
          return classes[status] || 'secondary';
        }
        
        function closeSessionDetailsModal() {
          document.getElementById('sessionDetailsModal').style.display = 'none';
          currentSessionId = null;
        }
        
        function terminateSession(sessionId) {
          if (confirm('Êtes-vous sûr de vouloir terminer cette session ?')) {
            fetch('/dashboard/api/sessions/' + sessionId + '/terminate', { method: 'POST' })
              .then(response => response.json())
              .then(result => {
                if (result.success) {
                  location.reload();
                } else {
                  alert('Erreur lors de la terminaison de la session');
                }
              });
          }
        }
        
        function terminateCurrentSession() {
          if (currentSessionId) {
            terminateSession(currentSessionId);
          }
        }
        
        function extendSession(sessionId) {
          const hours = prompt('Prolonger la session de combien d\'heures ?', '1');
          if (hours && !isNaN(hours)) {
            fetch('/dashboard/api/sessions/' + sessionId + '/extend', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ hours: parseInt(hours) })
            })
            .then(response => response.json())
            .then(result => {
              if (result.success) {
                alert('Session prolongée de ' + hours + ' heure(s)');
                location.reload();
              } else {
                alert('Erreur lors de la prolongation');
              }
            });
          }
        }
        
        function deleteSession(sessionId) {
          if (confirm('Êtes-vous sûr de vouloir supprimer cette session ?')) {
            fetch('/dashboard/api/sessions/' + sessionId, { method: 'DELETE' })
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
        
        function cleanupExpiredSessions() {
          if (confirm('Supprimer toutes les sessions expirées ?')) {
            fetch('/dashboard/api/sessions/cleanup', { method: 'POST' })
              .then(response => response.json())
              .then(result => {
                alert(result.deletedCount + ' sessions supprimées');
                location.reload();
              });
          }
        }
        
        function terminateAllExpiredSessions() {
          if (confirm('Terminer toutes les sessions expirées ?')) {
            fetch('/dashboard/api/sessions/terminate-expired', { method: 'POST' })
              .then(response => response.json())
              .then(result => {
                alert(result.terminatedCount + ' sessions terminées');
                location.reload();
              });
          }
        }
        
        function applySessionsFilters() {
          const filters = {
            type: document.getElementById('type-filter').value,
            status: document.getElementById('status-filter').value,
            dateFrom: document.getElementById('date-from-filter').value,
            dateTo: document.getElementById('date-to-filter').value,
            userId: document.getElementById('user-filter').value
          };
          
          const params = new URLSearchParams();
          Object.entries(filters).forEach(([key, value]) => {
            if (value) params.append(key, value);
          });
          
          window.location.href = '/dashboard/sessions?' + params.toString();
        }
        
        function resetSessionsFilters() {
          window.location.href = '/dashboard/sessions';
        }
        
        function refreshSessionsPage() {
          window.location.reload();
        }
      </script>
    `;
    }
    render() {
        const layout = new DashboardLayout_1.DashboardLayout({
            user: this.data.user,
            currentPage: 'sessions',
            children: this.generateMainContent()
        });
        return layout.render();
    }
}
exports.SessionsPage = SessionsPage;
exports.default = SessionsPage;
//# sourceMappingURL=SessionsPage.js.map