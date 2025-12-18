import { Photo, Album } from '../types';

const FLICKR_API_BASE = 'https://www.flickr.com/services/rest/';

/**
 * Helper function to fetch data, falling back to a CORS proxy if the direct request fails
 * (common in pure frontend applications interacting with Flickr).
 */
const fetchWithFallback = async (url: string): Promise<Response> => {
  try {
    // Try direct request first
    const response = await fetch(url);
    // If we get a valid HTTP response, return it.
    // Note: 403/401 from Flickr are still valid HTTP responses, fetch doesn't throw.
    // fetch only throws on network failure (DNS, CORS, offline).
    return response;
  } catch (error) {
    console.warn("Direct fetch failed (likely CORS). Retrying with proxy...", error);
    try {
        // Fallback: Use allorigins.win as a CORS proxy
        // We use 'raw' to get the exact JSON response from Flickr
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const proxyResponse = await fetch(proxyUrl);
        return proxyResponse;
    } catch (proxyError) {
        // If even the proxy fails, throw the original error to be helpful
        throw error;
    }
  }
};

/**
 * Resolves a username to a Flickr NSID.
 */
const resolveUserNsid = async (apiKey: string, username: string): Promise<string> => {
  if (username.includes('@')) {
    return username;
  }

  const params = new URLSearchParams({
    method: 'flickr.people.findByUsername',
    api_key: apiKey,
    username: username,
    format: 'json',
    nojsoncallback: '1',
  });

  try {
    const response = await fetchWithFallback(`${FLICKR_API_BASE}?${params.toString()}`);
    const data = await response.json();

    if (data.stat !== 'ok') {
      // Fallback to lookupUser if findByUsername fails (sometimes simpler for vanity URLs)
      const urlParams = new URLSearchParams({
        method: 'flickr.urls.lookupUser',
        api_key: apiKey,
        url: `https://www.flickr.com/photos/${username}`,
        format: 'json',
        nojsoncallback: '1',
      });
      const urlResponse = await fetchWithFallback(`${FLICKR_API_BASE}?${urlParams.toString()}`);
      const urlData = await urlResponse.json();
      
      if (urlData.stat === 'ok') {
        return urlData.user.id;
      }
      throw new Error(data.message || `Could not resolve user "${username}"`);
    }
    return data.user.id || data.user.nsid;
  } catch (error) {
    console.error("Error resolving Flickr User ID:", error);
    throw error;
  }
};

/**
 * Fetches the list of albums (photosets) for the user.
 */
export const getAlbums = async (apiKey: string, userId: string): Promise<Album[]> => {
  try {
    const nsid = await resolveUserNsid(apiKey, userId);
    const params = new URLSearchParams({
      method: 'flickr.photosets.getList',
      api_key: apiKey,
      user_id: nsid,
      format: 'json',
      nojsoncallback: '1',
    });

    const response = await fetchWithFallback(`${FLICKR_API_BASE}?${params.toString()}`);
    const data = await response.json();

    if (data.stat !== 'ok') {
      throw new Error(data.message || 'Failed to fetch albums');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.photosets.photoset.map((set: any) => ({
      id: set.id,
      title: set.title._content,
      count: parseInt(set.photos),
    }));
  } catch (error) {
    console.error("Error fetching albums:", error);
    throw error;
  }
};

/**
 * Fetches photos from either the entire photostream OR a specific album.
 * Loops through pages to ensure ALL photos are retrieved.
 */
export const fetchPhotos = async (apiKey: string, userId: string, albumId?: string): Promise<Photo[]> => {
  try {
    const nsid = await resolveUserNsid(apiKey, userId);
    const allPhotos: Photo[] = [];
    let page = 1;
    let hasMore = true;
    const MAX_PAGES = 100; // 100 * 500 = 50,000 photos max. Prevents infinite loops.

    const baseParams = {
        api_key: apiKey,
        format: 'json',
        nojsoncallback: '1',
        extras: 'url_k,url_h,url_l,url_o,url_m,o_dims',
        per_page: '500', // Max per page
    };

    while (hasMore && page <= MAX_PAGES) {
        const params = new URLSearchParams({
            ...baseParams,
            page: page.toString(),
        });

        if (albumId) {
            params.append('method', 'flickr.photosets.getPhotos');
            params.append('photoset_id', albumId);
            params.append('user_id', nsid);
        } else {
            params.append('method', 'flickr.people.getPublicPhotos');
            params.append('user_id', nsid);
        }

        const response = await fetchWithFallback(`${FLICKR_API_BASE}?${params.toString()}`);
        const data = await response.json();

        if (data.stat !== 'ok') {
             throw new Error(data.message || 'Failed to fetch photos');
        }

        const container = albumId ? data.photoset : data.photos;
        const totalPages = container.pages;
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pagePhotos = container.photo.map((p: any) => {
             // Flickr photo URLs: try largest available first
             let url = p.url_k || p.url_h || p.url_l || p.url_o || p.url_m;
             
             // Fallback to constructing URL from parts if direct URL extras failed
             if (!url && p.server && p.id && p.secret) {
                url = `https://live.staticflickr.com/${p.server}/${p.id}_${p.secret}_b.jpg`;
             }
             return {
                id: p.id,
                url,
                title: p.title || 'Untitled',
                width: p.width_l ? parseInt(p.width_l) : undefined,
                height: p.height_l ? parseInt(p.height_l) : undefined,
             };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }).filter((p: any) => p.url);

        allPhotos.push(...pagePhotos);

        if (page >= totalPages) {
            hasMore = false;
        } else {
            page++;
        }
    }

    return allPhotos;

  } catch (error) {
    console.error("Flickr Fetch Error", error);
    throw error;
  }
};

export const getDemoPhotos = (): Photo[] => {
  return Array.from({ length: 20 }).map((_, i) => ({
    id: `demo-${i}`,
    url: `https://picsum.photos/seed/${i + 123}/800/600`,
    title: `Demo Landscape ${i + 1}`,
  }));
};