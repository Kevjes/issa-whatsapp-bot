import { DatabaseService } from '../services/databaseService';
export declare class DatabaseSeeder {
    private databaseService;
    constructor(databaseService: DatabaseService);
    seedTestData(): Promise<void>;
    clearTestData(): Promise<void>;
}
//# sourceMappingURL=seedDatabase.d.ts.map