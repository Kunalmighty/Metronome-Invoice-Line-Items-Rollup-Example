import { END_BEFORE, START_AT, USD_CENTS_CREDIT_TYPE_ID } from "./config.js";

export const CASEWARE_EVENT_TYPE = "ai.agent.request.completed";

export const PRICING_GROUP_KEY = ["region", "model", "tier", "feature"];

export const PRESENTATION_GROUP_KEY = [
  "userId",
  "entityId",
  "product_id",
  "engagement_id",
  "eventType"
];

export const BILLABLE_METRIC_GROUP_KEY = [
  ...PRESENTATION_GROUP_KEY,
  ...PRICING_GROUP_KEY
];

export const REGIONS = ["US1", "CAP1", "EU1", "AP1"];
export const MODELS = ["claude-sonnet-4", "claude-opus-4", "gpt-4.1", "gpt-4.1-mini"];
export const FEATURES = ["verity"];

export const LICENSE_TIERS = [
  {
    key: "starter",
    sku: "Starter",
    targetProfile: "SMB",
    annualCredits: 1_000_000,
    includedSeats: 15
  },
  {
    key: "good",
    sku: "Good",
    targetProfile: "Mid-market",
    annualCredits: 10_000_000,
    includedSeats: 100
  },
  {
    key: "better",
    sku: "Better",
    targetProfile: "Enterprise",
    annualCredits: 50_000_000,
    includedSeats: 250
  },
  {
    key: "best",
    sku: "Best",
    targetProfile: "Strategic accounts",
    annualCredits: 120_000_000,
    includedSeats: 325
  }
];

export const TOKEN_USAGE_PRODUCTS = [
  {
    key: "input",
    aggregationKey: "input_tokens",
    metricName: "Verity Input Tokens",
    productName: "Verity Input Tokens",
    modelBaseCreditsPerThousand: {
      "claude-sonnet-4": 0.75,
      "claude-opus-4": 1.8,
      "gpt-4.1": 0.85,
      "gpt-4.1-mini": 0.25
    }
  },
  {
    key: "output",
    aggregationKey: "output_tokens",
    metricName: "Verity Output Tokens",
    productName: "Verity Output Tokens",
    modelBaseCreditsPerThousand: {
      "claude-sonnet-4": 3.0,
      "claude-opus-4": 7.2,
      "gpt-4.1": 3.4,
      "gpt-4.1-mini": 1.0
    }
  },
  {
    key: "cached_input",
    aggregationKey: "cached_input_tokens",
    metricName: "Verity Cached Input Tokens",
    productName: "Verity Cached Input Tokens",
    modelBaseCreditsPerThousand: {
      "claude-sonnet-4": 0.15,
      "claude-opus-4": 0.36,
      "gpt-4.1": 0.17,
      "gpt-4.1-mini": 0.05
    }
  },
  {
    key: "cached_output",
    aggregationKey: "cached_output_tokens",
    metricName: "Verity Cached Output Tokens",
    productName: "Verity Cached Output Tokens",
    modelBaseCreditsPerThousand: {
      "claude-sonnet-4": 0.6,
      "claude-opus-4": 1.44,
      "gpt-4.1": 0.68,
      "gpt-4.1-mini": 0.2
    }
  }
];

export const SUBSCRIPTION_PRODUCTS = [
  {
    key: "starterSeats",
    name: "Verity Starter Seats",
    annualPriceCents: 12_000
  },
  {
    key: "goodSeats",
    name: "Verity Good Seats",
    annualPriceCents: 24_000
  },
  {
    key: "betterSeats",
    name: "Verity Better Seats",
    annualPriceCents: 48_000
  },
  {
    key: "bestSeats",
    name: "Verity Best Seats",
    annualPriceCents: 72_000
  },
  {
    key: "powerSeats",
    name: "Verity Power User Seats",
    annualPriceCents: 96_000
  }
];

export const COMMIT_PRODUCT = {
  key: "creditPoolCommit",
  name: "Verity Credit Pool Commit"
};

const REGION_MULTIPLIERS = {
  US1: 1.0,
  CAP1: 1.08,
  EU1: 1.12,
  AP1: 1.15
};

const TIER_MULTIPLIERS = {
  starter: 1.1,
  good: 1.0,
  better: 0.95,
  best: 0.9
};

function round(value, decimals = 6) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function seatIds(prefix, names) {
  return names.map((name) => `${prefix}-${name}`);
}

