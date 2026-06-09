"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Database,
  FileText,
  GitCompareArrows,
  RefreshCw,
  Rows3
} from "lucide-react";

const STATUS_OPTIONS = ["DRAFT", "FINALIZED"];
const WINDOW_OPTIONS = ["day", "hour"];

export default function Home() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [windowSize, setWindowSize] = useState("day");
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [customerRequests, setCustomerRequests] = useState([]);
  const [invoiceListRequests, setInvoiceListRequests] = useState([]);
  const [invoiceResult, setInvoiceResult] = useState(null);
  const [breakdownResult, setBreakdownResult] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState({
    customers: true,
    invoices: false,
    detail: false
  });
  const [error, setError] = useState("");

  const selectedInvoice = useMemo(
    () => invoices.find((invoice) => invoice.id === selectedInvoiceId),
    [invoices, selectedInvoiceId]
  );

  useEffect(() => {
    let isActive = true;

    async function loadCustomers() {
      setLoading((value) => ({ ...value, customers: true }));
      setError("");

      try {
        const payload = await getJson("/api/metronome/customers");
        if (!isActive) return;
        setCustomers(payload.customers ?? []);
        setCustomerRequests(payload.apiRequests ?? []);
        setSelectedCustomerId((current) => current || payload.customers?.[0]?.id || "");
      } catch (err) {
        if (isActive) setError(err.message);
      } finally {
        if (isActive) setLoading((value) => ({ ...value, customers: false }));
      }
    }

    loadCustomers();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedCustomerId) return;

    let isActive = true;

    async function loadInvoices() {
      setLoading((value) => ({ ...value, invoices: true }));
      setError("");
      setInvoiceResult(null);
      setBreakdownResult(null);

      try {
        const payload = await getJson(
          `/api/metronome/invoices?customerId=${encodeURIComponent(selectedCustomerId)}&status=${status}`
        );
        if (!isActive) return;
        setInvoices(payload.invoices ?? []);
        setInvoiceListRequests(payload.apiRequests ?? []);
        setSelectedInvoiceId(payload.invoices?.[0]?.id || "");
      } catch (err) {
        if (isActive) setError(err.message);
      } finally {
        if (isActive) setLoading((value) => ({ ...value, invoices: false }));
      }
    }

    loadInvoices();
    return () => {
      isActive = false;
    };
  }, [selectedCustomerId, status, refreshKey]);

  useEffect(() => {
    if (!selectedCustomerId || !selectedInvoiceId || !selectedInvoice) return;

    let isActive = true;

    async function loadDetails() {
      setLoading((value) => ({ ...value, detail: true }));
      setError("");

      const start = selectedInvoice.start_timestamp ?? "2026-06-01T00:00:00.000Z";
      const end = selectedInvoice.end_timestamp ?? "2026-07-01T00:00:00.000Z";

      try {
        const [invoicePayload, breakdownPayload] = await Promise.all([
          getJson(
            `/api/metronome/invoice?customerId=${encodeURIComponent(selectedCustomerId)}&invoiceId=${selectedInvoiceId}`
          ),
          getJson(
            `/api/metronome/breakdowns?customerId=${encodeURIComponent(selectedCustomerId)}&status=${status}&windowSize=${windowSize}&startingOn=${encodeURIComponent(start)}&endingBefore=${encodeURIComponent(end)}`
          )
        ]);

        if (!isActive) return;
        setInvoiceResult(invoicePayload);
        setBreakdownResult(breakdownPayload);
      } catch (err) {
        if (isActive) setError(err.message);
      } finally {
        if (isActive) setLoading((value) => ({ ...value, detail: false }));
      }
    }

    loadDetails();
    return () => {
      isActive = false;
    };
  }, [selectedCustomerId, selectedInvoiceId, selectedInvoice, status, windowSize]);

  function refresh() {
    if (!selectedCustomerId) return;
    setSelectedInvoiceId("");
    setInvoices([]);
    setInvoiceResult(null);
    setBreakdownResult(null);
    setRefreshKey((value) => value + 1);
  }

  const combinedRequests = [
    ...customerRequests,
    ...invoiceListRequests,
    ...(invoiceResult?.apiRequests ?? []),
    ...(breakdownResult?.apiRequests ?? [])
  ];

  return (
    <main>
      <header className="topbar">
        <div>
          <p className="eyebrow">Caseware Verity</p>
          <h1>Invoice Line Item Rollup</h1>
        </div>
        <button className="iconButton" onClick={refresh} type="button" aria-label="Refresh invoice data">
          <RefreshCw size={18} />
        </button>
      </header>

      <section className="controlBand" aria-label="Invoice controls">
        <Control label="Customer">
          <select
            value={selectedCustomerId}
            onChange={(event) => setSelectedCustomerId(event.target.value)}
            disabled={loading.customers}
          >
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </Control>
        <Control label="Invoice Status">
          <SegmentedControl options={STATUS_OPTIONS} value={status} onChange={setStatus} />
        </Control>
        <Control label="Invoice">
          <select
            value={selectedInvoiceId}
            onChange={(event) => setSelectedInvoiceId(event.target.value)}
            disabled={loading.invoices || invoices.length === 0}
          >
            {invoices.map((invoice) => (
              <option key={invoice.id} value={invoice.id}>
                {formatDateRange(invoice.start_timestamp, invoice.end_timestamp)} · {invoice.status}
              </option>
            ))}
          </select>
        </Control>
        <Control label="Breakdown Window">
          <SegmentedControl options={WINDOW_OPTIONS} value={windowSize} onChange={setWindowSize} />
        </Control>
      </section>

      {error ? <ErrorBanner message={error} /> : null}

      {loading.customers || loading.invoices ? (
        <EmptyState label="Loading invoice context" />
      ) : invoices.length === 0 ? (
        <EmptyState label={`No ${status.toLowerCase()} usage invoices found`} />
      ) : (
        <>
          <section className="summaryStrip" aria-label="Selected invoice summary">
            <SummaryMetric
              icon={<FileText size={18} />}
              label="Invoice"
              value={shortId(selectedInvoiceId)}
            />
            <SummaryMetric
              icon={<CalendarDays size={18} />}
              label="Billing Period"
              value={formatDateRange(selectedInvoice?.start_timestamp, selectedInvoice?.end_timestamp)}
            />
            <SummaryMetric
              icon={<Rows3 size={18} />}
              label="Raw Lines"
              value={invoiceResult?.invoice?.line_items?.length ?? "-"}
            />
            <SummaryMetric
              icon={<GitCompareArrows size={18} />}
              label="Customer Lines"
              value={invoiceResult?.rolledInvoice?.line_items?.length ?? "-"}
            />
          </section>

          <section className="methodGrid">
            <MethodPanel
              title="Get Invoice Endpoint"
              icon={<FileText size={20} />}
              requests={invoiceResult?.apiRequests ?? []}
              loading={loading.detail}
            >
              <BeforeAfterTables
                beforeTitle="Metronome Invoice Line Items"
                afterTitle="Customer Presentation Line Items"
                beforeLineItems={invoiceResult?.invoice?.line_items ?? []}
                afterLineItems={invoiceResult?.rolledInvoice?.line_items ?? []}
                summary={invoiceResult?.rolledInvoice?.presentation_summary}
              />
              <JsonDetails
                title="Get Invoice Payloads"
                before={invoiceResult?.invoice}
                after={invoiceResult?.rolledInvoice}
              />
            </MethodPanel>

            <MethodPanel
              title="Invoice Breakdowns Endpoint"
              icon={<Database size={20} />}
              requests={breakdownResult?.apiRequests ?? []}
              loading={loading.detail}
            >
              <BreakdownTables
                before={breakdownResult?.breakdowns ?? []}
                after={breakdownResult?.rolledBreakdowns ?? []}
                aggregate={breakdownResult?.aggregate}
              />
              <JsonDetails
                title="Breakdown Payloads"
                before={breakdownResult?.breakdowns}
                after={breakdownResult?.rolledBreakdowns}
              />
            </MethodPanel>
          </section>

          <section className="apiLedger" aria-label="API request ledger">
            <div className="sectionTitle">
              <Database size={18} />
              <h2>API Requests</h2>
            </div>
            <ApiRequestList requests={combinedRequests} />
          </section>
        </>
      )}
    </main>
  );
}

