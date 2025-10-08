export interface TableFilter {
    key: string;
    label: string;
    type: 'text' | 'select' | 'date';
    options?: {
        value: string;
        label: string;
    }[];
}
export interface TableColumn {
    key: string;
    label: string;
    sortable?: boolean;
    filterable?: boolean;
    type?: 'text' | 'number' | 'date' | 'boolean' | 'badge' | 'actions';
    width?: string;
    align?: 'left' | 'center' | 'right';
    formatter?: (value: any, row: any) => string;
}
export interface TableAction {
    id: string;
    label: string;
    icon: string;
    color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
    onClick: string;
    condition?: (row: any) => boolean;
}
export interface DataTableProps {
    id: string;
    title: string;
    columns: TableColumn[];
    data: any[];
    actions?: TableAction[];
    pagination?: {
        page: number;
        limit: number;
        total: number;
    };
    filters?: TableFilter[];
    searchable?: boolean;
    exportable?: boolean;
    loading?: boolean;
    error?: string;
    emptyMessage?: string;
    enabled?: boolean;
}
export declare class DataTable {
    private props;
    constructor(props: DataTableProps);
    private generateTableHeader;
    private formatCellValue;
    private getBadgeClass;
    private generateRowActions;
    private generateTableBody;
    private generateToolbar;
    private generatePagination;
    render(): string;
}
export declare class DataTableFactory {
    static createLogsTable(data: any[], pagination?: any): DataTableProps;
    static createSessionsTable(data: any[], pagination?: any): DataTableProps;
    static createTransfersTable(data: any[], pagination?: any): DataTableProps;
}
export default DataTable;
//# sourceMappingURL=DataTable.d.ts.map