/********************************************************* {COPYRIGHT-TOP} ***
 * Licensed Materials - Property of IBM
 *
 * (C) Copyright IBM Corporation 2024
 *
 * All Rights Reserved.
 * US Government Users Restricted Rights - Use, duplication or disclosure
 * restricted by GSA ADP Schedule Contract with IBM Corp.
 ********************************************************** {COPYRIGHT-END} **/
import type { Entity } from "@backstage/catalog-model";

export class Org {
  org_type!: string;
  api_version!: string;
  id!: string;
  name!: string;
  title?: string;
  state!: string;
  owner_url!: string;
  created_at!: string;
  updated_at!: string;
  org_url!: string;
  catalog_url!: string;
  url!: string;
}

export class Catalog {
  api_version?: string;
  id?: string;
  name?: string;
  title?: string;
  owner_url?: string;
  created_at?: string;
  updated_at?: string;
  org_url?: string;
  url?: string;
}

export class Product {
  type!: string;
  api_version!: string;
  id!: string;
  name!: string;
  version!: string;
  title?: string;
  state!: string;
  scope!: string;
  gateway_types?: string[];
  gateway_service_urls?: string[];
  visibility?: ProductVisibility;
  api_urls?: string[];
  apiList?: Api[];
  plans?: ProductPlan[];
  oauth_provider_urls?: string[];
  billing_urls?: string[];
  org_url!: string;
  catalog_url!: string;
  url!: string;
}
export class ProductPlan {
  apis!: Api[];
  name!: string;
  title?: string;
}

export class ProductEnabledType {
  type!: string;
  enabled!: boolean;
}

class ProductVisibility {
  view?: ProductEnabledType;
  subscribe?: ProductEnabledType;
}

export interface ProductEntity extends Entity {
  apiVersion: 'ibm.com/v1beta1';
  kind: 'Product';
  spec: {
    type: string;
    lifecycle: string;
    owner: string;
    subcomponentOf?: string;
    providesApis?: string[];
    consumesApis?: string[];
    dependsOn?: string[];
    system?: string;
    plans: {
      name: string,
      title: string,
      apis: {
        id: string,
        url: string,
        name: string,
        title: string,
        version: string,
      }[]
    }[]
  };
}

export class Api {
  swagger?: string
  api_type?: string;
  api_version?: string;
  id!: string;
  name!: string;
  version!: string;
  title?: string;
  state?: string;
  scope?: string;
  gateway_type?: string;
  oai_version?: string;
  document_specification?: string;
  base_paths?: string[];
  enforced?: boolean;
  gateway_service_urls?: string[];
  user_registry_urls?: string[];
  oauth_provider_urls?: string[];
  tls_client_profile_urls?: string[];
  extension_urls?: string[];
  policy_urls?: string[];
  created_at?: string;
  updated_at?: string;
  org_url!: string;
  catalog_url!: string;
  url!: string;
}
