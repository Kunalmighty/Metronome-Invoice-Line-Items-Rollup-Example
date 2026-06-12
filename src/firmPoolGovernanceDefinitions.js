import {
  END_BEFORE,
  START_AT,
  VERITY_CREDITS_CREDIT_TYPE_ID
} from "./config.js";
import {
  CASEWARE_EVENT_TYPE,
  COMMIT_PRODUCT,
  TOKEN_USAGE_PRODUCTS
} from "./definitions.js";

export const FIRM_POOL_GOVERNANCE_CUSTOMER = {
  name: "Caseware Firm Pool Governance Labs",
  ingestAlias: "firm-caseware-firm-pool-governance",
  contractName: "Caseware Firm Pool Verity Governance Contract",
  contractUniquenessKey: "caseware-firm-pool-verity-governance-contract",
  tier: "good",
  annualFirmPoolCredits: 25000,
  monthlyUserLimits: [
    {
      userId: "pool-admin",
      monthlyLimitCredits: 3000,
      role: "Firm administrator"
    },
    {
      userId: "pool-manager",
      monthlyLimitCredits: 4500,
      role: "Audit manager"
    },
    {
      userId: "pool-senior",
      monthlyLimitCredits: 2500,
      role: "Senior auditor"
    },
    {
      userId: "pool-associate",
      monthlyLimitCredits: 1500,
      role: "Associate auditor"
    }
  ]
};

export function buildFirmPoolCustomerPayload() {
  return {
    name: FIRM_POOL_GOVERNANCE_CUSTOMER.name,
    ingest_aliases: [FIRM_POOL_GOVERNANCE_CUSTOMER.ingestAlias]
  };
}

export function buildFirmPoolContractPayload(customerId, rateCardId, productIds) {
  const usageProductIds = TOKEN_USAGE_PRODUCTS.map((metric) => productIds[metric.key]);

  return {
    customer_id: customerId,
    name: FIRM_POOL_GOVERNANCE_CUSTOMER.contractName,
    uniqueness_key: FIRM_POOL_GOVERNANCE_CUSTOMER.contractUniquenessKey,
    rate_card_id: rateCardId,
    starting_at: START_AT,
    ending_before: END_BEFORE,
    usage_statement_schedule: {
      frequency: "MONTHLY",
      day: "FIRST_OF_MONTH"
    },
    commits: [
      {
        type: "PREPAID",
        name: "Annual Firm Verity Credit Pool",
        description:
          "Purchased firm-level pool. User monthly draw limits are governed outside Metronome before usage events are sent.",
        product_id: productIds[COMMIT_PRODUCT.key],
        access_schedule: {
          credit_type_id: VERITY_CREDITS_CREDIT_TYPE_ID,
          schedule_items: [
            {
              amount: FIRM_POOL_GOVERNANCE_CUSTOMER.annualFirmPoolCredits,
              starting_at: START_AT,
              ending_before: END_BEFORE
            }
          ]
        },
        priority: 1,
        applicable_product_ids: usageProductIds,
        rate_type: "LIST_RATE",
        rollover_fraction: 0
      }
    ]
  };
}

export function buildFirmPoolUsageEvents() {
  const templates = [
    {
      word: "one",
      timestamp: "2026-06-01T09:05:00.000Z",
      userId: "pool-manager",
      engagement: "planning",
      input: 180_000,
      output: 72_000,
      cachedInput: 24_000,
      cachedOutput: 6_000
    },
    {
      word: "two",
      timestamp: "2026-06-02T11:30:00.000Z",
      userId: "pool-senior",
      engagement: "risk-review",
      input: 220_000,
      output: 92_000,
      cachedInput: 42_000,
      cachedOutput: 10_000
    },
    {
      word: "three",
      timestamp: "2026-06-03T15:45:00.000Z",
      userId: "pool-admin",
      engagement: "governance-review",
      input: 145_000,
      output: 58_000,
      cachedInput: 18_000,
      cachedOutput: 5_000
    },
    {
      word: "four",
      timestamp: "2026-06-04T10:20:00.000Z",
      userId: "pool-associate",
      engagement: "fieldwork",
      input: 160_000,
      output: 65_000,
      cachedInput: 32_000,
      cachedOutput: 8_000
    },
    {
      word: "five",
      timestamp: "2026-06-05T14:10:00.000Z",
      userId: "pool-manager",
      engagement: "analytics",
      input: 260_000,
      output: 118_000,
      cachedInput: 48_000,
      cachedOutput: 12_000
    },
    {
      word: "six",
      timestamp: "2026-06-06T17:25:00.000Z",
      userId: "pool-senior",
      engagement: "closeout",
      input: 190_000,
      output: 84_000,
      cachedInput: 35_000,
      cachedOutput: 9_000
    },
    {
      word: "seven",
      timestamp: "2026-06-07T20:05:00.000Z",
      userId: "pool-admin",
      engagement: "firm-dashboard",
      input: 125_000,
      output: 55_000,
      cachedInput: 22_000,
      cachedOutput: 6_000
    }
  ];

  return templates.map((template) => {
    const userLimit = FIRM_POOL_GOVERNANCE_CUSTOMER.monthlyUserLimits.find(
      (limit) => limit.userId === template.userId
    );

    return {
      transaction_id: `caseware-firm-pool-governance-june-${template.word}`,
      customer_id: FIRM_POOL_GOVERNANCE_CUSTOMER.ingestAlias,
      event_type: CASEWARE_EVENT_TYPE,
      timestamp: template.timestamp,
      properties: {
        userId: template.userId,
        entityId: template.userId,
        product_id: "firm-pool-governance-workspace",
        engagement_id: `firm-pool-${template.engagement}`,
        eventType: CASEWARE_EVENT_TYPE,
        region: "CAP1",
        model: "claude-sonnet-4",
        tier: FIRM_POOL_GOVERNANCE_CUSTOMER.tier,
        feature: "verity",
        input_tokens: template.input,
        output_tokens: template.output,
        cached_input_tokens: template.cachedInput,
        cached_output_tokens: template.cachedOutput,
        governance_pool: "annual-firm-pool",
        governance_limit_period: "2026-06",
        governance_policy: "app-enforced-monthly-user-limit",
        monthly_user_limit_credits: userLimit?.monthlyLimitCredits ?? null,
        monthly_user_limit_role: userLimit?.role ?? null
      }
    };
  });
}
