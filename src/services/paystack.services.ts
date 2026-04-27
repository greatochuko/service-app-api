import { PERCENTAGE_CHARGE } from "../controllers/paystack.controller";

const PAYSTACK_URL = "https://api.paystack.co";

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
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  if (!response.ok) {
    return { success: false, data: null };
  }

  return { success: false, data: data.data };
};
