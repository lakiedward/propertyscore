type AddressPinProps = {
  label?: string;
};

export function AddressPin({ label }: AddressPinProps) {
  return (
    <span aria-hidden="true" className="pointer-events-none grid justify-items-center">
      {label ? (
        <span className="mb-1 rounded-full bg-primary px-2.25 py-0.75 text-meta font-extrabold whitespace-nowrap text-primary-foreground">
          {label}
        </span>
      ) : null}
      <span className="grid size-6.5 rotate-45 place-items-center rounded-full rounded-br-none border-2 border-card bg-primary">
        <span className="size-2.5 rounded-full bg-cta" />
      </span>
    </span>
  );
}
