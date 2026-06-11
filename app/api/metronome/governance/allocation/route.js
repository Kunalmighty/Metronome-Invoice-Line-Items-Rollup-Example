import { createUserAllocationOverride } from "../../../../../lib/governance.js";
import { errorResponse, jsonResponse } from "../../../../../lib/metronome.js";

export async function POST(request) {
  try {
    const body = await request.json();
    const result = await createUserAllocationOverride({
      userId: body.userId,
      amount: body.amount,
      effectiveAt: body.effectiveAt,
      endingBefore: body.endingBefore
    });

    return jsonResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
