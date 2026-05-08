# Xledger Libya Branch Expansion Plan

## Decision

Use one Xledger application and one production Supabase database, then make the data model branch-aware.

The branch switcher in the app should change the active business branch, not the Supabase project or database connection.

This fits the current business context:

- Tunisia and Libya belong to the same company.
- The same users should be able to use the app.
- Branch data should be separate.
- Combined reporting may be useful later, but is not needed now.
- The only immediate visible difference is currency: Tunisia uses `TND`, Libya uses `LYD`.

## Why Not A Second Database

Creating a second Supabase project/database for Libya would work at first, but it creates duplicated operations:

- Every migration must be applied to both databases.
- Every RLS fix must be kept identical in two places.
- Every auth user/profile must be duplicated or synchronized.
- Every staging/production workflow becomes more complex.
- Future combined reporting becomes harder.
- Runtime database switching in the frontend would complicate Supabase Auth sessions and client setup.

Separate databases are worth considering only when there is a hard isolation requirement: different legal entity, separate administrators, separate backups, separate compliance boundaries, or no future need for cross-branch visibility.

For Xledger, a branch-aware single database is the cleaner path.

## Target Model

Add a `branches` table:

```sql
CREATE TABLE public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  country_code text NOT NULL,
  currency_code text NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);
```

Seed two rows:

| name | slug | country_code | currency_code |
| --- | --- | --- | --- |
| Tunisia | `tunisia` | `TN` | `TND` |
| Libya | `libya` | `LY` | `LYD` |

Add a branch membership table:

```sql
CREATE TABLE public.branch_memberships (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches (id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'mod', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, branch_id)
);
```

This table replaces the idea of one global role per user. The existing `profiles.role` can stay temporarily for compatibility, but the long-term source of permissions should be `branch_memberships.role`.

## Branch-Owned Tables

Add `branch_id` to every table whose records belong to one branch:

- `transactions`
- `employees`
- `products`
- `fixed_charges`
- `fixed_charge_requests`
- `subscriptions`
- `subcategories`
- `loan_contacts`
- `logs`

The current Tunisia data should be backfilled with the Tunisia branch id. Libya starts empty, except for any settings/entities you intentionally create.

## Foreign Key Integrity

It is not enough to add `branch_id` to `transactions`. The database should also prevent cross-branch links.

Example problem to prevent:

- Transaction has `branch_id = Libya`.
- Transaction references an employee whose `branch_id = Tunisia`.

Recommended pattern:

1. Add `branch_id` to the child and parent tables.
2. Add a unique pair on the parent table:

```sql
ALTER TABLE public.employees
  ADD CONSTRAINT employees_id_branch_id_key UNIQUE (id, branch_id);
```

3. Add a composite foreign key from `transactions`:

```sql
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_employee_branch_fk
  FOREIGN KEY (employee_id, branch_id)
  REFERENCES public.employees (id, branch_id);
```

Apply the same idea for:

- `transactions.product_id`
- `transactions.subcategory_id`
- `transactions.subscription_id`
- `transactions.loan_contact_id`
- `transactions.fixed_charge_id`
- `fixed_charge_requests.fixed_charge_id`
- `transactions.fixed_charge_request_id`

This keeps the database honest even if a frontend bug sends the wrong id.

## RLS Model

The frontend branch switcher is only a convenience. Real protection must happen in Row Level Security.

Create helper functions conceptually like:

```sql
public.can_access_branch(branch_id uuid)
public.has_branch_role(branch_id uuid, allowed_roles text[])
public.can_manage_branch(branch_id uuid)
public.can_edit_transactions_for_branch(branch_id uuid)
```

The important rule:

- RLS should check whether the authenticated user is a member of the row's `branch_id`.
- RLS should not trust a frontend-only "active branch" value.

Example policy shape:

```sql
CREATE POLICY read_transactions_by_branch
  ON public.transactions
  FOR SELECT
  TO authenticated
  USING (public.can_access_branch(branch_id));

CREATE POLICY insert_transactions_by_branch
  ON public.transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_branch_role(branch_id, ARRAY['admin'])
  );
```

The current app has global helper functions such as `can_edit_transactions()` that read from `profiles.role`. These should evolve into branch-aware checks. During migration, we can keep the old functions briefly, but the finished system should make permissions branch-specific.

