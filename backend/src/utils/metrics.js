import { pool } from "../config/database.js";

/**
 * Minimal, dependency-free Prometheus text-exposition-format metrics.
 *
 * We deliberately do NOT depend on prom-client here since it's not
 * already a project dependency — this is a small, self-contained
 * implementation covering exactly the metric types this app needs
 * (Counter, Gauge, Histogram). If prom-client is added to package.json
 * later, this file can be swapped out without touching call sites, since
 * every metric is used only through .inc()/.set()/.observe().
 *
 * Label cardinality is kept deliberately low: no applicationId, no
 * filenames, no tokens, no PII in any label anywhere in this file. Route
 * labels use the Express route pattern (e.g. "/submissions/:applicationId")
 * rather than the raw URL, so cardinality stays bounded regardless of
 * how many distinct application IDs exist.
 */

function labelKey(labels) {
  const keys = Object.keys(labels).sort();
  return keys
    .map((k) => `${k}="${String(labels[k]).replace(/"/g, '\\"')}"`)
    .join(",");
}

class Counter {
  constructor(name, help) {
    this.name = name;
    this.help = help;
    this.values = new Map(); // labelKey -> number
  }
  inc(labels = {}, value = 1) {
    const key = labelKey(labels);
    this.values.set(key, (this.values.get(key) || 0) + value);
    this._lastLabels = this.values.size ? labels : {};
    if (!this._labelsByKey) this._labelsByKey = new Map();
    this._labelsByKey.set(key, labels);
  }
  render() {
    let out = `# HELP ${this.name} ${this.help}\n# TYPE ${this.name} counter\n`;
    for (const [key, value] of this.values.entries()) {
      out += key
        ? `${this.name}{${key}} ${value}\n`
        : `${this.name} ${value}\n`;
    }
    return out;
  }
}

class Gauge {
  constructor(name, help) {
    this.name = name;
    this.help = help;
    this.values = new Map();
  }
  set(labels, value) {
    if (value === undefined) {
      value = labels;
      labels = {};
    }
    this.values.set(labelKey(labels), value);
  }
  inc(labels = {}, value = 1) {
    const key = labelKey(labels);
    this.values.set(key, (this.values.get(key) || 0) + value);
  }
  dec(labels = {}, value = 1) {
    this.inc(labels, -value);
  }
  render() {
    let out = `# HELP ${this.name} ${this.help}\n# TYPE ${this.name} gauge\n`;
    for (const [key, value] of this.values.entries()) {
      out += key
        ? `${this.name}{${key}} ${value}\n`
        : `${this.name} ${value}\n`;
    }
    return out;
  }
}

/**
 * Fixed-bucket histogram. Exposes standard `_bucket{le="..."}`,
 * `_sum`, `_count` series — Prometheus/Grafana compute p50/p95/p99 from
 * these via histogram_quantile(); this module does not compute
 * quantiles itself (per "do not build Grafana").
 */
class Histogram {
  constructor(name, help, buckets) {
    this.name = name;
    this.help = help;
    this.buckets = buckets;
    this.data = new Map(); // labelKey -> { counts: number[], sum, count, labels }
  }
  observe(labels = {}, value) {
    if (value === undefined) {
      value = labels;
      labels = {};
    }
    const key = labelKey(labels);
    let entry = this.data.get(key);
    if (!entry) {
      entry = {
        counts: new Array(this.buckets.length).fill(0),
        sum: 0,
        count: 0,
        labels,
      };
      this.data.set(key, entry);
    }
    entry.sum += value;
    entry.count += 1;
    for (let i = 0; i < this.buckets.length; i++) {
      if (value <= this.buckets[i]) entry.counts[i] += 1;
    }
  }
  render() {
    let out = `# HELP ${this.name} ${this.help}\n# TYPE ${this.name} histogram\n`;
    for (const [key, entry] of this.data.entries()) {
      const baseLabels = key ? `${key},` : "";
      for (let i = 0; i < this.buckets.length; i++) {
        out += `${this.name}_bucket{${baseLabels}le="${this.buckets[i]}"} ${entry.counts[i]}\n`;
      }
      out += `${this.name}_bucket{${baseLabels}le="+Inf"} ${entry.count}\n`;
      out += key
        ? `${this.name}_sum{${key}} ${entry.sum}\n${this.name}_count{${key}} ${entry.count}\n`
        : `${this.name}_sum ${entry.sum}\n${this.name}_count ${entry.count}\n`;
    }
    return out;
  }
}

