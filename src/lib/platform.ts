export function isElectron(): boolean {
  return typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent)
}
