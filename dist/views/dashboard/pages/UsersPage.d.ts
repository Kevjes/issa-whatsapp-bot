export interface UsersPageData {
    stats: {
        total: number;
        active: number;
        inactive: number;
        newToday: number;
    };
    users: any[];
    chartData: {
        registrations: any;
        activity: any;
        devices: any;
    };
}
export declare class UsersPage {
    private layout;
    private usersTable;
    constructor();
    private createUsersTable;
    render(data: UsersPageData): string;
    private getPageScripts;
}
export default UsersPage;
//# sourceMappingURL=UsersPage.d.ts.map