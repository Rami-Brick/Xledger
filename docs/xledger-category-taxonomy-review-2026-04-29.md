# Xledger Category Taxonomy Review

Date: 2026-04-29  
Source export: `zResources/transactions_2025-12-31_2026-04-29.csv`  
App context reviewed: transaction categories, category forms, products, subcategories, dashboard, and reports.

## Executive summary

Xledger's current workflow is intentionally simple: people log company money movements in WhatsApp, then the transaction is entered into the app. The categories should protect that speed while making the history more useful.

The strongest recommendation is to rework **Fournisseurs** into **Produits**. The data shows that the current "Fournisseurs" category is not really tracking suppliers; it is tracking product-level costs. The app already has a `products` table and a product selector inside the Fournisseurs form, so this is mostly a naming and reporting mismatch.

The second major recommendation is to separate **operating profit/loss** from **cash movements**. In the raw export, total net is **+24,873 TND**. After excluding loans and one clear bank withdrawal/internal movement, operating net is only **+4,396 TND**. That is a big enough difference that Xledger should report both numbers deliberately.

## Dataset overview

The CSV filename starts at `2025-12-31`, but the actual exported rows begin on **2026-02-18** and end on **2026-04-29**.

| Metric | Value |
| --- | ---: |
| Transactions | 296 |
| Gross revenue, raw | 138,882 TND |
| Gross expenses, raw | 114,009 TND |
| Net, raw | +24,873 TND |
| Gross revenue, excluding loans and bank withdrawal | 109,032 TND |
| Gross expenses, excluding loans | 104,636 TND |
| Operating net estimate | +4,396 TND |

Operating monthly estimate:

| Month | Revenue | Expenses | Net |
| --- | ---: | ---: | ---: |
| 2026-02 | 7,557 TND | 8,288 TND | -731 TND |
| 2026-03 | 31,725 TND | 30,446 TND | +1,279 TND |
| 2026-04 | 69,750 TND | 65,902 TND | +3,848 TND |

## Current category evidence

| Category | Count | Expense | Revenue | Notes |
| --- | ---: | ---: | ---: | --- |
| Recettes | 63 | 0 TND | 109,112 TND | Mostly Navex and Cosmos. Detail is always empty. |
| Sponsoring | 26 | 43,985 TND | 0 TND | Largest expense bucket. Description is almost always "Crypto". |
| Prêts | 18 | 9,373 TND | 29,770 TND | Cash-flow category, not operating revenue/expense. |
| Fournisseurs | 29 | 36,934 TND | 0 TND | Mostly product-level Biovera costs. |
| Salaires | 50 | 11,970 TND | 0 TND | Works well because employee detail is captured. |
| Divers | 44 | 4,234 TND | 0 TND | Low total spend, but too many unrelated meanings. |
| Charges fixes | 11 | 3,627 TND | 0 TND | Good concept, but some invoices leaked into Divers. |
| Transport | 32 | 2,025 TND | 0 TND | Good category; subcategories are useful. |
| Packaging | 23 | 1,861 TND | 0 TND | Mostly shipping/fulfillment supplies. |
| Subscriptions | 0 | 0 TND | 0 TND | Exists in the app but is unused in this export. |

## Recommended top-level taxonomy

### 1. Recettes

Keep this category, but add a required **source/channel** field.

Observed sources:

| Source | Count | Revenue |
| --- | ---: | ---: |
| Navex / Recette Navex | 56 | 100,333 TND |
| Cosmos | 6 | 8,699 TND |
| Bank withdrawal | 1 | 80 TND |

Recommended change:

- Normalize `Navex` and `Recette Navex` into one revenue source: `Navex`.
- Keep `Cosmos` as a revenue source.
- Do not treat `Retrait depuis compte bancaire société` as revenue. It should be an internal transfer or cash movement.

### 2. Produits

Replace or relabel **Fournisseurs** as **Produits**.

Evidence:

| Product/detail | Count | Expense |
| --- | ---: | ---: |
| Biovera | 25 | 31,633 TND |
| Manchons | 1 | 3,241 TND |
| حامل هاتف الصلاة و قيام الليل الأصلي | 1 | 2,000 TND |
| Fortika | 1 | 40 TND |
| كتاب ديني | 1 | 20 TND |

The current detail column behaves like product, not supplier. The form also already says `Produit` and writes `product_id`.

