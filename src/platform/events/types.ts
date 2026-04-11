import type { PlatformEventActor } from "@/platform/enums";

/**
 * Versioned payload envelope for domain events. Extend `name` and `payload` as the platform grows.
 * Naming: `aggregate.action` (e.g. `booking.created`).
 */
export type PlatformEventName =
  | "booking.created"
  | "booking.public_submit_failed"
  | "booking.updated"
  | "booking.cancelled"
  | "provider.updated"
  | "service.created"
  | "service.updated"
  | "customer.upserted"
  | "availability.rule.saved"
  | "availability.rule.deleted"
  | "availability.block.created"
  | "availability.block.deleted"
  | "onboarding.identity_completed"
  | "onboarding.first_service_created"
  | "onboarding.availability_completed"
  | "onboarding.customer_added"
  | "onboarding.share_prompt_viewed"
  | "onboarding.completed";

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
    /** Tip % of subtotal at booking; "0.00" when none. */
    tipPercent: string;
  };
  "booking.public_submit_failed": {
    providerId: string;
    serviceId: string;
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
  "onboarding.identity_completed": {
    providerId: string;
  };
  "onboarding.first_service_created": {
    providerId: string;
    serviceId: string;
  };
  "onboarding.availability_completed": {
    providerId: string;
  };
  "onboarding.customer_added": {
    providerId: string;
    customerId: string;
  };
  "onboarding.share_prompt_viewed": {
    providerId: string;
  };
  "onboarding.completed": {
    providerId: string;
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