const DURATION_BUCKETS_SECONDS = [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60];

const httpRequestsTotal = new Counter(
  "hsea_http_requests_total",
  "Total HTTP requests by method, route, and status code.",
);
const httpRequestDurationSeconds = new Histogram(
  "hsea_http_request_duration_seconds",
  "HTTP request duration in seconds.",
  DURATION_BUCKETS_SECONDS,
);

const documentUploadAttempts = new Counter(
  "hsea_document_upload_attempts_total",
  "Document upload attempts by document type.",
);
const documentUploadSuccess = new Counter(
  "hsea_document_upload_success_total",
  "Successful document uploads by document type.",
);
const documentUploadFailure = new Counter(
  "hsea_document_upload_failure_total",
  "Failed document uploads by document type and reason.",
);
const documentUploadDurationSeconds = new Histogram(
  "hsea_document_upload_duration_seconds",
  "Document upload processing duration in seconds (validation + storage + DB write).",
  DURATION_BUCKETS_SECONDS,
);
const documentUploadBytesTotal = new Counter(
  "hsea_document_upload_bytes_total",
  "Total bytes accepted across all document uploads.",
);
const documentDownloadsTotal = new Counter(
  "hsea_document_downloads_total",
  "Document download/stream requests by document type.",
);
const documentDeletionsTotal = new Counter(
  "hsea_document_deletions_total",
  "Document deletions by document type.",
);
const activeUploads = new Gauge(
  "hsea_active_uploads",
  "Number of document uploads currently being processed by this instance.",
);

function renderPoolMetrics() {
  // pool.totalCount/idleCount/waitingCount are provided by node-postgres
  // directly — no extra bookkeeping needed on our side.
  let out = "";
  out += `# HELP hsea_pg_pool_total_connections Total PostgreSQL pool connections.\n# TYPE hsea_pg_pool_total_connections gauge\nhsea_pg_pool_total_connections ${pool.totalCount ?? 0}\n`;
  out += `# HELP hsea_pg_pool_idle_connections Idle PostgreSQL pool connections.\n# TYPE hsea_pg_pool_idle_connections gauge\nhsea_pg_pool_idle_connections ${pool.idleCount ?? 0}\n`;
  out += `# HELP hsea_pg_pool_waiting_requests Requests waiting for a PostgreSQL connection.\n# TYPE hsea_pg_pool_waiting_requests gauge\nhsea_pg_pool_waiting_requests ${pool.waitingCount ?? 0}\n`;
  return out;
}

/**
 * Express middleware that instruments every request. Route label uses
 * req.route/baseUrl where available to avoid unbounded cardinality from
 * path parameters (falls back to "unmatched" for 404s, which is fine —
 * that's a single bounded label value, not one per bad URL).
 */
function httpMiddleware() {
  return (req, res, next) => {
    const start = process.hrtime.bigint();
    res.on("finish", () => {
      const routePath = req.route?.path
        ? `${req.baseUrl || ""}${req.route.path}`
        : "unmatched";
      const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
      httpRequestsTotal.inc({
        method: req.method,
        route: routePath,
        status: String(res.statusCode),
      });
      httpRequestDurationSeconds.observe(
        { method: req.method, route: routePath },
        durationSeconds,
      );
    });
    next();
  };
}

function renderPrometheus() {
  return [
    httpRequestsTotal.render(),
    httpRequestDurationSeconds.render(),
    documentUploadAttempts.render(),
    documentUploadSuccess.render(),
    documentUploadFailure.render(),
    documentUploadDurationSeconds.render(),
    documentUploadBytesTotal.render(),
    documentDownloadsTotal.render(),
    documentDeletionsTotal.render(),
    activeUploads.render(),
    renderPoolMetrics(),
  ].join("\n");
}

export const metrics = {
  httpMiddleware,
  renderPrometheus,
  documentUploadAttempts,
  documentUploadSuccess,
  documentUploadFailure,
  documentUploadDurationSeconds,
  documentUploadBytesTotal,
  documentDownloadsTotal,
  documentDeletionsTotal,
  activeUploads,
};
