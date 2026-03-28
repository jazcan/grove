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
  | "customer.upserted";

export type PlatformEventPayloads = {
  "booking.created": {
    bookingId: string;
    publicReference: string;
    providerId: string;
    serviceId: string;
    customerId: string;
    startsAt: string;
    endsAt: string;
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
