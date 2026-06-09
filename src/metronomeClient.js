export class MetronomeApiError extends Error {
  constructor(message, { status, body }) {
    super(message);
    this.name = "MetronomeApiError";
    this.status = status;
    this.body = body;
  }
}

export class MetronomeClient {
  constructor({ baseUrl, bearerToken }) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.bearerToken = bearerToken;
  }

  async get(path, query) {
    return this.request("GET", path, { query });
  }

  async post(path, body, query) {
    return this.request("POST", path, { body, query });
  }

  async request(method, path, { query, body } = {}) {
    const url = new URL(`${this.baseUrl}${path}`);

    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.bearerToken}`,
        "Content-Type": "application/json"
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });

    const rawBody = await response.text();
    const parsedBody = parseBody(rawBody);

    if (!response.ok) {
      throw new MetronomeApiError(
        `Metronome ${method} ${path} failed with HTTP ${response.status}`,
        {
          status: response.status,
          body: parsedBody
        }
      );
    }

    return parsedBody;
  }

  async listAllGet(path, query = {}) {
    const records = [];
    let nextPage;

    do {
      const response = await this.get(path, {
        ...query,
        limit: query.limit ?? 100,
        next_page: nextPage
      });

      records.push(...(response.data ?? []));
      nextPage = response.next_page;
    } while (nextPage);

    return records;
  }

  async listAllPost(path, body = {}, query = {}) {
    const records = [];
    let nextPage;

    do {
      const response = await this.post(
        path,
        body,
        {
          ...query,
          limit: query.limit ?? 100,
          next_page: nextPage
        }
      );

      records.push(...(response.data ?? []));
      nextPage = response.next_page;
    } while (nextPage);

    return records;
  }
}

function parseBody(rawBody) {
  if (!rawBody) {
    return {};
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    return { raw: rawBody };
  }
}
