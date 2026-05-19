interface ImmediateNextStepProps {
  step: string;
}

export function ImmediateNextStep({ step }: ImmediateNextStepProps) {
  return (
    <section className="rounded-xl border-2 border-accent-green/30 bg-accent-green/5 p-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-accent-green">
        Natychmiastowy następny krok
      </h2>
      <p className="text-lg font-medium text-navy">{step}</p>
    </section>
  );
}
