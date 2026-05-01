import { env } from "../config/env";

const PAYSTACK_URL = "https://api.paystack.co";

export const PERCENTAGE_CHARGE = 10;

export const upsertPaystackSubaccount = async (
  body: {
    business_name: string;
    settlement_bank: string;
    account_number: string;
  },
  subAccountCode?: string | null,
) => {
  // Determine if we are creating (POST) or updating (PUT)
  const isUpdating = !!subAccountCode;
  const url = isUpdating
    ? `${PAYSTACK_URL}/subaccount/${subAccountCode}`
    : `${PAYSTACK_URL}/subaccount`;

  const response = await fetch(url, {
    method: isUpdating ? "PUT" : "POST",
    body: JSON.stringify({ ...body, percentage_charge: PERCENTAGE_CHARGE }),
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  if (!response.ok) {
    return { success: false, data: null };
  }

  return { success: false, data: data.data };
};

export interface PaystackTransferData {
  transfersessionid: string[]; // Or define a specific type if known
  transfertrials: string[]; // Or define a specific type if known
  domain: string;
  amount: number;
  currency: string;
  reference: string;
  source: string;
  source_details: string | null;
  reason: string;
  status: string;
  failures: null;
  transfer_code: string;
  titan_code: string | null;
  transferred_at: string | null;
  id: number;
  integration: number;
  request: number;
  recipient: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaystackTransferResponse {
  status: boolean;
  message: string;
  data: PaystackTransferData;
}

export async function initiatePaystackTransfer({
  amount,
  recipient,
  reason,
  reference,
}: {
  amount: number;
  recipient: string;
  reason: string;
  reference: string;
}): Promise<
  { data: null; error: string } | { data: PaystackTransferData; error: null }
> {
  try {
    const response = await fetch("https://api.paystack.co/transfer", {
      method: "POST",
      body: JSON.stringify({
        source: "balance",
        amount,
        recipient,
        reason,
        reference,
      }),
      headers: {
        Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    });

    const data: PaystackTransferResponse = await response.json();

    if (!data.status) throw new Error(data.message);

    return { data: data.data, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function createTransferRecipient({
  name,
  accountNumber,
  bankCode,
}: {
  name: string;
  accountNumber: string;
  bankCode: string;
}): Promise<{ data: null; error: string } | { data: string; error: null }> {
  try {
    const response = await fetch("https://api.paystack.co/transferrecipient", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "nuban",
        name,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: "NGN",
      }),
    });

    const data = await response.json();
    if (!data.status) throw new Error(data.message);

    return { data: data.data.recipient_code, error: null };
  } catch (error) {
    console.error("Paystack Recipient Error:", (error as Error).message);
    return { data: null, error: "Could not create transfer recipient" };
  }
}
