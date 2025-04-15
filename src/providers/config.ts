/********************************************************* {COPYRIGHT-TOP} ***
 * Licensed Materials - Property of IBM
 *
 * (C) Copyright IBM Corporation 2024
 *
 * All Rights Reserved.
 * US Government Users Restricted Rights - Use, duplication or disclosure
 * restricted by GSA ADP Schedule Contract with IBM Corp.
 ********************************************************** {COPYRIGHT-END} **/
import { Config } from '@backstage/config';
import { IbmApicConfig } from './types';

export function readIbmApicEntityConfigs(config: Config): IbmApicConfig[] {
  const configs: IbmApicConfig[] = [];

  const providerConfigs = config.getOptionalConfigArray(
    'ibm.apic',
  );

  // No config added yet just return an empty config object and do no processing
  if (!providerConfigs) {
    return configs;
  }

  // Read each instance apicConfig added under ibm.apic key
  for (const apicConfig of providerConfigs) {
    configs.push(readIbmApicEntityConfig(apicConfig));
  }

  return configs;
}

function readIbmApicEntityConfig(config: Config): IbmApicConfig {
    const username = config.getOptionalString('username');
    const password = config.getOptionalString('password');
    const apiKey = config.getOptionalString('apiKey');
    const identityProvider = config.getOptionalString('identityProvider')

    if (username && !password) {
      throw new Error("Please provide a password with a username.");
    }

    if (!username && password) {
      throw new Error("Please provide a username with a password.");
    }

    if (!username && !password && !apiKey) {
      throw new Error("Please provide a method of authentication: Username and Password or just an API Key for OIDC Registries.");
    }

    if (username && password && apiKey) {
      throw new Error("Please only provide a Username and Password or just an API Key. Not all three.");
    }

    if (username && password && !identityProvider) {
      throw new Error("Please provide an identityProvider when authenticating with username and password.");
    }

    return {
      'id': config.get('name'),
      'url': config.get('url'),
      'clientId': config.get('clientId'),
      'clientSecret': config.get('clientSecret'),
      'username': username,
      'password': password,
      'identityProvider': identityProvider,
      'apiKey': apiKey,
    };
  }