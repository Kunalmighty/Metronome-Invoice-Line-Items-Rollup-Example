"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Database,
  RefreshCw,
  ShieldCheck,
  UserCog,
  Users
} from "lucide-react";

const SECTION_COPY = {
  context:
    "This section is the Metronome contract context for the Caseware seat governance demo. The annual seat subscription starts on June 1, 2026, while the entitlement periods are monthly.",
  credits:
    "The contract has two monthly recurring credit layers attached to the same seat subscription. User-scoped credits at priority 1 are consumed first; pooled credits at priority 2 are available after the user-scoped balance is exhausted.",
  editor:
    "This form sends a server-side Metronome contract edit request. It posts a dated contract-level credit adjustment scoped to one userId. Additions use a positive amount; deductions use a negative amount for the same active entitlement period.",
  api:
    "These are the Metronome API requests made by this page and by the most recent edit. The bearer token is kept server-side and is not included in any request shown here."
};

export default function GovernancePage() {
  const [context, setContext] = useState(null);
  const [editResult, setEditResult] = useState(null);
  const [loading, setLoading] = useState({ context: true, edit: false });
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    userId: "",
    mode: "add",
    amount: "300",
    effectiveAt: "2026-06-10T00:00:00.000Z",
    endingBefore: "2026-07-01T00:00:00.000Z"
  });

  async function loadContext() {
    setLoading((value) => ({ ...value, context: true }));
    setError("");

    try {
      const payload = await getJson("/api/metronome/governance");
      setContext(payload);
      setForm((value) => ({
        ...value,
        userId: value.userId || payload.model?.seatIds?.[0] || "",
        effectiveAt: value.effectiveAt || payload.model?.defaultEffectiveAt || "2026-06-10T00:00:00.000Z",
        endingBefore: value.endingBefore || payload.model?.defaultEndingBefore || "2026-07-01T00:00:00.000Z"
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading((value) => ({ ...value, context: false }));
    }
  }

  useEffect(() => {
    loadContext();
  }, []);

  async function submitOverride(event) {
    event.preventDefault();
    setLoading((value) => ({ ...value, edit: true }));
    setError("");
    setEditResult(null);

    try {
      const payload = await postJson("/api/metronome/governance/allocation", {
        ...form,
        amount: signedAmount(form.mode, form.amount)
      });
      setEditResult(payload);
      await loadContext();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading((value) => ({ ...value, edit: false }));
    }
  }

  const combinedRequests = useMemo(
    () => [
      ...(context?.apiRequests ?? []),
      ...(editResult?.apiRequests ?? [])
    ],
    [context, editResult]
  );

  const contract = context?.contract;
  const model = context?.model;

  return (
    <main>
      <header className="topbar">
        <div>
          <p className="eyebrow">Caseware Verity</p>
          <h1>Seat Governance Allocations</h1>
          <p className="pageIntro">
            Model scheduled monthly user limits, pooled overflow credits, and mid-period allocation
            changes on a Metronome contract.
          </p>
        </div>
        <div className="headerActions">
          <a className="iconButton" href="/" aria-label="Back to invoice rollup">
            <ArrowLeft size={18} />
          </a>
          <button className="iconButton" onClick={loadContext} type="button" aria-label="Refresh contract data">
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      {error ? <ErrorBanner message={error} /> : null}

      {loading.context && !context ? (
        <EmptyState label="Loading governance contract" />
      ) : (
        <>
          <section className="governanceHero" aria-label="Governance model summary">
            <div className="bandIntro">
              <h2>Contract Context</h2>
              <p>{SECTION_COPY.context}</p>
            </div>
            <SummaryMetric icon={<ShieldCheck size={18} />} label="Customer" value={context?.customer?.name ?? "-"} />
            <SummaryMetric icon={<CalendarDays size={18} />} label="Contract Term" value="Jun 1, 2026 to Jun 1, 2027" />
            <SummaryMetric icon={<Users size={18} />} label="Seat IDs" value={`${model?.seatIds?.length ?? 0} assigned`} />
          </section>

          <section className="governanceGrid">
            <InfoPanel title="Recurring Credits" icon={<ShieldCheck size={20} />} description={SECTION_COPY.credits}>
              <table className="compactTable">
                <thead>
                  <tr>
                    <th>Layer</th>
                    <th>Priority</th>
                    <th>Allocation</th>
                    <th>Monthly Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>User-scoped credits</strong></td>
                    <td>1</td>
                    <td>Individual per userId</td>
                    <td>{formatCredits(model?.userMonthlyCreditsPerSeat)} / seat</td>
                  </tr>
                  <tr>
                    <td><strong>Pooled overflow credits</strong></td>
                    <td>2</td>
                    <td>Shared across seats</td>
                    <td>{formatCredits(model?.pooledMonthlyCreditsPerSeat)} / seat</td>
                  </tr>
                </tbody>
              </table>
              <div className="seatPills">
                {(model?.seatIds ?? []).map((seatId) => (
                  <span key={seatId}>{seatId}</span>
                ))}
              </div>
            </InfoPanel>

            <InfoPanel title="Edit User Allocation" icon={<UserCog size={20} />} description={SECTION_COPY.editor}>
              <form className="allocationForm" onSubmit={submitOverride}>
                <label>
                  <span>User</span>
                  <select
                    value={form.userId}
                    onChange={(event) => setForm((value) => ({ ...value, userId: event.target.value }))}
                  >
                    {(model?.seatIds ?? []).map((seatId) => (
                      <option key={seatId} value={seatId}>
                        {seatId}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Adjustment Type</span>
                  <div className="segmented">
                    <button
                      className={form.mode === "add" ? "active" : ""}
                      onClick={() => setForm((value) => ({ ...value, mode: "add" }))}
                      type="button"
                    >
                      Add
                    </button>
                    <button
                      className={form.mode === "deduct" ? "active danger" : ""}
                      onClick={() => setForm((value) => ({ ...value, mode: "deduct" }))}
                      type="button"
                    >
                      Deduct
                    </button>
                  </div>
                </label>
                <label>
                  <span>{form.mode === "deduct" ? "Credits to Deduct" : "Credits to Add"}</span>
                  <input
                    min="1"
                    step="1"
                    type="number"
                    value={form.amount}
                    onChange={(event) => setForm((value) => ({ ...value, amount: event.target.value }))}
                  />
                </label>
                <label>
                  <span>Effective At</span>
                  <input
                    type="datetime-local"
                    value={toDatetimeLocal(form.effectiveAt)}
                    onChange={(event) => setForm((value) => ({ ...value, effectiveAt: fromDatetimeLocal(event.target.value) }))}
                  />
                </label>
                <label>
                  <span>Ending Before</span>
                  <input
                    type="datetime-local"
                    value={toDatetimeLocal(form.endingBefore)}
                    onChange={(event) => setForm((value) => ({ ...value, endingBefore: fromDatetimeLocal(event.target.value) }))}
                  />
                </label>
                <button className="primaryButton" type="submit" disabled={loading.edit || !form.userId}>
                  {loading.edit ? "Submitting..." : `${form.mode === "deduct" ? "Deduct" : "Add"} User Override`}
                </button>
              </form>
              {editResult ? (
                <div className="successPanel">
                  <strong>Contract edit submitted</strong>
                  <span>
                    {adjustmentVerb(editResult.addedCredit?.access_schedule?.schedule_items?.[0]?.amount)}{" "}
                    {formatCredits(Math.abs(editResult.addedCredit?.access_schedule?.schedule_items?.[0]?.amount ?? 0))} for{" "}
                    {editResult.addedCredit?.specifiers?.[0]?.presentation_group_values?.userId}.
                  </span>
                </div>
              ) : null}
            </InfoPanel>
          </section>

          <section className="apiLedger" aria-label="Governance API requests">
            <div className="sectionTitle">
              <Database size={18} />
              <h2>Governance API Requests</h2>
            </div>
            <p className="sectionDescription">{SECTION_COPY.api}</p>
            <ApiRequestList requests={combinedRequests} />
          </section>

          <section className="methodPanel">
            <div className="sectionTitle">
              <Database size={18} />
              <h2>Contract Payloads</h2>
            </div>
            <p className="sectionDescription">
              Inspect the current Metronome contract response and the most recent contract edit response.
            </p>
            <div className="jsonGrid">
              <pre>{JSON.stringify(contract ?? null, null, 2)}</pre>
              <pre>{JSON.stringify(editResult?.editResponse ?? null, null, 2)}</pre>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function InfoPanel({ title, icon, description, children }) {
  return (
    <section className="methodPanel">
      <div className="sectionTitle">
        {icon}
        <h2>{title}</h2>
      </div>
      <p className="sectionDescription">{description}</p>
      {children}
    </section>
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

function ApiRequestList({ requests }) {
  if (!requests?.length) {
    return <p className="mutedText">No requests yet</p>;
  }

  return (
    <div className="requestList">
      {requests.map((request, index) => (
        <details key={`${request.url}-${index}`} className="requestDetails">
          <summary>
            <code>
              <span>{request.method}</span>
              {request.url}
            </code>
          </summary>
          {request.body ? <pre>{JSON.stringify(request.body, null, 2)}</pre> : null}
        </details>
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
      <ShieldCheck size={24} />
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

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed");
  }

  return payload;
}

function formatCredits(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(number)} Verity Credits`;
}

function signedAmount(mode, amount) {
  const number = Math.abs(Number(amount));
  return mode === "deduct" ? -number : number;
}

function adjustmentVerb(amount) {
  return Number(amount) < 0 ? "Deducted" : "Added";
}

function toDatetimeLocal(value) {
  if (!value) return "";
  return value.slice(0, 16);
}

function fromDatetimeLocal(value) {
  if (!value) return "";
  return new Date(`${value}:00.000Z`).toISOString();
}
