interface Props {
  title: string;
}

export default function Placeholder({ title }: Props) {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-muted-foreground">Coming soon.</p>
    </div>
  );
}
