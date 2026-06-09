import {
  CREDIT_TYPE_NAME_CANDIDATES,
  END_BEFORE,
  METRONOME_API_BASE_URL,
  METRONOME_BEARER_TOKEN,
  RATE_CARD_ALIAS,
  RATE_CARD_NAME,
  START_AT,
  VERITY_CREDITS_CREDIT_TYPE_ID
} from "./config.js";
import {
  buildBillableMetricPayload,
  buildCommitProductPayload,
  buildContractPayload,
  buildCustomerPayload,
  buildRatePayloads,
  buildSubscriptionProductPayload,
  buildUsageEvents,
  buildUsageProductPayload,
  COMMIT_PRODUCT,
  CUSTOMER_SCENARIOS,
  SUBSCRIPTION_PRODUCTS,
  TOKEN_USAGE_PRODUCTS
} from "./definitions.js";
import { MetronomeApiError, MetronomeClient } from "./metronomeClient.js";

const client = new MetronomeClient({
  baseUrl: METRONOME_API_BASE_URL,
  bearerToken: METRONOME_BEARER_TOKEN
});

async function main() {
  if (!METRONOME_BEARER_TOKEN) {
    throw new Error("METRONOME_BEARER_TOKEN must be set before running the sandbox setup script.");
  }

  console.log("Creating Caseware Verity Metronome sandbox setup...");
  console.log(`All rates, contracts, commits, credits, and subscriptions start at ${START_AT}.`);
  console.log(`Contracts end before ${END_BEFORE}.`);

  const aiCreditType = await findAiCreditType();
  console.log(`Using Metronome pricing unit '${aiCreditType.name}' (${aiCreditType.id}) for Verity credits.`);

  const billableMetricIds = await ensureBillableMetrics();
  const productIds = await ensureProducts(billableMetricIds);
  const rateCard = await ensureRateCard(aiCreditType.id);

  if (rateCard.created) {
    await addRatesToRateCard(rateCard.id, productIds, aiCreditType.id);
  } else {
    console.log(`Reusing existing rate card '${RATE_CARD_NAME}', so rates were not added again.`);
  }

  const customerIds = await ensureCustomers();
  await ensureContracts(customerIds, rateCard.id, productIds, aiCreditType.id);
  await ingestUsageEvents();

  console.log("Done.");
}

async function findAiCreditType() {
  const creditTypes = await client.listAllGet("/credit-types/list");
  const configured = creditTypes.find((creditType) => creditType.id === VERITY_CREDITS_CREDIT_TYPE_ID);
  if (configured) {
    return configured;
  }

  const normalizedCandidates = CREDIT_TYPE_NAME_CANDIDATES.map(normalizeName);

  const exactMatch = creditTypes.find((creditType) => (
    !creditType.is_currency &&
    normalizedCandidates.includes(normalizeName(creditType.name))
  ));

  if (exactMatch) {
    return exactMatch;
  }

  const containsCredit = creditTypes.find((creditType) => (
    !creditType.is_currency &&
    normalizeName(creditType.name).includes("credit")
  ));

  if (containsCredit) {
    return containsCredit;
  }

  const availableUnits = creditTypes.map((creditType) => creditType.name).join(", ");
  throw new Error(
    `No custom AI Credits pricing unit was found. Configure a custom pricing unit named ` +
      `'AI Credits' or 'Verity Credits' in Metronome first. Available units: ${availableUnits}`
  );
}

async function ensureBillableMetrics() {
  const existingMetrics = await client.listAllGet("/billable-metrics");
  const ids = {};

  for (const metric of TOKEN_USAGE_PRODUCTS) {
    const existing = existingMetrics.find((item) => item.name === metric.metricName);
    if (existing) {
      ids[metric.key] = existing.id;
      console.log(`Reusing billable metric '${metric.metricName}'.`);
      continue;
    }

    const response = await client.post("/billable-metrics/create", buildBillableMetricPayload(metric));
    ids[metric.key] = response.data.id;
    console.log(`Created billable metric '${metric.metricName}'.`);
  }

  return ids;
}

