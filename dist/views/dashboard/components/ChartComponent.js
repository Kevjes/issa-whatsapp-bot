"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChartFactory = exports.ChartsGrid = exports.ChartComponent = void 0;
class ChartComponent {
    constructor(props) {
        this.props = props;
    }
    generateChartConfig() {
        const { type, data, config = {} } = this.props;
        const defaultConfig = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                },
            },
            scales: type === 'pie' || type === 'doughnut' ? {} : {
                x: {
                    display: true,
                    grid: {
                        display: false,
                    },
                },
                y: {
                    display: true,
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)',
                    },
                },
            },
        };
        const mergedConfig = {
            type,
            data,
            options: { ...defaultConfig, ...config }
        };
        return JSON.stringify(mergedConfig);
    }
    generateLoadingContent() {
        return `
      <div class="chart-loading">
        <div class="loading-spinner"></div>
        <p>Chargement des données...</p>
      </div>
    `;
    }
    generateErrorContent() {
        const { error } = this.props;
        return `
      <div class="chart-error">
        <i class="material-icons">error</i>
        <p>Erreur lors du chargement: ${error}</p>
        <button onclick="retryChart('${this.props.id}')" class="retry-btn">
          <i class="material-icons">refresh</i>
          Réessayer
        </button>
      </div>
    `;
    }
    generateChartCanvas() {
        const { id, height = 400 } = this.props;
        return `
      <div class="chart-canvas-wrapper" style="height: ${height}px;">
        <canvas id="${id}" class="chart-canvas"></canvas>
      </div>
      <script>
        (function() {
          const ctx = document.getElementById('${id}').getContext('2d');
          const config = ${this.generateChartConfig()};
          window.charts = window.charts || {};
          window.charts['${id}'] = new Chart(ctx, config);
        })();
      </script>
    `;
    }
    render() {
        const { title, loading, error } = this.props;
        let content;
        if (loading) {
            content = this.generateLoadingContent();
        }
        else if (error) {
            content = this.generateErrorContent();
        }
        else {
            content = this.generateChartCanvas();
        }
        return `
      <div class="chart-component">
        <div class="chart-header">
          <h3 class="chart-title">${title}</h3>
          <div class="chart-actions">
            <button onclick="refreshChart('${this.props.id}')" class="chart-action-btn" title="Actualiser">
              <i class="material-icons">refresh</i>
            </button>
            <button onclick="exportChart('${this.props.id}')" class="chart-action-btn" title="Exporter">
              <i class="material-icons">download</i>
            </button>
          </div>
        </div>
        <div class="chart-content">
          ${content}
        </div>
      </div>
    `;
    }
}
exports.ChartComponent = ChartComponent;
class ChartsGrid {
    constructor(charts, columns = 2) {
        this.charts = charts;
        this.columns = columns;
    }
    render() {
        const chartsHtml = this.charts.map(chartProps => {
            const chart = new ChartComponent(chartProps);
            return `<div class="chart-grid-item">${chart.render()}</div>`;
        }).join('');
        return `
      <div class="charts-grid" style="grid-template-columns: repeat(${this.columns}, 1fr);">
        ${chartsHtml}
      </div>
    `;
    }
}
exports.ChartsGrid = ChartsGrid;
class ChartFactory {
    static createSessionsChart(data) {
        return {
            id: 'sessions-chart',
            title: 'Sessions par Heure',
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                        label: 'Sessions',
                        data: data.values,
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        tension: 0.1
                    }]
            },
            height: 300
        };
    }
    static createTransfersChart(data) {
        return {
            id: 'transfers-chart',
            title: 'Transferts par Jour',
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Nombre de transferts',
                        data: data.values,
                        backgroundColor: 'rgba(54, 162, 235, 0.8)',
                        yAxisID: 'y'
                    },
                    {
                        label: 'Montant (USD)',
                        data: data.amounts,
                        backgroundColor: 'rgba(255, 99, 132, 0.8)',
                        yAxisID: 'y1'
                    }
                ]
            },
            config: {
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: {
                            drawOnChartArea: false,
                        },
                    },
                },
            },
            height: 350
        };
    }
    static createErrorsChart(data) {
        return {
            id: 'errors-chart',
            title: 'Répartition des Erreurs',
            type: 'doughnut',
            data: {
                labels: data.labels,
                datasets: [{
                        label: 'Erreurs',
                        data: data.values,
                        backgroundColor: [
                            '#FF6384',
                            '#36A2EB',
                            '#FFCE56',
                            '#4BC0C0',
                            '#9966FF',
                            '#FF9F40'
                        ]
                    }]
            },
            height: 300
        };
    }
    static createSystemPerformanceChart(data) {
        return {
            id: 'system-performance-chart',
            title: 'Performance Système',
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'CPU (%)',
                        data: data.cpu,
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    },
                    {
                        label: 'Mémoire (%)',
                        data: data.memory,
                        borderColor: 'rgb(54, 162, 235)',
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    },
                    {
                        label: 'Disque (%)',
                        data: data.disk,
                        borderColor: 'rgb(255, 205, 86)',
                        backgroundColor: 'rgba(255, 205, 86, 0.2)',
                    }
                ]
            },
            height: 300
        };
    }
}
exports.ChartFactory = ChartFactory;
exports.default = ChartComponent;
//# sourceMappingURL=ChartComponent.js.map