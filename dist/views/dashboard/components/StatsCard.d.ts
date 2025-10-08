export interface StatsCardProps {
    title: string;
    value: string | number;
    icon: string;
    color: 'primary' | 'success' | 'warning' | 'danger' | 'info';
    trend?: {
        value: number;
        direction: 'up' | 'down';
        period: string;
    };
    subtitle?: string;
    loading?: boolean;
}
export declare class StatsCard {
    private props;
    constructor(props: StatsCardProps);
    private generateTrendIcon;
    private generateCardContent;
    render(): string;
}
export declare class StatsGrid {
    private cards;
    constructor(cards: StatsCardProps[]);
    render(): string;
}
export declare class StatsCardFactory {
    static createActiveSessionsCard(count: number, trend?: {
        value: number;
        direction: 'up' | 'down';
    }): StatsCardProps;
    static createDailyTransfersCard(count: number, amount: number): StatsCardProps;
    static createErrorsCard(count: number, trend?: {
        value: number;
        direction: 'up' | 'down';
    }): StatsCardProps;
    static createSystemHealthCard(status: 'healthy' | 'warning' | 'critical', uptime: string): StatsCardProps;
}
export default StatsCard;
//# sourceMappingURL=StatsCard.d.ts.map