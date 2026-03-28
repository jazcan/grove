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
  "booking.reschedule": {
    id: "booking.reschedule",
    description: "Move a booking to a new start time (provider).",
    aggregate: "booking",
    emits: ["booking.updated"],
  },
  "booking.update_payment": {
    id: "booking.update_payment",
    description: "Update booking payment fields.",
    aggregate: "booking",
    emits: ["booking.updated"],
  },
  "booking.update_notes": {
    id: "booking.update_notes",
    description: "Update provider internal notes on a booking.",
    aggregate: "booking",
    emits: ["booking.updated"],
  },
  "availability.upsert_rule": {
    id: "availability.upsert_rule",
    description: "Create or update weekly availability windows.",
    aggregate: "availability",
    emits: ["availability.rule.saved"],
  },
  "availability.delete_rule": {
    id: "availability.delete_rule",
    description: "Delete a weekly availability rule.",
    aggregate: "availability",
    emits: ["availability.rule.deleted"],
  },
  "availability.add_block": {
    id: "availability.add_block",
    description: "Add blocked time on the calendar.",
    aggregate: "availability",
    emits: ["availability.block.created"],
  },
  "availability.delete_block": {
    id: "availability.delete_block",
    description: "Remove a blocked time.",
    aggregate: "availability",
    emits: ["availability.block.deleted"],
  },
  "pricing.update_profile": {
    id: "pricing.update_profile",
    description: "Update provider pricing profile (currency, name).",
    aggregate: "pricing",
    emits: [],
  },
  "pricing.update_tiers": {
    id: "pricing.update_tiers",
    description: "Update positioning tier labels and multipliers.",
    aggregate: "pricing",
    emits: [],
  },
  "pricing.add_on_override": {
    id: "pricing.add_on_override",
    description: "Override template add-on price or availability per service.",
    aggregate: "pricing",
    emits: [],
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
