import {
  CreatePaymentResponse,
  RetrieveOrderPaymentResponse,
  TransFerResponse,
} from "./types";

// Define the MoncashSDK configuration interface
interface MoncashSDKConfig {
  clientId: string;
  clientSecret: string;
  mode: "live" | "sandbox";
}

// Create the main MoncashSDK class
class MoncashSDK {
  private config: MoncashSDKConfig;
  private baseUrl: string;
  private gatewayUrl: string;

  constructor(config: MoncashSDKConfig) {
    this.config = config;
    this.baseUrl =
      config.mode === "live"
        ? "https://moncashbutton.digicelgroup.com/Api"
        : "https://sandbox.moncashbutton.digicelgroup.com/Api";

    this.gatewayUrl =
      config.mode === "live"
        ? "https://moncashbutton.digicelgroup.com/Moncash-middleware"
        : "https://sandbox.moncashbutton.digicelgroup.com/Moncash-middleware";
  }

  // Example method to make an authenticated API call
  async makeRequest<T>(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE",
    data?: any
  ) {
    try {
      const accessToken = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      // Handle errors appropriately
      console.error("API request failed:", error);
      throw error;
    }
  }

  createPayment(amount: number, orderId: string) {
    return this.makeRequest<CreatePaymentResponse>(
      "/v1/CreatePayment",
      "POST",
      {
        amount,
        orderId,
      }
    ).then((response) => {
      const redirectUrl = `${this.gatewayUrl}/Payment/Redirect?token=${response.payment_token.token}`;
      return { redirectUrl, paymentToken: response.payment_token.token };
    });
  }

  getTransaction(transactionId: string) {
    return this.makeRequest<any>(`/v1/ RetrieveTransactionPayment`, "POST", {
      transactionId,
    });
  }

  getOrder(orderId: string) {
    return this.makeRequest<RetrieveOrderPaymentResponse>(
      `/v1/RetrieveOrderPayment`,
      "POST",
      {
        orderId,
      }
    );
  }

  transFer(amount: number, receiver: string, description: string) {
    return this.makeRequest<TransFerResponse>("/v1/TransFer", "POST", {
      amount,
      receiver,
      description,
    });
  }

  private encodeSecret(secret: string) {
    return btoa(String.fromCharCode(...new TextEncoder().encode(secret)));
  }

  // Method to get an access token (you'll need to implement this based on your API's authentication method)
  private async getAccessToken(): Promise<string> {
    try {
      const credentials = btoa(
        `${this.config.clientId}:${this.config.clientSecret}`
      );

      const response = await fetch(`${this.baseUrl}/oauth/token`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: "grant_type=client_credentials&scope=read,write",
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status}`);
      }

      const data = await response.json();
      return data.access_token;
    } catch (error) {
      console.error("Failed to get access token:", error);
      throw error;
    }
  }
}

// Export the MoncashSDK
export default MoncashSDK;
