import { listAllMetronomeGet, listAllMetronomePost, metronomePost } from "./metronome.js";
import {
  COMMIT_PRODUCT,
  TOKEN_USAGE_PRODUCTS
} from "../src/definitions.js";
import {
  buildGovernanceOverrideCredit,
  GOVERNANCE_ALLOCATION,
  GOVERNANCE_CUSTOMER,
  GOVERNANCE_MONTHLY_SEAT_PRODUCT
} from "../src/governanceDefinitions.js";

export async function loadGovernanceContext() {
  const apiRequests = [];

  const customersResponse = await listAllMetronomeGet("/customers", {
    ingest_alias: GOVERNANCE_CUSTOMER.ingestAlias,
    limit: 100
  });
  apiRequests.push(...customersResponse.apiRequests);

  const customer = customersResponse.data.find((item) => (
    item.name === GOVERNANCE_CUSTOMER.name ||
    (item.ingest_aliases ?? []).includes(GOVERNANCE_CUSTOMER.ingestAlias)
  ));

  if (!customer) {
    throw responseError(`Customer '${GOVERNANCE_CUSTOMER.name}' was not found. Run npm run setup:governance first.`, 404);
  }

  const contractsResponse = await listAllMetronomePost("/v2/contracts/list", {
    customer_id: customer.id,
    include_archived: false,
    include_balance: true
  });
  apiRequests.push(...contractsResponse.apiRequests);

  const contract = contractsResponse.data.find((item) => item.name === GOVERNANCE_CUSTOMER.contractName);

  if (!contract) {
    throw responseError(`Contract '${GOVERNANCE_CUSTOMER.contractName}' was not found. Run npm run setup:governance first.`, 404);
  }

  const contractResponse = await metronomePost("/v2/contracts/get", {
    customer_id: customer.id,
    contract_id: contract.id,
    include_balance: true,
    include_ledger: true
  });
  apiRequests.push(contractResponse.request);

  return {
    customer,
    contract: contractResponse.body.data ?? contract,
    apiRequests
  };
}

export async function loadGovernanceProductIds() {
  const productsResponse = await listAllMetronomePost("/contract-pricing/products/list", {
    archive_filter: "NOT_ARCHIVED"
  });
  const expectedProducts = [
    ...TOKEN_USAGE_PRODUCTS.map((product) => [product.key, product.productName]),
    [GOVERNANCE_MONTHLY_SEAT_PRODUCT.key, GOVERNANCE_MONTHLY_SEAT_PRODUCT.name],
    [COMMIT_PRODUCT.key, COMMIT_PRODUCT.name]
  ];
  const ids = {};

  for (const [key, name] of expectedProducts) {
    const product = productsResponse.data.find((item) => productName(item) === name);
    if (!product) {
      throw responseError(`Product '${name}' was not found. Run npm run setup:sandbox first.`, 404);
    }
    ids[key] = product.id;
  }

  return {
    productIds: ids,
    apiRequests: productsResponse.apiRequests
  };
}

export async function createUserAllocationOverride({ userId, amount, effectiveAt, endingBefore }) {
  const normalizedUserId = String(userId ?? "").trim();
  const normalizedAmount = Number(amount);

  if (!GOVERNANCE_CUSTOMER.seatIds.includes(normalizedUserId)) {
    throw responseError("Select one of the governance subscription seat IDs.", 400);
  }

  if (!Number.isFinite(normalizedAmount) || normalizedAmount === 0) {
    throw responseError("Allocation amount must be a non-zero number.", 400);
  }

  const startingAt = normalizeDate(effectiveAt, GOVERNANCE_ALLOCATION.effectiveOverrideAt);
  const endingAt = normalizeDate(endingBefore, GOVERNANCE_ALLOCATION.firstPeriodEndingBefore);
  const context = await loadGovernanceContext();
  const products = await loadGovernanceProductIds();
  const addCredit = buildGovernanceOverrideCredit({
    productIds: products.productIds,
    userId: normalizedUserId,
    amount: normalizedAmount,
    startingAt,
    endingBefore: endingAt
  });

  const editBody = {
    customer_id: context.customer.id,
    contract_id: context.contract.id,
    uniqueness_key: buildOverrideUniquenessKey(normalizedUserId, startingAt, normalizedAmount),
    add_credits: [addCredit]
  };
  const editResponse = await metronomePost("/v2/contracts/edit", editBody);

  return {
    customer: context.customer,
    contract: context.contract,
    addedCredit: addCredit,
    editResponse: editResponse.body,
    apiRequests: [
      ...context.apiRequests,
      ...products.apiRequests,
      editResponse.request
    ]
  };
}

function buildOverrideUniquenessKey(userId, startingAt, amount) {
  const datePart = startingAt.slice(0, 10);
  const amountPart = String(amount).replace(/[^a-zA-Z0-9]/g, "-");
  const shortId = Math.random().toString(36).slice(2, 8);
  return `governance-allocation-${userId}-${datePart}-${amountPart}-${shortId}`;
}

function normalizeDate(value, fallback) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw responseError("Dates must be valid ISO timestamps.", 400);
  }
  return date.toISOString();
}

function productName(product) {
  return product.current?.name ?? product.initial?.name ?? product.name;
}

function responseError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}
