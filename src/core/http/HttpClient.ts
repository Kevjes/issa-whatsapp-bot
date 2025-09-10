import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import https from 'https';
import { IHttpClient, HttpRequestConfig, HttpResponse, HttpError } from '../interfaces/IHttpClient';
import { errorHandler } from '../errors/ErrorHandler';
import { logger } from '../../utils/logger';

/**
 * Configuration pour les headers par défaut
 */
export interface DefaultHeadersConfig {
  [key: string]: string | (() => string) | (() => Promise<string>);
}

/**
 * Client HTTP centralisé avec gestion des headers et erreurs
 */
export class HttpClient implements IHttpClient {
  private axiosInstance: AxiosInstance;
  private defaultHeaders: DefaultHeadersConfig = {};

  constructor(baseURL?: string, timeout: number = 30000, ignoreSslErrors: boolean = false) {
    const axiosConfig: any = {
      baseURL,
      timeout,
    };

    // Ignorer les erreurs SSL en développement
    if (ignoreSslErrors || process.env.NODE_ENV === 'development') {
      axiosConfig.httpsAgent = new https.Agent({
        rejectUnauthorized: false
      });
    }

    this.axiosInstance = axios.create(axiosConfig);

    this.setupInterceptors();
  }

  /**
   * Configurer les headers par défaut
   */
  public setDefaultHeaders(headers: DefaultHeadersConfig): void {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers };
  }

  /**
   * Ajouter un header par défaut
   */
  public setDefaultHeader(key: string, value: string | (() => string) | (() => Promise<string>)): void {
    this.defaultHeaders[key] = value;
  }

  /**
   * Supprimer un header par défaut
   */
  public removeDefaultHeader(key: string): void {
    delete this.defaultHeaders[key];
  }

  /**
   * Configurer les intercepteurs
   */
  private setupInterceptors(): void {
    // Intercepteur de requête pour ajouter les headers par défaut
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        // Résoudre les headers par défaut
        const resolvedHeaders: Record<string, string> = {};
        
        for (const [key, value] of Object.entries(this.defaultHeaders)) {
          if (typeof value === 'function') {
            try {
              resolvedHeaders[key] = await value();
            } catch (error) {
              logger.warn(`Error resolving header ${key}`, { error });
            }
          } else {
            resolvedHeaders[key] = value;
          }
        }

        // Fusionner avec les headers de la requête
        Object.assign(config.headers, resolvedHeaders);

        // Logger la requête
        logger.debug('HTTP request sent', {
          method: config.method?.toUpperCase(),
          url: config.url,
          baseURL: config.baseURL,
          headers: this.sanitizeHeaders(config.headers),
        });

        return config;
      },
      (error) => {
        logger.error('Error in request interceptor', { error });
        return Promise.reject(error);
      }
    );

    // Intercepteur de réponse pour gérer les erreurs
    this.axiosInstance.interceptors.response.use(
      (response) => {
        logger.debug('HTTP response received', {
          status: response.status,
          statusText: response.statusText,
          url: response.config.url,
        });
        return response;
      },
      (error) => {
        const httpError: HttpError = {
          name: 'HttpError',
          message: error.message || 'HTTP request failed',
          status: error.response?.status,
          response: error.response ? {
            data: error.response.data,
            status: error.response.status,
            statusText: error.response.statusText,
          } : undefined,
        };

        // Logger l'erreur et la rejeter directement
        logger.error('HTTP error', {
          status: httpError.status,
          message: httpError.message,
          response: httpError.response,
          url: error.config?.url
        });
        
        return Promise.reject(httpError);
      }
    );
  }

  /**
   * Nettoyer les headers sensibles pour les logs
   */
  private sanitizeHeaders(headers: any): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const sensitiveKeys = ['authorization', 'x-auth-token', 'cookie', 'x-api-key'];

    for (const [key, value] of Object.entries(headers || {})) {
      if (sensitiveKeys.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = String(value);
      }
    }

    return sanitized;
  }

  /**
   * Convertir la réponse Axios en HttpResponse
   */
  private convertResponse<T>(axiosResponse: AxiosResponse<T>): HttpResponse<T> {
    return {
      data: axiosResponse.data,
      status: axiosResponse.status,
      statusText: axiosResponse.statusText,
      headers: axiosResponse.headers as Record<string, string>,
    };
  }

  /**
   * Convertir la config HttpRequestConfig en AxiosRequestConfig
   */
  private convertConfig(config?: HttpRequestConfig): AxiosRequestConfig {
    if (!config) return {};

    return {
      headers: config.headers,
      timeout: config.timeout,
      params: config.params,
    };
  }

  // Implémentation de l'interface IHttpClient
  public async get<T>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    const response = await this.axiosInstance.get<T>(url, this.convertConfig(config));
    return this.convertResponse(response);
  }

  public async post<T>(url: string, data?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    const response = await this.axiosInstance.post<T>(url, data, this.convertConfig(config));
    return this.convertResponse(response);
  }

  public async put<T>(url: string, data?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    const response = await this.axiosInstance.put<T>(url, data, this.convertConfig(config));
    return this.convertResponse(response);
  }

  public async delete<T>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    const response = await this.axiosInstance.delete<T>(url, this.convertConfig(config));
    return this.convertResponse(response);
  }
}