function Control({ label, children }) {
  return (
    <label className="control">
      <span>{label}</span>
      {children}
    </label>
  );
}

function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="segmented">
      {options.map((option) => (
        <button
          key={option}
          className={value === option ? "active" : ""}
          onClick={() => onChange(option)}
          type="button"
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function SummaryMetric({ icon, label, value }) {
  return (
    <div className="summaryMetric">
      <div className="summaryIcon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function MethodPanel({ title, icon, requests, loading, children }) {
  return (
    <section className="methodPanel">
      <div className="methodHeader">
        <div className="sectionTitle">
          {icon}
          <h2>{title}</h2>
        </div>
        {loading ? <span className="loadingPill">Refreshing</span> : null}
      </div>
      <ApiRequestList requests={requests} compact />
      {children}
    </section>
  );
}

function BeforeAfterTables({ beforeTitle, afterTitle, beforeLineItems, afterLineItems, summary }) {
  return (
    <div className="comparison">
      <LineTable title={beforeTitle} lineItems={beforeLineItems} tone="before" />
      <LineTable title={afterTitle} lineItems={afterLineItems} tone="after" summary={summary} />
    </div>
  );
}

function BreakdownTables({ before, after, aggregate }) {
  return (
    <div className="comparison">
      <WindowTable title="Metronome Breakdown Windows" breakdowns={before} tone="before" />
      <WindowTable title="Customer Presentation Windows" breakdowns={after} tone="after" aggregate={aggregate} />
    </div>
  );
}

function LineTable({ title, lineItems, tone, summary }) {
  return (
    <div className={`tableBlock ${tone}`}>
      <TableTitle title={title} count={lineItems.length} summary={summary} />
      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Quantity</th>
              <th>Unit</th>
              <th>Total</th>
              <th>Groups</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((lineItem, index) => (
              <tr key={`${lineItem.name}-${index}`} className={lineItem.name === "Verity Usage" ? "rollupRow" : ""}>
                <td>
                  <strong>{lineItem.name}</strong>
                  {lineItem.rolled_up_from ? <small>{lineItem.rolled_up_from.length} source lines</small> : null}
                </td>
                <td>{lineItem.type}</td>
                <td>{formatNumber(lineItem.quantity)}</td>
                <td>{formatNumber(lineItem.unit_price)}</td>
                <td>{formatAmount(lineItem.total, lineItem.credit_type)}</td>
                <td>{formatGroups(lineItem)}</td>
              </tr>
            ))}
            {lineItems.length === 0 ? (
              <tr>
                <td colSpan="6" className="mutedCell">
                  No line items
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WindowTable({ title, breakdowns, tone, aggregate }) {
  return (
    <div className={`tableBlock ${tone}`}>
      <TableTitle title={title} count={breakdowns.length} summary={aggregate} />
      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Window</th>
              <th>Status</th>
              <th>Line Items</th>
              <th>Verity Lines</th>
              <th>Verity Total</th>
            </tr>
          </thead>
          <tbody>
            {breakdowns.map((breakdown, index) => {
              const summary = breakdown.presentation_summary;
              return (
                <tr key={`${breakdown.breakdown_start_timestamp}-${index}`}>
                  <td>
                    <strong>
                      {formatDateRange(
                        breakdown.breakdown_start_timestamp ?? breakdown.start_timestamp,
                        breakdown.breakdown_end_timestamp ?? breakdown.end_timestamp
                      )}
                    </strong>
                    <small>{shortId(breakdown.id)}</small>
                  </td>
                  <td>{breakdown.status}</td>
                  <td>{breakdown.line_items?.length ?? 0}</td>
                  <td>{summary?.veritySourceLineItemCount ?? countVerityLines(breakdown.line_items)}</td>
                  <td>{formatAmount(summary?.verityTotal ?? estimateVerityTotal(breakdown.line_items), inferVerityCreditType(breakdown.line_items, summary))}</td>
                </tr>
              );
            })}
            {breakdowns.length === 0 ? (
              <tr>
                <td colSpan="5" className="mutedCell">
                  No breakdown windows
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TableTitle({ title, count, summary }) {
  return (
    <div className="tableTitle">
      <h3>{title}</h3>
      <span>{count} rows</span>
      {summary?.veritySourceLineItemCount ? (
        <span>{summary.veritySourceLineItemCount} Verity token rows rolled up</span>
      ) : null}
    </div>
  );
}

function JsonDetails({ title, before, after }) {
  return (
    <details className="jsonDetails">
      <summary>{title}</summary>
      <div className="jsonGrid">
        <pre>{JSON.stringify(before ?? null, null, 2)}</pre>
        <pre>{JSON.stringify(after ?? null, null, 2)}</pre>
      </div>
    </details>
  );
}

function ApiRequestList({ requests, compact = false }) {
  if (!requests?.length) {
    return <p className="mutedText">No requests yet</p>;
  }

  return (
    <div className={compact ? "requestList compact" : "requestList"}>
      {requests.map((request, index) => (
        <code key={`${request.url}-${index}`}>
          <span>{request.method}</span>
          {request.url}
        </code>
      ))}
    </div>
  );
}

function ErrorBanner({ message }) {
  return (
    <section className="errorBanner">
      <AlertCircle size={18} />
      <span>{message}</span>
    </section>
  );
}

function EmptyState({ label }) {
  return (
    <section className="emptyState">
      <FileText size={24} />
      <strong>{label}</strong>
    </section>
  );
}

async function getJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed");
  }

  return payload;
}

function formatGroups(lineItem) {
  const pricing = lineItem.pricing_group_values ? Object.entries(lineItem.pricing_group_values) : [];
  const presentation = lineItem.presentation_group_values ? Object.entries(lineItem.presentation_group_values) : [];
  const groups = [...pricing, ...presentation];

  if (groups.length === 0) {
    return "-";
  }

  return groups.slice(0, 3).map(([key, value]) => `${key}: ${value ?? "-"}`).join(" · ");
}

function countVerityLines(lineItems = []) {
  return lineItems.filter((lineItem) => String(lineItem.name ?? "").startsWith("Verity ")).length;
}

function estimateVerityTotal(lineItems = []) {
  return lineItems
    .filter((lineItem) => String(lineItem.name ?? "").startsWith("Verity "))
    .reduce((total, lineItem) => total + Number(lineItem.total ?? 0), 0);
}

function inferVerityCreditType(lineItems = [], summary) {
  if (summary?.verityCreditType) {
    return { name: summary.verityCreditType };
  }

  return lineItems.find((lineItem) => String(lineItem.name ?? "").startsWith("Verity "))?.credit_type ?? {
    name: "Verity Credits"
  };
}

function formatDateRange(start, end) {
  if (!start && !end) return "-";
  return `${formatShortDate(start)} to ${formatShortDate(end)}`;
}

function formatShortDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  });
}

function shortId(value) {
  if (!value) return "-";
  return `${String(value).slice(0, 8)}...`;
}

function formatNumber(value) {
  if (value === null || value === undefined || value === "") return "-";
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 4
  }).format(number);
}

function formatAmount(value, creditType) {
  if (value === null || value === undefined) return "-";
  const name = creditType?.name ?? "";
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return String(value);
  }

  if (name.toLowerCase().includes("usd")) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(number / 100);
  }

  return `${formatNumber(number)} ${name || "units"}`;
}
