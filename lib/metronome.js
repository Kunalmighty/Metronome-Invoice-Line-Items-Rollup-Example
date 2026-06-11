import { METRONOME_API_BASE_URL, METRONOME_BEARER_TOKEN } from "../src/config.js";

export const CASEWARE_CUSTOMER_NAMES = [
  "Cedar Audit LLP",
  "Northstar Assurance",
  "Harborview Advisors",
  "Crownpoint Global"
];

const METRONOME_API_ORIGIN = METRONOME_API_BASE_URL.replace(/\/v1$/, "");

const METRONOME_TOKEN = process.env.METRONOME_BEARER_TOKEN ?? METRONOME_BEARER_TOKEN;

export async function metronomeGet(path, query = {}) {
  return metronomeRequest("GET", path, { query });
}

export async function metronomePost(path, body = {}, query = {}) {
  return metronomeRequest("POST", path, { body, query });
}

export async function metronomeRequest(method, path, { query = {}, body } = {}) {
  if (!METRONOME_TOKEN) {
    const error = new Error("METRONOME_BEARER_TOKEN is not configured on the server.");
    error.status = 500;
    throw error;
  }

  const url = buildUrl(path, query);
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${METRONOME_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store"
  });

  const rawBody = await response.text();
  const parsedBody = parseBody(rawBody);
  const apiRequest = publicRequest(method, path, query, body);

  if (!response.ok) {
    const message = parsedBody?.message ?? `Metronome request failed with HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.body = parsedBody;
    error.request = apiRequest;
    throw error;
  }

  return {
    body: parsedBody,
    request: apiRequest
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

export async function listAllMetronomePost(path, body = {}, query = {}) {
  const data = [];
  const apiRequests = [];
  let nextPage;

  do {
    const { body: responseBody, request } = await metronomePost(
      path,
      body,
      {
        ...query,
        limit: query.limit ?? 100,
        next_page: nextPage
      }
    );

    data.push(...(responseBody.data ?? []));
    apiRequests.push(request);
    nextPage = responseBody.next_page;
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
  const baseUrl = path.startsWith("/v2/")
    ? METRONOME_API_ORIGIN
    : METRONOME_API_BASE_URL;
  const url = new URL(`${baseUrl}${path}`);

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

function publicRequest(method, path, query, body) {
  const url = buildUrl(path, query);

  return {
    method,
    url: url.toString(),
    path,
    query: Object.fromEntries(url.searchParams.entries()),
    ...(body === undefined ? {} : { body })
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
