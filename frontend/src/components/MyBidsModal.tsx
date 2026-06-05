// src/components/MyBidsModal.tsx
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import type { BidRequest } from '@/types';
import { db } from '@/lib/firebase';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { createNotification } from '@/lib/notifications';
import API from '@/services/api';

interface MyBidsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bidRequests: BidRequest[];
  onRefresh: () => Promise<void>;
}

const MyBidsModal = ({ isOpen, onClose, bidRequests, onRefresh }: MyBidsModalProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const auth = getAuth();
  const currentUser = auth.currentUser;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Vendor accepts the wholesaler's counter-offer → creates an order at the counter price
  const handleAcceptCounter = async (request: BidRequest) => {
    if (!request.counterOffer || !currentUser) return;
    setActionLoading(request.id + '_accept');
    try {
      const counter = request.counterOffer;

      // Create order at counter-offer price
      const estimatedDelivery = new Date();
      estimatedDelivery.setHours(estimatedDelivery.getHours() + 4);

      const newOrder = {
        bidRequestId: request.id,
        productName: request.productName,
        quantity: counter.quantity,
        pricePerUnit: counter.price,
        totalAmount: counter.price * counter.quantity,
        vendorId: request.vendorId,
        vendorName: request.vendorName,
        wholesalerId: counter.byWholesaler,
        wholesalerName: counter.wholesalerName,
        status: 'confirmed',
        createdAt: new Date(),
        deliveryAddress: request.location,
        estimatedDelivery,
      };

      const orderRef = await addDoc(collection(db, 'orders'), newOrder);

      // Update bid status to counter_accepted
      const bidRef = doc(db, 'bidRequests', request.id);
      await updateDoc(bidRef, {
        status: 'counter_accepted',
        acceptedBy: counter.byWholesaler,
        acceptedAt: new Date(),
        wholesalerName: counter.wholesalerName,
        orderId: orderRef.id,
        orderPlacedAt: new Date(),
        counterRespondedAt: new Date(),
      });

      // Notify the wholesaler
      await createNotification({
        userId: counter.byWholesaler,
        title: '✅ Counter-Offer Accepted!',
        message: `${request.vendorName} accepted your counter-offer for ${request.productName}: ₹${counter.price}/unit × ${counter.quantity} units.`,
        type: 'bid',
      });

      // Sync bid order to MySQL for revenue tracking
      try {
        await API.post('/bid-orders/sync', {
          firestore_bid_id: request.id,
          firestore_order_id: orderRef.id,
          vendor_firebase_uid: request.vendorId,
          supplier_firebase_uid: counter.byWholesaler,
          product_name: request.productName,
          quantity: counter.quantity,
          price_per_unit: counter.price,
          total_amount: counter.price * counter.quantity,
        });
      } catch (syncErr) {
        console.log('Bid order MySQL sync error (non-critical):', syncErr);
      }

      await onRefresh();
    } catch (error) {
      console.error('Accept counter error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // Vendor rejects the wholesaler's counter-offer
  const handleRejectCounter = async (request: BidRequest) => {
    if (!request.counterOffer || !currentUser) return;
    setActionLoading(request.id + '_reject');
    try {
      const counter = request.counterOffer;

      const bidRef = doc(db, 'bidRequests', request.id);
      await updateDoc(bidRef, {
        status: 'counter_rejected',
        counterRespondedAt: new Date(),
      });

      // Notify the wholesaler
      await createNotification({
        userId: counter.byWholesaler,
        title: '❌ Counter-Offer Rejected',
        message: `${request.vendorName} rejected your counter-offer for ${request.productName} (₹${counter.price}/unit).`,
        type: 'bid',
      });

      await onRefresh();
    } catch (error) {
      console.error('Reject counter error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const formatUrgency = (urgency: string) => {
    const urgencyMap: { [key: string]: string } = {
      immediate: 'Immediate',
      today: 'Today',
      tomorrow: 'Tomorrow',
      this_week: 'This Week',
    };
    return urgencyMap[urgency] || urgency;
  };

  const getBidStatusColor = (status: string) => {
    switch (status) {
      case 'order_placed':
      case 'counter_accepted':
        return 'success';
      case 'accepted':
        return 'default';
      case 'rejected':
      case 'counter_rejected':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getBidStatusLabel = (status: string) => {
    switch (status) {
      case 'order_placed': return 'ORDER PLACED';
      case 'counter_accepted': return 'COUNTER ACCEPTED';
      case 'counter_rejected': return 'COUNTER REJECTED';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-4 flex justify-between items-center border-b">
          <div className="flex items-center space-x-3">
            <h3 className="text-xl font-bold">My Bid Requests</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-gray-500 hover:text-gray-700"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6">
          {bidRequests.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-gray-400 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-700">No bid requests yet</h3>
              <p className="text-gray-500 mt-1">Use VendorGPT to create bid requests when products aren't available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bidRequests.map((request) => (
                <Card key={request.id} className={`border-l-4 ${
                  request.status === 'order_placed' || request.status === 'counter_accepted' ? 'border-l-green-500' :
                  request.status === 'accepted' ? 'border-l-blue-500' :
                  request.status === 'rejected' || request.status === 'counter_rejected' ? 'border-l-red-500' :
                  request.counterOffer ? 'border-l-orange-500' :
                  'border-l-yellow-500'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-bold text-lg">{request.productName}</h4>
                      <Badge variant={getBidStatusColor(request.status) as any}>
                        {getBidStatusLabel(request.status)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <span className="font-medium">Quantity:</span> {request.quantity} units
                      </div>
                      <div>
                        <span className="font-medium">Your Bid:</span> ₹{request.bidPrice}/unit
                      </div>
                      <div>
                        <span className="font-medium">Total Value:</span> ₹{request.bidPrice * request.quantity}
                      </div>
                      <div>
                        <span className="font-medium">Urgency:</span> {formatUrgency(request.urgency)}
                      </div>
                    </div>

                    <div className="text-sm text-gray-500 mb-3">
                      <span className="font-medium">Description:</span> {request.description}
                    </div>

                    {/* ── COUNTER-OFFER RECEIVED (pending, needs vendor response) ── */}
                    {request.status === 'pending' && request.counterOffer && (
                      <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <h5 className="font-semibold text-orange-800 mb-2">🔄 Counter-Offer Received!</h5>
                        <p className="text-sm text-orange-700 mb-3">
                          <strong>{request.counterOffer.wholesalerName}</strong> has sent you a counter-offer:
                        </p>
                        <div className="bg-white rounded-lg p-3 mb-4 space-y-2 text-sm border border-orange-100">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Your original bid:</span>
                            <span className="font-medium line-through text-gray-400">₹{request.bidPrice}/unit</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Counter price:</span>
                            <span className="font-bold text-orange-700 text-base">₹{request.counterOffer.price}/unit</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Counter quantity:</span>
                            <span className="font-medium">{request.counterOffer.quantity} units</span>
                          </div>
                          <div className="flex justify-between border-t pt-2 font-semibold">
                            <span>Counter total:</span>
                            <span className="text-orange-700">₹{request.counterOffer.price * request.counterOffer.quantity}</span>
                          </div>
                        </div>

                        {/* Accept / Reject counter buttons */}
                        <div className="flex gap-3">
                          <Button
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            size="sm"
                            onClick={() => handleAcceptCounter(request)}
                            disabled={actionLoading === request.id + '_accept' || actionLoading === request.id + '_reject'}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            {actionLoading === request.id + '_accept' ? 'Accepting...' : 'Accept Counter'}
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                            size="sm"
                            onClick={() => handleRejectCounter(request)}
                            disabled={actionLoading === request.id + '_accept' || actionLoading === request.id + '_reject'}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            {actionLoading === request.id + '_reject' ? 'Rejecting...' : 'Reject Counter'}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* ── COUNTER ACCEPTED → order created ── */}
                    {request.status === 'counter_accepted' && request.counterOffer && (
                      <div className="mt-4 p-3 bg-green-50 rounded-lg">
                        <h5 className="font-medium text-green-800">🎉 Counter-Offer Accepted!</h5>
                        <p className="text-sm text-green-700 mt-1">
                          You accepted {request.counterOffer.wholesalerName}'s counter at ₹{request.counterOffer.price}/unit × {request.counterOffer.quantity} units.
                        </p>
                        {request.orderId && (
                          <p className="text-sm text-green-700 mt-1">
                            Order ID: #{request.orderId.slice(-8)} — check "My Orders" for tracking.
                          </p>
                        )}
                      </div>
                    )}

                    {/* ── COUNTER REJECTED ── */}
                    {request.status === 'counter_rejected' && request.counterOffer && (
                      <div className="mt-4 p-3 bg-red-50 rounded-lg">
                        <h5 className="font-medium text-red-800">❌ Counter-Offer Rejected</h5>
                        <p className="text-sm text-red-700 mt-1">
                          You rejected {request.counterOffer.wholesalerName}'s counter-offer. You can create a new bid with different terms.
                        </p>
                      </div>
                    )}

                    {/* ── DIRECT ACCEPT (no counter) ── */}
                    {request.status === 'accepted' && request.wholesalerName && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <h5 className="font-medium text-blue-800">✅ Bid Accepted!</h5>
                        <p className="text-sm text-blue-700">Accepted by: {request.wholesalerName}</p>
                        {request.wholesalerContact && (
                          <p className="text-sm text-blue-700">Contact: {request.wholesalerContact}</p>
                        )}
                      </div>
                    )}

                    {/* ── ORDER PLACED (direct accept path) ── */}
                    {request.status === 'order_placed' && request.orderId && (
                      <div className="mt-4 p-3 bg-green-50 rounded-lg">
                        <h5 className="font-medium text-green-800">🎉 Order Created!</h5>
                        <p className="text-sm text-green-700">Your bid was accepted and an order has been created!</p>
                        <p className="text-sm text-green-700">Order ID: #{request.orderId.slice(-8)}</p>
                        <p className="text-sm text-green-700">Check "My Orders" section for delivery tracking.</p>
                      </div>
                    )}

                    {/* ── REJECTED ── */}
                    {request.status === 'rejected' && (
                      <div className="mt-4 p-3 bg-red-50 rounded-lg">
                        <h5 className="font-medium text-red-800">❌ Bid Rejected</h5>
                        <p className="text-sm text-red-700">
                          This bid request was not accepted. You can create a new bid with different terms.
                        </p>
                      </div>
                    )}

                    {/* ── PENDING (no counter yet) ── */}
                    {request.status === 'pending' && !request.counterOffer && (
                      <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                        <h5 className="font-medium text-yellow-800">⏳ Bid Pending</h5>
                        <p className="text-sm text-yellow-700">
                          Your bid is waiting for a wholesaler response. You'll be notified when someone accepts or counters.
                        </p>
                      </div>
                    )}

                    <div className="text-xs text-gray-500 mt-3">
                      Created: {request.createdAt.toLocaleString()}
                      {request.acceptedAt && (
                        <span> • Accepted: {request.acceptedAt.toLocaleString()}</span>
                      )}
                      {request.orderPlacedAt && (
                        <span> • Order Placed: {request.orderPlacedAt.toLocaleString()}</span>
                      )}
                      {request.counterRespondedAt && (
                        <span> • Responded: {request.counterRespondedAt.toLocaleString()}</span>
                      )}
                    </div>
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

export default MyBidsModal;
