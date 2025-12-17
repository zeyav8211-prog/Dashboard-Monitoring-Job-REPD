
import { Job, User, ValidationLog } from '../types';
import { GOOGLE_SCRIPT_URL } from '../constants';

interface AppData {
  jobs: Job[];
  users: User[];
  validationLogs: ValidationLog[];
}

export const driveApi = {
  getScriptUrl() {
    return localStorage.getItem('jne_custom_script_url') || GOOGLE_SCRIPT_URL;
  },

  /**
   * Fetch data from Google Drive (via Apps Script)
   */
  async getData(): Promise<AppData | null> {
    try {
      // Add timestamp to prevent caching issues
      const baseUrl = this.getScriptUrl();
      if (!baseUrl) return null;

      const url = `${baseUrl}?action=read&t=${new Date().getTime()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow', 
        credentials: 'omit' // Vital for avoiding CORS errors with GAS Web App
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.status === 'error') {
        console.error('Script Error:', data.message);
        return null;
      }

      // Handle raw response format variations
      if (data.jobs || data.users) {
          return data;
      }
      
      // If wrapped in a 'data' property
      if (data.data) {
          return data.data;
      }

      return data;
    } catch (error) {
      console.error('Error fetching data from Drive:', error);
      throw error;
    }
  },

  /**
   * Save data to Google Drive (via Apps Script)
   */
  async saveData(data: AppData): Promise<boolean> {
    try {
      const baseUrl = this.getScriptUrl();
      if (!baseUrl) throw new Error("Google Script URL not configured");

      const response = await fetch(baseUrl, {
        method: 'POST',
        credentials: 'omit',
        redirect: 'follow',
        // Text/plain prevents preflight OPTIONS request which GAS doesn't handle well
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', 
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
         throw new Error(`Server returned ${response.status}`);
      }

      const result = await response.json();
      return result.status === 'success';
    } catch (error) {
      console.error('Error saving data to Drive:', error);
      return false;
    }
  }
};
