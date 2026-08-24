# Runbook: GCP Billing Export + Budget Alert

**Owner action, not code.** This is P0.1 from
`docs/reports/2026-08-24-gemini-cost-audit.md` — a Console-only setup step
that gives real $/day cost visibility (broken down by service/SKU) and an
email tripwire at spend thresholds. Nobody had this visibility before the
2026-08-24 cost audit; it's the prerequisite for measuring whether any
future cost change (model choice, caching, etc.) actually helped.

**Project:** `mrt-pallet-iq`
**Billing account:** `015773-4893BC-1DB3A1`

## Part 1 — Detailed billing export to BigQuery

Gives you a queryable table of every dollar spent, broken down by
service/SKU/day — the foundation for actually seeing where Gemini spend
goes, not just a project-level total.

1. Go to [BigQuery in the Console](https://console.cloud.google.com/bigquery?project=mrt-pallet-iq)
   (confirm `mrt-pallet-iq` is the selected project, top-left dropdown).
2. Click the project name in the left panel → **Create dataset**.
   - Dataset ID: `billing_export`
   - Location: any region (e.g. `us-central1`) — doesn't need to match the
     Functions region.
   - Leave other settings default → **Create dataset**.
3. Go to [Billing → Billing export](https://console.cloud.google.com/billing/015773-4893BC-1DB3A1/export)
   for this billing account.
4. Under **Detailed usage cost** (not "Standard usage cost" — detailed is
   what gives per-SKU granularity, e.g. separating Gemini's flat
   grounding-request fee from its token costs), click **Edit settings**.
5. Select project `mrt-pallet-iq` and the `billing_export` dataset created
   above → **Save**.

New data starts flowing from that point forward — **it does not backfill
history**, so the earlier this is done the more useful it becomes. First
rows typically appear within a few hours. BigQuery storage/query cost for
a project this size is trivial (comfortably inside the free tier).

Once populated (give it a day), a first useful query:

```sql
SELECT
  service.description AS service,
  sku.description AS sku,
  SUM(cost) AS total_cost,
  SUM(usage.amount) AS usage_amount
FROM `mrt-pallet-iq.billing_export.gcp_billing_export_resource_v1_015773_4893BC_1DB3A1`
WHERE service.description LIKE '%Generative Language%'
  AND usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY service, sku
ORDER BY total_cost DESC
```

(Gemini API billing typically appears under a service named "Generative
Language API" or similar — confirm the exact name once real rows land.)

## Part 2 — Budget alert

A lightweight tripwire that emails you at spend thresholds. It doesn't
stop anything automatically — it's a "notice, don't guess" signal.

1. Go to [Billing → Budgets & alerts](https://console.cloud.google.com/billing/015773-4893BC-1DB3A1/budgets).
2. **Create budget**.
3. **Scope**: project `mrt-pallet-iq` (or all projects under this billing
   account, if it's the only one — same effect).
4. **Amount**: a round monthly number that would be a genuine surprise if
   hit. Start conservative; recalibrate once Part 1's data gives a real
   baseline to compare against.
5. **Actions/thresholds**: the default 50% / 90% / 100% is a reasonable
   starting point.
6. **Notifications**: leave "Email alerts to billing admins and users"
   checked. Skip the Pub/Sub topic unless something programmatic is
   wired up later.
7. **Create budget**.

## Verifying it's live

Both pieces are checkable read-only via the Cloud Billing / BigQuery
APIs, without opening the Console again:

- Billing export dataset exists: `bq ls --project_id=mrt-pallet-iq` (or
  `GET https://bigquery.googleapis.com/bigquery/v2/projects/mrt-pallet-iq/datasets`)
  should list `billing_export` with rows once data starts flowing.
- Budget exists: the Cloud Billing Budget API
  (`billingbudgets.googleapis.com/v1/billingAccounts/015773-4893BC-1DB3A1/budgets`)
  lists any created budgets.
