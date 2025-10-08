import { DashboardUser } from '../../../types/dashboard';
export interface DashboardLayoutProps {
    user: DashboardUser;
    currentPage: string;
    children: string;
    sidebarCollapsed?: boolean;
}
export declare class DashboardLayout {
    private props;
    constructor(props: DashboardLayoutProps);
    private generateSidebar;
    private generateTopbar;
    private generateMainContent;
    render(): string;
}
export default DashboardLayout;
//# sourceMappingURL=DashboardLayout.d.ts.map