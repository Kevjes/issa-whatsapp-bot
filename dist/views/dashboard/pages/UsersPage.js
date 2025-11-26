"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersPage = void 0;
const DashboardLayout_1 = require("../components/DashboardLayout");
const StatsCard_1 = require("../components/StatsCard");
const ChartComponent_1 = require("../components/ChartComponent");
const DataTable_1 = require("../components/DataTable");
class UsersPage {
    constructor() {
        this.layout = new DashboardLayout_1.DashboardLayout({
            user: { id: '1', username: 'admin', role: 'admin', isActive: true },
            currentPage: 'users',
            children: ''
        });
        this.usersTable = this.createUsersTable();
    }
    createUsersTable() {
        return new DataTable_1.DataTable({
            id: 'users-table',
            title: 'Gestion des utilisateurs',
            data: [],
            columns: [
                { key: 'phoneNumber', label: 'Numéro de téléphone', sortable: true },
                { key: 'name', label: 'Nom', sortable: true },
                { key: 'lastActivity', label: 'Dernière activité', sortable: true },
                { key: 'status', label: 'Statut', sortable: true },
                { key: 'sessionsCount', label: 'Sessions', sortable: true },
                { key: 'transfersCount', label: 'Transferts', sortable: true },
                { key: 'createdAt', label: 'Inscription', sortable: true }
            ],
            actions: [
                {
                    id: 'view-user',
                    label: 'Voir détails',
                    icon: 'fas fa-eye',
                    color: 'primary',
                    onClick: 'viewUser'
                },
                {
                    id: 'block-user',
                    label: 'Bloquer',
                    icon: 'fas fa-ban',
                    color: 'warning',
                    onClick: 'blockUser'
                },
                {
                    id: 'delete-user',
                    label: 'Supprimer',
                    icon: 'fas fa-trash',
                    color: 'danger',
                    onClick: 'deleteUser'
                }
            ],
            pagination: {
                page: 1,
                limit: 20,
                total: 100
            },
            searchable: true
        });
    }
    render(data) {
        const statsCards = [
            {
                title: 'Total Utilisateurs',
                value: data.stats.total.toString(),
                icon: 'fas fa-users',
                color: 'primary'
            },
            {
                title: 'Actifs',
                value: data.stats.active.toString(),
                icon: 'fas fa-user-check',
                color: 'success'
            },
            {
                title: 'Inactifs',
                value: data.stats.inactive.toString(),
                icon: 'fas fa-user-times',
                color: 'warning'
            },
            {
                title: 'Nouveaux Aujourd\'hui',
                value: data.stats.newToday.toString(),
                icon: 'fas fa-user-plus',
                color: 'info'
            }
        ];
        const charts = [
            {
                id: 'users-registrations-chart',
                title: 'Inscriptions par Jour',
                type: 'line',
                data: data.chartData.registrations,
                height: 300
            },
            {
                id: 'users-activity-chart',
                title: 'Activité des Utilisateurs',
                type: 'bar',
                data: data.chartData.activity,
                height: 300
            },
            {
                id: 'users-devices-chart',
                title: 'Répartition par Appareil',
                type: 'pie',
                data: data.chartData.devices,
                height: 300
            }
        ];
        const content = `
      <div class="page-content">
        <!-- En-tête de page -->
        <div class="page-header">
          <div class="page-header-content">
            <h1 class="page-title">
              <i class="fas fa-users"></i>
              Gestion des Utilisateurs
            </h1>
            <p class="page-description">
              Gérez les utilisateurs de la plateforme WhatsApp Banking
            </p>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary" data-action="export-users">
              <i class="fas fa-download"></i>
              Exporter
            </button>
            <button class="btn btn-secondary" data-action="refresh-users">
              <i class="fas fa-sync-alt"></i>
              Actualiser
            </button>
          </div>
        </div>
        
        <!-- Statistiques -->
        <section class="page-section">
          <div class="section-header">
            <h2 class="section-title">Statistiques des Utilisateurs</h2>
          </div>
          <div class="section-content">
            ${new StatsCard_1.StatsGrid(statsCards).render()}
          </div>
        </section>
        
        <!-- Graphiques d'analyse -->
        <section class="page-section">
          <div class="section-header">
            <h2 class="section-title">Analyse des Utilisateurs</h2>
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
          <div class="section-content filters-section" id="users-filters" style="display: none;">
            <div class="filters-grid">
              <div class="filter-group">
                <label for="filter-status">Statut</label>
                <select id="filter-status" class="form-control">
                  <option value="">Tous les statuts</option>
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                  <option value="blocked">Bloqué</option>
                </select>
              </div>
              
              <div class="filter-group">
                <label for="filter-date-from">Inscrit depuis</label>
                <input type="date" id="filter-date-from" class="form-control">
              </div>
              
              <div class="filter-date-to">
                <label for="filter-date-to">Inscrit jusqu'à</label>
                <input type="date" id="filter-date-to" class="form-control">
              </div>
              
              <div class="filter-group">
                <label for="filter-activity">Dernière activité</label>
                <select id="filter-activity" class="form-control">
                  <option value="">Toutes</option>
                  <option value="today">Aujourd'hui</option>
                  <option value="week">Cette semaine</option>
                  <option value="month">Ce mois</option>
                  <option value="older">Plus ancien</option>
                </select>
              </div>
              
              <div class="filter-group">
                <label for="filter-search">Recherche</label>
                <input type="text" id="filter-search" class="form-control" placeholder="Numéro, nom...">
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
        
        <!-- Tableau des utilisateurs -->
        <section class="page-section">
          <div class="section-header">
            <h2 class="section-title">Liste des Utilisateurs</h2>
            <div class="section-actions">
              <button class="btn btn-outline-danger btn-sm" data-action="cleanup-inactive-users">
                <i class="fas fa-user-slash"></i>
                Nettoyer Inactifs
              </button>
            </div>
          </div>
          <div class="section-content">
            ${this.usersTable.render()}
          </div>
        </section>
      </div>
      
      <!-- Modale de détails utilisateur -->
      <div class="modal fade" id="userDetailsModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">
                <i class="fas fa-user"></i>
                Détails de l'Utilisateur
              </h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="user-details-content">
                <!-- Le contenu sera chargé dynamiquement -->
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
              <button type="button" class="btn btn-warning" data-action="block-user-modal">
                <i class="fas fa-ban"></i>
                Bloquer
              </button>
              <button type="button" class="btn btn-danger" data-action="delete-user-modal">
                <i class="fas fa-trash"></i>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
        const layout = new DashboardLayout_1.DashboardLayout({
            user: { id: '1', username: 'admin', role: 'admin', isActive: true },
            currentPage: 'users',
            children: content
        });
        return layout.render();
    }
    getPageScripts() {
        return `
      <script>
        // Gestion des événements de la page des utilisateurs
        document.addEventListener('DOMContentLoaded', function() {
          // Toggle des filtres
          const toggleFiltersBtn = document.querySelector('[data-action="toggle-filters"]');
          const filtersSection = document.getElementById('users-filters');
          
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
                dateFrom: document.getElementById('filter-date-from')?.value || '',
                dateTo: document.getElementById('filter-date-to')?.value || '',
                activity: document.getElementById('filter-activity')?.value || '',
                search: document.getElementById('filter-search')?.value || ''
              };
              
              // Appliquer les filtres
              window.dashboardApp.applyUsersFilters(filters);
            });
          }
          
          // Réinitialisation des filtres
          const resetFiltersBtn = document.querySelector('[data-action="reset-filters"]');
          if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', function() {
              document.getElementById('filter-status').value = '';
              document.getElementById('filter-date-from').value = '';
              document.getElementById('filter-date-to').value = '';
              document.getElementById('filter-activity').value = '';
              document.getElementById('filter-search').value = '';
              
              // Recharger les données
              window.dashboardApp.loadUsersPage();
            });
          }
          
          // Actualisation de la page
          const refreshBtn = document.querySelector('[data-action="refresh-users"]');
          if (refreshBtn) {
            refreshBtn.addEventListener('click', function() {
              window.dashboardApp.loadUsersPage();
            });
          }
          
          // Exportation des utilisateurs
          const exportBtn = document.querySelector('[data-action="export-users"]');
          if (exportBtn) {
            exportBtn.addEventListener('click', function() {
              window.dashboardApp.exportUsers();
            });
          }
          
          // Nettoyage des utilisateurs inactifs
          const cleanupBtn = document.querySelector('[data-action="cleanup-inactive-users"]');
          if (cleanupBtn) {
            cleanupBtn.addEventListener('click', function() {
              if (confirm('Êtes-vous sûr de vouloir supprimer les utilisateurs inactifs ? Cette action est irréversible.')) {
                window.dashboardApp.cleanupInactiveUsers();
              }
            });
          }
          
          // Gestion des actions du tableau
          document.addEventListener('click', function(e) {
            const target = e.target.closest('[data-action]');
            if (!target) return;
            
            const action = target.dataset.action;
            const userId = target.dataset.userId;
            
            switch (action) {
              case 'view-user':
                if (userId) {
                  window.dashboardApp.showUserDetails(userId);
                }
                break;
                
              case 'block-user':
                if (userId && confirm('Êtes-vous sûr de vouloir bloquer cet utilisateur ?')) {
                  window.dashboardApp.blockUser(userId);
                }
                break;
                
              case 'delete-user':
                if (userId && confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.')) {
                  window.dashboardApp.deleteUser(userId);
                }
                break;
            }
          });
        });
      </script>
    `;
    }
}
exports.UsersPage = UsersPage;
exports.default = UsersPage;
//# sourceMappingURL=UsersPage.js.map