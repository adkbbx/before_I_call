// Hash routes so the static build deep-links on any host: #/, #/shelf, #/tale/<id>, #/about. `?night=demo` selects the demo night.
import { useEffect, useState } from 'react';

export type Route =
  | { name: 'room' }
  | { name: 'shelf' }
  | { name: 'reader'; taleId: string }
  | { name: 'about' };

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '');
  const tale = path.match(/^\/tale\/([a-z]+)$/);
  if (tale) return { name: 'reader', taleId: tale[1] };
  if (path === '/shelf') return { name: 'shelf' };
  if (path === '/about') return { name: 'about' };
  return { name: 'room' };
}

export function routeHref(route: Route): string {
  switch (route.name) {
    case 'room': return '#/';
    case 'shelf': return '#/shelf';
    case 'reader': return `#/tale/${route.taleId}`;
    case 'about': return '#/about';
  }
}

export function isDemoNight(search: string): boolean {
  return new URLSearchParams(search).get('night') === 'demo';
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(globalThis.location?.hash ?? ''));
  useEffect(() => {
    const update = () => setRoute(parseRoute(location.hash));
    addEventListener('hashchange', update);
    return () => removeEventListener('hashchange', update);
  }, []);
  return route;
}
