import { CheckIcon, ChevronDownIcon, SearchIcon } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type SearchSelectOption = {
  value: string;
  label: string;
  description?: string;
  leading?: ReactNode;
};

type SearchSelectProps = {
  id?: string;
  value: string | null;
  options: readonly SearchSelectOption[];
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  ariaLabel?: string;
  className?: string;
};

function searchable(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function matchScore(_value: string, search: string, keywords?: string[]): number {
  const query = searchable(search.trim());
  if (!query) {
    return 1;
  }
  return searchable((keywords ?? []).join(' ')).includes(query) ? 1 : 0;
}

export function SearchSelect({
  id,
  value,
  options,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyText,
  ariaLabel,
  className,
}: SearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const listId = useId();
  const selected = options.find((option) => option.value === value);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          className={cn(
            'flex h-control w-full min-w-0 items-center gap-2.5 rounded-md border border-border bg-card px-(--control-padding-x) text-left text-(length:--control-font-size) outline-none hover:border-border-strong focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
            className,
          )}
        >
          {selected?.leading}
          <span className="flex min-w-0 flex-1 items-baseline gap-2">
            <span className={cn('truncate font-semibold', !selected && 'text-muted-foreground')}>
              {selected?.label ?? placeholder}
            </span>
            {selected?.description ? (
              <span className="truncate text-small text-muted-foreground">
                {selected.description}
              </span>
            ) : null}
          </span>
          <ChevronDownIcon aria-hidden className="size-4 shrink-0 text-brand" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        id={listId}
        align="start"
        className="w-(--radix-popover-trigger-width) min-w-72 gap-0 overflow-hidden p-0"
      >
        <Command
          filter={matchScore}
          label={searchPlaceholder}
          className="size-full overflow-hidden bg-popover"
        >
          <div className="flex h-11 items-center gap-2 border-b border-border-subtle px-3">
            <SearchIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            <CommandInput placeholder={searchPlaceholder} className="h-full text-body-sm" />
          </div>
          <CommandList className="max-h-72 scroll-py-1.5 p-1.5 outline-none">
            <CommandEmpty className="py-5 text-center text-muted-foreground">
              {emptyText}
            </CommandEmpty>
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  keywords={[option.label, option.description ?? '']}
                  onSelect={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'pr-10 data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
                    isSelected && 'font-bold text-brand',
                  )}
                >
                  {option.leading}
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{option.label}</span>
                    {option.description ? (
                      <span className="truncate text-meta font-normal text-muted-foreground">
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                  {isSelected ? (
                    <CheckIcon aria-hidden className="absolute right-3 size-4.5 text-brand" />
                  ) : null}
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
