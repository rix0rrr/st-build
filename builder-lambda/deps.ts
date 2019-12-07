// tslint:disable-next-line:no-var-requires
const depGraph: {[key: string]: string[]} = require('./deps.json');
const buildTimes: {[key: string]: number} = require('./times.json');

const packagesToBuild = new Set<string>(Object.keys(depGraph));

for (const [pkg, deps] of Object.entries(depGraph)) {
  depGraph[pkg] = deps.filter(d => packagesToBuild.has(d));
}

export function packagesWithoutDependencies() {
  return Object.entries(depGraph).filter(([_, deps]) => deps.length === 0).map(([pkgName, _]) => pkgName);
}

/**
 * All packages that directly depend on this package
 */
export function consumers(pkg: string) {
  return Object.entries(depGraph).filter(([_, deps]) => deps.includes(pkg)).map(([pkgName, _]) => pkgName);
}

export function dependencies(pkg: string) {
  return depGraph[pkg] || [];
}

export function buildTime(pkg: string) {
  return buildTimes[pkg] || 0;
}