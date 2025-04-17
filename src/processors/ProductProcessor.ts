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
    type CatalogProcessor,
    type CatalogProcessorCache,
    type CatalogProcessorEmit,
    type EntityRelationSpec,
    processingResult,
} from "@backstage/plugin-catalog-node";
import type { LocationSpec } from "@backstage/plugin-catalog-common";
import {
    type CompoundEntityRef,
    type Entity,
    getCompoundEntityRef,
    parseEntityRef, RELATION_API_PROVIDED_BY,
    RELATION_OWNED_BY,
    RELATION_OWNER_OF, RELATION_PROVIDES_API,
} from "@backstage/catalog-model";
import type { ProductEntity } from "../lib/types.js";

export class ProductProcessor implements CatalogProcessor {
    getProcessorName(): string {
        return "ProductProcessor";
    }

    validateEntityKind(entity: Entity): Promise<boolean> {
        return Promise.resolve(entity.kind === "Product")
    }

    async postProcessEntity(entity: Entity, _location: LocationSpec, emit: CatalogProcessorEmit, _cache: CatalogProcessorCache): Promise<Entity> {
        if (entity.kind === "Product") {
            let productEntity = entity as ProductEntity
            let productEntityRef = getCompoundEntityRef(productEntity)
            let productOwnerEntityRef = parseEntityRef(productEntity.spec.owner);

            await this.processRelation(RELATION_OWNED_BY, emit, productEntityRef, productOwnerEntityRef);
            await this.processRelation(RELATION_OWNER_OF, emit, productOwnerEntityRef, productEntityRef);

            if (productEntity.spec.providesApis) {
                for (let providedAPI of productEntity.spec.providesApis) {
                    await this.processRelation(RELATION_PROVIDES_API, emit, productEntityRef, parseEntityRef(`api:${providedAPI}`));
                    await this.processRelation(RELATION_API_PROVIDED_BY, emit, parseEntityRef(`api:${providedAPI}`), productEntityRef);
                }
            }
        }

        return entity;
    }

    async processRelation(type: string, emit: CatalogProcessorEmit, source: CompoundEntityRef, target: CompoundEntityRef) {
        emit(processingResult.relation({
            type: type,
            source: source,
            target: target,
        } as EntityRelationSpec));
    }


}
