---
paths:
  - 'src/**/*.ts'
  - 'src/**/*.tsx'
---

# React and TypeScript rules

## TypeScript

- Strict mode with the extra flags in `tsconfig.app.json`; never weaken them per file.
- Never `any` — use `unknown` and narrow. An `as` cast is allowed only when the type system cannot express a fact the code guarantees; say why in the PR description, never in a comment. Never `as unknown as`. No non-null `!` on values that can really be missing (`noUncheckedIndexedAccess` makes array access `T | undefined` on purpose).
- `type` by default; `interface` only for extending or declaration merging (module augmentation such as `i18next.d.ts`).
- No `enum`. String-literal unions or `as const` objects; database enums come from the generated types (`Enums<'property_status'>`).
- Derive types, never duplicate them: DB rows from `database.types.ts`, form values from `z.infer`, query results from the function's return type (`Awaited<ReturnType<typeof getProperty>>`).
- `satisfies` to check configuration objects without widening; `import type` for type-only imports (`verbatimModuleSyntax`).
- Discriminated unions for state with variants (`{ status: 'idle' } | { status: 'error'; error: AppError }`).
- Validate at the boundaries only: env vars, URL search params, form input, JSON from Edge Functions or third parties. Typed Supabase query results need no runtime validation.
- Named exports only; no default exports.
- Formatting is Prettier's (`printWidth: 100`, single quotes, `trailingComma: 'all'`, Tailwind class sorting). Run `pnpm format` before finishing a change.

## Feature boundaries

- `routes/` wire URLs to feature components and preload data: no business logic, no Supabase, no inline query keys.
- A feature's internals are imported only inside the feature; other code imports from `@/features/<feature>` (its `index.ts`). ESLint rejects deep imports.
- Pure domain logic (scoring, calculations, formatting rules) lives in `<entity>.utils.ts` as plain functions with no React or Supabase import.
- Start a new feature folder only for a new domain concept; a single screen does not need one.

## Components

- Function components only. The one class allowed is the error boundary that `react-error-boundary` already provides.
- One exported component per file, named like the file (`property-card.tsx` → `PropertyCard`). Small private sub-components may live in the same file below the export.
- **Smart edges, dumb leaves.** Route components and feature screens call hooks and own state; leaf components take props and render. Leaves never fetch.
- Props are a `type` named `<Component>Props` declared above the component; destructure in the signature. `ref` is a normal prop (React 19); never `forwardRef` in new code.
- Composition over configuration: prefer `children` and small composable parts to a component with many boolean props.
- Lists use stable ids as `key`, never the index for lists that change.
- No inline arrow components inside render; no components defined inside other components.

## Hooks and effects

- The React Compiler is on: do not add `useMemo`, `useCallback` or `React.memo` by default. Add one only when profiling proves the need, and put the measurement in the PR description, not in a comment.
- **No `useEffect` for fetching or derived state.** Fetch with TanStack Query; compute derived values during render. Effects only synchronise with something outside React (DOM APIs, subscriptions, Supabase Realtime) and always clean up.
- Custom hooks start with `use`, live in `features/<feature>/hooks/` (or `src/hooks` only when shared), and return an object, not a tuple, when they return more than two values.
- Follow the Rules of Hooks; `eslint-plugin-react-hooks` errors are never disabled.

## State

Pick the first that fits:

1. Data from Supabase → TanStack Query cache. Never copy it into `useState` or a store.
2. Bookmarkable state (filters, sort, page, tab, search) → route search params validated with Zod in `validateSearch`, read through `Route.useSearch()`.
3. Form state → React Hook Form.
4. Local UI state → `useState` / `useReducer` in the lowest component that needs it.
5. Cross-cutting app state (session, language) → one small context per concern. Nothing that changes on every keystroke goes in context.
6. Complex client-only state shared across distant components → a Zustand store in the owning feature (`<feature>.store.ts`), only when 1–5 become awkward. No global store folder.

## Loading, errors, suspense

- Route loaders prefetch with `context.queryClient.ensureQueryData(<entity>Queries.detail(id))`; components read with `useSuspenseQuery`. The route's `pendingComponent` and `errorComponent` handle loading and failure, so components have no `if (isLoading)` branches.
- Non-suspense queries (background panels, optional widgets) render an inline skeleton and an inline error state.
- Loading placeholders are shadcn `Skeleton`s shaped like the content, not spinners, except inside buttons.

## Forms

Reference implementation (follow the shape):

