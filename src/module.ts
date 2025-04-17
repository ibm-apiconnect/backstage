/********************************************************* {COPYRIGHT-TOP} ***
 * Licensed Materials - Property of IBM
 *
 * (C) Copyright IBM Corporation 2024
 *
 * All Rights Reserved.
 * US Government Users Restricted Rights - Use, duplication or disclosure
 * restricted by GSA ADP Schedule Contract with IBM Corp.
 ********************************************************** {COPYRIGHT-END} **/
import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';

import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node/alpha';
import { ApicProvider } from './providers/ApicProvider.js';
import { ProductProcessor } from './processors/ProductProcessor.js';

export const ibmModuleApic = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'apic',
  register(reg) {
    reg.registerInit({
      deps: {
        catalog: catalogProcessingExtensionPoint,
        config: coreServices.rootConfig,
        logger: coreServices.logger,
        scheduler: coreServices.scheduler,
        cache: coreServices.cache
      },
      async init({ catalog, config, logger, scheduler, cache }) {
        logger.info('Registering IBM APIC Provider Module')
        const taskRunner = config.get('ibm.schedule') !== undefined ? scheduler!.createScheduledTaskRunner({ frequency: { cron: config.get('ibm.schedule')}, timeout: { seconds: 30 }}) : scheduler.createScheduledTaskRunner({ frequency: { minutes: 5 }, timeout: { seconds: 30 }});

        catalog.addProcessor(new ProductProcessor())
        catalog.addEntityProvider(new ApicProvider(
          config,
          logger,
          taskRunner,
          cache,
        )
        )
      },
    });
  },
});
