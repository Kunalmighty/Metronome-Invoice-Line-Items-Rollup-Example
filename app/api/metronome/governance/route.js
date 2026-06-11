import { loadGovernanceContext } from "../../../../lib/governance.js";
import { errorResponse, jsonResponse } from "../../../../lib/metronome.js";
import {
  GOVERNANCE_ALLOCATION,
  GOVERNANCE_CUSTOMER
} from "../../../../src/governanceDefinitions.js";

export async function GET() {
  try {
    const context = await loadGovernanceContext();

    return jsonResponse({
      ...context,
      model: {
        customerName: GOVERNANCE_CUSTOMER.name,
        ingestAlias: GOVERNANCE_CUSTOMER.ingestAlias,
        seatIds: GOVERNANCE_CUSTOMER.seatIds,
        userMonthlyCreditsPerSeat: GOVERNANCE_ALLOCATION.userMonthlyCreditsPerSeat,
        pooledMonthlyCreditsPerSeat: GOVERNANCE_ALLOCATION.pooledMonthlyCreditsPerSeat,
        defaultEffectiveAt: GOVERNANCE_ALLOCATION.effectiveOverrideAt,
        defaultEndingBefore: GOVERNANCE_ALLOCATION.firstPeriodEndingBefore
      }
    });
  } catch (error) {
    return errorResponse(error);
  }
}
