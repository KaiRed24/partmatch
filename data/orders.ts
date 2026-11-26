/**
 * Fictional demo orders. Set DEMO_ORDER_EMAIL in .env to your own inbox before seeding,
 * so the delay emails in Phase 4 come to you.
 */
export type DemoOrder = {
  ref: string;
  customer: string;
  product_code: string;
  status: "processing" | "delayed" | "dispatched";
  promised_in_days: number;
};

export const ORDERS: DemoOrder[] = [
  { ref: "BSP-100231", customer: "Sam Patel", product_code: "DISC018", status: "processing", promised_in_days: 2 },
  { ref: "BSP-100232", customer: "Jo Clarke", product_code: "1.1663.152", status: "processing", promised_in_days: 3 },
  { ref: "BSP-100233", customer: "Alex Morgan", product_code: "PRO820UK", status: "dispatched", promised_in_days: 1 },
  { ref: "BSP-100234", customer: "Chris Evans", product_code: "PM-MX-35P", status: "processing", promised_in_days: 4 },
  { ref: "BSP-100235", customer: "Priya Shah", product_code: "PM-FL-S12", status: "processing", promised_in_days: 2 },
  { ref: "BSP-100236", customer: "Tom Hughes", product_code: "PM-SH-TADJS", status: "dispatched", promised_in_days: 1 },
  { ref: "BSP-100237", customer: "Lee Walker", product_code: "TC043", status: "processing", promised_in_days: 3 },
  { ref: "BSP-100238", customer: "Nina Brooks", product_code: "400LB074", status: "processing", promised_in_days: 5 },
  { ref: "BSP-100239", customer: "Dan Price", product_code: "PM-FV-C260", status: "processing", promised_in_days: 2 },
  { ref: "BSP-100240", customer: "Ruth Kelly", product_code: "8367J", status: "processing", promised_in_days: 2 },
  { ref: "BSP-100241", customer: "Omar Ali", product_code: "PM-MX-40P", status: "processing", promised_in_days: 2 },
  { ref: "BSP-100242", customer: "Kate Bell", product_code: "10120028", status: "processing", promised_in_days: 4 },
];
