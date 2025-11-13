import axios, { AxiosInstance } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiService {
  private api: AxiosInstance;
  private tokenProvider: (() => Promise<string | null>) | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(async (config) => {
      if (this.tokenProvider) {
        const token = await this.tokenProvider();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    });
  }

  setTokenProvider(provider: () => Promise<string | null>) {
    this.tokenProvider = provider;
  }

  // Customers
  async getCustomers() {
    const response = await this.api.get('/customers');
    return Array.isArray(response.data) ? response.data : [];
  }

  async getCustomer(id: string) {
    const response = await this.api.get(`/customers/${id}`);
    return response.data;
  }

  async createCustomer(data: any) {
    const response = await this.api.post('/customers', data);
    return response.data;
  }

  async updateCustomer(id: string, data: any) {
    const response = await this.api.put(`/customers/${id}`, data);
    return response.data;
  }

  async deleteCustomer(id: string) {
    const response = await this.api.delete(`/customers/${id}`);
    return response.data;
  }

  // AI Generator
  async generateIntegrationCode(data: any) {
    const response = await this.api.post('/ai-generator/integration-code', data);
    return response.data;
  }

  async generateTransformationFunction(description: string) {
    const response = await this.api.post('/ai-generator/transformation-function', {
      description,
    });
    return response.data;
  }

  // Lambda Deployer
  async deployLambda(data: any) {
    const response = await this.api.post('/lambda-deployer/deploy', data);
    return response.data;
  }

  // Deliveries
  async getDeliveries(params?: { customerId?: string; status?: string }) {
    const response = await this.api.get('/deliveries', { params });
    return Array.isArray(response.data) ? response.data : [];
  }

  async getDelivery(id: string) {
    const response = await this.api.get(`/deliveries/${id}`);
    return response.data;
  }

  async createDelivery(data: any) {
    const response = await this.api.post('/deliveries', data);
    return response.data;
  }

  async uploadDeliveryFile(data: { file: File; customerId: string }) {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('customerId', data.customerId);

    const response = await this.api.post('/deliveries/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Legacy method - not recommended (exposes AWS URLs to frontend)
  async getUploadUrl(data: { filename: string; customerId: string }) {
    const response = await this.api.post('/deliveries/upload-url', data);
    return response.data;
  }

  // Mappings
  async getMappings(customerId: string) {
    const response = await this.api.get('/mappings', {
      params: { customerId },
    });
    return Array.isArray(response.data) ? response.data : [];
  }

  async getMappingsByCustomer(customerId: string) {
    return this.getMappings(customerId);
  }

  async getMapping(customerId: string, mappingId: string) {
    const response = await this.api.get(`/mappings/${mappingId}`, {
      params: { customerId },
    });
    return response.data;
  }

  async createMapping(data: any) {
    const response = await this.api.post('/mappings', data);
    return response.data;
  }

  async updateMapping(customerId: string, mappingId: string, data: any) {
    const response = await this.api.put(`/mappings/${mappingId}`, data, {
      params: { customerId },
    });
    return response.data;
  }

  async deleteMapping(customerId: string, mappingId: string) {
    const response = await this.api.delete(`/mappings/${mappingId}`, {
      params: { customerId },
    });
    return response.data;
  }

  // Transformations
  async getTransformations() {
    const response = await this.api.get('/transformations');
    return Array.isArray(response.data) ? response.data : [];
  }

  async applyTransformation(data: any) {
    const response = await this.api.post('/transformations/apply', data);
    return response.data;
  }

  async validateTransformationCode(code: string) {
    const response = await this.api.post('/transformations/validate', { code });
    return response.data;
  }

  // Logs
  async getDeliveryLogs(deliveryId: string) {
    const response = await this.api.get(`/logs/delivery/${deliveryId}`);
    return Array.isArray(response.data) ? response.data : [];
  }

  async getFailedLeads(deliveryId: string) {
    const response = await this.api.get(`/logs/delivery/${deliveryId}/failed`);
    return Array.isArray(response.data) ? response.data : [];
  }

  async searchLogs(query: string) {
    const response = await this.api.get('/logs/search', { params: { q: query } });
    return Array.isArray(response.data) ? response.data : [];
  }

  // Upload file to S3
  async uploadFile(uploadUrl: string, file: File) {
    await axios.put(uploadUrl, file, {
      headers: {
        'Content-Type': file.type,
      },
    });
  }
}

export default new ApiService();
