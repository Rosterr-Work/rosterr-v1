import axios from "axios";
import type { SWRConfiguration } from "swr";

/** The default way useSWR loads a key: a GET to that address, and the body that comes back. */
export const fetcher = (url: string) => axios.get(url).then((res) => res.data);

export const swrConfig: SWRConfiguration = {
  fetcher,
  dedupingInterval: 2000,
  revalidateOnReconnect: true,
  revalidateOnFocus: false,
  shouldRetryOnError: true,
  errorRetryInterval: 5000,
  errorRetryCount: 3,
  onError: (error, key) => console.error(`SWR Error [${key}]:`, error),
};