export const CUSTOMER_SCENARIOS = [
  {
    slug: "cedar-audit",
    name: "Cedar Audit LLP",
    ingestAlias: "firm-cedar-audit",
    tierKey: "starter",
    contractModel: "annual_commit",
    seatGroups: [
      {
        key: "starter-standard",
        label: "Starter standard seats",
        subscriptionProductKey: "starterSeats",
        assignedSeatIds: seatIds("cedar", ["admin", "manager", "auditor-a", "auditor-b", "reviewer"]),
        unassignedSeats: 10
      }
    ]
  },
  {
    slug: "northstar-assurance",
    name: "Northstar Assurance",
    ingestAlias: "firm-northstar-assurance",
    tierKey: "good",
    contractModel: "recurring_commit",
    seatGroups: [
      {
        key: "good-standard",
        label: "Good pooled seats",
        subscriptionProductKey: "goodSeats",
        annualCreditShare: 1,
        assignedSeatIds: seatIds("northstar", [
          "admin",
          "audit-lead",
          "senior-a",
          "senior-b",
          "associate-a",
          "associate-b"
        ]),
        unassignedSeats: 94
      }
    ]
  },
  {
    slug: "harborview-advisors",
    name: "Harborview Advisors",
    ingestAlias: "firm-harborview-advisors",
    tierKey: "better",
    contractModel: "recurring_commit",
    seatGroups: [
      {
        key: "better-standard",
        label: "Better standard seats",
        subscriptionProductKey: "betterSeats",
        annualCreditShare: 0.78,
        assignedSeatIds: seatIds("harborview", ["admin", "lead", "senior-a", "senior-b", "associate"]),
        unassignedSeats: 220
      },
      {
        key: "better-power",
        label: "Better power user seats",
        subscriptionProductKey: "powerSeats",
        annualCreditShare: 0.22,
        assignedSeatIds: seatIds("harborview-power", ["reviewer-a", "reviewer-b", "partner"]),
        unassignedSeats: 22
      }
    ]
  },
  {
    slug: "crownpoint-global",
    name: "Crownpoint Global",
    ingestAlias: "firm-crownpoint-global",
    tierKey: "best",
    contractModel: "annual_commit_with_credit",
    complimentaryCredits: 2_000_000,
    seatGroups: [
      {
        key: "best-standard",
        label: "Best strategic seats",
        subscriptionProductKey: "bestSeats",
        assignedSeatIds: seatIds("crownpoint", [
          "admin",
          "global-lead",
          "regional-lead",
          "audit-a",
          "audit-b",
          "audit-c"
        ]),
        unassignedSeats: 294
      },
      {
        key: "best-power",
        label: "Best power user seats",
        subscriptionProductKey: "powerSeats",
        assignedSeatIds: seatIds("crownpoint-power", ["partner-a", "partner-b", "qa-lead", "innovation-lead"]),
        unassignedSeats: 21
      }
    ]
  }
];

export function tierFor(customerScenario) {
  const tier = LICENSE_TIERS.find((item) => item.key === customerScenario.tierKey);
  if (!tier) {
    throw new Error(`No tier definition found for ${customerScenario.tierKey}`);
  }
  return tier;
}

export function buildBillableMetricPayload(metric) {
  const propertyFilters = [
    { name: metric.aggregationKey, exists: true },
    ...PRESENTATION_GROUP_KEY.map((name) => ({ name, exists: true })),
    { name: "region", exists: true, in_values: REGIONS },
    { name: "model", exists: true, in_values: MODELS },
    { name: "tier", exists: true, in_values: LICENSE_TIERS.map((tier) => tier.key) },
    { name: "feature", exists: true, in_values: FEATURES }
  ];

  return {
    name: metric.metricName,
    event_type_filter: {
      in_values: [CASEWARE_EVENT_TYPE]
    },
    property_filters: propertyFilters,
    aggregation_type: "SUM",
    aggregation_key: metric.aggregationKey,
    group_keys: [BILLABLE_METRIC_GROUP_KEY]
  };
}

export function buildUsageProductPayload(metric, billableMetricId) {
  return {
    name: metric.productName,
    type: "USAGE",
    billable_metric_id: billableMetricId,
    pricing_group_key: PRICING_GROUP_KEY,
    presentation_group_key: PRESENTATION_GROUP_KEY,
    quantity_conversion: {
      name: "Tokens to thousands",
      conversion_factor: 1000,
      operation: "divide"
    },
    tags: ["caseware", "verity", "ai-credits"]
  };
}

export function buildSubscriptionProductPayload(product) {
  return {
    name: product.name,
    type: "SUBSCRIPTION",
    tags: ["caseware", "verity", "seats"]
  };
}

export function buildCommitProductPayload() {
  return {
    name: COMMIT_PRODUCT.name,
    type: "FIXED",
    tags: ["caseware", "verity", "commit"]
  };
}

