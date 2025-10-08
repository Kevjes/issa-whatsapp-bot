"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatsCardFactory = exports.StatsGrid = exports.StatsCard = void 0;
class StatsCard {
    constructor(props) {
        this.props = props;
    }
    generateTrendIcon() {
        const { trend } = this.props;
        if (!trend)
            return '';
        const trendClass = trend.direction === 'up' ? 'trend-up' : 'trend-down';
        const trendIcon = trend.direction === 'up' ? 'trending_up' : 'trending_down';
        const trendColor = trend.direction === 'up' ? 'success' : 'danger';
        return `
      <div class="stats-trend ${trendClass}">
        <i class="material-icons trend-icon text-${trendColor}">${trendIcon}</i>
        <span class="trend-value text-${trendColor}">${Math.abs(trend.value)}%</span>
        <span class="trend-period">${trend.period}</span>
      </div>
    `;
    }
    generateCardContent() {
        const { title, value, subtitle, loading } = this.props;
        if (loading) {
            return `
        <div class="stats-content loading">
          <div class="loading-skeleton title-skeleton"></div>
          <div class="loading-skeleton value-skeleton"></div>
          <div class="loading-skeleton subtitle-skeleton"></div>
        </div>
      `;
        }
        return `
      <div class="stats-content">
        <h3 class="stats-title">${title}</h3>
        <div class="stats-value">${value}</div>
        ${subtitle ? `<p class="stats-subtitle">${subtitle}</p>` : ''}
        ${this.generateTrendIcon()}
      </div>
    `;
    }
    render() {
        const { icon, color, loading } = this.props;
        const cardClass = loading ? 'stats-card loading' : 'stats-card';
        return `
      <div class="${cardClass} stats-card-${color}">
        <div class="stats-icon">
          <i class="material-icons">${icon}</i>
        </div>
        ${this.generateCardContent()}
      </div>
    `;
    }
}
exports.StatsCard = StatsCard;
class StatsGrid {
    constructor(cards) {
        this.cards = cards;
    }
    render() {
        const cardsHtml = this.cards.map(cardProps => {
            const card = new StatsCard(cardProps);
            return `<div class="stats-grid-item">${card.render()}</div>`;
        }).join('');
        return `
      <div class="stats-grid">
        ${cardsHtml}
      </div>
    `;
    }
}
exports.StatsGrid = StatsGrid;
class StatsCardFactory {
    static createActiveSessionsCard(count, trend) {
        return {
            title: 'Sessions Actives',
            value: count.toLocaleString(),
            icon: 'people',
            color: 'primary',
            trend: trend ? { ...trend, period: 'dernière heure' } : undefined,
            subtitle: 'Utilisateurs connectés'
        };
    }
    static createDailyTransfersCard(count, amount) {
        return {
            title: 'Transferts Aujourd\'hui',
            value: count.toLocaleString(),
            icon: 'swap_horiz',
            color: 'success',
            subtitle: `${amount.toLocaleString()} USD transférés`
        };
    }
    static createErrorsCard(count, trend) {
        return {
            title: 'Erreurs',
            value: count.toLocaleString(),
            icon: 'error',
            color: 'danger',
            trend: trend ? { ...trend, period: 'dernières 24h' } : undefined,
            subtitle: 'Erreurs système'
        };
    }
    static createSystemHealthCard(status, uptime) {
        const statusConfig = {
            healthy: { color: 'success', icon: 'check_circle', value: 'Opérationnel' },
            warning: { color: 'warning', icon: 'warning', value: 'Attention' },
            critical: { color: 'danger', icon: 'error', value: 'Critique' }
        };
        const config = statusConfig[status];
        return {
            title: 'État du Système',
            value: config.value,
            icon: config.icon,
            color: config.color,
            subtitle: `Uptime: ${uptime}`
        };
    }
}
exports.StatsCardFactory = StatsCardFactory;
exports.default = StatsCard;
//# sourceMappingURL=StatsCard.js.map