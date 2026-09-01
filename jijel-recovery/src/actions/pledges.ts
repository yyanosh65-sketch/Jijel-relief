"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import {
  needs,
  pledgeStatusEnum,
  pledges,
  type NeedStatus,
  type Pledge,
} from "@/db/schema";
import type { ActionResult } from "@/lib/types";

const createPledgeSchema = z.object({
  needId: z.coerce
    .number()
    .int("Need ID must be a whole number")
    .positive("Need ID is required"),
  contributorName: z.string().trim().min(1, "Contributor name is required"),
  contributorContact: z.string().trim().optional(),
  quantity: z.coerce
    .number()
    .int("Quantity must be a whole number")
    .positive("Quantity must be greater than zero"),
  notes: z.string().trim().optional(),
  status: z.enum(pledgeStatusEnum.enumValues).optional(),
});

export type CreatePledgeInput = z.infer<typeof createPledgeSchema>;

export type PledgeWithNeed = Pledge & {
  need: {
    id: number;
    quantityNeeded: number;
    quantityFulfilled: number;
    status: NeedStatus;
  };
};

function resolveNeedStatus(
  quantityNeeded: number,
  quantityFulfilled: number,
): NeedStatus {
  if (quantityFulfilled >= quantityNeeded) {
    return "fulfilled";
  }

  if (quantityFulfilled > 0) {
    return "partial";
  }

  return "open";
}

function revalidatePledgePaths(): void {
  revalidatePath("/");
  revalidatePath("/needs");
  revalidatePath("/map");
}

export async function createPledge(
  data: CreatePledgeInput,
): Promise<ActionResult<PledgeWithNeed>> {
  try {
    const parsed = createPledgeSchema.safeParse(data);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        success: false,
        error: firstIssue?.message ?? "Invalid pledge data",
      };
    }

    const input = parsed.data;

    const result = await db.transaction(async (tx) => {
      const need = await tx.query.needs.findFirst({
        where: eq(needs.id, input.needId),
      });

      if (!need) {
        throw new Error("NEED_NOT_FOUND");
      }

      if (need.status === "closed") {
        throw new Error("NEED_CLOSED");
      }

      const remainingQuantity = need.quantityNeeded - need.quantityFulfilled;

      if (input.quantity > remainingQuantity) {
        throw new Error("QUANTITY_EXCEEDS_REMAINING");
      }

      const [pledge] = await tx
        .insert(pledges)
        .values({
          needId: input.needId,
          contributorName: input.contributorName,
          contributorContact: input.contributorContact ?? null,
          quantity: input.quantity,
          notes: input.notes ?? null,
          status: input.status ?? "pending",
        })
        .returning();

      const nextQuantityFulfilled = need.quantityFulfilled + input.quantity;
      const nextStatus = resolveNeedStatus(
        need.quantityNeeded,
        nextQuantityFulfilled,
      );

      const [updatedNeed] = await tx
        .update(needs)
        .set({
          quantityFulfilled: nextQuantityFulfilled,
          status: nextStatus,
          updatedAt: new Date(),
        })
        .where(eq(needs.id, input.needId))
        .returning({
          id: needs.id,
          quantityNeeded: needs.quantityNeeded,
          quantityFulfilled: needs.quantityFulfilled,
          status: needs.status,
        });

      return {
        ...pledge,
        need: updatedNeed,
      };
    });

    revalidatePledgePaths();

    return { success: true, data: result };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NEED_NOT_FOUND") {
        return { success: false, error: "Need not found." };
      }

      if (error.message === "NEED_CLOSED") {
        return { success: false, error: "This need is closed and cannot receive pledges." };
      }

      if (error.message === "QUANTITY_EXCEEDS_REMAINING") {
        return {
          success: false,
          error: "Pledge quantity exceeds the remaining need.",
        };
      }
    }

    console.error("createPledge error:", error);
    return {
      success: false,
      error: "Failed to create pledge. Please try again.",
    };
  }
}