Security note: the current migrations define `SECURITY DEFINER` helpers in the `public` schema. For new privileged helpers, the safer long-term design is to put them in a private, non-exposed schema and grant only the exact execute permissions needed. If we keep helpers in `public` for consistency with the existing app, we should be strict about `REVOKE` and `GRANT`.

## Application Architecture

Add a `BranchProvider` after authentication:

```tsx
<AuthProvider>
  <BranchProvider>
    <RoleProvider>
      ...
    </RoleProvider>
  </BranchProvider>
</AuthProvider>
```

Responsibilities:

- Load branches the current user can access.
- Choose a default branch.
- Store the selected branch id in `localStorage`.
- Fall back safely if the stored branch is no longer available.
- Expose `activeBranch`, `branches`, `setActiveBranch`, and loading/error state.

Then update `RoleProvider`:

- Read role from `branch_memberships`.
- Scope permissions to the active branch.
- Recompute permissions whenever the active branch changes.

## Query Strategy

Every data-loading function must be scoped by `branch_id`.

Examples:

```ts
getTransactions({ branchId, startDate, endDate })
getEmployees(branchId)
getProducts(branchId)
getFixedCharges(branchId)
getSubscriptions(branchId)
```

Every insert must include `branch_id`.

Examples:

```ts
createTransaction({
  branch_id: activeBranch.id,
  category: 'Recettes',
  amount,
  date,
})
```

RLS should still protect the database if a query forgets the branch filter, but the frontend should filter explicitly for performance and clarity.

## Currency Strategy

Amounts can remain numeric. The currency comes from the branch.

Replace the current `formatTND()` helper with a generic branch-aware formatter:

```ts
formatCurrency(amount, activeBranch.currency_code)
```

Immediate UI changes:

- Replace labels like `Montant (TND)` with `Montant (${currencyCode})`.
- Replace CSV headers like `Montant (TND)` with the active branch currency.
- Replace `formatTND(...)` usages with `formatCurrency(...)`.
- Keep whole-dinar formatting unless the business wants decimals later.

Important reporting rule:

- Do not sum `TND` and `LYD` together in one total unless an exchange-rate/conversion feature is added later.

For now, branch-specific reports are simple because each active branch has exactly one currency.

## UI Plan

Add the branch switcher in `AppLayout`, near the profile menu and fixed-charge bell.

Recommended behavior:

- Show the active branch name, for example `Tunisia` or `Libya`.
- Include currency as secondary text, for example `TND` or `LYD`.
- If the user has only one branch, show a passive label instead of a dropdown.
- On branch switch, reload the current page data under the new branch.
- Keep the route the same. The user remains on `/dashboard`, `/historique`, etc.

This preserves the feeling of one app while making the active business context obvious.

## Logs And Audit Trail

Add `branch_id` to `logs`.

Update `log_action()` so it copies the branch from the affected row:

- On insert/update: use `NEW.branch_id`.
- On delete: use `OLD.branch_id`.
- For global tables like `profiles`, allow `branch_id` to be null or handle separately.

Then update log viewing:

- Normal branch-level managers see logs for the active branch.
- A future super-admin view can show all branches if needed.

## Fixed Charge Requests

Fixed-charge recurrence must be branch-scoped.

Rules:

- `fixed_charges.branch_id` identifies the branch.
- `fixed_charge_requests.branch_id` should match the fixed charge.
- Generated requests only come from active fixed charges in the active branch.
- Approval creates a transaction with the same `branch_id`.
- Duplicate checks must include `branch_id`.

This matters because Tunisia and Libya may both have a fixed charge named `Internet`, but they are separate business records.

## Migration Phases

### Phase 1: Preparation

- Confirm staging database is available and production-like.
- Back up production before schema changes.
- Identify all current production users and their roles.
- Decide initial membership rules. Based on the current answer, likely every current user gets access to both branches with their existing role.

### Phase 2: Schema Foundation

- Create `branches`.
- Create `branch_memberships`.
- Seed Tunisia and Libya.
- Backfill branch memberships from `profiles.role`.
- Add `branch_id` columns as nullable to branch-owned tables.
- Backfill all existing records to Tunisia.

### Phase 3: Constraints

- Set `branch_id` to `NOT NULL` where appropriate.
- Add indexes on `branch_id`.
- Add composite uniqueness and composite foreign keys to prevent cross-branch relationships.
- Update fixed-charge request uniqueness if needed:

```sql
UNIQUE (branch_id, fixed_charge_id, due_date)
```