Recommended product cost types:

- `Production / inventory`
- `Product packaging / labels / stickers`
- `Delivery / freight`
- `Sample / test order`
- `Other product cost`

This keeps the WhatsApp logging quick while allowing reports like: "How much did Biovera cost this month?" and "How much of Biovera was production vs delivery vs labels?"

### 3. Marketing / Ads

Rename **Sponsoring** to **Marketing / Ads** or **Publicité**.

Evidence:

- Sponsoring is the largest expense category: **43,985 TND**, or **38.6%** of raw expenses.
- The description is nearly always `Crypto`, which describes payment method, not business purpose.

Recommended fields:

- `Channel`: Facebook Ads, TikTok Ads, influencer, manual crypto buy, other.
- `Campaign/Product`: Biovera, Fortika, company brand, other.
- `Payment method`: crypto, cash, bank, card.

`Crypto` should become a payment method, not the transaction description.

### 4. Salaires

Keep as-is. It already has the right shape: employee detail, salary month support, and clear recurring usage.

Possible small improvement:

- Add a salary type field if needed later: base salary, bonus, advance, commission, freelancer.

### 5. Charges fixes

Keep the category, but make sure recurring telecom/internet/tax/rent entries do not fall into Divers.

Current recurring examples:

- Loyer bureau
- Loyer entrepôt
- Déclaration mensuelle DGI
- Facture Telecom internet
- Facture Ooredoo

Decision needed:

- Either keep **Subscriptions** separate for software/subscription tools only.
- Or merge unused **Subscriptions** into Charges fixes and use fixed-charge records for all recurring costs.

Given the current export has no Subscriptions transactions, merging it into Charges fixes may keep the system simpler.

### 6. Transport

Keep category and subcategories. The current split is useful.

Observed subcategories:

- Essence Kia
- Diesel Citroen
- Kia repair
- Transporteur produit
- Taxi
- Pickup fee

Recommended adjustment:

- Separate vehicle fuel/maintenance from product delivery if delivery is part of product cost. For example, `Transporteur produit` can either stay in Transport or move to `Produits > Delivery / freight`, depending on how you want product margin reports to work.

### 7. Packaging

Keep this category, but define it narrowly as shipping/fulfillment supplies.

Observed examples:

- Sac expedition
- Bubble wrap
- Scotch emballage
- Carton scotch
- Fragile stickers
- Encre imprimante
- Papier A3 Fortika

Recommended label:

- Either keep `Packaging`
- Or rename to `Emballage expédition`

Important distinction:

- Shipping supplies should stay here.
- Product packaging tied to inventory batches, labels, stickers, bottles, and product-specific packaging should move to `Produits`.

### 8. Prêts

Keep, but mark it as cash-flow only.

Evidence:

- Revenue-side loan entries: **29,770 TND**
- Expense-side loan/repayment entries: **9,373 TND**
- Net loan impact in raw balance: **+20,397 TND**

This category is useful for cash visibility, but it distorts profit/loss if mixed into revenue and expenses.

Recommended reporting behavior:

- Cash balance: include Prêts.
- Operating P&L: exclude Prêts.
- Loan report: show contact-level balances.

Also fix one data quality issue: there is a `Recu - undefined` loan description.

### 9. Divers

Keep Divers only as an exception bucket. Right now it contains several repeatable patterns.

Suggested split based on the export:

| Proposed bucket | Count | Expense | Examples |
| --- | ---: | ---: | --- |
| Marketing content / creative production | 7 | 1,695 TND | Shooting, voice-over, videography, Biovera photography |
| Admin / legal / company documents | 11 | 390 TND | Contracts, RNE, company stamp, municipal copies |
| Office / warehouse supplies | 8 | 375 TND | Cleaning supplies, paper, keys, tools |
| Refunds / returns | 3 | 317 TND | Client refund, Fortika return |
| Employee support / health | 2 | 240 TND | Doctor, medicine |
| Meals / coffee | 2 | 90 TND | Fast food, meals |
| Vehicle penalty spillover | 1 | 180 TND | Road fine |

Recommended change:

- Add subcategories for Divers, or create new top-level categories for the repeatable buckets.
- A good first step is to add subcategories instead of adding too many new buttons.

## Proposed final category list

Recommended simple version:

1. `Recettes`
2. `Produits`
3. `Marketing / Ads`
4. `Salaires`
5. `Charges fixes`
6. `Transport`
7. `Packaging`
8. `Prêts`
9. `Divers`

