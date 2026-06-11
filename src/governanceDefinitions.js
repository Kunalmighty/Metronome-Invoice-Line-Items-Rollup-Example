import { END_BEFORE, START_AT, VERITY_CREDITS_CREDIT_TYPE_ID } from "./config.js";
import {
  CASEWARE_EVENT_TYPE,
  COMMIT_PRODUCT,
  SUBSCRIPTION_PRODUCTS,
  TOKEN_USAGE_PRODUCTS
} from "./definitions.js";

export const GOVERNANCE_CUSTOMER = {
  name: "Caseware Governance Labs",
  ingestAlias: "firm-caseware-governance-labs",
  contractName: "Caseware Governance Labs Verity Governance Contract",
  contractUniquenessKey: "caseware-verity-governance-labs-contract",
  tier: "good",
  subscriptionTemporaryId: "caseware_governance_annual_seats",
  seatProductKey: "goodSeats",
  seatIds: ["gov-admin", "gov-standard", "gov-power"]
};

export const GOVERNANCE_ALLOCATION = {
  userMonthlyCreditsPerSeat: 900,
  pooledMonthlyCreditsPerSeat: 1500,
  effectiveOverrideAt: "2026-06-10T00:00:00.000Z",
  firstPeriodEndingBefore: "2026-07-01T00:00:00.000Z"
};

export function buildGovernanceCustomerPayload() {
  return {
    name: GOVERNANCE_CUSTOMER.name,
    ingest_aliases: [GOVERNANCE_CUSTOMER.ingestAlias]
  };
}

export function buildGovernanceContractPayload(customerId, rateCardId, productIds) {
  const usageProductIds = TOKEN_USAGE_PRODUCTS.map((metric) => productIds[metric.key]);
  const seatProduct = SUBSCRIPTION_PRODUCTS.find((product) => product.key === GOVERNANCE_CUSTOMER.seatProductKey);

  if (!seatProduct) {
    throw new Error(`Missing seat product definition for ${GOVERNANCE_CUSTOMER.seatProductKey}.`);
  }

  return {
    customer_id: customerId,
    name: GOVERNANCE_CUSTOMER.contractName,
    uniqueness_key: GOVERNANCE_CUSTOMER.contractUniquenessKey,
    rate_card_id: rateCardId,
    starting_at: START_AT,
    ending_before: END_BEFORE,
    usage_statement_schedule: {
      frequency: "MONTHLY",
      day: "FIRST_OF_MONTH"
    },
    subscriptions: [
      {
        temporary_id: GOVERNANCE_CUSTOMER.subscriptionTemporaryId,
        name: "Verity Governance Annual Seats",
        description: "Seat-based subscription used for per-user and pooled governance entitlement periods.",
        subscription_rate: {
          product_id: productIds[seatProduct.key],
          billing_frequency: "ANNUAL"
        },
        collection_schedule: "ADVANCE",
        proration: {
          is_prorated: true,
          invoice_behavior: "BILL_ON_NEXT_COLLECTION_DATE"
        },
        starting_at: START_AT,
        ending_before: END_BEFORE,
        quantity_management_mode: "SEAT_BASED",
        seat_config: {
          seat_group_key: "userId",
          initial_seat_ids: GOVERNANCE_CUSTOMER.seatIds,
          initial_unassigned_seats: 0
        }
      }
    ],
    recurring_credits: [
      {
        name: "Monthly User Verity Credits",
        product_id: productIds[COMMIT_PRODUCT.key],
        access_amount: {
          credit_type_id: VERITY_CREDITS_CREDIT_TYPE_ID,
          unit_price: GOVERNANCE_ALLOCATION.userMonthlyCreditsPerSeat
        },
        priority: 1,
        applicable_product_ids: usageProductIds,
        rate_type: "LIST_RATE",
        starting_at: START_AT,
        ending_before: END_BEFORE,
        commit_duration: {
          value: 1,
          unit: "PERIODS"
        },
        recurrence_frequency: "MONTHLY",
        proration: "NONE",
        rollover_fraction: 0,
        subscription_config: {
          subscription_id: GOVERNANCE_CUSTOMER.subscriptionTemporaryId,
          allocation: "INDIVIDUAL",
          apply_seat_increase_config: {
            is_prorated: true
          }
        }
      },
      {
        name: "Monthly Pooled Overflow Verity Credits",
        product_id: productIds[COMMIT_PRODUCT.key],
        access_amount: {
          credit_type_id: VERITY_CREDITS_CREDIT_TYPE_ID,
          unit_price: GOVERNANCE_ALLOCATION.pooledMonthlyCreditsPerSeat
        },
        priority: 2,
        applicable_product_ids: usageProductIds,
        rate_type: "LIST_RATE",
        starting_at: START_AT,
        ending_before: END_BEFORE,
        commit_duration: {
          value: 1,
          unit: "PERIODS"
        },
        recurrence_frequency: "MONTHLY",
        proration: "NONE",
        rollover_fraction: 0,
        subscription_config: {
          subscription_id: GOVERNANCE_CUSTOMER.subscriptionTemporaryId,
          allocation: "POOLED",
          apply_seat_increase_config: {
            is_prorated: true
          }
        }
      }
    ]
  };
}

