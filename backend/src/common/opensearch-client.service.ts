import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import axios, { AxiosInstance } from 'axios';

interface OpenSearchCredentials {
  username: string;
  password: string;
  endpoint: string;
}

@Injectable()
export class OpenSearchClientService {
  private client: AxiosInstance | null = null;
  private credentials: OpenSearchCredentials | null = null;
  private secretsClient: SecretsManagerClient;

  constructor(private configService: ConfigService) {
    const region = this.configService.get('AWS_REGION') || 'us-east-1';
    this.secretsClient = new SecretsManagerClient({ region });
  }

  /**
   * Get or create OpenSearch client with basic authentication
   */
  async getClient(): Promise<AxiosInstance | null> {
    if (this.client) {
      return this.client;
    }

    const credentials = await this.getCredentials();
    if (!credentials) {
      console.warn('OpenSearch credentials not configured');
      return null;
    }

    this.client = axios.create({
      baseURL: credentials.endpoint,
      auth: {
        username: credentials.username,
        password: credentials.password,
      },
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    return this.client;
  }

  /**
   * Get OpenSearch credentials from Secrets Manager or environment
   */
  private async getCredentials(): Promise<OpenSearchCredentials | null> {
    if (this.credentials) {
      return this.credentials;
    }

    const secretArn = this.configService.get('OPENSEARCH_SECRET_ARN');

    if (secretArn) {
      // Get credentials from Secrets Manager
      try {
        const command = new GetSecretValueCommand({ SecretId: secretArn });
        const response = await this.secretsClient.send(command);

        if (response.SecretString) {
          const secret = JSON.parse(response.SecretString);
          this.credentials = {
            username: secret.username,
            password: secret.password,
            endpoint: secret.endpoint,
          };
          return this.credentials;
        }
      } catch (error) {
        console.error('Error fetching OpenSearch credentials from Secrets Manager:', error);
        return null;
      }
    }

    // Fallback to environment variables (for local development)
    const endpoint = this.configService.get('OPENSEARCH_ENDPOINT');
    const username = this.configService.get('OPENSEARCH_USERNAME');
    const password = this.configService.get('OPENSEARCH_PASSWORD');

    if (endpoint && username && password) {
      this.credentials = { endpoint, username, password };
      return this.credentials;
    }

    return null;
  }

  /**
   * Index a document
   */
  async indexDocument(index: string, id: string, document: any): Promise<void> {
    const client = await this.getClient();
    if (!client) {
      console.warn('OpenSearch not configured, skipping indexing');
      return;
    }

    try {
      await client.put(`/${index}/_doc/${id}`, document);
    } catch (error) {
      console.error('Error indexing document to OpenSearch:', error);
      // Don't throw - logging failures shouldn't break the application
    }
  }

  /**
   * Bulk index documents
   */
  async bulkIndex(index: string, documents: Array<{ id: string; doc: any }>): Promise<void> {
    const client = await this.getClient();
    if (!client) {
      console.warn('OpenSearch not configured, skipping bulk indexing');
      return;
    }

    try {
      const body = documents
        .flatMap(({ id, doc }) => [
          { index: { _index: index, _id: id } },
          doc,
        ])
        .map(item => JSON.stringify(item))
        .join('\n') + '\n';

      await client.post('/_bulk', body, {
        headers: {
          'Content-Type': 'application/x-ndjson',
        },
      });
    } catch (error) {
      console.error('Error bulk indexing to OpenSearch:', error);
    }
  }

  /**
   * Search documents
   */
  async search(index: string, query: any): Promise<any> {
    const client = await this.getClient();
    if (!client) {
      console.warn('OpenSearch not configured, returning empty results');
      return { hits: { hits: [] } };
    }

    try {
      const response = await client.post(`/${index}/_search`, query);
      return response.data;
    } catch (error) {
      console.error('Error searching OpenSearch:', error);
      return { hits: { hits: [] } };
    }
  }

  /**
   * Create index with mapping
   */
  async createIndex(index: string, mapping: any): Promise<void> {
    const client = await this.getClient();
    if (!client) {
      return;
    }

    try {
      await client.put(`/${index}`, mapping);
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.error?.type === 'resource_already_exists_exception') {
        console.log(`Index ${index} already exists`);
      } else {
        console.error('Error creating OpenSearch index:', error);
      }
    }
  }
}
