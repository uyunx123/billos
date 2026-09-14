/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

declare module '*.svg?react' {
  import * as React from 'react';
  export const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}

declare module '*.svg?import&react' {
  import * as React from 'react';
  export const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}

/*
 * lucide-react ships its type declarations at the package root
 * (dist/lucide-react.d.ts) but its CJS main has no sibling .d.ts, which
 * breaks `moduleResolution: bundler` resolution after a fresh install.
 * Re-export the shipped ESM types so every `import { Icon } from
 * "lucide-react"` stays typed.
 */
declare module 'lucide-react' {
  export * from 'lucide-react/dist/lucide-react';
}