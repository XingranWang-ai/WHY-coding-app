import { Capacitor, registerPlugin } from '@capacitor/core'

type ExternalBrowserPlugin = {
  open(options: { url: string }): Promise<void>
}

const ExternalBrowser =
  registerPlugin<ExternalBrowserPlugin>('ExternalBrowser')

export async function openExternalUrl(url: string) {
  if (Capacitor.isNativePlatform()) {
    await ExternalBrowser.open({ url })
    return
  }

  const opened = window.open(url, '_blank', 'noopener,noreferrer')
  if (!opened) window.location.assign(url)
}
