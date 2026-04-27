/********************************************************* {COPYRIGHT-TOP} ***
 * Licensed Materials - Property of IBM
 *
 * (C) Copyright IBM Corporation 2024
 *
 * All Rights Reserved.
 * US Government Users Restricted Rights - Use, duplication or disclosure
 * restricted by GSA ADP Schedule Contract with IBM Corp.
 ********************************************************** {COPYRIGHT-END} **/
import type { Config } from '@backstage/config';
import type { EntityProvider, EntityProviderConnection } from '@backstage/plugin-catalog-node';
import type { CacheService, SchedulerServiceTaskRunner, LoggerService } from '@backstage/backend-plugin-api';
export declare class ApicProvider implements EntityProvider {
    private cache;
    private config;
    private env;
    private readonly logger;
    private connection?;
    private readonly scheduleFn;
    /** [1] */
    constructor(config: Config, logger: LoggerService, taskRunner: SchedulerServiceTaskRunner, cache: CacheService);
    private createScheduleFn;
    getProviderName(): string;
    connect(connection: EntityProviderConnection): Promise<void>;
    run(): Promise<void>;
}
