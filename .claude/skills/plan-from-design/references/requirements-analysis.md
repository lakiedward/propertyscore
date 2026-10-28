# Requirements analysis: from screens to schema, backend, auth and integrations

The design says what a screen shows and lets people do. The plan says where the data lives and what the rules are. This reference turns both into concrete requirements, every item traceable to its source.

## 1. Sources and precedence

Use the precedence in `.claude/skills/implement/references/gap-analysis.md` §1. In short: rules decide how, the design decides how it looks, the plan decides data, permissions and behaviour, and the code and local schema decide what already exists. A design element that needs data, permissions or behaviour the plan does not describe is **new from design** and needs the user's yes.

## 2. Screen data inventory (from the design)

For every screen in scope, the design spec subagent lists:

| Kind | What to capture | Example |
| --- | --- | --- |
| Displayed value | label, format, where it appears, which entity it belongs to | "Scor 7,4" on the property card → property score, 1 decimal |
| List or collection | what is listed, sort, filters, pagination or infinite scroll, empty state | appointments list, sorted by date, filter by status |
| Input | field, type, required, validation shown, default | phone, required, Romanian format |
| Action | button or link, what it changes, confirmation, success and error feedback | "Anulează programarea" → appointment cancelled |
| State | loading, empty, error, permission, special states per state machine | `slot taken`, `invitation expired` |
| Media | images, files, maps, 360° views, uploads and their limits | property photos, upload up to 20 |
| Visibility | who sees the element (anonymous, owner, inspector, admin) | "Editează" only for the owner |
| Static content | text that is copy, not data | hero headline → translation keys |

Values that are clearly copy go to translations; values that vary per user, property or time are data.

## 3. Data requirements matrix

Combine the inventory with the plan digest and the code report:

```
| Screen | Element | Kind | Served by | Plan ref | Status | Note |
| / | featured listings | list | listings (status = published), listing_photos | §7.7, S25 | in plan · deferred | |
| /account/appointments | appointment status chip | displayed | appointments.status (enum appointment_status) | §7.6, §8.1 | in plan | |
| /inspection/confirmation | "Adaugă în calendar" | action | client-side .ics from appointment fields | §5.2 [D] | new from design · UI only | no data |
| /account | avatar | displayed | profiles.avatar_path + bucket avatars | — | new from design · needs data | ask |
```

Status values: `exists` (in the local schema and code), `in plan` (in §7 but not built), `new from design · UI only` (case 1 of `design-analysis.md` §6, no new data), `new from design · needs data` (case 2, needs a yes), `deferred` (owned by a later step).

Served by is one of: `table.column`, a view, an RPC, an Edge Function, a Storage bucket, a computed value (and where it is computed), the auth session, or `copy`.

## 4. Schema derivation

From the matrix, list every table the scope reads or writes and, for each one:

1. **Reconcile with §7 and the migrations.** Start from the plan's table definition and what already exists. Never recreate an existing table; extend it with a new migration. Never edit a migration that is on `main`.
2. **Columns**: name, type, nullability, default, `check`, `unique`, foreign key with `on delete` behaviour. Apply `.claude/rules/supabase.md`: `id`, `created_at`, `updated_at` and its trigger, `owner_id` for user-owned rows, money as `numeric(12, 2)` plus `currency`, enums with English codes, `unaccent` and trigram for searched text, `"ro-x-icu"` collation for sorted names.
3. **Relationships**: cardinality and the owning side, with a short diagram when there are more than three tables.
4. **Indexes**: every foreign key, every column a policy filters on, every column the screens filter or sort on (from the matrix).
5. **RLS**: from the §7.12 matrix and the matrix's Visibility column, one policy per operation and role, named as an English sentence, with `using` and `with check`. Role checks go through `private` `security definer` helpers; roles come from the `user_role` claim. Columns the client must not write get column privileges or a trigger.
6. **Functions and triggers**: multi-table writes, state transitions (§8) and calculations (§9) as Postgres functions with error codes; `security invoker` unless `definer` is required.
7. **Views**: only when a screen needs a read model that would otherwise need several queries; `security_invoker = true`.
8. **Storage**: buckets, public or private, size limit, MIME types, object path pattern, `storage.objects` policies.
9. **Seed**: the rows the screens need to be reviewed locally, with Romanian diacritics, for each test user and role.
10. **pgTAP**: for every policy, the allowed and the denied case; for every function, its error codes.
11. **Migrations**: grouped and named `<verb>_<object>`, in dependency order, each creating its tables with RLS enabled in the same file.

## 5. Backend logic

For each server-side behaviour the scope needs:

| Behaviour | Where | Trigger | Rules enforced | Errors (codes) | Plan ref |
| Book a slot | RPC `book_inspection_slot` | wizard submit | slot free, hold 15 min, state `pending_payment` | `slot_taken`, `slot_expired` | §7.14, §8.1 |

Choose the place with `.claude/rules/supabase.md`: SQL functions for business rules and multi-table writes, Edge Functions only for third-party APIs with secrets, webhooks and secret-key work, `pg_cron` for timeouts. Frontend code never enforces a rule the database does not also enforce.

## 6. Auth and access

For each screen in scope:

| Screen | Anonymous | Signed in | Owner | Inspector | Admin | Guard (`beforeLoad`) | RLS policies relied on |

Plus: sign-in methods the screens use (password, email OTP, magic link, per §11 D5), redirects (§3.4), session handling (`.claude/rules/data-api.md`), email templates touched (`supabase/templates/`, both languages), and auth settings in `supabase/config.toml`.

## 7. Integrations

For each third-party service the scope touches (payments, maps, geocoding, email, SMS, analytics, monitoring):

| Service | Used for | Called from | Secret and where it lives | Webhook and its verification | Local testing | Failure behaviour | Plan ref |

Secrets never reach a `VITE_` variable. An integration whose provider or account is not decided yet is an open question; a decision in §11 that blocks it is listed with the plan's recommendation.

## 8. Design fidelity check

Used during execution after each screen, and again in verification:

1. Open the running page in the in-app browser (`preview_start` with `property-score-dev`) and the matching design screen in a second tab (the normalised export file), both at 375 px and then 1440 px. For a screen whose mobile source is `derived` (`design-analysis.md` §8.5) there is nothing to compare at 375 px: check the page instead against the approved derived layout and the §8.5 patterns.
2. Screenshot both and compare section by section: layout and order, spacing rhythm, type scale and weight, colours, radii, shadows, icons, copy, states.
3. Every difference is one of: a bug to fix now; a design-system deviation already listed in the plan (keep the design-system version); a rule requirement (accessibility, translations, semantic structure); or a new difference to ask about.
4. Resize the running page through 360, 768, 1024 and 1440 px: no horizontal scroll, nothing overlapping or cut off, touch targets at `--touch-min`, and the layout switching at the spec's breakpoints.
5. Check the screen's code against its markup mapping (`.claude/skills/implement/references/design-analysis.md` §8): every block became the mapped component, and nothing from the export survived (class names, `style` attributes, arbitrary pixel values, inline SVG icons, demo data, hardcoded text).
6. Repeat until only listed, accepted differences remain. Keep the final pair of screenshots for the report.
