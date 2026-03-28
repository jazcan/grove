import { z } from "zod";
import {
  BOOKING_STATUSES,
  PAYMENT_STATUSES,
  PRICING_TYPES,
  USER_ROLES,
} from "@/platform/enums";

/** UUID string (entity ids across the platform). */
export const idSchema = z.string().uuid();

export const userRoleSchema = z.enum(USER_ROLES);

export const bookingStatusSchema = z.enum(BOOKING_STATUSES);

export const paymentStatusSchema = z.enum(PAYMENT_STATUSES);

export const pricingTypeSchema = z.enum(PRICING_TYPES);

/** Core user shape for validation and cross-layer contracts (not every DB column). */
export const userCoreSchema = z.object({
  id: idSchema,
  email: z.string().email().max(320),
  role: userRoleSchema,
  emailVerifiedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type UserCore = z.infer<typeof userCoreSchema>;

export const providerCoreSchema = z.object({
  id: idSchema,
  userId: idSchema,
  username: z.string().min(1).max(64),
  displayName: z.string().min(1).max(200),
  timezone: z.string().min(1).max(64),
  publicProfileEnabled: z.boolean(),
  discoverable: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ProviderCore = z.infer<typeof providerCoreSchema>;

export const serviceCoreSchema = z.object({
  id: idSchema,
  providerId: idSchema,
  name: z.string().min(1).max(200),
  durationMinutes: z.number().int().positive(),
  pricingType: pricingTypeSchema,
  priceAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().min(1).max(8),
  bufferMinutes: z.number().int().min(0),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ServiceCore = z.infer<typeof serviceCoreSchema>;

export const customerCoreSchema = z.object({
  id: idSchema,
  providerId: idSchema,
  fullName: z.string().min(1).max(200),
  email: z.string().email().max(320),
  emailNormalized: z.string().min(1).max(320),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CustomerCore = z.infer<typeof customerCoreSchema>;

export const bookingCoreSchema = z.object({
  id: idSchema,
  publicReference: idSchema,
  providerId: idSchema,
  serviceId: idSchema,
  customerId: idSchema,
  startsAt: z.date(),
  endsAt: z.date(),
  status: bookingStatusSchema,
  paymentStatus: paymentStatusSchema,
  bufferAfterMinutes: z.number().int().min(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type BookingCore = z.infer<typeof bookingCoreSchema>;
