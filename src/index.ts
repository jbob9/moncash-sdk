import {
  CreatePaymentResponse,
  RetrieveOrderPaymentResponse,
  TransFerResponse,
} from "./types";

// Custom error class for MonCash specific errors
export class MonCashError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = "MonCashError";
  }
}

// Configuration interface with additional options
interface MoncashSDKConfig {
  clientId: string;
  clientSecret: string;
  mode: "live" | "sandbox";
  maxRetries?: number;
  timeout?: number;
}

// API endpoints enum for better maintenance
enum Endpoints {
  CREATE_PAYMENT = "/v1/CreatePayment",
  RETRIEVE_TRANSACTION = "/v1/RetrieveTransactionPayment",
  RETRIEVE_ORDER = "/v1/RetrieveOrderPayment",
  TRANSFER = "/v1/TransFer",
  TOKEN = "/oauth/token",
}

class MoncashSDK {
  private readonly baseUrl: string;
  private readonly gatewayUrl: string;
  private readonly maxRetries: number;
  private readonly timeout: number;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(private readonly config: MoncashSDKConfig) {
    this.maxRetries = config.maxRetries ?? 3;
    this.timeout = config.timeout ?? 30000;

    const environment =
      config.mode === "live"
        ? "moncashbutton.digicelgroup.com"
        : "sandbox.moncashbutton.digicelgroup.com";
    this.baseUrl = `https://${environment}/Api`;
    this.gatewayUrl = `https://${environment}/Moncash-middleware`;
  }

  // Improved request method with retry mechanism and better error handling
  private async makeRequest<T>(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE",
    data?: unknown,
    retryCount = 0
  ): Promise<T> {
    try {
      const accessToken = await this.getAccessToken();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new MonCashError(
          `Request failed with status ${response.status}`,
          response.status,
          await response.json().catch(() => null)
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof MonCashError) {
        if (error.statusCode === 401 && retryCount < this.maxRetries) {
          this.accessToken = null; // Reset token
          return this.makeRequest<T>(endpoint, method, data, retryCount + 1);
        }
        throw error;
      }

      if (error instanceof Error) {
        throw new MonCashError(
          `Request failed: ${error.message}`,
          undefined,
          error
        );
      }

      throw new MonCashError("Unknown error occurred");
    }
  }

  // Improved payment creation with input validation
  async createPayment(amount: number, orderId: string) {
    if (amount <= 0) throw new MonCashError("Amount must be greater than 0");
    if (!orderId.trim()) throw new MonCashError("OrderId is required");

    const response = await this.makeRequest<CreatePaymentResponse>(
      Endpoints.CREATE_PAYMENT,
      "POST",
      { amount, orderId }
    );

    return {
      redirectUrl: `${this.gatewayUrl}/Payment/Redirect?token=${response.payment_token.token}`,
      paymentToken: response.payment_token.token,
    };
  }

  async getTransaction(transactionId: string) {
    if (!transactionId.trim())
      throw new MonCashError("TransactionId is required");

    return this.makeRequest<any>(Endpoints.RETRIEVE_TRANSACTION, "POST", {
      transactionId,
    });
  }

  async getOrder(orderId: string) {
    if (!orderId.trim()) throw new MonCashError("OrderId is required");

    return this.makeRequest<RetrieveOrderPaymentResponse>(
      Endpoints.RETRIEVE_ORDER,
      "POST",
      { orderId }
    );
  }

  async transFer(amount: number, receiver: string, description: string) {
    if (amount <= 0) throw new MonCashError("Amount must be greater than 0");
    if (!receiver.trim()) throw new MonCashError("Receiver is required");

    return this.makeRequest<TransFerResponse>(Endpoints.TRANSFER, "POST", {
      amount,
      receiver,
      description,
    });
  }

  private encodeSecret(secret: string): string {
    return btoa(String.fromCharCode(...new TextEncoder().encode(secret)));
  }

  private async getAccessToken(): Promise<string> {
    // Return existing token if it's still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const credentials = this.encodeSecret(
        `${this.config.clientId}:${this.config.clientSecret}`
      );

      const response = await fetch(`${this.baseUrl}${Endpoints.TOKEN}`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: "grant_type=client_credentials&scope=read,write",
      });

      if (!response.ok) {
        throw new MonCashError(
          "Authentication failed",
          response.status,
          await response.json().catch(() => null)
        );
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + data.expires_in * 1000;

      if (!this.accessToken) {
        throw new MonCashError("Access token is null");
      }
      return this.accessToken;
    } catch (error) {
      if (error instanceof MonCashError) throw error;
      throw new MonCashError("Failed to get access token", undefined, error);
    }
  }
}

export default MoncashSDK;
