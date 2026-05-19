interface DisclaimerProps {
  text: string;
}

export function Disclaimer({ text }: DisclaimerProps) {
  return (
    <aside className="rounded-lg border border-border bg-card p-4 text-sm leading-relaxed text-slate-muted">
      <p className="mb-1 font-medium text-graphite">Zastrzeżenie</p>
      <p>{text}</p>
    </aside>
  );
}
