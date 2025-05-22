import { showError, showSuccess } from '@/utils/toast';
import { extractPseudoTitleFromUrl } from './bookmarkUtils';

export async function fetchPageTitleWithProxy(url: string, bookmarkId: string, maxRetries: number = 1): Promise<{ title: string, id: string }> {
  const proxyUrlBase = `https://api.allorigins.win/get?url=`;
  const shortUrl = url.length > 50 ? `${url.substring(0, 47)}...` : url;
  let currentAttempt = 0;

  while (currentAttempt <= maxRetries) {
    if (currentAttempt > 0) {
      await new Promise(resolve => setTimeout(resolve, 2000 * currentAttempt));
    }
    try {
      const proxyUrl = `${proxyUrlBase}${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) {
        console.warn(`Proxy error for ${shortUrl} (attempt ${currentAttempt + 1}/${maxRetries + 1}): ${response.status} ${response.statusText}`);
        if (currentAttempt === maxRetries) {
          showError(`Proxy error for ${shortUrl}. Using fallback title.`);
          return { title: extractPseudoTitleFromUrl(url), id: bookmarkId };
        }
        currentAttempt++;
        continue; 
      }
      const data = await response.json();
      const htmlContent = data.contents;
      if (!htmlContent) {
        console.warn(`No content from proxy for ${shortUrl} (attempt ${currentAttempt + 1}/${maxRetries + 1}).`);
        if (currentAttempt === maxRetries) {
          showError(`No content for ${shortUrl}. Using fallback title.`);
          return { title: extractPseudoTitleFromUrl(url), id: bookmarkId };
        }
        currentAttempt++;
        continue;
      }
      const doc = new DOMParser().parseFromString(htmlContent, "text/html");
      const titleTag = doc.querySelector('title');
      const fetchedTitle = titleTag?.textContent?.trim();
      if (fetchedTitle) {
        showSuccess(`Title fetched for ${shortUrl}!`);
        return { title: fetchedTitle, id: bookmarkId };
      }
      console.warn(`Could not extract title tag for ${shortUrl} (attempt ${currentAttempt + 1}/${maxRetries + 1}).`);
      if (currentAttempt === maxRetries) {
        showError(`Could not extract title for ${shortUrl}. Using fallback title.`);
        return { title: extractPseudoTitleFromUrl(url), id: bookmarkId };
      }
      currentAttempt++;
    } catch (error) {
      console.error(`Error fetching title via proxy for ${shortUrl} (attempt ${currentAttempt + 1}/${maxRetries + 1}):`, error);
      if (currentAttempt === maxRetries) {
        showError(`Error fetching title for ${shortUrl}. Using fallback title.`);
        return { title: extractPseudoTitleFromUrl(url), id: bookmarkId };
      }
      currentAttempt++;
    }
  }
  console.error(`Exhausted retries for ${shortUrl} unexpectedly.`);
  showError(`Failed to fetch title for ${shortUrl} after all attempts. Using fallback title.`);
  return { title: extractPseudoTitleFromUrl(url), id: bookmarkId };
}