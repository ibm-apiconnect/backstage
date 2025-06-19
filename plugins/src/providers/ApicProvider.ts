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
import type {
  EntityProvider,
  EntityProviderConnection,
} from '@backstage/plugin-catalog-node';

import { readIbmApicEntityConfigs } from './config.js';
import type { CacheService, SchedulerServiceTaskRunner, LoggerService } from '@backstage/backend-plugin-api';
import type { ProductEntity } from '../lib/types.js';

import type {
  ApiEntity,
  SystemEntity
} from '@backstage/catalog-model';
import { collectAPIEntities, collectCatalogEntities, collectOrgEntities, collectProductEntities, createAPICDomain, createInstanceDomain } from '../lib/ApicDataCollector.js';

export class ApicProvider implements EntityProvider {
  private cache: CacheService;
  private config: Config;
  private env: string;

  private readonly logger: LoggerService;

  private connection?: EntityProviderConnection;
  private readonly scheduleFn: () => Promise<void>;

  /** [1] */
  constructor(config: Config, logger: LoggerService, taskRunner: SchedulerServiceTaskRunner, cache: CacheService) {
    this.config = config;
    this.env = 'apic';

    logger.debug(this.getProviderName())

    this.logger = logger.child({
      target: this.getProviderName(),
    });
    this.scheduleFn = this.createScheduleFn(taskRunner);
    this.cache = cache;
  }

  private createScheduleFn(taskRunner: SchedulerServiceTaskRunner): () => Promise<void> {
    return async () => {
      const taskId = `${this.getProviderName()}:run`;
      return taskRunner.run({
        id: taskId,
        fn: async () => {
          try {
            await this.run();
          } catch (error: any) {
            this.logger.error(error);
          }
        },
      });
    };
  }

  getProviderName(): string {
    return `ibm:apic`;
  }

  async connect(connection: EntityProviderConnection): Promise<void> {
    this.connection = connection;
    await this.scheduleFn();
  }

  async run(): Promise<void> {
    this.logger.info('Running Scheduled APIC Provider Code')

    const apicConfigs = readIbmApicEntityConfigs(this.config)

    if (!this.connection) {
      throw new Error('Not initialized')
    }
    let allResults: any[] = []

    for (const config of apicConfigs) {
      this.logger.info('Running with ' + config.id)
      const orgEntities = await collectOrgEntities(config, this.logger, this.cache)

      let catalogEntities: SystemEntity[] = []
      let productEntities: ProductEntity[] = []
      let apiEntities: ApiEntity[] = []
      for (const orgEntity of orgEntities) {
        const orgName = orgEntity.metadata.name
        const nextCatalogEntities = await collectCatalogEntities(config, this.logger, this.cache, orgName)
        for (const catalogEntity of nextCatalogEntities) {
          apiEntities = [...apiEntities, ...await collectAPIEntities(config, this.logger, this.cache, orgName, catalogEntity.metadata.name)]
          productEntities = [...productEntities, ...await collectProductEntities(config, this.logger, this.cache, orgName, catalogEntity.metadata.name)]
        }
        catalogEntities = [...catalogEntities, ...nextCatalogEntities]
      }

      const results = [createAPICDomain(), createInstanceDomain(config.id), ...orgEntities, ...apiEntities, ...catalogEntities, ...productEntities]
      allResults = [...allResults, ...results]
      this.logger.debug(JSON.stringify(results, null, 2))
    }

    await this.connection.applyMutation({
      type: 'full',
      entities: allResults.map(entity => {
        return {
          entity: entity,
          locationKey: `${this.env}:default`
        }
      })
    })
  }
}
