const PAYSTACK_URL = "https://api.paystack.co";

export const createPaystackSubaccount = async (body: {
  business_name: string;
  settlement_bank: string;
  account_number: string;
  percentage_charge: number; // 0.1 for 10%
}) => {
  const response = await fetch(`${PAYSTACK_URL}/subaccount`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  });
  const data = await response.json();
  return data.data;
};
