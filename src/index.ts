import {
  CreatePaymentResponse,
  RetrieveOrderPaymentResponse,
  RetrieveTransactionPaymentResponse,
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

export class RequestTimeoutError extends MonCashError {
  constructor(message: string = "Request timed out") {
    super(message, 408);
    this.name = "RequestTimeoutError";
  }
}

export class OrderNotFoundError extends MonCashError {
  constructor(orderId: string) {
    super(`Order with ID ${orderId} not found`, 404);
    this.name = "OrderNotFoundError";
  }
}

export class PaymentNotFoundError extends MonCashError {
  constructor(transactionId: string) {
    super(`Payment with ID ${transactionId} not found`, 404);
    this.name = "PaymentNotFoundError";
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

interface TokenData {
  accessToken: string;
  expiresAt: number;
}

class MoncashSDK {
  private readonly baseUrl: string;
  private readonly gatewayUrl: string;
  private readonly maxRetries: number;
  private readonly timeout: number;
  private tokenData: TokenData | null = null;

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
          Accept: "application/json",
        },
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        // Handle specific error cases
        switch (response.status) {
          case 404:
            if (endpoint === Endpoints.RETRIEVE_ORDER) {
              throw new OrderNotFoundError(
                (data as { orderId: string }).orderId
              );
            }
            if (endpoint === Endpoints.RETRIEVE_TRANSACTION) {
              throw new PaymentNotFoundError(
                (data as { transactionId: string }).transactionId
              );
            }
            break;
          case 401:
            if (retryCount < this.maxRetries) {
              this.tokenData = null;
              return this.makeRequest<T>(
                endpoint,
                method,
                data,
                retryCount + 1
              );
            }
            break;
        }

        throw new MonCashError(
          responseData?.error?.message ||
            `Request failed with status ${response.status}`,
          response.status,
          responseData
        );
      }

      return responseData as T;
    } catch (error) {
      if (
        error instanceof MonCashError ||
        error instanceof OrderNotFoundError ||
        error instanceof PaymentNotFoundError ||
        error instanceof RequestTimeoutError
      ) {
        if (error.statusCode === 401 && retryCount < this.maxRetries) {
          this.tokenData = null; // Reset token
          return this.makeRequest<T>(endpoint, method, data, retryCount + 1);
        }
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new RequestTimeoutError();
      }

      // Wrap unknown errors
      throw new MonCashError(
        error instanceof Error ? error.message : "Unknown error occurred",
        undefined,
        error
      );
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

    return this.makeRequest<RetrieveTransactionPaymentResponse>(
      Endpoints.RETRIEVE_TRANSACTION,
      "POST",
      {
        transactionId,
      }
    );
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

  private isTokenValid(): boolean {
    if (!this.tokenData) return false;
    // Add 60 second buffer before expiry
    // return Date.now() < this.tokenData.expiresAt - 60000;
    // Reduce buffer to 10 seconds since token life is short
    return Date.now() < this.tokenData.expiresAt - 10000;
  }

  private async getAccessToken(): Promise<string> {
    // Return existing token if it's still valid

    console.log(this.tokenData, "cachedToken");
    // Check instance cache first
    if (this.isTokenValid()) {
      return this.tokenData!.accessToken;
    }

    try {
      const credentials = Buffer.from(
        `${this.config.clientId}:${this.config.clientSecret}`
      ).toString("base64");

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

      const expiresIn = Math.max(data.expires_in, 30) * 1000; // minimum 30 seconds

      this.tokenData = {
        accessToken: data.access_token,
        expiresAt: Date.now() + expiresIn,
      };

      return this.tokenData.accessToken;
    } catch (error) {
      if (error instanceof MonCashError) throw error;
      throw new MonCashError("Failed to get access token", undefined, error);
    }
  }
}

export default MoncashSDK;
