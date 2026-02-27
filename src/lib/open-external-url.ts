export const openExternalUrl = async (url: string) => {
  if (window.electronAPI) {
    await window.electronAPI.openExternalUrl(url);
    return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
};
