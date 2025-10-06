"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransfersPage = void 0;
const DashboardLayout_1 = require("../components/DashboardLayout");
const StatsCard_1 = require("../components/StatsCard");
const ChartComponent_1 = require("../components/ChartComponent");
const DataTable_1 = require("../components/DataTable");
class TransfersPage {
    constructor() {
        const tableProps = DataTable_1.DataTableFactory.createTransfersTable([]);
        this.transfersTable = new DataTable_1.DataTable(tableProps);
    }
    render(data) {
        const statsCards = [
            {
                title: 'Total Transferts',
                value: data.stats.total.toString(),
                icon: 'fas fa-exchange-alt',
                color: 'primary'
            },
            {
                title: 'En Attente',
                value: data.stats.pending.toString(),
                icon: 'fas fa-clock',
                color: 'warning'
            },
            {
                title: 'Complétés',
                value: data.stats.completed.toString(),
                icon: 'fas fa-check-circle',
                color: 'success'
            },
            {
                title: 'Échoués',
                value: data.stats.failed.toString(),
                icon: 'fas fa-times-circle',
                color: 'danger'
            },
            {
                title: 'Montant Total',
                value: `${data.stats.totalAmount.toLocaleString()} USD`,
                icon: 'fas fa-dollar-sign',
                color: 'info'
            },
            {
                title: 'Montant Moyen',
                value: `${data.stats.averageAmount.toLocaleString()} USD`,
                icon: 'fas fa-chart-line',
                color: 'info'
            }
        ];
        const charts = [
            {
                id: 'transfers-hourly-chart',
                title: 'Transferts par Heure',
                type: 'line',
                data: data.chartData.hourly,
                height: 300
            },
            {
                id: 'transfers-status-chart',
                title: 'Répartition par Statut',
                type: 'doughnut',
                data: data.chartData.status,
                height: 300
            },
            {
                id: 'transfers-amounts-chart',
                title: 'Distribution des Montants',
                type: 'bar',
                data: data.chartData.amounts,
                height: 300
            }
        ];
        const content = `
      <div class="page-content">
        <!-- En-tête de page -->
        <div class="page-header">
          <div class="page-header-content">
            <h1 class="page-title">
              <i class="fas fa-exchange-alt"></i>
              Gestion des Transferts
            </h1>
            <p class="page-description">
              Gérez et surveillez tous les transferts de fonds effectués via la plateforme
            </p>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary" data-action="export-transfers">
              <i class="fas fa-download"></i>
              Exporter
            </button>
            <button class="btn btn-secondary" data-action="refresh-transfers">
              <i class="fas fa-sync-alt"></i>
              Actualiser
            </button>
          </div>
        </div>
        
        <!-- Statistiques -->
        <section class="page-section">
          <div class="section-header">
            <h2 class="section-title">Statistiques des Transferts</h2>
          </div>
          <div class="section-content">
            ${new StatsCard_1.StatsGrid(statsCards).render()}
          </div>
        </section>
        
        <!-- Graphiques d'analyse -->
        <section class="page-section">
          <div class="section-header">
            <h2 class="section-title">Analyse des Transferts</h2>
          </div>
          <div class="section-content">
            ${new ChartComponent_1.ChartsGrid(charts).render()}
          </div>
        </section>
        
        <!-- Filtres -->
        <section class="page-section">
          <div class="section-header">
            <h2 class="section-title">Filtres Avancés</h2>
            <button class="btn btn-outline-secondary btn-sm" data-action="toggle-filters">
              <i class="fas fa-filter"></i>
              Afficher/Masquer
            </button>
          </div>
          <div class="section-content filters-section" id="transfers-filters" style="display: none;">
            <div class="filters-grid">
              <div class="filter-group">
                <label for="filter-status">Statut</label>
                <select id="filter-status" class="form-control">
                  <option value="">Tous les statuts</option>
                  <option value="pending">En attente</option>
                  <option value="completed">Complété</option>
                  <option value="failed">Échoué</option>
                  <option value="cancelled">Annulé</option>
                </select>
              </div>
              
              <div class="filter-group">
                <label for="filter-amount-min">Montant Min</label>
                <input type="number" id="filter-amount-min" class="form-control" placeholder="0">
              </div>
              
              <div class="filter-group">
                <label for="filter-amount-max">Montant Max</label>
                <input type="number" id="filter-amount-max" class="form-control" placeholder="Illimité">
              </div>
              
              <div class="filter-group">
                <label for="filter-date-from">Date de début</label>
                <input type="date" id="filter-date-from" class="form-control">
              </div>
              
              <div class="filter-group">
                <label for="filter-date-to">Date de fin</label>
                <input type="date" id="filter-date-to" class="form-control">
              </div>
              
              <div class="filter-group">
                <label for="filter-search">Recherche</label>
                <input type="text" id="filter-search" class="form-control" placeholder="ID, compte, nom...">
              </div>
            </div>
            
            <div class="filters-actions">
              <button class="btn btn-primary" data-action="apply-filters">
                <i class="fas fa-search"></i>
                Appliquer
              </button>
              <button class="btn btn-outline-secondary" data-action="reset-filters">
                <i class="fas fa-times"></i>
                Réinitialiser
              </button>
            </div>
          </div>
        </section>
        
        <!-- Tableau des transferts -->
        <section class="page-section">
          <div class="section-header">
            <h2 class="section-title">Liste des Transferts</h2>
            <div class="section-actions">
              <button class="btn btn-outline-danger btn-sm" data-action="cleanup-old-transfers">
                <i class="fas fa-trash"></i>
                Nettoyer Anciens
              </button>
            </div>
          </div>
          <div class="section-content">
            ${this.transfersTable.render()}
          </div>
        </section>
      </div>
      
      <!-- Modale de détails de transfert -->
      <div class="modal fade" id="transferDetailsModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">
                <i class="fas fa-exchange-alt"></i>
                Détails du Transfert
              </h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="transfer-details-content">
                <!-- Le contenu sera chargé dynamiquement -->
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
              <button type="button" class="btn btn-primary" data-action="export-transfer-details">
                <i class="fas fa-download"></i>
                Exporter
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
        const layout = new DashboardLayout_1.DashboardLayout({
            user: { id: '1', username: 'admin', role: 'admin', isActive: true },
            currentPage: 'transfers',
            children: content
        });
        return layout.render();
    }
    getPageScripts() {
        return `
      <script>
        // Gestion des événements de la page des transferts
        document.addEventListener('DOMContentLoaded', function() {
          // Toggle des filtres
          const toggleFiltersBtn = document.querySelector('[data-action="toggle-filters"]');
          const filtersSection = document.getElementById('transfers-filters');
          
          if (toggleFiltersBtn && filtersSection) {
            toggleFiltersBtn.addEventListener('click', function() {
              const isVisible = filtersSection.style.display !== 'none';
              filtersSection.style.display = isVisible ? 'none' : 'block';
              
              const icon = this.querySelector('i');
              if (icon) {
                icon.className = isVisible ? 'fas fa-filter' : 'fas fa-filter-circle-xmark';
              }
            });
          }
          
          // Application des filtres
          const applyFiltersBtn = document.querySelector('[data-action="apply-filters"]');
          if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', function() {
              const filters = {
                status: document.getElementById('filter-status')?.value || '',
                amountMin: document.getElementById('filter-amount-min')?.value || '',
                amountMax: document.getElementById('filter-amount-max')?.value || '',
                dateFrom: document.getElementById('filter-date-from')?.value || '',
                dateTo: document.getElementById('filter-date-to')?.value || '',
                search: document.getElementById('filter-search')?.value || ''
              };
              
              // Appliquer les filtres
              window.dashboardApp.applyTransfersFilters(filters);
            });
          }
          
