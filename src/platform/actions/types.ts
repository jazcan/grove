import type { PlatformEventName } from "@/platform/events/types";

export type PlatformActionId =
  | "auth.signup"
  | "auth.login"
  | "booking.create"
  | "booking.update_status"
  | "service.create"
  | "service.update"
  | "provider.update_profile"
  | "customer.upsert";

export type PlatformActionDefinition = {
  id: PlatformActionId;
  description: string;
  aggregate: string;
  /** Events this action is expected to emit on success (documentation + static checks later). */
  emits: readonly PlatformEventName[];
};

export type ActionRunContext = {
  actorUserId: string | null;
  tenantProviderId: string | null;
};