export function buildGovernanceOverrideCredit({ productIds, userId, amount, startingAt, endingBefore }) {
  const usageProductIds = TOKEN_USAGE_PRODUCTS.map((metric) => productIds[metric.key]);
  const adjustmentType = Number(amount) < 0 ? "Deduction" : "Addition";

  return {
    name: `User Allocation ${adjustmentType} - ${userId}`,
    product_id: productIds[COMMIT_PRODUCT.key],
    access_schedule: {
      credit_type_id: VERITY_CREDITS_CREDIT_TYPE_ID,
      schedule_items: [
        {
          amount,
          starting_at: startingAt,
          ending_before: endingBefore
        }
      ]
    },
    priority: 1,
    rate_type: "LIST_RATE",
    rollover_fraction: 0,
    specifiers: usageProductIds.map((productId) => ({
      product_id: productId,
      presentation_group_values: {
        userId
      }
    }))
  };
}

export function buildGovernanceUsageEvents() {
  const templates = [
    {
      word: "one",
      timestamp: "2026-06-01T09:30:00.000Z",
      userId: "gov-standard",
      engagement: "risk-planning",
      input: 620_000,
      output: 260_000,
      cachedInput: 90_000,
      cachedOutput: 30_000
    },
    {
      word: "two",
      timestamp: "2026-06-02T13:10:00.000Z",
      userId: "gov-power",
      engagement: "analytics-review",
      input: 380_000,
      output: 160_000,
      cachedInput: 72_000,
      cachedOutput: 20_000
    },
    {
      word: "three",
      timestamp: "2026-06-03T16:05:00.000Z",
      userId: "gov-admin",
      engagement: "admin-review",
      input: 210_000,
      output: 86_000,
      cachedInput: 38_000,
      cachedOutput: 12_000
    },
    {
      word: "four",
      timestamp: "2026-06-05T11:45:00.000Z",
      userId: "gov-standard",
      engagement: "substantive-testing",
      input: 740_000,
      output: 310_000,
      cachedInput: 120_000,
      cachedOutput: 40_000
    },
    {
      word: "five",
      timestamp: "2026-06-07T15:20:00.000Z",
      userId: "gov-power",
      engagement: "closeout",
      input: 540_000,
      output: 225_000,
      cachedInput: 84_000,
      cachedOutput: 25_000
    }
  ];

  return templates.map((template) => ({
    transaction_id: `caseware-governance-june-${template.word}`,
    customer_id: GOVERNANCE_CUSTOMER.ingestAlias,
    event_type: CASEWARE_EVENT_TYPE,
    timestamp: template.timestamp,
    properties: {
      userId: template.userId,
      entityId: template.userId,
      product_id: "governance-workspace",
      engagement_id: `governance-${template.engagement}`,
      eventType: CASEWARE_EVENT_TYPE,
      region: "CAP1",
      model: "claude-sonnet-4",
      tier: GOVERNANCE_CUSTOMER.tier,
      feature: "verity",
      input_tokens: template.input,
      output_tokens: template.output,
      cached_input_tokens: template.cachedInput,
      cached_output_tokens: template.cachedOutput
    }
  }));
}
