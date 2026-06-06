import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, IndianRupee, PackageCheck, Clock, Truck } from "lucide-react";
import API from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  orders: any[];
  bidOrders?: any[];
  updateMysqlOrderStatus: (id: number, status: string) => void;
  markPaymentReceived: (id: number) => void;
  markBidOrderPaid?: (firestoreBidId: string) => void;
  onBidOrderStatusUpdate?: () => void; // optional refresh callback
}

const formatDate = (date: string) => {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const PaymentBadge = ({ status, method }: { status: string; method?: string }) => (
  <span
    className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
      status === "paid"
        ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
        : "bg-amber-100 text-amber-700 border border-amber-200"
    }`}
  >
    <IndianRupee size={10} />
    {status === "paid"
      ? `Paid${method === "online" ? " (Online)" : " (COD)"}`
      : "Payment Pending"}
  </span>
);

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    placed:    "bg-yellow-100 text-yellow-700 border border-yellow-200",
    accepted:  "bg-blue-100 text-blue-700 border border-blue-200",
    delivered: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    confirmed: "bg-blue-100 text-blue-700 border border-blue-200",
    shipped:   "bg-violet-100 text-violet-700 border border-violet-200",
    cancelled: "bg-red-100 text-red-700 border border-red-200",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
};

const IncomingOrdersModal = ({
  isOpen,
  onClose,
  orders,
  bidOrders = [],
  updateMysqlOrderStatus,
  markPaymentReceived,
  markBidOrderPaid,
  onBidOrderStatusUpdate,
}: Props) => {
  const { toast } = useToast();

  if (!isOpen) return null;

  const pendingBidPayments = bidOrders.filter(
    (o) => o.payment_status === "pending" && o.order_status !== "cancelled"
  );

  // Update bid order status (shipped / delivered / cancelled)
  const handleBidOrderStatus = async (firestoreBidId: string, status: string) => {
    try {
      await API.patch(`/bid-orders/${firestoreBidId}/status`, { status });
      toast({ title: "Bid Order Updated", description: `Status changed to ${status}` });
      if (onBidOrderStatusUpdate) onBidOrderStatusUpdate();
    } catch (err) {
      console.error("BID STATUS UPDATE ERROR:", err);
      toast({ variant: "destructive", title: "Error", description: "Failed to update bid order status." });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">Incoming Orders</h2>
            {pendingBidPayments.length > 0 && (
              <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingBidPayments.length} bid payment{pendingBidPayments.length > 1 ? "s" : ""} pending
              </span>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-8">

          {/* ── MARKETPLACE ORDERS ── */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Marketplace Orders ({orders.length})
            </h3>

            {orders.length === 0 ? (
              <p className="text-gray-400 text-sm py-4">No marketplace orders yet.</p>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold">{order.product_name ?? "Marketplace Order"}</h3>
                          <p className="text-sm text-gray-500">Order #{order.id}</p>
                          <p className="text-xs text-gray-400 mt-0.5">📅 {formatDate(order.created_at)}</p>
                        </div>
                        <div className="flex gap-2 flex-wrap justify-end">
                          <StatusBadge status={order.order_status} />
                          <PaymentBadge status={order.payment_status} method={order.payment_method} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                        <div><strong>Vendor:</strong> {order.vendor_name}</div>
                        <div><strong>Phone:</strong> {order.phone ?? "—"}</div>
                        <div><strong>Total:</strong> <span className="font-bold text-green-700">₹{order.total_amount}</span></div>
                        <div><strong>Payment:</strong> {order.payment_method === "online" ? "Online" : "Cash on Delivery"}</div>
                        {order.address && (
                          <div className="col-span-2"><strong>Address:</strong> {order.address}</div>
                        )}
                      </div>

                      {order.items?.length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-2">
                          <p className="font-semibold text-sm">Products:</p>
                          {order.items.map((item: any, i: number) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span>{item.product_name} × {item.quantity}</span>
                              <span className="font-medium text-green-700">₹{item.subtotal}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {order.delivered_at && (
                        <p className="text-xs text-gray-500 mb-2">📦 Delivered: {formatDate(order.delivered_at)}</p>
                      )}
                      {order.paid_at && (
                        <p className="text-xs text-emerald-600 mb-2">💳 Paid: {formatDate(order.paid_at)}</p>
                      )}

                      <div className="flex gap-2 flex-wrap mt-2">
                        {order.order_status === "placed" && (
                          <>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700"
                              onClick={() => updateMysqlOrderStatus(order.id, "accepted")}>
                              Accept
                            </Button>
                            <Button size="sm" variant="destructive"
                              onClick={() => updateMysqlOrderStatus(order.id, "cancelled")}>
                              Reject
                            </Button>
                          </>
                        )}
                        {order.order_status === "accepted" && (
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => updateMysqlOrderStatus(order.id, "delivered")}>
                            Mark Delivered
                          </Button>
                        )}
                        {order.order_status === "delivered" &&
                          order.payment_method === "cod" &&
                          order.payment_status === "pending" && (
                            <Button size="sm" className="bg-purple-600 hover:bg-purple-700"
                              onClick={() => markPaymentReceived(order.id)}>
                              <IndianRupee size={13} className="mr-1" />
                              Mark Payment Received
                            </Button>
                          )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* ── BID / NEGOTIATION ORDERS ── */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              Bid / Negotiation Orders ({bidOrders.length})
              {pendingBidPayments.length > 0 && (
                <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {pendingBidPayments.length} unpaid
                </span>
              )}
            </h3>

            {bidOrders.length === 0 ? (
              <p className="text-gray-400 text-sm py-4">No bid orders yet. Accepted bids will appear here.</p>
            ) : (
              <div className="space-y-4">
                {bidOrders.map((order) => (
                  <Card
                    key={order.id}
                    className={`border-l-4 ${
                      order.payment_status === "paid"   ? "border-l-emerald-500" :
                      order.order_status  === "cancelled" ? "border-l-gray-300"   :
                      "border-l-amber-400"
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-lg font-bold">{order.product_name}</h3>
                          <p className="text-sm text-gray-500">Bid Order #{order.id}</p>
                          <p className="text-xs text-gray-400 mt-0.5">📅 {formatDate(order.created_at)}</p>
                        </div>
                        <div className="flex gap-2 flex-wrap justify-end">
                          <StatusBadge status={order.order_status} />
                          <PaymentBadge status={order.payment_status} method={order.payment_method} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                        <div><strong>Vendor:</strong> {order.vendor_name}</div>
                        <div><strong>Phone:</strong> {order.vendor_phone ?? "—"}</div>
                        <div><strong>Qty:</strong> {order.quantity} units @ ₹{order.price_per_unit}/unit</div>
                        <div><strong>Total:</strong> <span className="font-bold text-green-700">₹{order.total_amount}</span></div>
                        {order.vendor_address && (
                          <div className="col-span-2"><strong>Address:</strong> {order.vendor_address}</div>
                        )}
                      </div>

                      {/* Payment pending warning (only for COD — online payment vendor does themselves) */}
                      {order.payment_status === "pending" &&
                        order.order_status   !== "cancelled" &&
                        order.payment_method !== "online" && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 flex items-start gap-2">
                            <Clock size={14} className="text-amber-600 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-amber-700">COD Payment Pending</p>
                              <p className="text-xs text-amber-600 mt-0.5">
                                Vendor will pay cash on delivery. Once received, mark it below.
                              </p>
                            </div>
                          </div>
                        )}

                      {/* Online payment already done by vendor */}
                      {order.payment_status === "pending" &&
                        order.payment_method === "online" &&
                        order.order_status !== "cancelled" && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 flex items-start gap-2">
                            <IndianRupee size={14} className="text-blue-600 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-blue-700">Online Payment Initiated</p>
                              <p className="text-xs text-blue-600 mt-0.5">
                                Vendor chose online payment. Awaiting Razorpay confirmation.
                              </p>
                            </div>
                          </div>
                        )}

                      {order.paid_at && (
                        <p className="text-xs text-emerald-600 mb-2">
                          💳 Paid: {formatDate(order.paid_at)}
                          {order.payment_method === "online" && " (Online / Razorpay)"}
                        </p>
                      )}
                      {order.delivered_at && (
                        <p className="text-xs text-gray-500 mb-2">📦 Delivered: {formatDate(order.delivered_at)}</p>
                      )}

                      {/* Bid order action buttons */}
                      <div className="flex gap-2 flex-wrap mt-2">
                        {/* Mark COD payment received */}
                        {order.payment_status === "pending" &&
                          order.order_status   !== "cancelled" &&
                          order.payment_method !== "online" &&
                          markBidOrderPaid && (
                            <Button
                              size="sm"
                              className="bg-purple-600 hover:bg-purple-700"
                              onClick={() => markBidOrderPaid(order.firestore_bid_id)}
                            >
                              <IndianRupee size={13} className="mr-1" />
                              Mark Payment Received
                            </Button>
                          )}

                        {/* Mark Shipped */}
                        {order.order_status === "confirmed" && (
                          <Button
                            size="sm"
                            className="bg-violet-600 hover:bg-violet-700"
                            onClick={() => handleBidOrderStatus(order.firestore_bid_id, "shipped")}
                          >
                            <Truck size={13} className="mr-1" />
                            Mark Shipped
                          </Button>
                        )}

                        {/* Mark Delivered */}
                        {(order.order_status === "confirmed" || order.order_status === "shipped") && (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleBidOrderStatus(order.firestore_bid_id, "delivered")}
                          >
                            <PackageCheck size={13} className="mr-1" />
                            Mark Delivered
                          </Button>
                        )}

                        {/* Cancel */}
                        {order.order_status !== "delivered" && order.order_status !== "cancelled" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleBidOrderStatus(order.firestore_bid_id, "cancelled")}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
};

export default IncomingOrdersModal;
