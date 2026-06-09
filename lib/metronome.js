import { METRONOME_API_BASE_URL, METRONOME_BEARER_TOKEN } from "../src/config.js";

export const CASEWARE_CUSTOMER_NAMES = [
  "Cedar Audit LLP",
  "Northstar Assurance",
  "Harborview Advisors",
  "Crownpoint Global"
];

const METRONOME_TOKEN = process.env.METRONOME_BEARER_TOKEN ?? METRONOME_BEARER_TOKEN;

export async function metronomeGet(path, query = {}) {
  if (!METRONOME_TOKEN) {
    const error = new Error("METRONOME_BEARER_TOKEN is not configured on the server.");
    error.status = 500;
    throw error;
  }

  const url = buildUrl(path, query);
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${METRONOME_TOKEN}`,
      "Content-Type": "application/json"
    },
    cache: "no-store"
  });

  const body = await response.text();
  const parsedBody = parseBody(body);
  const request = publicRequest("GET", path, query);

  if (!response.ok) {
    const message = parsedBody?.message ?? `Metronome request failed with HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.body = parsedBody;
    error.request = request;
    throw error;
  }

  return {
    body: parsedBody,
    request
  };
}

export async function listAllMetronomeGet(path, query = {}) {
  const data = [];
  const apiRequests = [];
  let nextPage;

  do {
    const { body, request } = await metronomeGet(path, {
      ...query,
      limit: query.limit ?? 100,
      next_page: nextPage
    });

    data.push(...(body.data ?? []));
    apiRequests.push(request);
    nextPage = body.next_page;
  } while (nextPage);

  return {
    data,
    apiRequests
  };
}

export function jsonResponse(payload, init) {
  return Response.json(payload, {
    headers: {
      "Cache-Control": "no-store"
    },
    ...init
  });
}

export function errorResponse(error) {
  return jsonResponse(
    {
      error: error.message,
      status: error.status ?? 500,
      details: error.body ?? null,
      apiRequests: error.request ? [error.request] : []
    },
    {
      status: error.status ?? 500
    }
  );
}

export function normalizeQueryValue(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  return value;
}

function buildUrl(path, query) {
  const url = new URL(`${METRONOME_API_BASE_URL}${path}`);

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

function publicRequest(method, path, query) {
  const url = buildUrl(path, query);

  return {
    method,
    url: url.toString(),
    path,
    query: Object.fromEntries(url.searchParams.entries())
  };
}

function parseBody(body) {
  if (!body) {
    return {};
  }

  try {
    return JSON.parse(body);
  } catch {
    return { raw: body };
  }
}
