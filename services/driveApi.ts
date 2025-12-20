
import { Job, User, ValidationLog } from '../types';
import { GOOGLE_SCRIPT_URL } from '../constants';

interface AppData {
  jobs: Job[];
  users: User[];
  validationLogs: ValidationLog[];
}

export const driveApi = {
  /**
   * Fetch data from Google Drive (via Apps Script)
   */
  async getData(): Promise<AppData | null> {
    try {
      const url = `${GOOGLE_SCRIPT_URL}?action=read&t=${new Date().getTime()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow', 
        credentials: 'omit'
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.status === 'error') {
        console.error('Script Error:', data.message);
        return null;
      }

      return {
        jobs: data.jobs || [],
        users: data.users || [],
        validationLogs: data.validationLogs || []
      };
    } catch (error) {
      console.error('Error fetching data from Drive:', error);
      return null;
    }
  },

  /**
   * Save data to Google Drive (via Apps Script)
   */
  async saveData(data: AppData): Promise<boolean> {
    try {
      // Stringify payload before fetch to monitor size for debugging
      const bodyStr = JSON.stringify(data);
      console.log(`Syncing to GAS. Payload size: ${(bodyStr.length / 1024).toFixed(2)} KB`);

      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        credentials: 'omit',
        redirect: 'follow',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', 
        },
        body: bodyStr
      });

      if (!response.ok) {
         throw new Error(`Server returned ${response.status}`);
      }

      const result = await response.json();
      return result.status === 'success';
    } catch (error) {
      console.error('Error saving data to Drive:', error);
      // We don't throw here to avoid killing the app's online state instantly
      return false;
    }
  }
};
