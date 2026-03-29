"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { dismissPublicBookingFailureSignal } from "@/domain/provider-dashboard-signals";
import { csrfOk, loadProviderContext } from "@/actions/_guard";

export async function dismissPublicBookingFailureSignalAction(formData: FormData): Promise<void> {
  if (!(await csrfOk(formData, { action: "dismissPublicBookingFailureSignalAction" }))) return;
  const ctx = await loadProviderContext();
  await dismissPublicBookingFailureSignal(getDb(), ctx.providerId);
  revalidatePath("/dashboard");
}
