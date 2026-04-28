import axios from 'axios';
import { config } from '../config/config.js';
import { getBaseUrls } from '../config/urls.js';
import { agencyTokenManager } from '../auth/agency-token-manager.js';

const urls = getBaseUrls(config.env);

export class AgencyClient {
  private readonly http = axios.create({ baseURL: urls.agency, timeout: 45_000 });

  async postXml(path: string, xml: string): Promise<string> {
    const token = await agencyTokenManager.getToken();
    const response = await this.http.post(path, xml, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/xml', Accept: 'application/xml' },
    });
    return String(response.data);
  }
}

export const agencyClient = new AgencyClient();
