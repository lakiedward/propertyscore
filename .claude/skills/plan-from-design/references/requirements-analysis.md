# Requirements analysis: from screens to schema, backend, auth and integrations

The design says what a screen shows and lets people do. This reference turns that into concrete requirements (data, schema, backend, access, integrations), every item traceable to its source. `IMPLEMENTATION_PLAN.md` is not a source.

## 1. Sources and precedence

The precedence table in this skill's `SKILL.md` (Sources): rules decide how, the selected screens decide what is shown and done, and the code and local schema decide what already exists. Data, permissions and business rules are derived from what the screens show and do. A rule the screens imply but do not settle (who may see a value, when a record expires, what a price depends on) is an open question for the user, never a guess.

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

Values that are clearly copy go to translations; values that vary per user, property or time are data (`selection.md` §2 tells them apart). Content the design labels as an example stays copy and keeps its label.

## 3. Data requirements matrix

Combine the inventory with the code report:

```
| Screen | Section · element | Kind | Served by | Design ref | Status | Note |
| / | listings · map pins | list | listings (status = published), listing_locations | Home #proprietati | new | seeded with 12 listings |
| / | listings · sale/rent toggle | input | search param transaction | Home #proprietati | new | |
| / | SmartCheck · sample scores | displayed | copy, labelled "Valori de exemplu" | Home #smart-check | copy | |
| /account | language | displayed | profiles.locale | Account header | exists | |
```

Status values: `exists` (in the local schema and code), `new` (built in this plan), `copy` (translation keys, no data).

Served by is one of: `table.column`, a view, an RPC, an Edge Function, a Storage bucket, a computed value (and where it is computed), the auth session, or `copy`.

## 4. Schema derivation

From the matrix, list every table the scope reads or writes and, for each one:

1. **Reconcile with the migrations.** Start from what already exists and from the screens' data inventory. Never recreate an existing table; extend it with a new migration. Never edit a migration that is on `main`.
2. **Columns**: name, type, nullability, default, `check`, `unique`, foreign key with `on delete` behaviour. Apply `.claude/rules/supabase.md`: `id`, `created_at`, `updated_at` and its trigger, `owner_id` for user-owned rows, money as `numeric(12, 2)` plus `currency`, enums with English codes, `unaccent` and trigram for searched text, `"ro-x-icu"` collation for sorted names.
3. **Relationships**: cardinality and the owning side, with a short diagram when there are more than three tables.
4. **Indexes**: every foreign key, every column a policy filters on, every column the screens filter or sort on (from the matrix).
5. **RLS**: from the matrix's Visibility column and the auth table of §6, one policy per operation and role, named as an English sentence, with `using` and `with check`. Role checks go through `private` `security definer` helpers; roles come from the `user_role` claim. Columns the client must not write get column privileges or a trigger.
6. **Functions and triggers**: multi-table writes, state transitions and calculations the screens imply, as Postgres functions with error codes; `security invoker` unless `definer` is required.
7. **Views**: only when a screen needs a read model that would otherwise need several queries; `security_invoker = true`.
8. **Storage**: buckets, public or private, size limit, MIME types, object path pattern, `storage.objects` policies.
9. **Seed**: the rows the screens need to be reviewed locally, with Romanian diacritics, for each test user and role.
10. **pgTAP**: for every policy, the allowed and the denied case; for every function, its error codes.
11. **Migrations**: grouped and named `<verb>_<object>`, in dependency order, each creating its tables with RLS enabled in the same file.

## 5. Backend logic

For each server-side behaviour the scope needs:

| Behaviour | Where | Trigger | Rules enforced | Errors (codes) | Design ref |
| Search listings in view | RPC `search_listings` | map moved, toggle changed | published only, transaction filter | `invalid_bbox` | Home #proprietati |

Choose the place with `.claude/rules/supabase.md`: SQL functions for business rules and multi-table writes, Edge Functions only for third-party APIs with secrets, webhooks and secret-key work, `pg_cron` for timeouts. Frontend code never enforces a rule the database does not also enforce.

