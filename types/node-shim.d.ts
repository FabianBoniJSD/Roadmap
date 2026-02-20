// Temporary shim to allow building in environments where @types/node may not be installed yet.
// Prefer installing @types/node instead of relying on this long-term.
// This file can be removed once the build environment reliably installs dev dependencies.
// Minimal declarations
/* eslint-disable @typescript-eslint/no-explicit-any */

declare let process: any;

declare module 'fs' {
  const x: any;
  export = x;
}
declare module 'path' {
  const x: any;
  export = x;
}
declare module 'os' {
  const x: any;
  export = x;
}
