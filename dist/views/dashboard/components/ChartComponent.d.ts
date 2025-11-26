import { ChartData } from '../../../types/dashboard';
export interface ChartComponentProps {
    id: string;
    title: string;
    type: 'line' | 'bar' | 'pie' | 'doughnut' | 'area';
    data: ChartData;
    config?: any;
    height?: number;
    loading?: boolean;
    error?: string;
}
export declare class ChartComponent {
    private props;
    constructor(props: ChartComponentProps);
    private generateChartConfig;
    private generateLoadingContent;
    private generateErrorContent;
    private generateChartCanvas;
    render(): string;
}
export declare class ChartsGrid {
    private charts;
    private columns;
    constructor(charts: ChartComponentProps[], columns?: number);
    render(): string;
}
export declare class ChartFactory {
    static createSessionsChart(data: {
        labels: string[];
        values: number[];
    }): ChartComponentProps;
    static createTransfersChart(data: {
        labels: string[];
        values: number[];
        amounts: number[];
    }): ChartComponentProps;
    static createErrorsChart(data: {
        labels: string[];
        values: number[];
    }): ChartComponentProps;
    static createSystemPerformanceChart(data: {
        labels: string[];
        cpu: number[];
        memory: number[];
        disk: number[];
    }): ChartComponentProps;
}
export default ChartComponent;
//# sourceMappingURL=ChartComponent.d.ts.map