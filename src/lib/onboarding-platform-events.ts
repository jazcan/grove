import type { Database } from "@/db";
import type { PlatformEventActor } from "@/platform/enums";
import { emitPlatformEvent } from "@/platform/events/emit";

type ActorCtx = {
  providerId: string;
  userId: string;
  actorType: PlatformEventActor;
};

export async function emitOnboardingIdentityCompleted(db: Database, ctx: ActorCtx): Promise<void> {
  await emitPlatformEvent(
    {
      name: "onboarding.identity_completed",
      aggregateType: "provider",
      aggregateId: ctx.providerId,
      tenantProviderId: ctx.providerId,
      actorUserId: ctx.userId,
      actorType: ctx.actorType,
      payload: { providerId: ctx.providerId },
    },
    db
  );
}

export async function emitOnboardingFirstServiceCreated(
  db: Database,
  ctx: ActorCtx,
  serviceId: string
): Promise<void> {
  await emitPlatformEvent(
    {
      name: "onboarding.first_service_created",
      aggregateType: "service",
      aggregateId: serviceId,
      tenantProviderId: ctx.providerId,
      actorUserId: ctx.userId,
      actorType: ctx.actorType,
      payload: { providerId: ctx.providerId, serviceId },
    },
    db
  );
}

export async function emitOnboardingAvailabilityCompleted(db: Database, ctx: ActorCtx): Promise<void> {
  await emitPlatformEvent(
    {
      name: "onboarding.availability_completed",
      aggregateType: "provider",
      aggregateId: ctx.providerId,
      tenantProviderId: ctx.providerId,
      actorUserId: ctx.userId,
      actorType: ctx.actorType,
      payload: { providerId: ctx.providerId },
    },
    db
  );
}

export async function emitOnboardingCustomerAdded(
  db: Database,
  ctx: ActorCtx,
  customerId: string
): Promise<void> {
  await emitPlatformEvent(
    {
      name: "onboarding.customer_added",
      aggregateType: "customer",
      aggregateId: customerId,
      tenantProviderId: ctx.providerId,
      actorUserId: ctx.userId,
      actorType: ctx.actorType,
      payload: { providerId: ctx.providerId, customerId },
    },
    db
  );
}

export async function emitOnboardingSharePromptViewed(db: Database, ctx: ActorCtx): Promise<void> {
  await emitPlatformEvent(
    {
      name: "onboarding.share_prompt_viewed",
      aggregateType: "provider",
      aggregateId: ctx.providerId,
      tenantProviderId: ctx.providerId,
      actorUserId: ctx.userId,
      actorType: ctx.actorType,
      payload: { providerId: ctx.providerId },
    },
    db
  );
}

export async function emitOnboardingCompleted(db: Database, ctx: ActorCtx): Promise<void> {
  await emitPlatformEvent(
    {
      name: "onboarding.completed",
      aggregateType: "provider",
      aggregateId: ctx.providerId,
      tenantProviderId: ctx.providerId,
      actorUserId: ctx.userId,
      actorType: ctx.actorType,
      payload: { providerId: ctx.providerId },
    },
    db
  );
}
