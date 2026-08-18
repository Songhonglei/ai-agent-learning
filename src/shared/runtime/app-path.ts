function currentPathname() {
  return typeof window === 'undefined' ? '' : window.location.pathname
}

/** Keeps browser navigation within Cowork's `/s/<alias>` deployment mount. */
export function deploymentBasePath(pathname = currentPathname()) {
  return pathname.match(/^\/s\/[^/]+(?=\/|$)/)?.[0] ?? ''
}

export function appPath(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${deploymentBasePath()}${normalized}`
}
