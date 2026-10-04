import { useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import scenarios from './scenarios.json';

export function ExamplePicker({ disabled, onSelect }: { disabled: boolean; onSelect: (id: string, situation: string) => void }) {
  const menu = useRef<HTMLDetailsElement | null>(null);
  useEffect(() => {
    const dismiss = (event: Event) => {
      if (menu.current?.open && event.target instanceof Node && !menu.current.contains(event.target)) menu.current.open = false;
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('focusin', dismiss);
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('focusin', dismiss); };
  }, []);
  return <details className="example-picker" ref={menu} onKeyDown={event => {
    if (event.key === 'Escape' && menu.current?.open) { event.preventDefault(); menu.current.open = false; menu.current.querySelector('summary')?.focus(); }
  }}><summary aria-disabled={disabled} onClick={event => { if (disabled) event.preventDefault(); }}><span><strong>Start from an example</strong><span>Pick a sample call, then make it yours.</span></span><ChevronDown size={18} aria-hidden="true" /></summary><div className="example-picker-list" role="group" aria-label="Sample call situations">{scenarios.map(item => <button type="button" key={item.id} disabled={disabled} onClick={() => {
    onSelect(item.id, item.situation);
    if (menu.current) menu.current.open = false;
    document.getElementById('scenario')?.focus();
  }}><strong>{item.title}</strong><span>{item.description}</span></button>)}</div></details>;
}
