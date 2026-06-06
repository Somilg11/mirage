import {z} from "zod";

export const CreateOrderSchema = z.object({
  marketId: z.string(),
  side: z.enum(["yes", "no"]),
  type: z.enum(["buy", "sell"]),
  price: z.int(),
  quantity: z.int(),
});

export type OrderBook = {[key: string]: {
    availableQuantity: number;
    orders: {userId: string, quantity: number, filledQuantity: number, originalOrderId: string, reverseOrder: boolean}[];
}}