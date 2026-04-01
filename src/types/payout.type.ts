export interface BankType {
  id: number;
  name: string;
  slug: string;
  code: string;
  longcode: string;
  gateway: string | null;
  pay_with_bank: boolean;
  supports_transfer: boolean;
  available_for_direct_debit: boolean;
  active: boolean;
  country: string;
  currency: "NGN" | string; // Narrowed to NGN but allows for others
  type: "nuban" | string;
  is_deleted: boolean;
  createdAt: string; // ISO Date string
  updatedAt: string; // ISO Date string
}
