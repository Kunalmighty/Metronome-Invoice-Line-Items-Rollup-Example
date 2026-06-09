import { errorResponse, jsonResponse, metronomeGet } from "../../../../lib/metronome.js";
import { rollupInvoice } from "../../../../lib/invoiceRollup.js";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");
    const invoiceId = searchParams.get("invoiceId");

    if (!customerId || !invoiceId) {
      return jsonResponse({ error: "customerId and invoiceId are required" }, { status: 400 });
    }

    const { body, request: apiRequest } = await metronomeGet(`/customers/${customerId}/invoices/${invoiceId}`, {
      skip_zero_qty_line_items: true
    });

    const invoice = body.data;

    return jsonResponse({
      invoice,
      rolledInvoice: rollupInvoice(invoice),
      apiRequests: [apiRequest]
    });
  } catch (error) {
    return errorResponse(error);
  }
}