async function ensureProducts(billableMetricIds) {
  const existingProducts = await client.listAllPost("/contract-pricing/products/list", {
    archive_filter: "NOT_ARCHIVED"
  });
  const ids = {};

  for (const metric of TOKEN_USAGE_PRODUCTS) {
    ids[metric.key] = await ensureProduct(
      existingProducts,
      metric.productName,
      () => buildUsageProductPayload(metric, billableMetricIds[metric.key])
    );
  }

  for (const subscriptionProduct of SUBSCRIPTION_PRODUCTS) {
    ids[subscriptionProduct.key] = await ensureProduct(
      existingProducts,
      subscriptionProduct.name,
      () => buildSubscriptionProductPayload(subscriptionProduct)
    );
  }

  ids[COMMIT_PRODUCT.key] = await ensureProduct(
    existingProducts,
    COMMIT_PRODUCT.name,
    buildCommitProductPayload
  );

  return ids;
}

async function ensureProduct(existingProducts, name, buildPayload) {
  const existing = existingProducts.find((product) => productName(product) === name);
  if (existing) {
    console.log(`Reusing product '${name}'.`);
    return existing.id;
  }

  const response = await client.post("/contract-pricing/products/create", buildPayload());
  console.log(`Created product '${name}'.`);
  return response.data.id;
}

async function ensureRateCard(aiCreditTypeId) {
  const existingRateCards = await client.listAllPost("/contract-pricing/rate-cards/list", {});
  const existing = existingRateCards.find((rateCard) => rateCard.name === RATE_CARD_NAME);

  if (existing) {
    return {
      id: existing.id,
      created: false
    };
  }

  const response = await client.post("/contract-pricing/rate-cards/create", {
    name: RATE_CARD_NAME,
    description:
      "Dimensional AI credit pricing for Caseware Verity token usage, with annual seat subscriptions.",
    credit_type_conversions: [
      {
        custom_credit_type_id: aiCreditTypeId,
        fiat_per_custom_credit: 1
      }
    ],
    aliases: [
      {
        name: RATE_CARD_ALIAS,
        starting_at: START_AT
      }
    ]
  });

  console.log(`Created rate card '${RATE_CARD_NAME}'.`);
  return {
    id: response.data.id,
    created: true
  };
}

async function addRatesToRateCard(rateCardId, productIds, aiCreditTypeId) {
  const rates = buildRatePayloads(productIds, aiCreditTypeId);
  const chunks = chunk(rates, 100);

  for (const [index, rateChunk] of chunks.entries()) {
    await client.post("/contract-pricing/rate-cards/addRates", {
      rate_card_id: rateCardId,
      rates: rateChunk
    });
    console.log(`Added rate card rate batch ${index + 1} of ${chunks.length}.`);
  }
}

async function ensureCustomers() {
  const ids = {};

  for (const customerScenario of CUSTOMER_SCENARIOS) {
    const existingCustomers = await client.listAllGet("/customers", {
      ingest_alias: customerScenario.ingestAlias
    });
    const existing = existingCustomers.find((customer) => (
      customer.ingest_aliases ?? []
    ).includes(customerScenario.ingestAlias));

    if (existing) {
      ids[customerScenario.slug] = existing.id;
      console.log(`Reusing customer '${customerScenario.name}'.`);
      continue;
    }

    const response = await client.post("/customers", buildCustomerPayload(customerScenario));
    ids[customerScenario.slug] = response.data.id;
    console.log(`Created customer '${customerScenario.name}'.`);
  }

  return ids;
}

async function ensureContracts(customerIds, rateCardId, productIds, aiCreditTypeId) {
  for (const customerScenario of CUSTOMER_SCENARIOS) {
    const payload = buildContractPayload(
      customerScenario,
      customerIds[customerScenario.slug],
      rateCardId,
      productIds,
      aiCreditTypeId
    );

    try {
      await client.post("/contracts/create", payload);
      console.log(`Created contract '${payload.name}'.`);
    } catch (error) {
      if (error instanceof MetronomeApiError && error.status === 409) {
        console.log(`Contract '${payload.name}' already exists; skipping.`);
        continue;
      }
      throw error;
    }
  }
}

async function ingestUsageEvents() {
  const events = buildUsageEvents();
  const chunks = chunk(events, 100);

  for (const [index, eventChunk] of chunks.entries()) {
    await client.post("/ingest", eventChunk);
    console.log(`Ingested usage event batch ${index + 1} of ${chunks.length}.`);
  }
}

function productName(product) {
  return product.current?.name ?? product.initial?.name ?? product.name;
}

function normalizeName(value) {
  return String(value).trim().toLowerCase();
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

main().catch((error) => {
  if (error instanceof MetronomeApiError) {
    console.error(error.message);
    console.error(JSON.stringify(error.body, null, 2));
    process.exitCode = 1;
    return;
  }

  console.error(error);
  process.exitCode = 1;
});