The existing `UNIQUE (fixed_charge_id, due_date)` may still be enough because `fixed_charge_id` is globally unique, but adding `branch_id` makes intent clearer and helps branch-scoped queries.

### Phase 4: RLS

- Replace global role checks with branch-aware membership checks.
- Update policies for all branch-owned tables.
- Verify `SELECT`, `INSERT`, `UPDATE`, and `DELETE` behavior with at least:
  - Tunisia admin
  - Libya admin
  - viewer
  - user with access to only one branch

### Phase 5: Frontend Branch Context

- Add `BranchProvider`.
- Update `RoleProvider` to depend on the active branch.
- Add `BranchSwitcher` to `AppLayout`.
- Store active branch in `localStorage`.
- Add loading/empty states for users with no branch access.

### Phase 6: Query Scoping

- Update all feature APIs to require or receive `branchId`.
- Add `.eq('branch_id', branchId)` to reads.
- Add `branch_id` to inserts.
- Ensure update/delete operations are still protected by RLS and do not accidentally operate across branches.

### Phase 7: Currency

- Replace `formatTND` with `formatCurrency`.
- Update all labels from hardcoded `TND` to active branch currency.
- Update unit tests.
- Update CSV export headers.

### Phase 8: Libya Setup

- Create Libya-specific:
  - employees
  - products
  - fixed charges
  - subcategories
  - subscriptions
  - loan contacts
- Confirm new Libya transactions display in `LYD`.
- Confirm Tunisia data remains unchanged and displays in `TND`.

### Phase 9: Release

- Deploy to staging first.
- Validate branch switching.
- Validate RLS with real auth users.
- Validate dashboard, history, reports, salaries, fixed charges, logs, and settings.
- Release to production.
- Monitor logs and user feedback for wrong-branch data entry.

## Testing Plan

Unit tests:

- `formatCurrency` formats `TND` and `LYD`.
- `BranchProvider` chooses the correct default branch.
- `RoleProvider` returns permissions for the active branch.
- Fixed-charge recurrence remains unchanged except for branch scoping.

Component tests:

- Branch switcher renders one branch or multiple branches correctly.
- Amount labels show `TND` or `LYD`.
- Forms include branch-specific data only.

API tests:

- Every list API filters by `branch_id`.
- Every create API includes `branch_id`.
- Fixed-charge request approval creates a transaction in the same branch.

E2E tests:

- Login.
- Switch to Tunisia and create a transaction.
- Switch to Libya and confirm Tunisia transaction is not visible.
- Create Libya transaction and confirm it displays `LYD`.
- Switch back to Tunisia and confirm Libya transaction is not visible.

RLS verification:

- A user without Libya membership cannot read Libya rows.
- A viewer cannot insert/update/delete branch rows.
- An admin/mod can perform only the operations allowed for that branch.

## Main Risks

| Risk | Mitigation |
| --- | --- |
| A query forgets `branch_id` and leaks data | RLS policies enforce branch membership |
| A transaction links to an entity from another branch | Composite foreign keys enforce matching `branch_id` |
| Users enter Libya data while Tunisia is selected | Branch switcher must be visible in the top layout |
| Reports accidentally combine `TND` and `LYD` | Keep reports branch-scoped until currency conversion exists |
| Old hardcoded `TND` labels remain | Search for `TND`, `formatTND`, and `Montant (TND)` during implementation |
| Existing global role logic conflicts with branch roles | Move permission checks to `branch_memberships` |
| Logs lose branch context | Add `branch_id` to logs and update `log_action()` |

## Acceptance Criteria

The work is complete when:

- Tunisia and Libya exist as selectable branches.
- Existing production data belongs to Tunisia.
- Libya starts with separate business data.
- The same users can access the branches they are assigned to.
- The active branch controls all reads, inserts, updates, and deletes.
- RLS prevents cross-branch access even if frontend filtering fails.
- Tunisia amounts show `TND`.
- Libya amounts show `LYD`.
- Fixed-charge requests and approvals are branch-scoped.
- Logs are branch-scoped.
- Branch switching does not require logout or app redeploy.
- Staging validation passes before production release.

## Recommended Implementation Order

1. Database branch foundation.
2. Backfill Tunisia data.
3. RLS and permission helpers.
4. Branch provider and switcher.
5. Query scoping.
6. Currency formatting.
7. Libya seed/setup.
8. Full staging validation.
9. Production release.

This order keeps the risky data isolation work ahead of the UI polish, which is the right tradeoff for an accounting app.
