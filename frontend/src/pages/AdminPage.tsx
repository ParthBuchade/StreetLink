import { useEffect, useState } from "react";

import { signOut } from "firebase/auth";

import { auth } from "@/lib/firebase";

import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";

import API from "@/services/api";

interface Supplier {
  id: number;

  business_name: string;

  verification_status: string;

  name: string;

  email: string;

  gst_number: string;
}

const AdminPage = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    totalUsers: 0,

    totalVendors: 0,

    totalSuppliers: 0,

    totalOrders: 0,

    totalRevenue: 0,

    pendingVerifications: 0,

    deliveredOrders: 0,

    pendingCOD: 0,
  });

  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  const handleLogout = async () => {
    try {
      await signOut(auth);

      navigate("/login");
    } catch (error) {
      console.log("LOGOUT ERROR:", error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await API.get("/admin/suppliers");

      setSuppliers(response.data.suppliers);
    } catch (error) {
      console.log("FETCH SUPPLIERS ERROR:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminStats = async () => {
    try {
      const response = await API.get("/admin/stats");

      setStats(response.data.stats);
    } catch (error) {
      console.log("ADMIN STATS ERROR:", error);
    }
  };

  const fetchRecentOrders = async () => {
    try {
      const response = await API.get("/admin/orders");

      setRecentOrders(response.data.orders);
    } catch (error) {
      console.log("FETCH ORDERS ERROR:", error);
    }
  };

  const approveSupplier = async (supplierId: number) => {
    try {
      await API.patch(`/admin/suppliers/${supplierId}/approve`);

      fetchSuppliers();
    } catch (error) {
      console.log("APPROVE ERROR:", error);
    }
  };

  const rejectSupplier = async (supplierId: number) => {
    try {
      await API.patch(`/admin/suppliers/${supplierId}/reject`);

      fetchSuppliers();
    } catch (error) {
      console.log("REJECT ERROR:", error);
    }
  };

  // useEffect(() => {
  //   fetchSuppliers();
  //   fetchAdminStats();
  //   fetchRecentOrders();
  // }, []);

  useEffect(() => {
    fetchSuppliers();
    fetchAdminStats();
    fetchRecentOrders();

    const interval = setInterval(() => {
      fetchSuppliers();
      fetchAdminStats();
      fetchRecentOrders();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div
        className="
      min-h-screen
      flex
      items-center
      justify-center
      text-xl
      font-semibold
    "
      >
        Loading Admin Dashboard...
      </div>
    );
  }

  return (
    <div className="p-10">
      <div
        className="
  flex
  justify-between
  items-center
  mb-10
"
      >
        <div>
          <h1
            className="
      text-4xl
      font-bold
    "
          >
            Admin Dashboard
          </h1>

          <p
            className="
      text-gray-500
      mt-1
    "
          >
            Monitor marketplace activity and supplier verification
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="
    bg-red-600
    hover:bg-red-700
    transition
    text-white
    px-5
    py-2
    rounded-lg
    shadow
  "
        >
          Logout
        </button>
      </div>

      <div
        className="
    grid
    grid-cols-1
    md:grid-cols-2
    lg:grid-cols-4 xl:grid-cols-4
    gap-6
    mb-8
  "
      >
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-500">Total Users</p>

            <h2
              className="
          text-3xl
          font-bold
          mt-2
        "
            >
              {stats.totalUsers}
            </h2>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-gray-500">Total Orders</p>

            <h2
              className="
          text-3xl
          font-bold
          mt-2
        "
            >
              {stats.totalOrders}
            </h2>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-gray-500">Total Revenue</p>

            <h2
              className="
          text-3xl
          font-bold
          mt-2
          text-green-600
        "
            >
              ₹{stats.totalRevenue}
            </h2>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-gray-500">Pending Verifications</p>

            <h2
              className="
          text-3xl
          font-bold
          mt-2
          text-orange-500
        "
            >
              {stats.pendingVerifications}
            </h2>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-gray-500">Total Vendors</p>

            <h2
              className="
      text-3xl
      font-bold
      mt-2
      text-blue-600
    "
            >
              {stats.totalVendors}
            </h2>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-gray-500">Total Wholesalers</p>

            <h2
              className="
      text-3xl
      font-bold
      mt-2
      text-purple-600
    "
            >
              {stats.totalSuppliers}
            </h2>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-gray-500">Delivered Orders</p>

            <h2
              className="
      text-3xl
      font-bold
      mt-2
      text-green-600
    "
            >
              {stats.deliveredOrders}
            </h2>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-gray-500">Pending COD</p>

            <h2
              className="
      text-3xl
      font-bold
      mt-2
      text-orange-500
    "
            >
              {stats.pendingCOD}
            </h2>
          </CardContent>
        </Card>
      </div>

      {/* <div className="mb-10">
        <h2
          className="
      text-2xl
      font-bold
      mb-4
    "
        >
          Recent Orders
        </h2>

        <div className="overflow-x-auto">
          <table
            className="
        w-full
        border
        border-gray-200
        mb-8
      "
          >
            <thead>
              <tr className="bg-gray-100">
                <th className="p-3 border">Order ID</th>

                <th className="p-3 border">Vendor</th>

                <th className="p-3 border">Wholesaler</th>

                <th className="p-3 border">Amount</th>

                <th className="p-3 border">Payment</th>

                <th className="p-3 border">Status</th>

                <th className="p-3 border">Date</th>
              </tr>
            </thead>

            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id}>
                  <td className="p-3 border">#{order.id}</td>

                  <td className="p-3 border">{order.vendor_name}</td>

                  <td className="p-3 border">{order.business_name}</td>

                  <td className="p-3 border font-medium">
                    ₹{order.total_amount}
                  </td>

                  <td className="p-3 border">
                    <span
                      className={`
                  px-2
                  py-1
                  rounded
                  text-xs
                  ${
                    order.payment_status === "paid"
                      ? `
                      bg-green-100
                      text-green-800
                    `
                      : `
                      bg-yellow-100
                      text-yellow-800
                    `
                  }
                `}
                    >
                      {order.payment_method}
                      {" • "}
                      {order.payment_status}
                    </span>
                  </td>

                  <td className="p-3 border">
                    <span
                      className={`
                  px-2
                  py-1
                  rounded
                  text-xs
                  ${
                    order.order_status === "delivered"
                      ? `
                      bg-green-100
                      text-green-800
                    `
                      : `
                      bg-blue-100
                      text-blue-800
                    `
                  }
                `}
                    >
                      {order.order_status}
                    </span>
                  </td>

                  <td className="p-3 border text-sm">
                    {new Date(order.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div> */}

      <Card className="mb-10 shadow-lg border-0">
        <CardContent className="p-6">
          <div
            className="
      flex
      justify-between
      items-center
      mb-6
    "
          >
            <h2
              className="
        text-2xl
        font-bold
      "
            >
              Recent Orders
            </h2>

            <span
              className="
        text-sm
        text-gray-500
      "
            >
              Latest marketplace activity
            </span>
          </div>

          {/* <div className="overflow-x-auto">
            <table
              className="
        w-full
        border
        border-gray-200
        rounded-lg
        overflow-hidden
      "
            >
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-3 border">Order ID</th>

                  <th className="p-3 border">Vendor</th>

                  <th className="p-3 border">Wholesaler</th>

                  <th className="p-3 border">Amount</th>

                  <th className="p-3 border">Payment</th>

                  <th className="p-3 border">Status</th>

                  <th className="p-3 border">Date</th>
                </tr>
              </thead>

              <tbody>
                {recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="
              hover:bg-gray-50
              transition
            "
                  >
                    <td
                      className="
                p-3
                border
                font-medium
              "
                    >
                      #{order.id}
                    </td>

                    <td className="p-3 border">{order.vendor_name}</td>

                    <td className="p-3 border">{order.business_name}</td>

                    <td
                      className="
                p-3
                border
                font-semibold
                text-green-600
              "
                    >
                      ₹{order.total_amount}
                    </td>

                    <td className="p-3 border">
                      <span
                        className={`
                  px-3
                  py-1
                  rounded-full
                  text-xs
                  font-medium

                  ${
                    order.payment_status === "paid"
                      ? `
                      bg-green-100
                      text-green-800
                    `
                      : `
                      bg-yellow-100
                      text-yellow-800
                    `
                  }
                `}
                      >
                        {order.payment_method}

                        {" • "}

                        {order.payment_status}
                      </span>
                    </td>

                    <td className="p-3 border">
                      <span
                        className={`
                  px-3
                  py-1
                  rounded-full
                  text-xs
                  font-medium

                  ${
                    order.order_status === "delivered"
                      ? `
                      bg-green-100
                      text-green-800
                    `
                      : `
                      bg-blue-100
                      text-blue-800
                    `
                  }
                `}
                      >
                        {order.order_status}
                      </span>
                    </td>

                    <td
                      className="
                p-3
                border
                text-sm
                text-gray-500
              "
                    >
                      {new Date(order.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div> */}

          <div className="overflow-x-auto">
            <table
              className="
    w-full
    border
    border-gray-200
    rounded-lg
    overflow-hidden
  "
            >
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-3 border">Order ID</th>

                  <th className="p-3 border">Vendor</th>

                  <th className="p-3 border">Wholesaler</th>

                  <th className="p-3 border">Amount</th>

                  <th className="p-3 border">Payment</th>

                  <th className="p-3 border">Status</th>

                  <th className="p-3 border">Date</th>
                </tr>
              </thead>

              <tbody>
                {recentOrders.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="
      text-center
      p-6
      text-gray-500
    "
                    >
                      No recent orders found
                    </td>
                  </tr>
                )}

                {recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="
          hover:bg-gray-50
          transition
        "
                  >
                    <td
                      className="
            p-3
            border
            font-medium
          "
                    >
                      #{order.id}
                    </td>

                    <td className="p-3 border">{order.vendor_name}</td>

                    <td className="p-3 border">{order.business_name}</td>

                    <td
                      className="
            p-3
            border
            font-semibold
            text-green-600
          "
                    >
                      ₹{order.total_amount}
                    </td>

                    <td className="p-3 border">
                      <span
                        className={`
              px-3
              py-1
              rounded-full
              text-xs
              font-medium

              ${
                order.payment_status === "paid"
                  ? `
                  bg-green-100
                  text-green-800
                `
                  : `
                  bg-yellow-100
                  text-yellow-800
                `
              }
            `}
                      >
                        {order.payment_method}

                        {" • "}

                        {order.payment_status}
                      </span>
                    </td>

                    <td className="p-3 border">
                      <span
                        className={`
              px-3
              py-1
              rounded-full
              text-xs
              font-medium

              ${
                order.order_status === "delivered"
                  ? `
                  bg-green-100
                  text-green-800
                `
                  : order.order_status === "accepted"
                    ? `
                    bg-purple-100
                    text-purple-800
                  `
                    : `
                    bg-blue-100
                    text-blue-800
                  `
              }
            `}
                      >
                        {order.order_status}
                      </span>
                    </td>

                    <td
                      className="
            p-3
            border
            text-sm
            text-gray-500
          "
                    >
                      {new Date(order.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto">
        <table
          className="
          w-full
          border
          border-gray-200
        "
        >
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 border">Business</th>

              <th className="p-3 border">Owner</th>

              <th className="p-3 border">Email</th>

              <th className="p-3 border">GST</th>

              <th className="p-3 border">Status</th>

              <th className="p-3 border">Actions</th>
            </tr>
          </thead>

          <tbody>
            {suppliers.map((supplier) => (
              <tr key={supplier.id}>
                <td className="p-3 border">{supplier.business_name}</td>

                <td className="p-3 border">{supplier.name}</td>

                <td className="p-3 border">{supplier.email}</td>

                <td className="p-3 border">{supplier.gst_number}</td>

                <td className="p-3 border">
                  {supplier.verification_status === "pending" && (
                    <span
                      className="
                      bg-yellow-100
                      text-yellow-800
                      px-2
                      py-1
                      rounded
                      text-xs
                    "
                    >
                      Pending
                    </span>
                  )}

                  {supplier.verification_status === "verified" && (
                    <span
                      className="
                      bg-green-100
                      text-green-800
                      px-2
                      py-1
                      rounded
                      text-xs
                    "
                    >
                      Verified
                    </span>
                  )}

                  {supplier.verification_status === "rejected" && (
                    <span
                      className="
                      bg-red-100
                      text-red-800
                      px-2
                      py-1
                      rounded
                      text-xs
                    "
                    >
                      Rejected
                    </span>
                  )}
                </td>

                <td className="p-3 border">
                  <div
                    className="
                    flex
                    gap-2
                  "
                  >
                    <button
                      onClick={() => approveSupplier(supplier.id)}
                      className="
                        bg-green-600
                        text-white
                        px-3
                        py-1
                        rounded
                        text-sm
                      "
                    >
                      Approve
                    </button>

                    <button
                      onClick={() => rejectSupplier(supplier.id)}
                      className="
                        bg-red-600
                        text-white
                        px-3
                        py-1
                        rounded
                        text-sm
                      "
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPage;
