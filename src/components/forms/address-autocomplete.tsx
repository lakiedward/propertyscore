import { LoaderCircleIcon, MapPinIcon, SearchIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { MENU_CONTENT_CLASS } from '@/components/ui/menu-classes';
import { cn } from '@/lib/utils';

export type AddressSuggestion = {
  id: string;
  main: string;
  sub: string;
};

type AddressAutocompleteProps<Suggestion extends AddressSuggestion> = {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  suggestions: readonly Suggestion[];
  isSearching: boolean;
  emptyText: string | undefined;
  isInvalid?: boolean;
  describedBy?: string | undefined;
  action?: ReactNode;
  onValueChange: (value: string) => void;
  onSelect: (suggestion: Suggestion) => void;
};

function HighlightedMatch({ text, query }: { text: string; query: string }) {
  const needle = query.trim().toLocaleLowerCase();
  const start = needle.length > 0 ? text.toLocaleLowerCase().indexOf(needle) : -1;
  if (start < 0) {
    return <span className="font-bold">{text}</span>;
  }
  const end = start + needle.length;
  return (
    <span className="font-semibold">
      {text.slice(0, start)}
      <mark className="bg-transparent font-extrabold text-brand">{text.slice(start, end)}</mark>
      {text.slice(end)}
    </span>
  );
}

export function AddressAutocomplete<Suggestion extends AddressSuggestion>({
  id,
  label,
  placeholder,
  value,
  suggestions,
  isSearching,
  emptyText,
  isInvalid = false,
  describedBy,
  action,
  onValueChange,
  onSelect,
}: AddressAutocompleteProps<Suggestion>) {
  const [isOpen, setIsOpen] = useState(false);
  const hasList = isOpen && (suggestions.length > 0 || emptyText !== undefined);

  return (
    <Command shouldFilter={false} loop label={label} className="relative">
      <div
        data-invalid={isInvalid || undefined}
        className="flex h-14 items-center gap-3 rounded-md border-(length:--border-width-control) border-border bg-card pr-1.5 pl-4 transition-colors focus-within:border-primary focus-within:ring-3 focus-within:ring-ring/30 data-invalid:border-destructive"
      >
        {isSearching ? (
          <LoaderCircleIcon aria-hidden className="size-5 shrink-0 animate-spin text-brand" />
        ) : (
          <SearchIcon aria-hidden className="size-5 shrink-0 text-muted-foreground" />
        )}
        <CommandInput
          id={id}
          value={value}
          placeholder={placeholder}
          autoComplete="street-address"
          aria-invalid={isInvalid}
          aria-describedby={describedBy}
          onValueChange={(next) => {
            onValueChange(next);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
          }}
          onBlur={() => {
            setIsOpen(false);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setIsOpen(false);
            }
          }}
          className="h-full flex-1 text-body"
        />
        {action}
      </div>
      <CommandList
        hidden={!hasList}
        className={cn(MENU_CONTENT_CLASS, 'absolute inset-x-0 top-full mt-1 max-h-80')}
      >
        {emptyText === undefined ? null : (
          <CommandEmpty className="text-muted-foreground">{emptyText}</CommandEmpty>
        )}
        {suggestions.map((suggestion) => (
          <CommandItem
            key={suggestion.id}
            value={suggestion.id}
            onMouseDown={(event) => {
              event.preventDefault();
            }}
            onSelect={() => {
              onSelect(suggestion);
              setIsOpen(false);
            }}
            className="min-h-14 items-start py-2.5"
          >
            <MapPinIcon aria-hidden className="mt-0.5 text-brand" />
            <span className="flex min-w-0 flex-col">
              <HighlightedMatch text={suggestion.main} query={value} />
              <span className="truncate text-caption text-muted-foreground">{suggestion.sub}</span>
            </span>
          </CommandItem>
        ))}
      </CommandList>
    </Command>
  );
}