export function buildRatePayloads(productIds, aiCreditTypeId) {
  const usageRates = [];

  for (const metric of TOKEN_USAGE_PRODUCTS) {
    for (const region of REGIONS) {
      for (const model of MODELS) {
        for (const tier of LICENSE_TIERS) {
          for (const feature of FEATURES) {
            usageRates.push({
              product_id: productIds[metric.key],
              starting_at: START_AT,
              entitled: true,
              rate_type: "FLAT",
              price: calculateCreditsPerThousand(metric, { region, model, tierKey: tier.key }),
              credit_type_id: aiCreditTypeId,
              pricing_group_values: {
                region,
                model,
                tier: tier.key,
                feature
              }
            });
          }
        }
      }
    }
  }

  const subscriptionRates = SUBSCRIPTION_PRODUCTS.map((product) => ({
    product_id: productIds[product.key],
    starting_at: START_AT,
    entitled: true,
    rate_type: "FLAT",
    price: product.annualPriceCents,
    credit_type_id: USD_CENTS_CREDIT_TYPE_ID,
    billing_frequency: "ANNUAL"
  }));

  return [...usageRates, ...subscriptionRates];
}

export function buildContractPayload(customerScenario, metronomeCustomerId, rateCardId, productIds, aiCreditTypeId) {
  const tier = tierFor(customerScenario);
  const usageProductIds = TOKEN_USAGE_PRODUCTS.map((metric) => productIds[metric.key]);

  const payload = {
    customer_id: metronomeCustomerId,
    name: `${customerScenario.name} Verity ${tier.sku} Contract`,
    uniqueness_key: `caseware-verity-${customerScenario.slug}-${tier.key}`,
    rate_card_id: rateCardId,
    starting_at: START_AT,
    ending_before: END_BEFORE,
    usage_statement_schedule: {
      frequency: "MONTHLY",
      day: "FIRST_OF_MONTH"
    },
    subscriptions: buildSubscriptions(customerScenario, productIds)
  };

  if (customerScenario.contractModel === "recurring_commit") {
    payload.recurring_commits = buildRecurringCommits(
      customerScenario,
      productIds,
      aiCreditTypeId,
      usageProductIds
    );
  } else {
    payload.commits = [
      buildAnnualCommit(`${tier.sku} Annual Verity Credits`, tier.annualCredits, productIds, aiCreditTypeId, usageProductIds)
    ];
  }

  if (customerScenario.complimentaryCredits) {
    payload.credits = [
      {
        name: "Strategic Migration Credits",
        product_id: productIds[COMMIT_PRODUCT.key],
        access_schedule: {
          credit_type_id: aiCreditTypeId,
          schedule_items: [
            {
              amount: customerScenario.complimentaryCredits,
              starting_at: START_AT,
              ending_before: END_BEFORE
            }
          ]
        },
        priority: 50,
        applicable_product_ids: usageProductIds,
        rate_type: "LIST_RATE",
        rollover_fraction: 0
      }
    ];
  }

  return payload;
}

export function buildCustomerPayload(customerScenario) {
  const tier = tierFor(customerScenario);
  return {
    name: customerScenario.name,
    ingest_aliases: [customerScenario.ingestAlias]
  };
}

