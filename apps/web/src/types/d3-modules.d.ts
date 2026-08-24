/**
 * Ambient declarations for d3 modules that ship without bundled types
 * (d3-array, d3-shape). The corresponding @types packages are recorded in
 * package-lock.json but not installed in this environment; these shorthands
 * keep `tsc --noEmit` green until they are added as devDependencies.
 */
declare module "d3-array";
declare module "d3-shape";
