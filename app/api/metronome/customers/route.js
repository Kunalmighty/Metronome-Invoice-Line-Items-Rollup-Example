import { CASEWARE_CUSTOMER_NAMES, errorResponse, jsonResponse, listAllMetronomeGet } from "../../../../lib/metronome.js";

export async function GET() {
  try {
    const { data, apiRequests } = await listAllMetronomeGet("/customers", {
      limit: 100
    });

    const customers = data
      .filter((customer) => CASEWARE_CUSTOMER_NAMES.includes(customer.name))
      .sort((a, b) => CASEWARE_CUSTOMER_NAMES.indexOf(a.name) - CASEWARE_CUSTOMER_NAMES.indexOf(b.name));

    return jsonResponse({
      customers,
      apiRequests
    });
  } catch (error) {
    return errorResponse(error);
  }
}