Optional additions if you want cleaner reporting:

1. `Admin & juridique`
2. `Fournitures bureau / entrepôt`
3. `Remboursements & retours`

The simple version keeps the app close to the current WhatsApp-to-Xledger workflow. The optional version makes reporting cleaner but adds more choices during entry.

## Data cleanup recommendations

High confidence cleanup:

- Rename or relabel historical `Fournisseurs` records as `Produits`.
- Normalize revenue detail/source:
  - `Navex`
  - `Cosmos`
- Mark `Retrait depuis compte bancaire société` as internal transfer/cash movement, not revenue.
- Move Ooredoo invoices from Divers into Charges fixes or Subscriptions.
- Move Biovera creative production from Divers into Marketing content.
- Move company registration, contracts, RNE, stamps, and legal paperwork from Divers into Admin / juridique.
- Move paper, cleaning supplies, keys, lamps, tools, and warehouse supplies from Divers into Office / warehouse supplies.
- Fix `Recu - undefined` in Prêts.

Medium confidence cleanup:

- Move `Transporteur produit`, product delivery fees, and supplier delivery fees into `Produits > Delivery / freight` if product margin reporting matters.
- Move product labels/stickers/product-specific packaging into `Produits > Product packaging / labels`.
- Keep general shipping supplies like bags, bubble wrap, tape, and cartons under Packaging.

## Implementation path for Xledger

### Phase 1: Low-risk naming cleanup

- Change the visible label `Fournisseurs` to `Produits` while optionally keeping the stored category value as `Fournisseurs` temporarily.
- Rename UI copy:
  - `FournisseursForm` title/copy to product purchasing language.
  - Products settings subtitle from "suivi fournisseurs" to "suivi des coûts produits".
- Update reports to display `Produits`.

This gives the team the improved category immediately without a database migration.

### Phase 2: Better transaction classification

Add fields that separate meaning without adding too many top-level buttons:

- `cash_flow_type`: operating, loan, internal_transfer, refund, owner_contribution, other.
- `affects_pnl`: boolean, default true for normal revenue/expense, false for loans/internal transfers.
- `payment_method`: cash, bank, card, crypto, other.
- Product cost type for Produits.
- Revenue source for Recettes.

This solves the current problem where positive amounts are treated as revenue and negative amounts as expenses even when they are loans or internal transfers.

### Phase 3: Extend subcategories

The app currently supports subcategories only for Transport and Packaging. Extend subcategories so they can apply to:

- Divers
- Produits
- Marketing / Ads
- Recettes, if source is not implemented as its own table

This keeps the main entry screen simple while making reports much more useful.

## Category decision rules

Use these rules when entering future WhatsApp messages:

| If the message says... | Enter as... |
| --- | --- |
| Product batch, bottles, labels, stickers, supplier payment, Wafacash supplier transfer | Produits |
| Product delivery from supplier or batch freight | Produits > Delivery / freight |
| Shipping bags, tape, bubble wrap, cartons used to fulfill orders | Packaging |
| Facebook/TikTok/crypto ad spend/campaign spend | Marketing / Ads |
| Photo shoot, video shoot, voice-over, creative assets | Marketing content |
| Rent, telecom, Ooredoo, DGI, internet | Charges fixes |
| Fuel, taxi, vehicle repair | Transport |
| Money borrowed, lent, returned, received from a contact | Prêts |
| Bank withdrawal or cash movement between company funds | Internal transfer, not Recettes |
| Customer refund, return, reimbursement | Remboursements & retours |
| Company documents, contracts, RNE, stamps | Admin & juridique |

## Risks and open questions

- The export does not include `is_internal`, so internal/cash movements are inferred from descriptions.
- The report assumes the goal is both cash tracking and business profitability. If the only goal is cash-on-hand, fewer reporting changes are needed.
- Product margin reporting needs a clear decision: should delivery and product-specific packaging be part of product cost? For real margin analysis, yes.
- `Subscriptions` may be useful later for software tools, but based on this export it is currently not pulling its weight as a separate category.

## Recommended next step

Implement the low-risk UI rename first: **Fournisseurs → Produits**. Then add reporting filters for:

- Cash balance
- Operating P&L
- Loans

That sequence gives the biggest clarity improvement without making transaction entry slower.
