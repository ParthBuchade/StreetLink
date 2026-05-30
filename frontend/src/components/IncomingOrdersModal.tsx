import { Card, CardContent } from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import { X } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  orders: any[];
  updateMysqlOrderStatus: (id: number, status: string) => void;
  markPaymentReceived: (id: number) => void;
}

const formatDate = (date: string) => {
  if (!date) return "—";

  return new Date(date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const IncomingOrdersModal = ({
  isOpen,
  onClose,
  orders,
  updateMysqlOrderStatus,
  markPaymentReceived,
}: Props) => {
  if (!isOpen) return null;

  console.log("INCOMING ORDERS:", orders);
  return (
    <div
      className="
        fixed
        inset-0
        bg-black/70
        z-50
        flex
        items-center
        justify-center
        p-4
      "
    >
      <div
        className="
          bg-white
          rounded-xl
          max-w-4xl
          w-full
          max-h-[90vh]
          overflow-y-auto
        "
      >
        <div
          className="
            sticky
            top-0
            bg-white
            p-4
            border-b
            flex
            justify-between
            items-center
          "
        >
          <h2
            className="
              text-2xl
              font-bold
            "
          >
            Incoming Orders
          </h2>

          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6">
          {orders.length === 0 ? (
            <p className="text-gray-500">No incoming orders</p>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Card
                  key={order.id}
                  className="
                    border-l-4
                    border-l-green-500
                  "
                >
                  <CardContent className="p-4">
                    <div
                      className="
                        flex
                        justify-between
                        items-start
                        mb-4
                      "
                    >
                      <div>
                        <h3
                          className="
                            text-lg
                            font-bold
                          "
                        >
                          {order.product_name}
                        </h3>

                        <p
                          className="
                            text-sm
                            text-gray-500
                          "
                        >
                          Order #{order.id}
                        </p>
                      </div>

                      <div
                        className="
                          flex
                          gap-2
                          flex-wrap
                        "
                      >
                        <span
                          className={`
                            px-3
                            py-1
                            rounded-full
                            text-xs
                            font-medium

                            ${
                              order.order_status === "placed"
                                ? "bg-yellow-300 text-black"
                                : order.order_status === "accepted"
                                  ? "bg-green-600 text-white"
                                  : order.order_status === "delivered"
                                    ? "bg-blue-600 text-white"
                                    : "bg-red-600 text-white"
                            }
                          `}
                        >
                          {order.order_status}
                        </span>

                        <span
                          className={`
                            px-3
                            py-1
                            rounded-full
                            text-xs
                            font-medium

                            ${
                              order.payment_status === "paid"
                                ? "bg-green-700 text-white"
                                : "bg-orange-300 text-black"
                            }
                          `}
                        >
                          {order.payment_status}
                        </span>
                      </div>
                    </div>

                    <div
                      className="
                        grid
                        grid-cols-2
                        gap-4
                        text-sm
                        mb-4
                      "
                    >
                      <div>
                        <strong>Vendor:</strong> {order.vendor_name}
                      </div>

                      {/* <div>
                        <strong>Quantity:</strong> {order.quantity}
                      </div> */}

                      <div>
                        <strong>Phone:</strong> {order.phone}
                      </div>

                      <div>
                        <strong>Total:</strong> ₹{order.total_amount}
                      </div>

                      <div>
                        <strong>Payment Method:</strong>{" "}
                        {order.payment_method === "online"
                          ? "Online Payment"
                          : "Cash on Delivery"}
                      </div>

                      <div className="col-span-2">
                        <strong>Address:</strong> {order.address}
                      </div>

                      <div className="mt-4">
                        <p
                          className="
    font-bold
    mb-2
  "
                        >
                          Products:
                        </p>

                        <div className="space-y-2">
                          {order.items?.map((item: any, index: number) => (
                            <div
                              key={index}
                              className="
          bg-gray-50
          border
          rounded-lg
          p-3
        "
                            >
                              <p className="font-semibold">
                                {item.product_name}
                              </p>

                              <p className="text-sm text-gray-600">
                                Quantity: {item.quantity}
                              </p>

                              <p className="text-sm text-gray-600">
                                Price: ₹{item.price}
                              </p>

                              <p
                                className="
            text-sm
            font-medium
            text-green-600
          "
                              >
                                Subtotal: ₹{item.subtotal}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="col-span-2 mt-2">
                        <div className="space-y-1 text-sm text-gray-600">
                          <p>
                            📅 <strong>Ordered On:</strong>{" "}
                            {formatDate(order.created_at)}
                          </p>

                          {order.delivered_at && (
                            <p>
                              📦 <strong>Delivered On:</strong>{" "}
                              {formatDate(order.delivered_at)}
                            </p>
                          )}

                          {order.paid_at && (
                            <p>
                              💳 <strong>Paid On:</strong>{" "}
                              {formatDate(order.paid_at)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {order.order_status === "placed" && (
                      <div className="flex gap-3">
                        <Button
                          className="
                            bg-green-600
                            hover:bg-green-700
                          "
                          onClick={() =>
                            updateMysqlOrderStatus(order.id, "accepted")
                          }
                        >
                          Accept
                        </Button>

                        <Button
                          variant="destructive"
                          onClick={() =>
                            updateMysqlOrderStatus(order.id, "cancelled")
                          }
                        >
                          Reject
                        </Button>
                      </div>
                    )}

                    {order.order_status === "accepted" && (
                      <Button
                        className="
                          bg-blue-600
                          hover:bg-blue-700
                        "
                        onClick={() =>
                          updateMysqlOrderStatus(order.id, "delivered")
                        }
                      >
                        Mark Delivered
                      </Button>
                    )}

                    {order.order_status === "delivered" &&
                      order.payment_method === "cod" &&
                      order.payment_status === "pending" && (
                        <Button
                          className="
      bg-purple-600
      hover:bg-purple-700
      mt-3
    "
                          onClick={() => markPaymentReceived(order.id)}
                        >
                          Mark Payment Received
                        </Button>
                      )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IncomingOrdersModal;
