import {
  METRONOME_API_BASE_URL,
  METRONOME_BEARER_TOKEN,
  RATE_CARD_NAME,
  START_AT,
  USD_CENTS_CREDIT_TYPE_ID
} from "./config.js";
import {
  COMMIT_PRODUCT,
  TOKEN_USAGE_PRODUCTS
} from "./definitions.js";
import {
  buildGovernanceContractPayload,
  buildGovernanceCustomerPayload,
  buildGovernanceUsageEvents,
  GOVERNANCE_CUSTOMER,
  GOVERNANCE_MONTHLY_SEAT_PRODUCT
} from "./governanceDefinitions.js";
import { MetronomeApiError, MetronomeClient } from "./metronomeClient.js";

const client = new MetronomeClient({
  baseUrl: METRONOME_API_BASE_URL,
  bearerToken: METRONOME_BEARER_TOKEN
});

async function main() {
  if (!METRONOME_BEARER_TOKEN) {
    throw new Error("METRONOME_BEARER_TOKEN must be set before running the governance setup script.");
  }

  console.log("Creating Caseware governance customer and contract...");
  console.log(`Governance subscription, recurring credits, and usage all start at ${START_AT}.`);

  const customerId = await ensureGovernanceCustomer();
  const rateCardId = await findRateCardId();
  const productIds = await findProductIds();
  await ensureMonthlySeatRate(rateCardId, productIds);

  await ensureGovernanceContract(customerId, rateCardId, productIds);
  await ingestGovernanceUsageEvents();

  console.log("Done.");
}

async function ensureGovernanceCustomer() {
  const customers = await client.listAllGet("/customers", {
    ingest_alias: GOVERNANCE_CUSTOMER.ingestAlias
  });
  const existing = customers.find((customer) => (
    customer.name === GOVERNANCE_CUSTOMER.name ||
    (customer.ingest_aliases ?? []).includes(GOVERNANCE_CUSTOMER.ingestAlias)
  ));

  if (existing) {
    console.log(`Reusing customer '${GOVERNANCE_CUSTOMER.name}'.`);
    return existing.id;
  }

  const response = await client.post("/customers", buildGovernanceCustomerPayload());
  console.log(`Created customer '${GOVERNANCE_CUSTOMER.name}'.`);
  return response.data.id;
}

async function findRateCardId() {
  const rateCards = await client.listAllPost("/contract-pricing/rate-cards/list", {});
  const rateCard = rateCards.find((item) => item.name === RATE_CARD_NAME);

  if (!rateCard) {
    throw new Error(`Could not find rate card '${RATE_CARD_NAME}'. Run npm run setup:sandbox first.`);
  }

  console.log(`Using rate card '${RATE_CARD_NAME}'.`);
  return rateCard.id;
}

async function findProductIds() {
  const products = await client.listAllPost("/contract-pricing/products/list", {
    archive_filter: "NOT_ARCHIVED"
  });

  const expectedProducts = [
    ...TOKEN_USAGE_PRODUCTS.map((product) => [product.key, product.productName]),
    [GOVERNANCE_MONTHLY_SEAT_PRODUCT.key, GOVERNANCE_MONTHLY_SEAT_PRODUCT.name],
    [COMMIT_PRODUCT.key, COMMIT_PRODUCT.name]
  ];
  const ids = {};

  for (const [key, name] of expectedProducts) {
    const product = products.find((item) => productName(item) === name);
    if (!product && key === GOVERNANCE_MONTHLY_SEAT_PRODUCT.key) {
      const response = await client.post("/contract-pricing/products/create", {
        name,
        type: "SUBSCRIPTION",
        tags: ["caseware", "verity", "seats", "monthly-governance"]
      });
      ids[key] = response.data.id;
      console.log(`Created product '${name}'.`);
      continue;
    }

    if (!product) {
      throw new Error(`Could not find product '${name}'. Run npm run setup:sandbox first.`);
    }
    ids[key] = product.id;
  }

  console.log("Resolved Verity usage, seat subscription, and credit pool products.");
  return ids;
}

async function ensureMonthlySeatRate(rateCardId, productIds) {
  try {
    await client.post("/contract-pricing/rate-cards/addRates", {
      rate_card_id: rateCardId,
      rates: [
        {
          product_id: productIds[GOVERNANCE_MONTHLY_SEAT_PRODUCT.key],
          starting_at: START_AT,
          entitled: true,
          rate_type: "FLAT",
          price: GOVERNANCE_MONTHLY_SEAT_PRODUCT.monthlyPriceCents,
          credit_type_id: USD_CENTS_CREDIT_TYPE_ID,
          billing_frequency: "MONTHLY"
        }
      ]
    });
    console.log(`Added monthly rate for '${GOVERNANCE_MONTHLY_SEAT_PRODUCT.name}'.`);
  } catch (error) {
    if (error instanceof MetronomeApiError && error.status === 409) {
      console.log(`Monthly rate for '${GOVERNANCE_MONTHLY_SEAT_PRODUCT.name}' already exists; skipping.`);
      return;
    }
    throw error;
  }
}

async function ensureGovernanceContract(customerId, rateCardId, productIds) {
  const contracts = await client.listAllPost(
    "/v2/contracts/list",
    {
      customer_id: customerId,
      include_archived: false
    }
  );
  const existing = contracts.find((contract) => contract.name === GOVERNANCE_CUSTOMER.contractName);

  if (existing) {
    console.log(`Contract '${GOVERNANCE_CUSTOMER.contractName}' already exists; skipping.`);
    return;
  }

  const payload = buildGovernanceContractPayload(customerId, rateCardId, productIds);
  await client.post("/contracts/create", payload);
  console.log(`Created contract '${GOVERNANCE_CUSTOMER.contractName}'.`);
}

async function ingestGovernanceUsageEvents() {
  const events = buildGovernanceUsageEvents();
  await client.post("/ingest", events);
  console.log("Ingested governance usage events for June 1 through June 7, 2026.");
}

function productName(product) {
  return product.current?.name ?? product.initial?.name ?? product.name;
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
