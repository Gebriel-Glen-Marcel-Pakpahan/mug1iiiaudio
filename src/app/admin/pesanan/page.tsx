import { listAllOrders } from "@/lib/repo";
import { AdminOrders } from "@/components/admin/orders-table";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await listAllOrders();
  return (
    <AdminOrders
      orders={orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        userEmail: o.userEmail,
        albums: o.albumTitles,
        totalAmount: o.totalAmount,
        status: o.status,
        accessStatus: o.accessStatus,
        createdAt: o.createdAt,
        items: o.items.length,
      }))}
    />
  );
}
