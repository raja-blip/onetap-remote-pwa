/**
 * Launcher Service
 * Connects to Tifoh Launcher to fetch calendar events and send commands
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  LAUNCHER_IP: '@launcher_ip',
  LAUNCHER_PORT: '@launcher_port',
  LAUNCHER_CONNECTED: '@launcher_connected',
};

export interface Meeting {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  link: string;
  platform?: string;
  status?: string;
}

class LauncherService {
  private launcherIP: string = '';
  private launcherPort: string = '8001';
  private isConnected: boolean = false;

  async initialize(): Promise<void> {
    try {
      const ip = await AsyncStorage.getItem(STORAGE_KEYS.LAUNCHER_IP);
      const port = await AsyncStorage.getItem(STORAGE_KEYS.LAUNCHER_PORT);
      const connected = await AsyncStorage.getItem(STORAGE_KEYS.LAUNCHER_CONNECTED);

      if (ip) this.launcherIP = ip;
      if (port) this.launcherPort = port;
      this.isConnected = connected === 'true';

      console.log('LauncherService initialized:', { ip: this.launcherIP, port: this.launcherPort, connected: this.isConnected });
    } catch (error) {
      console.error('Error initializing LauncherService:', error);
    }
  }

  async setLauncherConnection(ip: string, port: string = '8001'): Promise<void> {
    try {
      this.launcherIP = ip;
      this.launcherPort = port;
      this.isConnected = true;

      await AsyncStorage.setItem(STORAGE_KEYS.LAUNCHER_IP, ip);
      await AsyncStorage.setItem(STORAGE_KEYS.LAUNCHER_PORT, port);
      await AsyncStorage.setItem(STORAGE_KEYS.LAUNCHER_CONNECTED, 'true');

      console.log('Launcher connection saved:', { ip, port });
    } catch (error) {
      console.error('Error saving launcher connection:', error);
      throw error;
    }
  }

  private getLauncherURL(): string {
    if (!this.launcherIP) {
      throw new Error('Launcher IP not configured');
    }
    return `http://${this.launcherIP}:${this.launcherPort}`;
  }

  isLauncherConnected(): boolean {
    return this.isConnected && !!this.launcherIP;
  }

  getConnectionInfo(): { ip: string; port: string; connected: boolean } {
    return {
      ip: this.launcherIP,
      port: this.launcherPort,
      connected: this.isConnected,
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const url = `${this.getLauncherURL()}/discover`;
      console.log('Testing connection to:', url);
      
      // Use fetchWithTimeout instead of AbortSignal.timeout
      const response = await this.fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }, 10000); // 10 second timeout

      console.log('Connection test response status:', response.status);
      
      if (response.ok) {
        this.isConnected = true;
        await AsyncStorage.setItem(STORAGE_KEYS.LAUNCHER_CONNECTED, 'true');
        console.log('Connection test successful');
        return true;
      }
      
      console.log('Connection test failed with status:', response.status);
      return false;
    } catch (error) {
      console.error('Error testing launcher connection:', error);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      this.isConnected = false;
      await AsyncStorage.setItem(STORAGE_KEYS.LAUNCHER_CONNECTED, 'false');
      return false;
    }
  }

  private fetchWithTimeout(url: string, options: RequestInit = {}, timeout: number = 5000): Promise<Response> {
    return Promise.race([
      fetch(url, options),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      )
    ]);
  }

  async fetchMeetings(): Promise<Meeting[]> {
    try {
      const url = `${this.getLauncherURL()}/ui/state`;
      console.log('Fetching meetings from:', url);

      const response = await this.fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }, 10000);

      if (!response.ok) {
        throw new Error(`Failed to fetch meetings: ${response.status}`);
      }

      const data = await response.json();
      console.log('Received UI state:', data);

      const meetings: Meeting[] = data.meetings || [];

      return meetings.map((meeting: any) => this.processMeeting(meeting));
    } catch (error) {
      console.error('Error fetching meetings:', error);
      throw error;
    }
  }

  private processMeeting(meeting: any): Meeting {
    let platform = 'unknown';
    if (meeting.link) {
      if (meeting.link.includes('teams.microsoft.com') || meeting.link.includes('teams.live.com')) {
        platform = 'teams';
      } else if (meeting.link.includes('meet.google.com')) {
        platform = 'google';
      } else if (meeting.link.includes('zoom.us')) {
        platform = 'zoom';
      } else if (meeting.link.includes('webex.com')) {
        platform = 'webex';
      }
    }

    const now = Date.now();
    const startTime = meeting.startTime || 0;
    const endTime = meeting.endTime || 0;

    let status = 'upcoming';
    if (now >= startTime && now <= endTime) {
      status = 'live';
    } else if (now > endTime) {
      status = 'completed';
    }

    return {
      id: meeting.id?.toString() || String(Math.random()),
      title: meeting.title || 'Untitled Meeting',
      startTime: startTime,
      endTime: endTime,
      link: meeting.link || '',
      platform: platform,
      status: status,
    };
  }

  async launchMeeting(meetingUrl: string, meetingType: string): Promise<boolean> {
    try {
      const url = `${this.getLauncherURL()}/commands/send`;
      console.log('Launching meeting:', { meetingUrl, meetingType });

      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'meeting_launch',
          payload: {
            meetingUrl: meetingUrl,
            meetingType: meetingType,
          },
        }),
      }, 10000);

      if (!response.ok) {
        throw new Error(`Failed to launch meeting: ${response.status}`);
      }

      const data = await response.json();
      console.log('Meeting launch response:', data);

      return data.status === 'success' || data.success === true;
    } catch (error) {
      console.error('Error launching meeting:', error);
      throw error;
    }
  }

  /**
   * Inject text into focused field on launcher device
   */
  async injectText(text: string): Promise<boolean> {
    try {
      const url = `${this.getLauncherURL()}/commands/send`;
      console.log('Injecting text:', text, 'to URL:', url);

      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'text_injection',
          payload: {
            textToInject: text,
          },
        }),
      }, 10000);

      if (!response.ok) {
        console.error('Text injection failed - status:', response.status);
        return false;
      }

      const data = await response.json();
      console.log('Text injection response:', data);

      return data.status === 'success' || data.success === true;
    } catch (error) {
      console.error('Error injecting text:', error);
      return false;
    }
  }
    /**
   * Click button by text on launcher device
   */
  async clickByText(clickText: string): Promise<boolean> {
    try {
      const url = `${this.getLauncherURL()}/commands/send`;
      console.log('Clicking button with text:', clickText);

      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'click_by_text',
          payload: {
            clickText: clickText,
          },
        }),
      }, 10000);

      if (!response.ok) {
        throw new Error(`Failed to click by text: ${response.status}`);
      }

      const data = await response.json();
      console.log('Click by text response:', data);

      return data.status === 'success' || data.success === true;
    } catch (error) {
      console.error('Error clicking by text:', error);
      throw error;
    }
  }

  /**
 * Dump all visible text on launcher device screen
 */
async dumpText(): Promise<string> {
  try {
    const url = `${this.getLauncherURL()}/commands/send`;
    console.log('Dumping screen text');

    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'dump_text',
        payload: {},
      }),
    }, 10000);

    if (!response.ok) {
      throw new Error(`Failed to dump text: ${response.status}`);
    }

    const data = await response.json();
    console.log('Dump text response:', data);

    return data.text || data.message || JSON.stringify(data);
  } catch (error) {
    console.error('Error dumping text:', error);
    throw error;
  }
}
  
  async disconnect(): Promise<void> {
    try {
      this.isConnected = false;
      await AsyncStorage.setItem(STORAGE_KEYS.LAUNCHER_CONNECTED, 'false');
      console.log('Disconnected from launcher');
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  }

  async clearSettings(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.LAUNCHER_IP,
        STORAGE_KEYS.LAUNCHER_PORT,
        STORAGE_KEYS.LAUNCHER_CONNECTED,
      ]);
      this.launcherIP = '';
      this.launcherPort = '8001';
      this.isConnected = false;
      console.log('Launcher settings cleared');
    } catch (error) {
      console.error('Error clearing settings:', error);
    }
  }
}

export default new LauncherService();