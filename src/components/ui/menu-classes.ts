export const MENU_CONTENT_CLASS =
  'z-400 overflow-x-hidden overflow-y-auto rounded-lg border border-border bg-popover p-1.5 text-popover-foreground shadow-md duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95';

export const MENU_ITEM_CLASS =
  "relative flex min-h-11 w-full cursor-default items-center gap-2.5 rounded-md px-3 text-body-sm text-popover-foreground outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4.5";

export const MENU_CHECKABLE_ITEM_CLASS =
  'pr-10 data-[state=checked]:font-bold data-[state=checked]:text-brand';

export const MENU_INDICATOR_CLASS =
  'pointer-events-none absolute right-3 flex size-4.5 items-center justify-center text-brand';
