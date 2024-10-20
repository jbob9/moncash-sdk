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

  constructor(config: MoncashSDKConfig) {
    this.config = config;
    this.baseUrl =
      config.mode === "live"
        ? "https://api.example.com"
        : "https://sandbox-api.example.com";
  }

  // Example method to make an authenticated API call
  async makeRequest(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE",
    data?: any
  ) {
    try {
      // const accessToken = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          // Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      // Handle errors appropriately
      console.error("API request failed:", error);
      throw error;
    }
  }

  // Method to get an access token (you'll need to implement this based on your API's authentication method)
  // private async getAccessToken(): Promise<string> {
  //   // Implement token retrieval logic here
  //   // This might involve making a request to an auth endpoint using clientId and clientSecret
  //   // Return the access token
  // }

  // Add more methods for specific API endpoints here
}

// Export the MoncashSDK
export default MoncashSDK;
