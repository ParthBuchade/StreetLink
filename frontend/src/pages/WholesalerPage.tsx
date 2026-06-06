// src/pages/WholesalerPage.tsx
import { useState, useEffect, useRef } from "react";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  updateDoc,
  doc,
  deleteDoc,
  where,
} from "firebase/firestore";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import WholesalerBidRequestsModal from "@/components/WholesalerBidRequestsModal";
import WholesalerOrdersModal from "@/components/WholesalerOrdersModal";
import ProductUploadForm from "@/components/ProductUploadForm";
import ProductList from "@/components/ProductList";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LogOut, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BidRequest, Order } from "@/types";
import VideoCall from "@/components/VideoCall";
import { useToast } from "@/hooks/use-toast";
import API from "@/services/api";
import { getSupplierProfile } from "@/services/supplier";
import IncomingOrdersModal from "@/components/IncomingOrdersModal";
import { createNotification } from "@/lib/notifications";
import WholesalerGPTComponent from "@/components/WholesalerGPT";
interface Product {
  id?: string;
  name: string;
  description: string;
  address: string;
  mobileNo: string;
  countryCode: string;
  price: number;
  minOrder: number;
  quantity: number;
  city: string;
  imageUrl: string;
  wholesalerId?: string;
}

const WholesalerPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const navigate = useNavigate();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousOrderCount = useRef(0);
  const [supplierProfile, setSupplierProfile] = useState<any>(null);

  // stats(Analytics)
  const [stats, setStats] = useState({
    totalOrders: 0,
    deliveredOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,         // marketplace + bid combined
    marketplaceRevenue: 0,
    bidRevenue: 0,
    totalProducts: 0,
    totalBidOrders: 0,
    pendingBidPayments: 0,
  });

  // Bid orders from MySQL (synced after Firestore acceptance)
  const [mysqlBidOrders, setMysqlBidOrders] = useState<any[]>([]);

  // Video call states
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [videoCallRoom, setVideoCallRoom] = useState("");
  const { toast } = useToast();

  // Bid management states
  const [bidRequests, setBidRequests] = useState<BidRequest[]>([]);
  const [showBidRequests, setShowBidRequests] = useState(false);

  // Orders management states
  const [orders, setOrders] = useState<Order[]>([]);
  const [mysqlOrders, setMysqlOrders] = useState<any[]>([]);
  const [showOrders, setShowOrders] = useState(false);
  const [showIncomingOrders, setShowIncomingOrders] = useState(false);

  const [currentTime, setCurrentTime] = useState(new Date());

  const startVideoCall = (product: Product) => {
    const roomName = `FreshFarm-${product.id}-${product.wholesalerId}`;
    setVideoCallRoom(roomName);
    setShowVideoCall(true);
  };

  const fetchBidRequests = async () => {
    try {
      const bidRequestsRef = collection(db, "bidRequests");
      const q = query(bidRequestsRef, where("status", "==", "pending"));
      const querySnapshot = await getDocs(q);

      const requests: BidRequest[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        requests.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          acceptedAt: data.acceptedAt?.toDate(),
        } as BidRequest);
      });

      setBidRequests(
        requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
      );
    } catch (error) {
      console.error("Error fetching bid requests:", error);
    }
  };

  const fetchOrders = async () => {
    if (!user) return;

    try {
      const ordersRef = collection(db, "orders");
      const q = query(ordersRef, where("wholesalerId", "==", user.uid));
      const querySnapshot = await getDocs(q);

      const ordersList: Order[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        ordersList.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          estimatedDelivery: data.estimatedDelivery?.toDate(),
        } as Order);
      });

      setOrders(
        ordersList.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        ),
      );
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  const fetchProducts = async (userId: string) => {
    try {
      setProductsLoading(true);
      const productsRef = collection(db, "products");
      const q = query(productsRef);
      const querySnapshot = await getDocs(q);

      const productsData: Product[] = [];
      querySnapshot.forEach((doc) => {
        if (doc.data().wholesalerId === userId) {
          productsData.push({ id: doc.id, ...doc.data() } as Product);
        }
      });

      setProducts(productsData);

      setStats((prev) => ({
        ...prev,
        totalProducts: productsData.length,
      }));
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch products. Please refresh the page.",
      });
    } finally {
      setProductsLoading(false);
    }
  };

  const handleAcceptBid = async (bidRequest: BidRequest) => {
    if (!user) return;

    try {
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const estimatedDelivery = new Date();
      estimatedDelivery.setHours(estimatedDelivery.getHours() + 4);

      const newOrder: Omit<Order, "id"> = {
        bidRequestId: bidRequest.id,
        productName: bidRequest.productName,
        quantity: bidRequest.quantity,
        pricePerUnit: bidRequest.bidPrice,
        totalAmount: bidRequest.bidPrice * bidRequest.quantity,
        vendorId: bidRequest.vendorId,
        vendorName: bidRequest.vendorName,
        wholesalerId: user.uid,
        wholesalerName: user.displayName || "Wholesaler",
        status: "confirmed",
        createdAt: new Date(),
        deliveryAddress: bidRequest.location,
        estimatedDelivery: estimatedDelivery,
      };

      const orderRef = await addDoc(collection(db, "orders"), newOrder);

      const bidRef = doc(db, "bidRequests", bidRequest.id);
      await updateDoc(bidRef, {
        status: "order_placed",
        acceptedBy: user.uid,
        acceptedAt: new Date(),
        wholesalerName: user.displayName || "Wholesaler",
        wholesalerContact: user.email || "",
        orderId: orderRef.id,
        orderPlacedAt: new Date(),
      });

      setBidRequests((prev) => prev.filter((req) => req.id !== bidRequest.id));

      // Sync bid order to MySQL for revenue tracking
      try {
        await API.post("/bid-orders/sync", {
          firestore_bid_id: bidRequest.id,
          firestore_order_id: null,
          vendor_firebase_uid: bidRequest.vendorId,
          supplier_firebase_uid: user.uid,
          product_name: bidRequest.productName,
          quantity: bidRequest.quantity,
          price_per_unit: bidRequest.bidPrice,
          total_amount: bidRequest.bidPrice * bidRequest.quantity,
        });
        fetchMysqlBidOrders();
      } catch (syncErr) {
        console.log("BID ORDER SYNC ERROR (non-critical):", syncErr);
      }
      fetchOrders();

      await createNotification({
        userId: bidRequest.vendorId,

        title: "Bid Accepted",

        message: `${user.displayName}
    accepted your bid
    for ${bidRequest.productName}`,

        type: "bid",
      });

      toast({
        title: "Order Created Successfully!",
        description: `Order placed for ${bidRequest.productName}. Estimated delivery: ${estimatedDelivery.toLocaleTimeString()}`,
      });
    } catch (error) {
      console.error("Error accepting bid:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create order. Please try again.",
      });
    }
  };

  const handleRejectBid = async (bidId: string) => {
    try {
      const bidRef = doc(db, "bidRequests", bidId);
      await updateDoc(bidRef, {
        status: "rejected",
        rejectedAt: new Date(),
      });

      setBidRequests((prev) => prev.filter((req) => req.id !== bidId));
      toast({
        title: "Bid Rejected",
        description: "The bid request has been rejected.",
      });
    } catch (error) {
      console.error("Error rejecting bid:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reject bid request. Please try again.",
      });
    }
  };

  const updateOrderStatus = async (
    orderId: string,
    newStatus: Order["status"],
  ) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        status: newStatus,
        updatedAt: new Date(),
      });

      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order,
        ),
      );

      toast({
        title: "Order Updated",
        description: `Order status changed to ${newStatus}`,
      });
    } catch (error) {
      console.error("Error updating order:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update order status.",
      });
    }
  };

  const fetchMysqlOrders = async () => {
    try {
      const response = await API.get("/orders/supplier");

      console.log("SUPPLIER MYSQL ORDERS:", response.data);

      const latestOrders = response.data.orders || [];

      if (
        previousOrderCount.current &&
        latestOrders.length > previousOrderCount.current
      ) {
        new Audio("/notification.mp3").play();

        toast({
          title: "New Marketplace Order",

          description: "You received a new order",
        });
      }

      previousOrderCount.current = latestOrders.length;

      setMysqlOrders(latestOrders);

      const orders = response.data.orders || [];

      const marketplaceRevenue = orders
        .filter((o) => o.payment_status === "paid")
        .reduce((sum, order) => sum + Number(order.total_amount), 0);

      setStats((prev) => ({
        ...prev,

        totalOrders: orders.length,

        deliveredOrders: orders.filter((o) => o.order_status === "delivered")
          .length,

        pendingOrders: orders.filter(
          (o) => o.order_status === "placed" || o.order_status === "accepted",
        ).length,

        marketplaceRevenue,

        // totalRevenue will be recalculated once bid orders are also loaded
        totalRevenue: marketplaceRevenue + (prev.bidRevenue ?? 0),
      }));
    } catch (error) {
      console.log("FETCH MYSQL SUPPLIER ORDERS ERROR:", error);
    }
  };

  // Fetch bid orders from MySQL and recalculate combined revenue
  const fetchMysqlBidOrders = async () => {
    try {
      const response = await API.get("/bid-orders/supplier");
      const bidOrders = response.data.bidOrders || [];
      setMysqlBidOrders(bidOrders);

      const bidRevenue = bidOrders
        .filter((o: any) => o.payment_status === "paid")
        .reduce((sum: number, o: any) => sum + Number(o.total_amount), 0);

      const pendingBidPayments = bidOrders.filter(
        (o: any) => o.payment_status === "pending" && o.order_status !== "cancelled"
      ).length;

      setStats((prev) => ({
        ...prev,
        bidRevenue,
        pendingBidPayments,
        totalBidOrders: bidOrders.length,
        totalRevenue: (prev.marketplaceRevenue ?? 0) + bidRevenue,
      }));
    } catch (error) {
      console.log("FETCH MYSQL BID ORDERS ERROR:", error);
    }
  };

  // Mark a bid order payment as received
  const markBidOrderPaid = async (firestoreBidId: string) => {
    try {
      await API.patch(`/bid-orders/${firestoreBidId}/pay`);
      await fetchMysqlBidOrders();
      toast({ title: "Payment Received", description: "Bid order payment marked as paid." });
    } catch (error) {
      console.log("BID PAYMENT UPDATE ERROR:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to update bid payment." });
    }
  };

  const updateMysqlOrderStatus = async (orderId: number, status: string) => {
    try {
      await API.patch(`/orders/${orderId}`, { status });

      const updatedOrder = mysqlOrders.find((o) => o.id === orderId);

      // setMysqlOrders((prev) =>
      //   prev.map((order) =>
      //     order.id === orderId
      //       ? {
      //           ...order,
      //           order_status: status,
      //         }
      //       : order,
      //   ),
      // );

      if (updatedOrder && status === "accepted") {
        await createNotification({
          userId: updatedOrder.vendor_uid,

          title: "Order Accepted",

          message: `Your order #${orderId}
      has been accepted`,

          type: "order",
        });
      }

      if (updatedOrder && status === "delivered") {
        await createNotification({
          userId: updatedOrder.vendor_uid,

          title: "Order Delivered",

          message: `Your order #${orderId}
      has been delivered`,

          type: "delivery",
        });
      }

      await fetchMysqlOrders();

      toast({
        title: "Order Updated",
        description: `Order marked as ${status}`,
      });
    } catch (error) {
      console.log("MYSQL STATUS UPDATE ERROR:", error);

      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update order status",
      });
    }
  };

  // const markPaymentReceived = async (orderId: number) => {
  //   try {
  //     await API.patch(`/orders/payment/${orderId}`);

  //     await fetchMysqlOrders();

  //     toast({
  //       title: "Payment Updated",
  //       description: "Payment marked as received",
  //     });
  //   } catch (error) {
  //     console.log("PAYMENT UPDATE ERROR:", error);

  //     toast({
  //       variant: "destructive",
  //       title: "Error",
  //       description: "Failed to update payment",
  //     });
  //   }
  // };

  const markPaymentReceived = async (orderId: number) => {
    try {
      await API.patch(`/orders/payment/${orderId}`);

      const updatedOrder = mysqlOrders.find((o) => o.id === orderId);

      if (updatedOrder) {
        await createNotification({
          userId: updatedOrder.vendor_uid,

          title: "Payment Received",

          message: `Payment received
            for order #${orderId}`,

          type: "payment",
        });
      }

      await fetchMysqlOrders();

      toast({
        title: "Payment Updated",

        description: "Payment marked as received",
      });
    } catch (error) {
      console.log("PAYMENT UPDATE ERROR:", error);

      toast({
        variant: "destructive",

        title: "Error",

        description: "Failed to update payment",
      });
    }
  };

  const handleSubmitProduct = async (productData: Omit<Product, "id">) => {
    if (!user) return;

    try {
      if (editingProduct?.id) {
        // Update existing product
        const productRef = doc(db, "products", editingProduct.id);
        await updateDoc(productRef, {
          ...productData,
          updatedAt: new Date(),
        });

        setProducts((prev) =>
          prev.map((p) =>
            p.id === editingProduct.id
              ? { ...productData, id: editingProduct.id }
              : p,
          ),
        );

        toast({
          title: "Product Updated",
          description: "Product has been updated successfully.",
        });
      } else {
        // Add new product
        const productsRef = collection(db, "products");
        const docRef = await addDoc(productsRef, {
          ...productData,
          wholesalerId: user.uid,
          wholesalerName: user.displayName || "Wholesaler",
          wholesalerPhoto: user.photoURL || "",
          createdAt: new Date(),
        });

        setProducts((prev) => [...prev, { ...productData, id: docRef.id }]);
        toast({
          title: "Product Added",
          description: "Product has been added successfully.",
        });
      }

      setEditingProduct(null);
    } catch (error) {
      console.error("Error saving product:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save product. Please try again.",
      });
      throw error; // Re-throw to handle in form component
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await deleteDoc(doc(db, "products", productId));
      setProducts((prev) => prev.filter((product) => product.id !== productId));

      toast({
        title: "Product Deleted",
        description: "Product has been deleted successfully.",
      });

      if (editingProduct?.id === productId) {
        setEditingProduct(null);
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete product. Please try again.",
      });
    }
  };

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await auth.signOut();
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to log out. Please try again.",
      });
    }
  };

  // Authentication effect
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        setLoading(false);
      } else {
        navigate("/login");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Fetch data when user changes
  useEffect(() => {
    // const fetchMysqlOrders = async () => {
    //   try {
    //     const response = await API.get("/orders/supplier");

    //     console.log("SUPPLIER MYSQL ORDERS:", response.data);

    //     setMysqlOrders(response.data.orders || []);

    //     const orders = response.data.orders || [];

    //     setStats({
    //       totalOrders: orders.length,

    //       deliveredOrders: orders.filter((o) => o.order_status === "delivered")
    //         .length,

    //       pendingOrders: orders.filter(
    //         (o) => o.order_status === "placed" || o.order_status === "accepted",
    //       ).length,

    //       totalRevenue: orders
    //         .filter((o) => o.order_status === "delivered")
    //         .reduce((sum, order) => sum + Number(order.total_amount), 0),
    //     });
    //   } catch (error) {
    //     console.log("FETCH MYSQL SUPPLIER ORDERS ERROR:", error);
    //   }
    // };

    const initializeDashboard = async () => {
      if (!user) return;

      try {
        const supplierData = await getSupplierProfile();

        setSupplierProfile(supplierData.supplier);

        // supplier exists
        fetchProducts(user.uid);

        fetchBidRequests();

        fetchOrders();
        fetchMysqlOrders();
        fetchMysqlBidOrders();
      } catch (error: any) {
        console.log("SUPPLIER PROFILE ERROR:", error);

        if (error.response && error.response.status === 404) {
          navigate("/supplier-onboarding");

          return;
        }

        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to initialize dashboard.",
        });
      }
    };

    initializeDashboard();
  }, [user]);

  // Set up interval for bid requests and orders
  useEffect(() => {
    if (user) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // intervalRef.current = setInterval(() => {
      //   fetchBidRequests();
      //   fetchOrders();
      // }, 30000);

      intervalRef.current = setInterval(() => {
        fetchBidRequests();

        fetchOrders();

        fetchMysqlOrders();
        fetchMysqlBidOrders();
      }, 10000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header searchQuery={""} onSearchChange={() => {}} cartItems={0} />
        <main className="flex-grow container mx-auto px-4 py-8 flex justify-center items-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">
              Loading wholesaler dashboard...
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header searchQuery={""} onSearchChange={() => {}} cartItems={0} />

      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          {/* <h1 className="text-xl font-bold text-green-700">
            Wholesaler Dashboard
          </h1> */}
          <div>
            {/* <h1 className="text-xl font-bold text-green-700">
              Wholesaler Dashboard
            </h1> */}

            <div>
              <h1
                className="
    text-2xl
    font-bold
    text-green-700
  "
              >
                Welcome, {user?.displayName}
              </h1>

              <p
                className="
    text-sm
    text-gray-500
    mt-1
  "
              >
                Manage your products, marketplace orders and negotiations
              </p>

              <p
                className="
  text-xs
  text-gray-400
  mt-1
"
              >
                {currentTime.toLocaleString()}
              </p>
            </div>

            {supplierProfile && (
              <div className="mt-2">
                {supplierProfile.verification_status === "pending" && (
                  <span
                    className="
          bg-yellow-100
          text-yellow-800
          text-xs
          px-3
          py-1
          rounded-full
        "
                  >
                    Pending Verification
                  </span>
                )}

                {supplierProfile.verification_status === "verified" && (
                  <span
                    className="
          bg-green-100
          text-green-800
          text-xs
          px-3
          py-1
          rounded-full
        "
                  >
                    Verified Supplier
                  </span>
                )}

                {supplierProfile.verification_status === "rejected" && (
                  <span
                    className="
                     bg-red-100
                     text-red-800
                     text-xs
                      px-3
                      py-1
          rounded-full
        "
                  >
                    Verification Rejected
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {/* <NotificationBell /> */}
            {/* Bid Requests Button */}
            <Button
              variant="outline"
              onClick={() => setShowBidRequests(!showBidRequests)}
              className="relative"
            >
              💰 Negotiation Requests
              {bidRequests.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {bidRequests.length}
                </span>
              )}
            </Button>

            {/* Orders Button */}
            <Button
              variant="outline"
              onClick={() => setShowIncomingOrders(true)}
              className="relative"
            >
              📦 Marketplace Orders
              {mysqlOrders.filter((order) => order.order_status === "placed")
                .length > 0 && (
                <span
                  className="
        absolute
        -top-2
        -right-2
        bg-green-500
        text-white
        text-xs
        rounded-full
        w-5
        h-5
        flex
        items-center
        justify-center
      "
                >
                  {
                    mysqlOrders.filter(
                      (order) => order.order_status === "placed",
                    ).length
                  }
                </span>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowOrders(!showOrders)}
              className="relative"
            >
              <Package className="h-4 w-4 mr-2" />
              Bid Orders
              {orders.filter((order) => order.status === "confirmed").length >
                0 && (
                <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {
                    orders.filter((order) => order.status === "confirmed")
                      .length
                  }
                </span>
              )}
            </Button>

            {/* Profile Dropdown */}
            <DropdownMenu
              open={isDropdownOpen}
              onOpenChange={setIsDropdownOpen}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="rounded-full p-1 border border-gray-200"
                >
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="Profile"
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="bg-gray-200 border-2 border-dashed rounded-xl w-8 h-8" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="end">
                <div className="p-3 border-b">
                  <div className="flex items-center space-x-3">
                    {user?.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="Profile"
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="bg-gray-200 border-2 border-dashed rounded-xl w-10 h-10" />
                    )}
                    <div>
                      <p className="font-medium">
                        {user?.displayName || "User"}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 border-b">
                  <p className="text-sm text-gray-500 mb-1">Account Type</p>
                  <div className="flex items-center">
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      Wholesaler
                    </span>
                    <span className="ml-2 flex items-center text-sm">
                      {user?.providerData[0]?.providerId === "google.com" ? (
                        <>
                          <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24">
                            <path
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              fill="#4285F4"
                            />
                            <path
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                              fill="#34A853"
                            />
                            <path
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                              fill="#FBBC05"
                            />
                            <path
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                              fill="#EA4335"
                            />
                            <path d="M1 1h22v22H1z" fill="none" />
                          </svg>
                          Google
                        </>
                      ) : (
                        "Email"
                      )}
                    </span>
                  </div>
                </div>

                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8">
        {/* <div
          className="
    mb-8
    bg-white
    rounded-xl
    p-6
    border
  "
        >
          <h2
            className="
      text-2xl
      font-bold
      mb-4
    "
          >
            Incoming MySQL Orders
          </h2>

          {mysqlOrders.length === 0 ? (
            <p>No orders found</p>
          ) : (
            <div className="space-y-4">
              {mysqlOrders.map((order) => (
                <div
                  key={order.id}
                  className="
              border
              p-4
              rounded-lg
            "
                >
                  <p>Order ID: #{order.id}</p>
                  <p>Amount: ₹{order.total_amount}</p>
                  <p>
                    <strong>Vendor:</strong> {order.vendor_name}
                  </p>

                  <p>
                    <strong>Phone:</strong> {order.phone}
                  </p>

                  <p>
                    <strong>Address:</strong> {order.address}
                  </p>
                  <p>Status: {order.order_status}</p>

                  <p>Payment: {order.payment_status}</p>
                  <div className="mt-4 flex gap-3">
                    {order.order_status === "placed" && (
                      <div className="flex gap-3">
                        <button
                          onClick={() =>
                            updateMysqlOrderStatus(order.id, "accepte d")
                          }
                          className="
        bg-green-600
        text-white
        px-4
        py-2
        rounded
      "
                        >
                          Accept
                        </button>

                        <button
                          onClick={() =>
                            updateMysqlOrderStatus(order.id, "cancelled")
                          }
                          className="
        bg-red-600
        text-white
        px-4
        py-2
        rounded
      "
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {order.order_status === "accepted" && (
                      <button
                        onClick={() =>
                          updateMysqlOrderStatus(order.id, "delivered")
                        }
                        className="
        bg-blue-600
        text-white
        px-4
        py-2
        rounded
      "
                      >
                        Mark Delivered
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div> */}

        <div className="mb-6">
          <h2
            className="
    text-2xl
    font-bold
  "
          >
            Analytics Overview
          </h2>

          <p
            className="
    text-gray-500
    mt-1
  "
          >
            Monitor marketplace performance
          </p>
        </div>

        <div
          className="
    grid
    grid-cols-1
    md:grid-cols-2
    lg:grid-cols-5
    gap-6
    mb-8
  "
        >
          <div
            className="
      bg-white
      border
      rounded-xl
      p-6
    "
          >
            <p className="text-gray-500 text-sm">Total Orders</p>

            <h2
              className="
        text-3xl
        font-bold
        mt-2
      "
            >
              {stats.totalOrders}
            </h2>
          </div>

          <div
            className="
      bg-white
      border
      rounded-xl
      p-6
    "
          >
            <p className="text-gray-500 text-sm">Delivered Orders</p>

            <h2
              className="
        text-3xl
        font-bold
        text-green-600
        mt-2
      "
            >
              {stats.deliveredOrders}
            </h2>
          </div>

          <div
            className="
      bg-white
      border
      rounded-xl
      p-6
    "
          >
            <p className="text-gray-500 text-sm">Pending Orders</p>

            <h2
              className="
        text-3xl
        font-bold
        text-yellow-600
        mt-2
      "
            >
              {stats.pendingOrders}
            </h2>
          </div>

          <div className="bg-white border rounded-xl p-6">
            <p className="text-gray-500 text-sm">Total Products</p>
            <h2 className="text-3xl font-bold text-purple-600 mt-2">
              {stats.totalProducts}
            </h2>
          </div>

          {/* Revenue breakdown card */}
          <div className="bg-white border rounded-xl p-6 col-span-2">
            <p className="text-gray-500 text-sm mb-3">Total Revenue (Paid)</p>
            <h2 className="text-3xl font-bold text-blue-600 mb-3">
              ₹{stats.totalRevenue.toLocaleString("en-IN")}
            </h2>
            <div className="flex gap-4 flex-wrap">
              <div className="bg-blue-50 rounded-lg px-3 py-2">
                <p className="text-xs text-gray-500">Marketplace</p>
                <p className="font-bold text-blue-700">₹{(stats.marketplaceRevenue ?? 0).toLocaleString("en-IN")}</p>
              </div>
              <div className="bg-violet-50 rounded-lg px-3 py-2">
                <p className="text-xs text-gray-500">Bid Orders</p>
                <p className="font-bold text-violet-700">₹{(stats.bidRevenue ?? 0).toLocaleString("en-IN")}</p>
              </div>
              {(stats.pendingBidPayments ?? 0) > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <p className="text-xs text-amber-600">Pending Bid Payments</p>
                  <p className="font-bold text-amber-700">{stats.pendingBidPayments} order{stats.pendingBidPayments > 1 ? "s" : ""}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          className="
  bg-white
  border
  rounded-xl
  p-6
  mb-8
"
        >
          <h2
            className="
    text-lg
    font-bold
    mb-4
  "
          >
            Quick Actions
          </h2>

          <div
            className="
    flex
    flex-wrap
    gap-4
  "
          >
            <Button onClick={() => setShowIncomingOrders(true)} className="relative">
              View All Orders
              {(stats.pendingBidPayments ?? 0) > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {stats.pendingBidPayments}
                </span>
              )}
            </Button>

            <Button variant="outline" onClick={() => setShowBidRequests(true)}>
              View Negotiations
              {bidRequests.filter(b => b.status === "pending" && !b.counterOffer).length > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {bidRequests.filter(b => b.status === "pending" && !b.counterOffer).length}
                </span>
              )}
            </Button>

            <Button variant="secondary" onClick={() => setShowOrders(true)}>
              View Bid Orders
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Product Upload Form Sidebar */}
          <div className="lg:col-span-1">
            {/* <ProductUploadForm
              editingProduct={editingProduct}
              onSubmit={handleSubmitProduct}
              onCancel={handleCancelEdit}
              loading={productsLoading}
            /> */}
            {supplierProfile?.verification_status === "verified" ? (
              <ProductUploadForm
                editingProduct={editingProduct}
                onSubmit={handleSubmitProduct}
                onCancel={handleCancelEdit}
                loading={productsLoading}
              />
            ) : (
              <div
                className="
    bg-yellow-50
    border
    border-yellow-200
    rounded-lg
    p-6
  "
              >
                <h2
                  className="
      text-lg
      font-semibold
      text-yellow-800
      mb-2
    "
                >
                  Verification Pending
                </h2>

                <p className="text-sm text-yellow-700">
                  Your supplier account is currently under verification. You
                  will be able to upload products after admin approval.
                </p>
              </div>
            )}
          </div>

          {/* Product List */}
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Your Products</h2>
              <span className="text-sm text-gray-500">
                {products.length} product{products.length !== 1 ? "s" : ""}
              </span>
            </div>

            <input
              type="text"
              placeholder="Search products..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="
  w-full
  border
  rounded-lg
  px-4
  py-2
  mb-4
"
            />

            {products.length === 0 && (
              <div
                className="
    bg-gray-50
    border
    rounded-xl
    p-10
    text-center
    mb-6
  "
              >
                <h2
                  className="
      text-xl
      font-semibold
    "
                >
                  No Products Added
                </h2>

                <p className="text-gray-500 mt-2">
                  Upload your first product to start selling
                </p>
              </div>
            )}

            <ProductList
              products={products.filter((product) =>
                product.name
                  .toLowerCase()
                  .includes(productSearch.toLowerCase()),
              )}
              onEditProduct={handleEditProduct}
              onDeleteProduct={handleDeleteProduct}
              onStartVideoCall={startVideoCall}
              loading={productsLoading}
            />
          </div>
        </div>
      </main>

      {/* Use the broken-down modal components */}
      <WholesalerBidRequestsModal
        isOpen={showBidRequests}
        onClose={() => setShowBidRequests(false)}
        bidRequests={bidRequests}
        onRefresh={fetchBidRequests}
        onAcceptBid={handleAcceptBid}
        onRejectBid={handleRejectBid}
      />

      <WholesalerOrdersModal
        isOpen={showOrders}
        onClose={() => setShowOrders(false)}
        orders={orders}
        onRefresh={fetchOrders}
        onUpdateOrderStatus={updateOrderStatus}
      />
      {/* <IncomingOrdersModal
        isOpen={showIncomingOrders}
        onClose={() => setShowIncomingOrders(false)}
        orders={mysqlOrders}
        updateMysqlOrderStatus={updateMysqlOrderStatus}
      /> */}
      <IncomingOrdersModal
        isOpen={showIncomingOrders}
        onClose={() => setShowIncomingOrders(false)}
        orders={mysqlOrders}
        bidOrders={mysqlBidOrders}
        updateMysqlOrderStatus={updateMysqlOrderStatus}
        markPaymentReceived={markPaymentReceived}
        markBidOrderPaid={markBidOrderPaid}
        onBidOrderStatusUpdate={fetchMysqlBidOrders}
      />
      <Footer />

      {showVideoCall && (
        <VideoCall
          roomName={videoCallRoom}
          onClose={() => setShowVideoCall(false)}
          userInfo={{
            displayName: user?.displayName || "Wholesaler",
            email: user?.email || "",
          }}
        />
      )}

      {/* SupplierGPT — Business Intelligence Chatbot */}
      {user && (
        <WholesalerGPTComponent
          wholesalerId={user.uid}
          wholesalerName={user.displayName || "Wholesaler"}
          stats={stats}
          products={products.map((p) => ({
            name: p.name,
            price: p.price,
            quantity: p.quantity,
            minOrder: p.minOrder,
          }))}
          bidRequests={bidRequests.map((b) => ({
            productName: b.productName,
            quantity: b.quantity,
            bidPrice: b.bidPrice,
            vendorName: b.vendorName,
            urgency: b.urgency,
            location: b.location,
            createdAt: b.createdAt,
          }))}
          recentOrders={mysqlOrders.slice(0, 10)}
        />
      )}
    </div>
  );
};

export default WholesalerPage;
