"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataTableFactory = exports.DataTable = void 0;
class DataTable {
    constructor(props) {
        this.props = props;
    }
    generateTableHeader() {
        const { columns } = this.props;
        const headerCells = columns.map(column => {
            const sortableClass = column.sortable ? 'sortable' : '';
            const alignClass = column.align ? `text-${column.align}` : '';
            const widthStyle = column.width ? `style="width: ${column.width}"` : '';
            const sortIcon = column.sortable ? '<i class="material-icons sort-icon">unfold_more</i>' : '';
            return `
        <th class="table-header-cell ${sortableClass} ${alignClass}" 
            ${widthStyle}
            ${column.sortable ? `onclick="sortTable('${this.props.id}', '${column.key}')"` : ''}>
          <div class="header-content">
            <span>${column.label}</span>
            ${sortIcon}
          </div>
        </th>
      `;
        }).join('');
        return `
      <thead class="table-header">
        <tr>
          ${headerCells}
        </tr>
      </thead>
    `;
    }
    formatCellValue(value, column, row) {
        if (column.formatter) {
            return column.formatter(value, row);
        }
        switch (column.type) {
            case 'date':
                return value ? new Date(value).toLocaleString('fr-FR') : '-';
            case 'boolean':
                return value ?
                    '<span class="badge badge-success">Oui</span>' :
                    '<span class="badge badge-danger">Non</span>';
            case 'badge':
                const badgeClass = this.getBadgeClass(value);
                return `<span class="badge ${badgeClass}">${value}</span>`;
            case 'number':
                return typeof value === 'number' ? value.toLocaleString('fr-FR') : value || '-';
            case 'actions':
                return this.generateRowActions(row);
            default:
                return value || '-';
        }
    }
    getBadgeClass(value) {
        const lowerValue = value?.toLowerCase();
        if (['actif', 'active', 'success', 'completed', 'online'].includes(lowerValue)) {
            return 'badge-success';
        }
        if (['inactif', 'inactive', 'pending', 'warning'].includes(lowerValue)) {
            return 'badge-warning';
        }
        if (['erreur', 'error', 'failed', 'offline', 'danger'].includes(lowerValue)) {
            return 'badge-danger';
        }
        return 'badge-info';
    }
    generateRowActions(row) {
        const { actions = [] } = this.props;
        const actionButtons = actions
            .filter(action => !action.condition || action.condition(row))
            .map(action => {
            const colorClass = action.color ? `btn-${action.color}` : 'btn-primary';
            return `
          <button class="action-btn ${colorClass}" 
                  onclick="${action.onClick}('${row.id}')" 
                  title="${action.label}">
            <i class="material-icons">${action.icon}</i>
          </button>
        `;
        }).join('');
        return `<div class="action-buttons">${actionButtons}</div>`;
    }
    generateTableBody() {
        const { columns, data, loading, error, emptyMessage = 'Aucune donnée disponible' } = this.props;
        if (loading) {
            return `
        <tbody>
          <tr>
            <td colspan="${columns.length}" class="table-loading">
              <div class="loading-spinner"></div>
              <span>Chargement...</span>
            </td>
          </tr>
        </tbody>
      `;
        }
        if (error) {
            return `
        <tbody>
          <tr>
            <td colspan="${columns.length}" class="table-error">
              <i class="material-icons">error</i>
              <span>Erreur: ${error}</span>
              <button onclick="retryTable('${this.props.id}')" class="retry-btn">
                <i class="material-icons">refresh</i>
                Réessayer
              </button>
            </td>
          </tr>
        </tbody>
      `;
        }
        if (!data || data.length === 0) {
            return `
        <tbody>
          <tr>
            <td colspan="${columns.length}" class="table-empty">
              <i class="material-icons">inbox</i>
              <span>${emptyMessage}</span>
            </td>
          </tr>
        </tbody>
      `;
        }
        const rows = data.map((row, index) => {
            const cells = columns.map(column => {
                const value = row[column.key];
                const formattedValue = this.formatCellValue(value, column, row);
                const alignClass = column.align ? `text-${column.align}` : '';
                return `<td class="table-cell ${alignClass}">${formattedValue}</td>`;
            }).join('');
            return `<tr class="table-row" data-row-id="${row.id || index}">${cells}</tr>`;
        }).join('');
        return `<tbody class="table-body">${rows}</tbody>`;
    }
    generateToolbar() {
        const { title, searchable, exportable, filters = [] } = this.props;
        const searchInput = searchable ? `
      <div class="search-input-wrapper">
        <i class="material-icons">search</i>
        <input type="text" 
               class="search-input" 
               placeholder="Rechercher..." 
               onkeyup="searchTable('${this.props.id}', this.value)">
      </div>
    ` : '';
        const filterDropdowns = filters.map(filter => `
      <select class="filter-select" 
              onchange="filterTable('${this.props.id}', '${filter.key}', this.value)">
        <option value="">${filter.label}</option>
        ${filter.options?.map(option => `<option value="${option.value}">${option.label}</option>`).join('') || ''}
      </select>
    `).join('');
        const exportButton = exportable ? `
      <button class="toolbar-btn" onclick="exportTable('${this.props.id}')" title="Exporter">
        <i class="material-icons">download</i>
        Exporter
      </button>
    ` : '';
        return `
      <div class="table-toolbar">
        <div class="toolbar-left">
          <h3 class="table-title">${title}</h3>
        </div>
        <div class="toolbar-center">
          ${filterDropdowns}
        </div>
        <div class="toolbar-right">
          ${searchInput}
          ${exportButton}
          <button class="toolbar-btn" onclick="refreshTable('${this.props.id}')" title="Actualiser">
            <i class="material-icons">refresh</i>
          </button>
        </div>
      </div>
    `;
    }
    generatePagination() {
        const { pagination } = this.props;
        if (!pagination)
            return '';
        const { page, limit, total } = pagination;
        const totalPages = Math.ceil(total / limit);
        const startItem = (page - 1) * limit + 1;
        const endItem = Math.min(page * limit, total);
        const prevDisabled = page <= 1 ? 'disabled' : '';
        const nextDisabled = page >= totalPages ? 'disabled' : '';
        return `
      <div class="table-pagination">
        <div class="pagination-info">
          Affichage de ${startItem} à ${endItem} sur ${total} éléments
        </div>
        <div class="pagination-controls">
          <button class="pagination-btn ${prevDisabled}" 
                  onclick="changePage('${this.props.id}', ${page - 1})" 
                  ${prevDisabled ? 'disabled' : ''}>
            <i class="material-icons">chevron_left</i>
          </button>
          <span class="pagination-current">Page ${page} sur ${totalPages}</span>
          <button class="pagination-btn ${nextDisabled}" 
                  onclick="changePage('${this.props.id}', ${page + 1})" 
                  ${nextDisabled ? 'disabled' : ''}>
            <i class="material-icons">chevron_right</i>
          </button>
        </div>
      </div>
    `;
    }
    render() {
        return `
      <div class="data-table-container" id="${this.props.id}">
        ${this.generateToolbar()}
        <div class="table-wrapper">
          <table class="data-table">
            ${this.generateTableHeader()}
            ${this.generateTableBody()}
          </table>
        </div>
        ${this.generatePagination()}
      </div>
    `;
    }
}
exports.DataTable = DataTable;
class DataTableFactory {
    static createLogsTable(data, pagination) {
        return {
            id: 'logs-table',
            title: 'Journaux Système',
            columns: [
                { key: 'timestamp', label: 'Date/Heure', type: 'date', sortable: true, width: '180px' },
                { key: 'level', label: 'Niveau', type: 'badge', filterable: true, width: '100px' },
                { key: 'message', label: 'Message', type: 'text' },
                { key: 'userId', label: 'Utilisateur', type: 'text', width: '120px' },
                { key: 'actions', label: 'Actions', type: 'actions', width: '100px', align: 'center' }
            ],
            data,
            pagination,
            actions: [
                { id: 'view', label: 'Voir', icon: 'visibility', color: 'info', onClick: 'viewLog' },
                { id: 'delete', label: 'Supprimer', icon: 'delete', color: 'danger', onClick: 'deleteLog' }
            ],
            searchable: true,
            exportable: true,
            filters: [
                {
                    key: 'level',
                    label: 'Niveau',
                    type: 'select',
                    options: [
                        { value: 'info', label: 'Info' },
                        { value: 'warning', label: 'Avertissement' },
                        { value: 'error', label: 'Erreur' }
                    ]
                }
            ]
        };
    }
    static createSessionsTable(data, pagination) {
        return {
            id: 'sessions-table',
            title: 'Sessions Utilisateurs',
            columns: [
                { key: 'userId', label: 'Utilisateur', type: 'text', sortable: true },
                { key: 'sessionType', label: 'Type', type: 'badge', filterable: true, width: '120px' },
                { key: 'status', label: 'Statut', type: 'badge', width: '100px' },
                { key: 'createdAt', label: 'Créée le', type: 'date', sortable: true, width: '180px' },
                { key: 'lastActivity', label: 'Dernière activité', type: 'date', width: '180px' },
                { key: 'actions', label: 'Actions', type: 'actions', width: '120px', align: 'center' }
            ],
            data,
            pagination,
            actions: [
                { id: 'view', label: 'Voir', icon: 'visibility', color: 'info', onClick: 'viewSession' },
                { id: 'terminate', label: 'Terminer', icon: 'stop', color: 'warning', onClick: 'terminateSession' },
                { id: 'delete', label: 'Supprimer', icon: 'delete', color: 'danger', onClick: 'deleteSession' }
            ],
            searchable: true,
            exportable: true
        };
    }
    static createTransfersTable(data, pagination) {
        return {
            id: 'transfers-table',
            title: 'Historique des Transferts',
            columns: [
                { key: 'id', label: 'ID', type: 'text', width: '80px' },
                { key: 'fromAccount', label: 'Compte source', type: 'text' },
                { key: 'toAccount', label: 'Compte destination', type: 'text' },
                { key: 'amount', label: 'Montant', type: 'number', align: 'right', width: '120px' },
                { key: 'status', label: 'Statut', type: 'badge', width: '100px' },
                { key: 'createdAt', label: 'Date', type: 'date', sortable: true, width: '180px' },
                { key: 'actions', label: 'Actions', type: 'actions', width: '100px', align: 'center' }
            ],
            data,
            pagination,
            actions: [
                { id: 'view', label: 'Voir', icon: 'visibility', color: 'info', onClick: 'viewTransfer' },
                { id: 'export', label: 'Exporter', icon: 'download', color: 'primary', onClick: 'exportTransfer' }
            ],
            searchable: true,
            exportable: true
        };
    }
}
exports.DataTableFactory = DataTableFactory;
exports.default = DataTable;
//# sourceMappingURL=DataTable.js.map