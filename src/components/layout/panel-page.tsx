type PanelPageProps = {
  title: string;
};

export function PanelPage({ title }: PanelPageProps) {
  return <h1 className="sr-only">{title}</h1>;
}
