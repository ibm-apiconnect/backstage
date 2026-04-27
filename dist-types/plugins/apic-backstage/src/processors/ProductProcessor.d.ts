/********************************************************* {COPYRIGHT-TOP} ***
 * Licensed Materials - Property of IBM
 *
 * (C) Copyright IBM Corporation 2024
 *
 * All Rights Reserved.
 * US Government Users Restricted Rights - Use, duplication or disclosure
 * restricted by GSA ADP Schedule Contract with IBM Corp.
 ********************************************************** {COPYRIGHT-END} **/
import { type CatalogProcessor, type CatalogProcessorCache, type CatalogProcessorEmit } from "@backstage/plugin-catalog-node";
import type { LocationSpec } from "@backstage/plugin-catalog-common";
import { type CompoundEntityRef, type Entity } from "@backstage/catalog-model";
export declare class ProductProcessor implements CatalogProcessor {
    getProcessorName(): string;
    validateEntityKind(entity: Entity): Promise<boolean>;
    postProcessEntity(entity: Entity, _location: LocationSpec, emit: CatalogProcessorEmit, _cache: CatalogProcessorCache): Promise<Entity>;
    processRelation(type: string, emit: CatalogProcessorEmit, source: CompoundEntityRef, target: CompoundEntityRef): Promise<void>;
}
