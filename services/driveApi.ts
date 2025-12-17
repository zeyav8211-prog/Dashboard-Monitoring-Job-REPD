
import { Job, User, ValidationLog } from '../types';
import { GOOGLE_SCRIPT_URL } from '../constants';

interface AppData {
  jobs: Job[];
  users: User[];
  validationLogs: ValidationLog[];
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const driveApi = {
  getScriptUrl() {
    const url = localStorage.getItem('jne_custom_script_url') || GOOGLE_SCRIPT_URL;
    return url ? url.trim() : '';
  },

  /**
   * Helper to perform fetch with retry logic and timeout
   */
  async fetchWithRetry(url: string, options: RequestInit, retries = 2, backoff = 1000): Promise<Response> {
    // 15s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) throw new Error("Endpoint not found (404)");
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      const isAbort = error.name === 'AbortError';
      const isNetworkError = error.message === 'Failed to fetch' || error.name === 'TypeError';

      if (retries > 0) {
        // Only retry on network errors or timeouts, not logic errors
        if (isAbort || isNetworkError) {
             console.warn(`Sync attempt failed (${isAbort ? 'Timeout' : 'Network'}), retrying...`);
             await wait(backoff);
             return this.fetchWithRetry(url, options, retries - 1, backoff * 1.5);
        }
      }
      throw error;
    }
  },

  /**
   * Fetch data from Google Drive (via Apps Script)
   */
  async getData(): Promise<AppData | null> {
    if (!navigator.onLine) return null; 

    try {
      const baseUrl = this.getScriptUrl();
      if (!baseUrl) return null;

      const separator = baseUrl.includes('?') ? '&' : '?';
      // Add timestamp to prevent caching
      const url = `${baseUrl}${separator}action=read&t=${new Date().getTime()}`;
      
      const response = await this.fetchWithRetry(url, {
        method: 'GET',
        redirect: 'follow', 
        credentials: 'omit',
        mode: 'cors'
      });
      
      const contentType = response.headers.get("content-type");
      let data;

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
            data = JSON.parse(text);
        } catch (e) {
            // Check if it's the specific "HTML Error Page" from Google
            if (text.includes('<!DOCTYPE html>')) {
                 throw new Error("Received HTML instead of JSON. Check Script Permissions (Anyone/Anonymous).");
            }
            throw new Error("Invalid JSON response from server.");
        }
      }
      
      if (data && data.status === 'error') {
        console.warn('Script reported error:', data.message);
        return null;
      }

      if (data.jobs || data.users) return data;
      if (data.data) return data.data;

      return data;
    } catch (error: any) {
      // Use warn instead of error to avoid console noise during connection blips
      console.warn('Drive sync skipped:', error.message || error);
      throw error;
    }
  },

  /**
   * Save data to Google Drive (via Apps Script)
   */
  async saveData(data: AppData): Promise<boolean> {
    if (!navigator.onLine) return false;

    try {
      const baseUrl = this.getScriptUrl();
      if (!baseUrl) throw new Error("Google Script URL not configured");

      const response = await this.fetchWithRetry(baseUrl, {
        method: 'POST',
        credentials: 'omit',
        redirect: 'follow',
        mode: 'cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', 
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      return result.status === 'success';
    } catch (error: any) {
      console.warn('Save failed (will retry next sync):', error.message || error);
      return false;
    }
  }
};

