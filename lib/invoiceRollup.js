export const VERITY_TOKEN_LINE_NAMES = [
  "Verity Input Tokens",
  "Verity Output Tokens",
  "Verity Cached Input Tokens",
  "Verity Cached Output Tokens"
];

const VERITY_TOKEN_NAME_SET = new Set(VERITY_TOKEN_LINE_NAMES.map((name) => name.toLowerCase()));

export function rollupInvoice(invoice) {
  const { lineItems, summary } = rollupLineItems(invoice?.line_items ?? []);

  return {
    ...invoice,
    line_items: lineItems,
    presentation_summary: summary
  };
}

export function rollupBreakdowns(breakdowns) {
  const rolledBreakdowns = breakdowns.map((breakdown) => rollupInvoice(breakdown));

  return {
    breakdowns: rolledBreakdowns,
    aggregate: aggregateSummaries(rolledBreakdowns.map((breakdown) => breakdown.presentation_summary))
  };
}

export function rollupLineItems(lineItems) {
  const verityTokenLines = [];
  const otherLines = [];

  for (const lineItem of lineItems) {
    if (isVerityTokenLineItem(lineItem)) {
      verityTokenLines.push(lineItem);
    } else {
      otherLines.push(lineItem);
    }
  }

  const rolledLine = buildVerityUsageLine(verityTokenLines);
  const nextLineItems = rolledLine ? [rolledLine, ...otherLines] : [...otherLines];

  return {
    lineItems: nextLineItems,
    summary: {
      beforeLineItemCount: lineItems.length,
      afterLineItemCount: nextLineItems.length,
      veritySourceLineItemCount: verityTokenLines.length,
      rolledUpProductNames: unique(verityTokenLines.map((line) => line.name)),
      verityQuantity: sum(verityTokenLines, "quantity"),
      verityTotal: sum(verityTokenLines, "total"),
      verityCreditType: firstCreditTypeName(verityTokenLines)
    }
  };
}

export function isVerityTokenLineItem(lineItem) {
  const name = String(lineItem?.name ?? "").trim().toLowerCase();
  const tags = Array.isArray(lineItem?.product_tags) ? lineItem.product_tags : [];
  const hasAiCreditTag = tags.some((tag) => String(tag).toLowerCase() === "ai-credits");

  return lineItem?.type === "usage" && (VERITY_TOKEN_NAME_SET.has(name) || hasAiCreditTag);
}

function buildVerityUsageLine(verityTokenLines) {
  if (verityTokenLines.length === 0) {
    return null;
  }

  const quantity = sum(verityTokenLines, "quantity");
  const total = sum(verityTokenLines, "total");
  const creditType = firstCreditType(verityTokenLines);
  const sourceNames = unique(verityTokenLines.map((line) => line.name));

  return {
    name: "Verity Usage",
    type: "usage",
    product_type: "CustomerPresentationRollup",
    quantity,
    unit_price: quantity > 0 ? total / quantity : null,
    total,
    credit_type: creditType,
    pricing_group_values: {
      presentation_rollup: "mixed"
    },
    presentation_group_values: {
      customer_line_item: "Verity Usage"
    },
    metadata: `Rolled up from ${sourceNames.join(", ")}`,
    rolled_up_from: verityTokenLines.map((line) => ({
      name: line.name,
      type: line.type,
      quantity: line.quantity ?? 0,
      unit_price: line.unit_price ?? null,
      total: line.total ?? 0,
      credit_type: line.credit_type ?? null,
      pricing_group_values: line.pricing_group_values ?? null,
      presentation_group_values: line.presentation_group_values ?? null,
      product_id: line.product_id ?? null,
      commit_id: line.commit_id ?? null,
      applied_commit_or_credit: line.applied_commit_or_credit ?? null
    }))
  };
}

function aggregateSummaries(summaries) {
  return {
    beforeLineItemCount: summaries.reduce((total, summary) => total + summary.beforeLineItemCount, 0),
    afterLineItemCount: summaries.reduce((total, summary) => total + summary.afterLineItemCount, 0),
    veritySourceLineItemCount: summaries.reduce((total, summary) => total + summary.veritySourceLineItemCount, 0),
    verityQuantity: summaries.reduce((total, summary) => total + summary.verityQuantity, 0),
    verityTotal: summaries.reduce((total, summary) => total + summary.verityTotal, 0),
    verityCreditType: summaries.find((summary) => summary.verityCreditType)?.verityCreditType ?? "Verity Credits",
    rolledUpProductNames: unique(summaries.flatMap((summary) => summary.rolledUpProductNames))
  };
}

function sum(lineItems, key) {
  return lineItems.reduce((total, lineItem) => total + asNumber(lineItem?.[key]), 0);
}

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function firstCreditType(lineItems) {
  return lineItems.find((lineItem) => lineItem.credit_type)?.credit_type ?? {
    name: "Verity Credits"
  };
}

function firstCreditTypeName(lineItems) {
  return firstCreditType(lineItems)?.name ?? "Verity Credits";
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}
