import * as React from "react"

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = React.useState(false)

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.electronAPI) return

    let cancelled = false
    let cleanup: (() => void) | undefined

    window.electronAPI
      .isFullscreen()
      .then(value => {
        if (!cancelled) setIsFullscreen(value)
      })
      .catch(() => {})

    cleanup = window.electronAPI.onFullscreenChange(value => {
      if (!cancelled) setIsFullscreen(value)
    })

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [])

  return isFullscreen
}
