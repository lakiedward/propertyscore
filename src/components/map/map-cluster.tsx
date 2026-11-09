type MapClusterProps = {
  label: string;
  accessibleName: string;
  onExpand: () => void;
};

export function MapCluster({ label, accessibleName, onExpand }: MapClusterProps) {
  return (
    <button
      type="button"
      aria-label={accessibleName}
      onClick={onExpand}
      className="grid size-11 place-items-center rounded-full border-2 border-card bg-primary text-small font-extrabold text-primary-foreground tabular-nums shadow-md ring-6 ring-primary/20 transition-transform duration-(--duration-fast) ease-standard hover:scale-110 focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
    >
      {label}
    </button>
  );
}
