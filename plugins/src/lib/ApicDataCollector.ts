/********************************************************* {COPYRIGHT-TOP} ***
 * Licensed Materials - Property of IBM
 *
 * (C) Copyright IBM Corporation 2024
 *
 * All Rights Reserved.
 * US Government Users Restricted Rights - Use, duplication or disclosure
 * restricted by GSA ADP Schedule Contract with IBM Corp.
 ********************************************************** {COPYRIGHT-END} **/
import * as https from 'https';
import type { IbmApicConfig } from '../providers/types.js';
import fetch from 'node-fetch';
import type { CacheService, LoggerService } from '@backstage/backend-plugin-api';
import { Api, Catalog, Org, Product, type ProductEntity } from '../lib/types.js';

import {
    ANNOTATION_SOURCE_LOCATION,
    type ApiEntity,
    ANNOTATION_LOCATION,
    ANNOTATION_ORIGIN_LOCATION,
    type DomainEntity,
    type SystemEntity,
    type EntityLink
} from '@backstage/catalog-model';

const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
});

function extractIdFromUrl(url?: string) {
    return url?.slice(url?.lastIndexOf('/') + 1, url?.length);
}

function getProviderName(config: IbmApicConfig): string {
    return `apic:${config.id}`;
}

async function getAPICToken(config: IbmApicConfig, logger: LoggerService, cache: CacheService) {
    const providerName = getProviderName(config)
    let token = await cache.get(`${providerName}:access-token`)
    if (!token) {
        const url: string = `${config.url}/token`;
        let postBody
        if (config.apiKey) {
            postBody = `{"api_key":"${config.apiKey}","client_id":"${config.clientId}","client_secret":"${config.clientSecret}","grant_type":"api_key"}`
        } else {
            postBody = `{"client_id":"${config.clientId}","client_secret":"${config.clientSecret}","grant_type":"password","password":"${config.password}","realm":"provider/${config.identityProvider}","username":"${config.username}"}`
        }
        const tokenResponse = await fetch(url, {
            agent: httpsAgent,
            method: 'POST',
            headers: {
                'User-Agent': 'catalog-backend-module-apic',
                'X-Ibm-Client-Id': `${config.clientId}`,
                'X-Ibm-Client-Secret': `${config.clientSecret}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: postBody,
        })
        .then((response: any) => {
            if (!response.ok) {
                logger.debug(JSON.stringify(response, null, 2));
                throw new Error(`Error while fetching services on APIC, code: ${response.status}`);
            }
            const responseBody = response.json()
            logger.debug(JSON.stringify(responseBody, null, 2))
            return responseBody
        }).catch((error: any) => {
            logger.error(error);
        });

        logger.debug(JSON.stringify(tokenResponse, null, 2))
        await cache.set(`${providerName}:access-token`, tokenResponse.access_token)
        token = tokenResponse.access_token
        await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
        logger.debug('Retrieving stored access token')
    }

    return token
}

export function createAPICDomain(): DomainEntity {
    return {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Domain',
        metadata: {
            id: 'apic',
            name: 'APIC-Instances',
            title: 'APIC Instances',
            uid: 'apic',
            annotations: {
                [ANNOTATION_SOURCE_LOCATION]: `apic:default`,
                [ANNOTATION_LOCATION]: `apic:default`,
                [ANNOTATION_ORIGIN_LOCATION]: `apic:default`,
            }
        },
        spec: {
            owner: 'default/apic',
        },
    } as DomainEntity;
}

export function createInstanceDomain(env: string): DomainEntity {
    return {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Domain',
        metadata: {
            id: `${env}`,
            name: `${env}`,
            title: `${env}`,
            uid: `${env}`,
            annotations: {
                [ANNOTATION_SOURCE_LOCATION]: `${env}:default`,
                [ANNOTATION_LOCATION]: `${env}:default`,
                [ANNOTATION_ORIGIN_LOCATION]: `${env}:default`,
            }
        },
        spec: {
            owner: 'default/apic',
            subdomainOf: `domain:default/APIC-Instances`
        },
    } as DomainEntity;
}

function convertOrgToDomainEntity(org: Org, env: string): DomainEntity {
    return {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Domain',
        metadata: {
            namespace: `${env}`,
            id: org.id,
            name: org.name,
            title: org.title,
            uid: org.id,
            annotations: {
                [ANNOTATION_SOURCE_LOCATION]: `${env}:${org.url}`,
                [ANNOTATION_LOCATION]: `${env}:default`,
                [ANNOTATION_ORIGIN_LOCATION]: `${env}:default`,
            }
        },
        spec: {
            owner: `${extractIdFromUrl(org.owner_url)}`,
            subdomainOf: `domain:default/${env}`
        },
    } as DomainEntity;
}

function covertCatalogToSystemEntity(catalog: Catalog, orgName: string, env: string): SystemEntity {
    return {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'System',
        spec: {
            owner: `${extractIdFromUrl(catalog.owner_url)}`,
            domain: `${orgName}`
        },
        metadata: {
            namespace: `${env}`,
            name: catalog.name,
            title: catalog.title,
            id: catalog.id,
            annotations: {
                [ANNOTATION_SOURCE_LOCATION]: `${env}:${catalog.url}`,
                [ANNOTATION_LOCATION]: `${env}:default`,
                [ANNOTATION_ORIGIN_LOCATION]: `${env}:default`
            }
        }
    } as SystemEntity
}

function convertProductToProductEntity(product: Product, catalogName: string, env: string, portalEndpoint: string): ProductEntity {
    let productEntity = {
        apiVersion: 'ibm.com/v1beta1',
        kind: 'Product',
        metadata: {
            namespace: `${env}-${catalogName}`,
            id: product.id,
            // name is set to id as name has maximum of 63 chars
            name: product.id,
            title: product.title,
            description: `Product retrieved from ${env} APIC Instance.`,
            annotations: {
                [`${env}/orgId`]: `${extractIdFromUrl(product.org_url)}`,
                [`${env}/catalogId`]: `${extractIdFromUrl(product.catalog_url)}`,
                [`${env}/productName`]: product.name,
                [ANNOTATION_SOURCE_LOCATION]: `${env}:${product.url}`,
                [ANNOTATION_LOCATION]: `${env}:default`,
                [ANNOTATION_ORIGIN_LOCATION]: `${env}:default`,
            },
        },
        spec: {
            type: 'product',
            lifecycle: product.state,
            owner: `system:${env}/${catalogName}`,
            plans: product.plans?.map(p => {
                return p
            })
        },
    } as ProductEntity;

    productEntity.spec.providesApis = productEntity.spec.plans.flatMap(p => {
        return p.apis.map(
            a => `${productEntity.metadata.namespace}/${a.name}_${a.version}`,
        );
    });

    let apiLinks = productEntity.spec.plans.flatMap(p => {
        return p.apis.map(
            a => { return {
                url: `${portalEndpoint}/product/${product.name}:${product.version}/api/${a.name}:${a.version}`,
                title: `${a.name}:${a.version}`,
                icon: 'api'
            }
        },
        ) as EntityLink[];
    });

    productEntity.metadata.links = [...new Map(apiLinks.map(item => [item['title'], item])).values()];

    return productEntity;
}

function convertToAPIEntity(api: Api, apiDocument: string, catalogName: string, env: string, apiLink: string): ApiEntity {
    let apiEntity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'API',
        metadata: {
            namespace: `${env}-${catalogName}`,
            id: `${api.id}`,
            name: `${api.name}_${api.version}`,
            title: `${api.title} ${api.version}`,
            description: api.name,
            annotations: {
                [`${env}/orgId`]: `${extractIdFromUrl(api.org_url)}`,
                [`${env}/catalogId`]: `${extractIdFromUrl(api.catalog_url)}`,
                [ANNOTATION_SOURCE_LOCATION]: `${env}:${api.url}`,
                [ANNOTATION_LOCATION]: `${env}:default`,
                [ANNOTATION_ORIGIN_LOCATION]: `${env}:default`,
            },
            tags: extractTagsFromApiDocument(apiDocument),
        },
        spec: {
            type: api.document_specification?.startsWith('openapi') ? 'openapi' : '',
            lifecycle: api.state,
            owner: `system:${env}/${catalogName}`,
            definition: apiDocument,
            system: `${env}/${catalogName}`
        },
    } as ApiEntity;

    if (apiLink != '') {
        apiEntity.metadata.links = [{
            url: `${apiLink}`,
            title: `Link to API - ${api.name}:${api.version}`,
            icon: 'api'
        }]
    }

    return apiEntity
}

export function extractTagsFromApiDocument(apiDocument: string): string[] {
    const parsedDocument = JSON.parse(apiDocument)
    let apiTags = []
    if (parsedDocument.hasOwnProperty('tags')) {
        for (const tag of parsedDocument.tags) {
            // Convert to lowercase as backstage does not support capitals in tags
            apiTags.push(tag.name.toLowerCase())
        }
    }
    if (parsedDocument.hasOwnProperty('x-tagGroups')) {
        for (const tagGroup of parsedDocument['x-tagGroups']) {
            // Convert to lowercase as backstage does not support capitals in tags
            var convertedTags = tagGroup.tags.map((v: string) => v.toLowerCase());
            apiTags = [...apiTags, ...convertedTags]
        }
    }
    return apiTags
}

export async function collectAPIEntities(config: IbmApicConfig, logger: LoggerService, cache: CacheService, orgName: string, catalogName: string): Promise<ApiEntity[]> {
    const apiUrl: string = `${config.url}/catalogs/${orgName}/${catalogName}/apis`;
    logger.debug(apiUrl)
    const apiResponse = await fetch(apiUrl, {
        agent: httpsAgent,
        method: 'GET',
        headers: {
            'User-Agent': 'catalog-backend-module-apic',
            'X-Ibm-Client-Id': `${config.clientId}`,
            'X-Ibm-Client-Secret': `${config.clientSecret}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await getAPICToken(config, logger, cache)}`
        },
    })
    .then((response: any) => {
        if (!response.ok) {
            logger.debug(JSON.stringify(response, null, 2));
            throw new Error(`Error while fetching services on APIC, code: ${response.status}`);
        }
        const responseBody = response.json()
        logger.debug(JSON.stringify(responseBody, null, 2))
        return responseBody
    }).catch((error: any) => {
        logger.error(error);
    });

    const apis: Api[] = JSON.parse(JSON.stringify(apiResponse.results, null, 2)) as Api[]

    const apiEntities = await Promise.all(apis.map(async api => {
        const apiDocument = await collectAPIDocument(config, logger, cache, orgName, catalogName, api.name, api.version)
        const portalEndpoint = await getPortalEndpoint(config, logger, cache, orgName, catalogName)
        let apiLink = ''
        if (portalEndpoint !== '') {
            apiLink = `${portalEndpoint}/productselect/${api.name}:${api.version}`
        }
        return convertToAPIEntity(api, apiDocument, catalogName, config.id, apiLink);
    }));

    return apiEntities
}

export async function collectAPIDocument(config: IbmApicConfig, logger: LoggerService, cache: CacheService, orgName: string, catalogName: string, apiName: string, apiVersion: string): Promise<string> {
    const apiDocumentUrl: string = `${config.url}/catalogs/${orgName}/${catalogName}/apis/${apiName}/${apiVersion}/document`;
    const apiDocumentResponse = await fetch(apiDocumentUrl, {
        agent: httpsAgent,
        method: 'GET',
        headers: {
            'User-Agent': 'catalog-backend-module-apic',
            'X-Ibm-Client-Id': `${config.clientId}`,
            'X-Ibm-Client-Secret': `${config.clientSecret}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await getAPICToken(config, logger, cache)}`
        },
    })
    .then((response: any) => {
        if (!response.ok) {
            logger.debug(JSON.stringify(response, null, 2));
            throw new Error(`Error while fetching services on APIC, code: ${response.status}`);
        }
        const responseBody = response.json()
        logger.debug(JSON.stringify(responseBody, null, 2))
        return responseBody
    }).catch((error: any) => {
        logger.error(error);
    });

    return JSON.stringify(apiDocumentResponse, null, 2)
}

export async function collectCatalogEntities(config: IbmApicConfig, logger: LoggerService, cache: CacheService, orgName: string): Promise<SystemEntity[]> {
    // catalogs
    const catalogUrl: string = `${config.url}/orgs/${orgName}/catalogs`;
    logger.debug(catalogUrl)
    const catalogsResponse = await fetch(catalogUrl, {
        agent: httpsAgent,
        method: 'GET',
        headers: {
            'User-Agent': 'catalog-backend-module-apic',
            'X-Ibm-Client-Id': `${config.clientId}`,
            'X-Ibm-Client-Secret': `${config.clientSecret}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await getAPICToken(config, logger, cache)}`
        },
    })
    .then((response: any) => {
        if (!response.ok) {
            logger.debug(JSON.stringify(response, null, 2));
            throw new Error(`Error while fetching catalogs on APIC, code: ${response.status}`);
        }
        const responseBody = response.json()
        logger.debug(JSON.stringify(responseBody, null, 2))
        return responseBody
    }).catch((error: any) => {
        logger.error(error);
    });

    const catalogs: Array<Catalog> = catalogsResponse.results
    const nextCatalogEntities = catalogs.map(catalog => {
        return covertCatalogToSystemEntity(catalog, orgName, config.id)
    })

    return nextCatalogEntities
}

export async function collectProductEntities(config: IbmApicConfig, logger: LoggerService, cache: CacheService, orgName: string, catalogName: string): Promise<ProductEntity[]> {
    const productUrl: string = `${config.url}/catalogs/${orgName}/${catalogName}/products`;
    const productResponse = await fetch(productUrl, {
        agent: httpsAgent,
        method: 'GET',
        headers: {
            'User-Agent': 'catalog-backend-module-apic',
            'X-Ibm-Client-Id': `${config.clientId}`,
            'X-Ibm-Client-Secret': `${config.clientSecret}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await getAPICToken(config, logger, cache)}`
        },
    })
    .then((response: any) => {
        if (!response.ok) {
            logger.debug(JSON.stringify(response, null, 2));
            throw new Error(`Error while fetching services on APIC, code: ${response.status}`);
        }
        const responseBody = response.json()
        logger.debug(JSON.stringify(responseBody, null, 2))
        return responseBody
    }).catch((error: any) => {
        logger.error(error);
    });

    const products: Product[] = JSON.parse(JSON.stringify(productResponse.results, null, 2)) as Product[]
    const portalEndpoint = `${await getPortalEndpoint(config, logger, cache, orgName, catalogName)}`

    const nextProductEntities = products.map(product => {
        return convertProductToProductEntity(product, catalogName, config.id, portalEndpoint);
    });

    return nextProductEntities;
}

export async function collectOrgEntities(config: IbmApicConfig, logger: LoggerService, cache: CacheService): Promise<DomainEntity[]> {
    const orgsUrl: string = `${config.url}/orgs`;
    const orgsResponse = await fetch(orgsUrl, {
        agent: httpsAgent,
        method: 'GET',
        headers: {
            'User-Agent': 'catalog-backend-module-apic',
            'X-Ibm-Client-Id': `${config.clientId}`,
            'X-Ibm-Client-Secret': `${config.clientSecret}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await getAPICToken(config, logger, cache)}`
        },
    })
    .then((response: any) => {
        if (!response.ok) {
            logger.debug(JSON.stringify(response, null, 2));
            throw new Error(`Error while fetching services on APIC, code: ${response.status}`);
        }
        const responseBody = response.json()
        logger.debug(JSON.stringify(responseBody, null, 2))
        return responseBody
    }).catch((error: any) => {
        logger.error(error);
    });

    const orgs: Org[] = JSON.parse(JSON.stringify(orgsResponse.results, null, 2)) as Org[]

    const orgEntities = orgs.map(org => {
        return convertOrgToDomainEntity(org, config.id);
    });

    return orgEntities
}

export async function getPortalEndpoint(config: IbmApicConfig, logger: LoggerService, cache: CacheService, orgName: string, catalogName: string) {
    const providerName = getProviderName(config)
    let portalEndpoint = await cache.get(`${providerName}:portal-endpoint-${orgName}-${catalogName}`)
    if (!portalEndpoint) {
        const settingsUrl: string = `${config.url}/catalogs/${orgName}/${catalogName}/settings`;
        const settingsResponse = await fetch(settingsUrl, {
            agent: httpsAgent,
            method: 'GET',
            headers: {
                'User-Agent': 'catalog-backend-module-apic',
                'X-Ibm-Client-Id': `${config.clientId}`,
                'X-Ibm-Client-Secret': `${config.clientSecret}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await getAPICToken(config, logger, cache)}`
            },
        })
        .then((response: any) => {
            if (!response.ok) {
                logger.debug(JSON.stringify(response, null, 2));
                throw new Error(`Error while fetching services on APIC, code: ${response.status}`);
            }
            const responseBody = response.json()
            logger.debug(JSON.stringify(responseBody, null, 2))
            return responseBody
        }).catch((error: any) => {
            logger.error(error);
        });
        logger.debug(settingsResponse)
        portalEndpoint = settingsResponse.portal.endpoint ?? ''
        if (portalEndpoint != '') {
            await cache.set(`${providerName}:portal-endpoint`, settingsResponse.portal.endpoint)
        } else {
            await cache.set(`${providerName}:portal-endpoint`, '')
        }

    } else {
        logger.debug(`Retrieving stored Portal endpoint ${portalEndpoint}`)
    }

    return portalEndpoint
}