export function buildUsageEvents() {
  const eventTemplates = [
    {
      timestamp: "2026-06-01T09:15:00.000Z",
      region: "CAP1",
      model: "claude-sonnet-4",
      productId: "template4",
      engagement: "planning",
      input: 180_000,
      output: 72_000,
      cachedInput: 24_000,
      cachedOutput: 6_000
    },
    {
      timestamp: "2026-06-02T12:25:00.000Z",
      region: "US1",
      model: "gpt-4.1",
      productId: "template-review",
      engagement: "risk-review",
      input: 240_000,
      output: 96_000,
      cachedInput: 42_000,
      cachedOutput: 10_000
    },
    {
      timestamp: "2026-06-03T16:40:00.000Z",
      region: "EU1",
      model: "claude-opus-4",
      productId: "template-analytics",
      engagement: "analytics",
      input: 125_000,
      output: 66_000,
      cachedInput: 18_000,
      cachedOutput: 5_000
    },
    {
      timestamp: "2026-06-04T10:05:00.000Z",
      region: "AP1",
      model: "gpt-4.1-mini",
      productId: "template-chat",
      engagement: "chat-assist",
      input: 310_000,
      output: 88_000,
      cachedInput: 64_000,
      cachedOutput: 14_000
    },
    {
      timestamp: "2026-06-05T14:35:00.000Z",
      region: "CAP1",
      model: "gpt-4.1",
      productId: "template-disclosure",
      engagement: "disclosure",
      input: 210_000,
      output: 115_000,
      cachedInput: 38_000,
      cachedOutput: 11_000
    },
    {
      timestamp: "2026-06-06T18:20:00.000Z",
      region: "US1",
      model: "claude-sonnet-4",
      productId: "template4",
      engagement: "fieldwork",
      input: 375_000,
      output: 140_000,
      cachedInput: 72_000,
      cachedOutput: 16_000
    },
    {
      timestamp: "2026-06-07T21:10:00.000Z",
      region: "EU1",
      model: "gpt-4.1-mini",
      productId: "template-close",
      engagement: "closeout",
      input: 195_000,
      output: 82_000,
      cachedInput: 30_000,
      cachedOutput: 8_000
    }
  ];

  const dayNames = ["one", "two", "three", "four", "five", "six", "seven"];
  const events = [];

  for (const customerScenario of CUSTOMER_SCENARIOS) {
    const tier = tierFor(customerScenario);
    const assignedSeats = customerScenario.seatGroups.flatMap((group) => group.assignedSeatIds);

    eventTemplates.forEach((template, index) => {
      const userId = assignedSeats[index % assignedSeats.length];
      events.push({
        transaction_id: `caseware-${customerScenario.slug}-june-day-${dayNames[index]}`,
        customer_id: customerScenario.ingestAlias,
        event_type: CASEWARE_EVENT_TYPE,
        timestamp: template.timestamp,
        properties: {
          userId,
          eventType: CASEWARE_EVENT_TYPE,
          feature: "verity",
          region: template.region,
          input_tokens: template.input,
          output_tokens: template.output,
          cached_input_tokens: template.cachedInput,
          cached_output_tokens: template.cachedOutput,
          model: template.model,
          tier: tier.key,
          entityId: userId,
          product_id: template.productId,
          engagement_id: `${customerScenario.slug}-${template.engagement}`,
          durationSeconds: 1500 + index * 420,
          cpuPercentage: round(0.42 + index * 0.037, 3)
        }
      });
    });
  }

  return events;
}

function buildSubscriptions(customerScenario, productIds) {
  return customerScenario.seatGroups.map((group) => ({
    temporary_id: subscriptionTemporaryId(customerScenario, group),
    name: `${customerScenario.name} ${group.label}`,
    description: "Seat-based Verity subscription for assigned firm users.",
    subscription_rate: {
      product_id: productIds[group.subscriptionProductKey],
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
      initial_seat_ids: group.assignedSeatIds,
      initial_unassigned_seats: group.unassignedSeats
    }
  }));
}

function buildRecurringCommits(customerScenario, productIds, aiCreditTypeId, usageProductIds) {
  const tier = tierFor(customerScenario);

  return customerScenario.seatGroups.map((group, index) => {
    const totalSeats = group.assignedSeatIds.length + group.unassignedSeats;
    const annualCreditsForGroup = tier.annualCredits * (group.annualCreditShare ?? 1);
    const monthlyCreditsPerSeat = annualCreditsForGroup / 12 / totalSeats;

    return {
      name: `${customerScenario.name} ${group.label} Monthly Credits`,
      product_id: productIds[COMMIT_PRODUCT.key],
      access_amount: {
        unit_price: round(monthlyCreditsPerSeat, 4),
        credit_type_id: aiCreditTypeId
      },
      priority: 100 + index,
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
        subscription_id: subscriptionTemporaryId(customerScenario, group),
        allocation: "POOLED",
        apply_seat_increase_config: {
          is_prorated: true
        }
      }
    };
  });
}

function buildAnnualCommit(name, amount, productIds, aiCreditTypeId, usageProductIds) {
  return {
    type: "PREPAID",
    name,
    product_id: productIds[COMMIT_PRODUCT.key],
    access_schedule: {
      credit_type_id: aiCreditTypeId,
      schedule_items: [
        {
          amount,
          starting_at: START_AT,
          ending_before: END_BEFORE
        }
      ]
    },
    priority: 100,
    applicable_product_ids: usageProductIds,
    rate_type: "LIST_RATE",
    rollover_fraction: 0
  };
}

function subscriptionTemporaryId(customerScenario, group) {
  return `${customerScenario.slug}-${group.key}-subscription`;
}

function calculateCreditsPerThousand(metric, { region, model, tierKey }) {
  const base = metric.modelBaseCreditsPerThousand[model];
  return round(base * REGION_MULTIPLIERS[region] * TIER_MULTIPLIERS[tierKey]);
}