## 6. Auth and access

For each screen in scope:

| Screen | Anonymous | Signed in | Owner | Inspector | Admin | Guard (`beforeLoad`) | RLS policies relied on |

Plus: sign-in methods the screens use (password, email OTP, magic link), redirects, session handling (`.claude/rules/data-api.md`), email templates touched (`supabase/templates/`, both languages), and auth settings in `supabase/config.toml`.

## 7. Integrations

For each third-party service the scope touches (payments, maps, geocoding, email, SMS, analytics, monitoring):

| Service | Used for | Called from | Secret and where it lives | Webhook and its verification | Local testing | Failure behaviour | Design ref |

Secrets never reach a `VITE_` variable. An integration whose provider or account is not decided yet (a map tile provider, a geocoder) is an open question with options and a recommendation; a new dependency it needs is listed for approval and recorded in the `CLAUDE.md` Tech stack.

## 8. Design fidelity check

Used during execution after each screen, and again in verification:

1. Open the running page in the in-app browser (`preview_start` with `property-score-dev`) and the matching design screen in a second tab (the normalised export file), both at 375 px and then 1440 px. For a screen whose mobile source is `derived` (`design-analysis.md` §8.5) there is nothing to compare at 375 px: check the page instead against the approved derived layout and the §8.5 patterns.
2. Screenshot both and compare section by section: layout and order, spacing rhythm, type scale and weight, colours, radii, shadows, icons, copy, states.
3. Repeat the comparison with the page in English: same layout, nothing cut off or overflowing, no untranslated string. Every difference is one of: a bug to fix now; a design-system deviation already listed in the plan (keep the design-system version); a rule requirement (accessibility, translations, semantic structure); or a new difference to ask about.
4. Resize the running page through 360, 768, 1024 and 1440 px: no horizontal scroll, nothing overlapping or cut off, touch targets at `--touch-min`, and the layout switching at the spec's breakpoints.
5. Check the screen's code against its markup mapping (`.claude/skills/implement/references/design-analysis.md` §8): every block became the mapped component, and nothing from the export survived (class names, `style` attributes, arbitrary pixel values, inline SVG icons, demo data, hardcoded text).
6. Repeat until only listed, accepted differences remain. Keep the final pair of screenshots for the report.

## 9. Languages (Romanian and English, always)

Every screen is built bilingual, RO (default) and EN, even when the design is drawn in one language only, has no language switch, or shows the switch without wiring it. A plan that delivers one language is incomplete. Rules: `.claude/rules/i18n.md`.

| Item | Requirement |
| --- | --- |
| Source language | The language the design is drawn in is the source; the other is written in the same change. Uncertain translations are listed in the plan and in the report, never left out or copied across |
| Coverage | Every visible string, `aria-label`, `title`, `alt`, placeholder, toast, page title, validation and error message, and the design's example and illustrative content, as keys in both `ro` and `en` |
| Language switch | Present on every screen in scope (header and, where the screen has one, the mobile menu), even if the design omits it: labels in their own language with `lang`, `changeLocale`, `localStorage`, `profiles.locale` when signed in, `<html lang>`. No language in the URL |
| Formatting | Dates, numbers, prices and units through `@/i18n/format` (`ro-RO`, `en-GB`); the currency comes from the record or constant, never from the language |
| Plurals and sentences | Counts with `count` and `_one` / `_few` / `_other` for Romanian; whole sentences with interpolation; links and emphasis inside sentences through `<Trans>` |
| Enum and status labels | Translation keys by database code under the feature namespace |
| Stored user content | Shown as entered, not translated (listing titles, addresses, descriptions); the plan says so for each such field |
| Third-party text | Hidden English strings of shadcn/Radix primitives, map attribution and controls translated where the library allows |
| Layout | Romanian runs 20–30% longer: no fixed widths on text; every screen checked in both languages at 375 and 1440 px |

The plan's Languages section (`plan-template.md` §9) lists the namespaces, the source language, where the switch lives, the formatted values, the plurals, the stored fields shown untranslated, and the phrasings to review.