          // Réinitialisation des filtres
          const resetFiltersBtn = document.querySelector('[data-action="reset-filters"]');
          if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', function() {
              document.getElementById('filter-status').value = '';
              document.getElementById('filter-amount-min').value = '';
              document.getElementById('filter-amount-max').value = '';
              document.getElementById('filter-date-from').value = '';
              document.getElementById('filter-date-to').value = '';
              document.getElementById('filter-search').value = '';
              
              // Recharger les données
              window.dashboardApp.loadTransfersPage();
            });
          }
          
          // Actualisation de la page
          const refreshBtn = document.querySelector('[data-action="refresh-transfers"]');
          if (refreshBtn) {
            refreshBtn.addEventListener('click', function() {
              window.dashboardApp.loadTransfersPage();
            });
          }
          
          // Exportation des transferts
          const exportBtn = document.querySelector('[data-action="export-transfers"]');
          if (exportBtn) {
            exportBtn.addEventListener('click', function() {
              window.dashboardApp.exportTransfers();
            });
          }
          
          // Nettoyage des anciens transferts
          const cleanupBtn = document.querySelector('[data-action="cleanup-old-transfers"]');
          if (cleanupBtn) {
            cleanupBtn.addEventListener('click', function() {
              if (confirm('Êtes-vous sûr de vouloir supprimer les anciens transferts ? Cette action est irréversible.')) {
                window.dashboardApp.cleanupOldTransfers();
              }
            });
          }
          
          // Gestion des actions du tableau
          document.addEventListener('click', function(e) {
            const target = e.target.closest('[data-action]');
            if (!target) return;
            
            const action = target.dataset.action;
            const transferId = target.dataset.transferId;
            
            switch (action) {
              case 'view-transfer':
                if (transferId) {
                  window.dashboardApp.showTransferDetails(transferId);
                }
                break;
                
              case 'retry-transfer':
                if (transferId && confirm('Êtes-vous sûr de vouloir relancer ce transfert ?')) {
                  window.dashboardApp.retryTransfer(transferId);
                }
                break;
                
              case 'cancel-transfer':
                if (transferId && confirm('Êtes-vous sûr de vouloir annuler ce transfert ?')) {
                  window.dashboardApp.cancelTransfer(transferId);
                }
                break;
                
              case 'delete-transfer':
                if (transferId && confirm('Êtes-vous sûr de vouloir supprimer ce transfert ? Cette action est irréversible.')) {
                  window.dashboardApp.deleteTransfer(transferId);
                }
                break;
            }
          });
        });
      </script>
    `;
    }
}
exports.TransfersPage = TransfersPage;
exports.default = TransfersPage;
//# sourceMappingURL=TransfersPage.js.map