```tsx
export function PropertyForm({ onSaved }: PropertyFormProps) {
  const { t } = useTranslation('properties');
  const validationMessage = useValidationMessage();
  const createProperty = useCreateProperty();
  const titleId = useId();
  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: { title: '', address: '', price: undefined },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      const saved = await createProperty.mutateAsync(toPropertyInsert(values));
      onSaved(saved);
    } catch (error) {
      applyServerErrors(form, error);
    }
  });

  return (
    <form onSubmit={(event) => void handleSubmit(event)} noValidate>
      <FieldGroup>
        <Controller
          name="title"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={titleId}>{t('form.title.label')}</FieldLabel>
              <Input {...field} id={titleId} aria-invalid={fieldState.invalid} />
              <FieldError>{validationMessage(fieldState.error?.message)}</FieldError>
            </Field>
          )}
        />
      </FieldGroup>
      <Button type="submit" disabled={createProperty.isPending}>
        {t('common:actions.save')}
      </Button>
    </form>
  );
}
```

- One Zod schema per form in `<entity>.schemas.ts`; the form type is `z.infer` of it. Messages in schemas are translation keys (`'validation.minLength'`), translated by `useValidationMessage` from `@/i18n/validation` inside `FieldError`; never English text.
- Always React Hook Form's `Controller` with the shadcn `Field` components from `@/components/ui/field` (`FieldGroup`, `FieldSet`, `FieldLegend`, `Field`, `FieldLabel`, `FieldDescription`, `FieldError`), so labels, errors and ARIA are wired the same way everywhere. Every input has a visible `FieldLabel` tied to it with `htmlFor` and a `useId` id; the control gets `aria-invalid` and the `Field` gets `data-invalid` from `fieldState.invalid`. Radio and checkbox groups use `FieldSet` with a `FieldLegend`. There is no shadcn `Form` wrapper in the project; do not add it.
- Submit goes through a mutation hook: `mutateAsync` with `applyServerErrors` when server errors map to fields, or `mutate` with the mutation's error in a form-level `Alert` when they never do (the sign-in form); the submit button is disabled only while the mutation is pending, never because the form is invalid, so pressing it reveals every error.
- Server errors map back to fields through the shared `applyServerErrors(form, error)` helper (an `AppError` with `field` becomes `setError(field, …)`); other errors show a form-level `Alert`. Mutations whose form handles the error set `meta: { silent: true }` so the global toast is skipped.
- Number inputs parse with `parseLocaleNumber` from `@/i18n/format`, never a bare `Number()` or `z.coerce.number()`, because Romanian input uses `,` as the decimal separator.
- When the insert payload differs from the form values, convert with a small explicit function next to the schema (`toPropertyInsert`), never inside the component.
- Never uncontrolled `<form>` reading `FormData` by hand, never React 19 form Actions for data mutations: TanStack Query mutations are the only mutation path.

## Routing

- File-based TanStack Router routes; `routeTree.gen.ts` is generated and committed.
- `_site/` for public pages everyone may see, signed in or not (home and marketing), inside the site layout (`SiteHeader`, `SiteFooter`); `_public/` for logged-out pages (authenticated users are redirected into the app), `_authenticated/` for everything behind login; its `route.tsx` holds the guard (`beforeLoad` → `redirect({ to: '/login', search: { redirect: location.href } })`) and the app shell.
- Router context carries `queryClient` and `auth`; loaders and guards use them, never module imports of singletons.
- Every route that fetches data has a `loader`, a `pendingComponent`, and an `errorComponent` or the root default. Loaders throw `notFound()` when a record does not exist or RLS hides it.
- Search params are validated with Zod in `validateSearch`; navigate with `<Link to search>` / `useNavigate`, never by building URL strings.
- Every route sets a translated title in `head`. URLs carry no language prefix and stay in English.
- Role-restricted areas check `useAuth().hasRole(...)` in `beforeLoad`; this is UX, RLS is the protection.

## Accessibility

- Semantic HTML first (`button` for actions, `a`/`Link` for navigation, headings in order, `main`/`nav` landmarks).
- Dialogs, menus, popovers, tabs and selects come from the shadcn/Radix primitives, which manage focus and ARIA; never a hand-built modal.
- Icon-only buttons carry a translated `aria-label`; decorative icons are `aria-hidden`.
- The code must pass `eslint-plugin-jsx-a11y` and WCAG AA (contrast, focus visible, keyboard reachable).
