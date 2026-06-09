import { errorResponse, jsonResponse, listAllMetronomeGet, normalizeQueryValue } from "../../../../lib/metronome.js";
import { rollupBreakdowns } from "../../../../lib/invoiceRollup.js";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");

    if (!customerId) {
      return jsonResponse({ error: "customerId is required" }, { status: 400 });
    }

    const status = normalizeQueryValue(searchParams.get("status"), "DRAFT");
    const windowSize = normalizeQueryValue(searchParams.get("windowSize"), "day");
    const startingOn = normalizeQueryValue(searchParams.get("startingOn"), "2026-06-01T00:00:00.000Z");
    const endingBefore = normalizeQueryValue(searchParams.get("endingBefore"), "2026-07-01T00:00:00.000Z");

    const { data, apiRequests } = await listAllMetronomeGet(`/customers/${customerId}/invoices/breakdowns`, {
      status,
      window_size: windowSize,
      sort: "date_asc",
      starting_on: startingOn,
      ending_before: endingBefore,
      skip_zero_qty_line_items: true,
      limit: 100
    });

    const rolled = rollupBreakdowns(data);

    return jsonResponse({
      breakdowns: data,
      rolledBreakdowns: rolled.breakdowns,
      aggregate: rolled.aggregate,
      apiRequests
    });
  } catch (error) {
    return errorResponse(error);
  }
}
