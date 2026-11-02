import Image from "next/image";
import { cn } from "@/lib/cn";
import {
  ORDER_STATUS_SVG,
  orderListStatusIcon,
} from "@/lib/order-status-icons";
import type { OrderProgressId, OrderStatus } from "@/lib/sample-orders";

export function OrderStatusSvg({
  name,
  className,
  size = 20,
}: {
  name: Exclude<OrderProgressId, "cancelled"> | "cancelled";
  className?: string;
  size?: number;
}) {
  const src =
    name === "cancelled"
      ? "/orders/status/cancelled.svg"
      : ORDER_STATUS_SVG[name];

  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      unoptimized
    />
  );
}

export function OrderListStatusSvg({
  status,
  className,
  size = 20,
}: {
  status: OrderStatus;
  className?: string;
  size?: number;
}) {
  return (
    <Image
      src={orderListStatusIcon(status)}
      alt=""
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      unoptimized
    />
  );
}
