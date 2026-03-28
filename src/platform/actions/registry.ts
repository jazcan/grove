import type { PlatformActionDefinition, PlatformActionId } from "@/platform/actions/types";

/**
 * Canonical catalog of platform mutations. Server actions and domain functions should map to these ids
 * so automation, AI, and audits stay aligned.
 */
export const PLATFORM_ACTION_REGISTRY: Record<PlatformActionId, PlatformActionDefinition> = {
  "auth.signup": {
    id: "auth.signup",
    description: "Create a user account (and provider row when applicable).",
    aggregate: "user",
    emits: [],
  },
  "auth.login": {
    id: "auth.login",
    description: "Establish an authenticated session.",
    aggregate: "user",
    emits: [],
  },
  "booking.create": {
    id: "booking.create",
    description: "Create a booking for a service and customer.",
    aggregate: "booking",
    emits: ["booking.created"],
  },
  "booking.update_status": {
    id: "booking.update_status",
    description: "Change booking lifecycle state.",
    aggregate: "booking",
    emits: ["booking.updated", "booking.cancelled"],
  },
  "service.create": {
    id: "service.create",
    description: "Create an offerable service for a provider.",
    aggregate: "service",
    emits: ["service.created"],
  },
  "service.update": {
    id: "service.update",
    description: "Update service fields.",
    aggregate: "service",
    emits: ["service.updated"],
  },
  "provider.update_profile": {
    id: "provider.update_profile",
    description: "Update provider profile and discovery settings.",
    aggregate: "provider",
    emits: ["provider.updated"],
  },
  "customer.upsert": {
    id: "customer.upsert",
    description: "Create or update a customer record for a provider.",
    aggregate: "customer",
    emits: ["customer.upserted"],
  },
};

export function getPlatformAction(id: PlatformActionId): PlatformActionDefinition {
  return PLATFORM_ACTION_REGISTRY[id];
}

export const PLATFORM_ACTION_IDS = Object.keys(PLATFORM_ACTION_REGISTRY) as PlatformActionId[];
