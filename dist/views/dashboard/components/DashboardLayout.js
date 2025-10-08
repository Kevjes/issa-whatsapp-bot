"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardLayout = void 0;
class DashboardLayout {
    constructor(props) {
        this.props = props;
    }
    generateSidebar() {
        const { currentPage, sidebarCollapsed = false } = this.props;
        const sidebarClass = sidebarCollapsed ? 'sidebar collapsed' : 'sidebar';
        const menuItems = [
            { id: 'dashboard', label: 'Tableau de bord', icon: 'dashboard', path: '/dashboard' },
            { id: 'analytics', label: 'Analyses', icon: 'analytics', path: '/dashboard/analytics' },
            { id: 'logs', label: 'Journaux', icon: 'description', path: '/dashboard/logs' },
            { id: 'sessions', label: 'Sessions', icon: 'people', path: '/dashboard/sessions' },
            { id: 'transfers', label: 'Transferts', icon: 'swap_horiz', path: '/dashboard/transfers' },
            { id: 'users', label: 'Utilisateurs', icon: 'person', path: '/dashboard/users' },
            { id: 'alerts', label: 'Alertes', icon: 'notifications', path: '/dashboard/alerts' },
            { id: 'settings', label: 'Paramètres', icon: 'settings', path: '/dashboard/settings' }
        ];
        const menuItemsHtml = menuItems.map(item => {
            const activeClass = currentPage === item.id ? 'active' : '';
            return `
        <li class="menu-item ${activeClass}">
          <a href="${item.path}" class="menu-link">
            <i class="material-icons">${item.icon}</i>
            <span class="menu-text">${item.label}</span>
          </a>
        </li>
      `;
        }).join('');
        return `
      <aside class="${sidebarClass}">
        <div class="sidebar-header">
          <div class="logo">
            <i class="material-icons">account_balance</i>
            <span class="logo-text">Banking Bot</span>
          </div>
          <button class="sidebar-toggle" onclick="toggleSidebar()">
            <i class="material-icons">menu</i>
          </button>
        </div>
        <nav class="sidebar-nav">
          <ul class="menu-list">
            ${menuItemsHtml}
          </ul>
        </nav>
      </aside>
    `;
    }
    generateTopbar() {
        const { user } = this.props;
        return `
      <header class="topbar">
        <div class="topbar-left">
          <button class="sidebar-toggle-mobile" onclick="toggleSidebar()">
            <i class="material-icons">menu</i>
          </button>
          <h1 class="page-title">Dashboard Administratif</h1>
        </div>
        <div class="topbar-right">
          <div class="notifications">
            <button class="notification-btn" onclick="toggleNotifications()">
              <i class="material-icons">notifications</i>
              <span class="notification-badge">3</span>
            </button>
          </div>
          <div class="user-menu">
            <button class="user-btn" onclick="toggleUserMenu()">
              <div class="user-avatar">
                <i class="material-icons">person</i>
              </div>
              <span class="user-name">${user.username}</span>
              <i class="material-icons">arrow_drop_down</i>
            </button>
            <div class="user-dropdown" id="userDropdown">
              <a href="/dashboard/profile" class="dropdown-item">
                <i class="material-icons">person</i>
                Profil
              </a>
              <a href="/dashboard/settings" class="dropdown-item">
                <i class="material-icons">settings</i>
                Paramètres
              </a>
              <div class="dropdown-divider"></div>
              <button onclick="logout()" class="dropdown-item logout-btn">
                <i class="material-icons">logout</i>
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>
    `;
    }
    generateMainContent() {
        const { children } = this.props;
        return `
      <main class="main-content">
        <div class="content-wrapper">
          ${children}
        </div>
      </main>
    `;
    }
    render() {
        return `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dashboard - Banking Bot</title>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
        <link rel="stylesheet" href="/dashboard/css/dashboard.css">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      </head>
      <body class="dashboard-body">
        <div class="dashboard-container">
          ${this.generateSidebar()}
          <div class="main-wrapper">
            ${this.generateTopbar()}
            ${this.generateMainContent()}
          </div>
        </div>
        <script src="/dashboard/js/dashboard.js"></script>
      </body>
      </html>
    `;
    }
}
exports.DashboardLayout = DashboardLayout;
exports.default = DashboardLayout;
//# sourceMappingURL=DashboardLayout.js.map