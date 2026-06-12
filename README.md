# WinnerFlags × CUIGG

This repository hosts two **separate apps** behind a small **app-store hub**:

| App | Stack | Location | Run |
|-----|-------|----------|-----|
| **App Hub** | Next.js | `src/app/page.tsx` (route `/`) | part of `npm run dev` |
| **Ordering System** | Next.js | `src/app/(order)/…` (route `/order`) | part of `npm run dev` |
| **Report Maker** | Python / Streamlit | `reporting/` | `cd reporting && streamlit run app.py` |

The hub at `/` is a branded **WinnerFlags × CUIGG** launcher: it shows a card per
app and links out to each. The two apps are independent — each runs on its own
and keeps its own menu/functions. They are linked only by the hub.

## Ordering System + Hub (Next.js)

```bash
npm install
npm run dev
```

Open http://localhost:3000:
- `/` — the app hub (choose an app)
- `/order` — the ordering funnel (run size → artwork → details → review → payment)
- `/sample`, `/enquiry`, `/order-success` — supporting pages

### Routing structure

The ordering app lives inside a route group `(order)/` so it can own the
`OrderProvider` context and the order-step chrome without affecting the hub:

```
src/app/
  layout.tsx                       # root: html/body/fonts only (no OrderProvider)
  page.tsx                         # the app hub  (route: /)
  (order)/
    layout.tsx                     # OrderProvider + ordering metadata
    order/
      page.tsx                     # ordering landing (route: /order)
      step/
        layout.tsx                 # Header + ProgressIndicator chrome
        [step]/page.tsx            # steps (route: /order/step/N)
  sample/ · enquiry/ · order-success/
```

## Report Maker (Streamlit)

A standalone, local survey-reporting tool. See `reporting/README.md` for details.

```bash
cd reporting
pip install -r requirements.txt
streamlit run app.py            # serves on http://localhost:8501
```

## Configuration

Copy `.env.example` to `.env.local` and fill in. The hub's **Report Maker**
card opens `NEXT_PUBLIC_REPORT_MAKER_URL` (default `http://localhost:8501`); set
it to the deployed Report Maker URL in production. The Report Maker can link
back to the hub via its own `HUB_URL` env var (default `http://localhost:3000`).
