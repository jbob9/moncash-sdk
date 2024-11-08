export type CreatePaymentResponse = {
  path: "/v1/CreatePayment";
  payment_token: {
    expired: string;
    created: string;
    token: string;
  };
  timestamp: number;
  status: number;
  mode: "live" | "sandbox";
};

export type RetrieveTransactionPaymentResponse = {
  path: "Api/v1/RetrieveTransactionPayment";
  payment: {
    reference: string;
    transaction_id: string;
    cost: number;
    message: "successful" | 'failed';
    payer: string;
  };
  timestamp: number;
  status: number;
};

export type RetrieveOrderPaymentResponse = {
  path: "Api/v1/RetrieveOrderPayment";
  payment: {
    reference: string;
    transaction_id: string;
    cost: number;
    message: "successful" | "failed";
    payer: string;
  };
  timestamp: number;
  status: number;
};

export type TransFerResponse = {
  path: "Api/v1/TransFer";
  transfer: {
    transaction_id: string;
    amount: number;
    receiver: string;
    message: "successful";
    desc: string;
  };
  timestamp: number;
  status: number;
};
