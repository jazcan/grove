import type { PlatformEventActor } from "@/platform/enums";

/**
 * Versioned payload envelope for domain events. Extend `name` and `payload` as the platform grows.
 * Naming: `aggregate.action` (e.g. `booking.created`).
 */
export type PlatformEventName =
  | "booking.created"
  | "booking.updated"
  | "booking.cancelled"
  | "provider.updated"
  | "service.created"
  | "service.updated"
  | "customer.upserted"
  | "availability.rule.saved"
  | "availability.rule.deleted"
  | "availability.block.created"
  | "availability.block.deleted";

export type PlatformEventPayloads = {
  "booking.created": {
    bookingId: string;
    publicReference: string;
    providerId: string;
    serviceId: string;
    customerId: string;
    startsAt: string;
    endsAt: string;
    /** From service / booking snapshot; null for legacy services without a template link. */
    canonicalTemplateId: string | null;
    positioningTierId: string | null;
    selectedAddOnIds: string[];
    paymentAmount: string | null;
  };
  "booking.updated": {
    bookingId: string;
    providerId: string;
    patch: Record<string, unknown>;
  };
  "booking.cancelled": {
    bookingId: string;
    providerId: string;
    reason?: string;
  };
  "provider.updated": {
    providerId: string;
    patch: Record<string, unknown>;
  };
  "service.created": {
    serviceId: string;
    providerId: string;
    canonicalTemplateId: string | null;
    canonicalTemplateVersion: number | null;
  };
  "service.updated": {
    serviceId: string;
    providerId: string;
    patch: Record<string, unknown>;
  };
  "customer.upserted": {
    customerId: string;
    providerId: string;
  };
  "availability.rule.saved": {
    providerId: string;
    ruleId: string;
    dayOfWeek: number;
  };
  "availability.rule.deleted": {
    providerId: string;
    ruleId: string;
  };
  "availability.block.created": {
    providerId: string;
    blockId: string;
  };
  "availability.block.deleted": {
    providerId: string;
    blockId: string;
  };
};

export type PlatformEventEnvelope<N extends PlatformEventName = PlatformEventName> = {
  name: N;
  aggregateType: string;
  aggregateId: string;
  payload: N extends keyof PlatformEventPayloads ? PlatformEventPayloads[N] : Record<string, unknown>;
  occurredAt: Date;
  tenantProviderId: string | null;
  actorUserId: string | null;
  actorType: PlatformEventActor;
  correlationId: string | null;
  causationEventId: string | null;
  schemaVersion: number;
};
