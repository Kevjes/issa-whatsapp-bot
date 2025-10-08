export interface TransfersPageData {
    stats: {
        total: number;
        pending: number;
        completed: number;
        failed: number;
        totalAmount: number;
        averageAmount: number;
    };
    transfers: any[];
    chartData: {
        hourly: any;
        status: any;
        amounts: any;
    };
}
export declare class TransfersPage {
    private transfersTable;
    constructor();
    render(data: TransfersPageData): string;
    private getPageScripts;
}
export default TransfersPage;
//# sourceMappingURL=TransfersPage.d.ts.map