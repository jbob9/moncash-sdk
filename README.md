# MonCash SDK

A powerful Node.js/TypeScript SDK for integrating MonCash payment services into your applications.

## Table of Contents
- [Installation](#installation)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Methods](#methods)
- [Error Handling](#error-handling)

<!-- ## Installation

```bash
npm install moncash-sdk
# or
yarn add moncash-sdk
``` -->

## Prerequisites

Before using this SDK, make sure you have:
- A MonCash business account
- Client ID and Client Secret from MonCash
- Node.js version 14 or higher

## Setup

1. Install the package in your project
2. Import and initialize the SDK:

```typescript
import MoncashSDK from 'moncash-sdk';

const moncash = new MoncashSDK({
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  mode: 'sandbox', // Use 'live' for production
  maxRetries: 3,
  timeout: 30000 // 30 seconds
});
```

## Usage

### Creating a Payment

```typescript
try {
  const payment = await moncash.createPayment(100, 'ORDER123');
  console.log('Payment URL:', payment.redirectUrl);
  console.log('Payment Token:', payment.paymentToken);
} catch (error) {
  console.error('Payment failed:', error.message);
}
```

### Retrieving a Transaction

```typescript
try {
  const transaction = await moncash.getTransaction('transaction-id');
  console.log('Transaction:', transaction);
} catch (error) {
  console.error('Failed to get transaction:', error.message);
}
```

### Retrieving an Order

```typescript
try {
  const order = await moncash.getOrder('order-id');
  console.log('Order:', order);
} catch (error) {
  console.error('Failed to get order:', error.message);
}
```

### Making a Transfer

```typescript
try {
  const transfer = await moncash.transFer(100, 'receiver-id', 'Payment for services');
  console.log('Transfer:', transfer);
} catch (error) {
  console.error('Transfer failed:', error.message);
}
```

## API Reference

### Configuration Options

```typescript
interface MoncashSDKConfig {
  clientId: string;        // Your MonCash client ID
  clientSecret: string;    // Your MonCash client secret
  mode: 'live' | 'sandbox'; // API environment
  maxRetries?: number;     // Maximum retry attempts (default: 3)
  timeout?: number;        // Request timeout in ms (default: 30000)
}
```

### Methods

#### createPayment(amount: number, orderId: string)
Creates a new payment request.

#### getTransaction(transactionId: string)
Retrieves transaction details.

#### getOrder(orderId: string)
Retrieves order details.

#### transFer(amount: number, receiver: string, description: string)
Transfers money to another MonCash account.

## Error Handling

The SDK uses a custom `MonCashError` class for comprehensive error handling:

```typescript
try {
  const payment = await moncash.createPayment(100, 'ORDER123');
} catch (error) {
  if (error instanceof MonCashError) {
    console.error('Status:', error.statusCode);
    console.error('Message:', error.message);
    console.error('Response:', error.response);
  }
}
```

## Best Practices

1. Always use environment variables for credentials
2. Implement proper error handling
3. Use sandbox mode for testing
4. Monitor API metrics regularly
5. Keep the SDK updated to the latest version

## License

MIT License

## Support

For support, please open an issue in the GitHub repository or contact our support team.
