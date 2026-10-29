import type { ReactNode } from 'react';

type Option<T extends string> = { value: T; label: ReactNode; disabled?: boolean };
export function Segmented<T extends string>({ label, ariaLabel = label, value, options, onChange, seals = false }: {
  label: string; ariaLabel?: string; value: T; options: readonly Option<T>[];
  onChange: (value: T) => void; seals?: boolean;
}) {
  return <div className={`paper-tabs ${seals ? 'seal-tabs' : ''}`}>
    <span className="paper-tabs-label">{label}</span>
    <div role="radiogroup" aria-label={ariaLabel}>
      {options.map(option => <button key={option.value} type="button" role="radio"
        aria-checked={value === option.value} disabled={option.disabled}
        tabIndex={value === option.value ? 0 : -1} onClick={() => onChange(option.value)}
        onKeyDown={event => {
          const direction = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 0;
          if (!direction && event.key !== 'Home' && event.key !== 'End') return;
          event.preventDefault();
          const enabled = options.filter(item => !item.disabled);
          const index = enabled.findIndex(item => item.value === option.value);
          const next = enabled[event.key === 'Home' ? 0 : event.key === 'End' ? enabled.length - 1 : (index + direction + enabled.length) % enabled.length];
          onChange(next.value);
          const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button');
          buttons?.[options.indexOf(next)]?.focus();
        }}>{option.label}</button>)}
    </div>
  </div>;
}
