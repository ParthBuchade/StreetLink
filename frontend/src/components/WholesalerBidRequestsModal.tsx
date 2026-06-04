// src/components/WholesalerBidRequestsModal.tsx
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X, RefreshCw, Package, MessageSquare } from 'lucide-react';
import type { BidRequest } from '@/types';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { createNotification } from '@/lib/notifications';
import { getAuth } from 'firebase/auth';

interface WholesalerBidRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bidRequests: BidRequest[];
  onRefresh: () => Promise<void>;
  onAcceptBid: (bidRequest: BidRequest) => Promise<void>;
  onRejectBid: (bidId: string) => Promise<void>;
}

const WholesalerBidRequestsModal = ({
  isOpen,
  onClose,
  bidRequests,
  onRefresh,
  onAcceptBid,
  onRejectBid,
}: WholesalerBidRequestsModalProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Counter-offer state per bid
  const [counterOfferMode, setCounterOfferMode] = useState<string | null>(null);
  const [counterPrice, setCounterPrice] = useState<string>('');
  const [counterQuantity, setCounterQuantity] = useState<string>('');

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

  const handleAccept = async (request: BidRequest) => {
    setActionLoading(request.id);
    try {
      await onAcceptBid(request);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (bidId: string, vendorId: string, productName: string) => {
    setActionLoading(bidId);
    try {
      await onRejectBid(bidId);

      // Notify vendor
      if (currentUser) {
        await createNotification({
          userId: vendorId,
          title: 'Bid Rejected',
          message: `Your bid for ${productName} was declined by the wholesaler.`,
          type: 'bid',
        });
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleCounterOffer = async (request: BidRequest) => {
    const newPrice = parseFloat(counterPrice);
    const newQty = counterQuantity ? parseInt(counterQuantity) : request.quantity;

    if (!newPrice || newPrice <= 0) return;

    setActionLoading(request.id);
    try {
      const bidRef = doc(db, 'bidRequests', request.id);
      await updateDoc(bidRef, {
        status: 'pending', // Keep pending but add counter-offer data
        counterOffer: {
          price: newPrice,
          quantity: newQty,
          byWholesaler: currentUser?.uid || '',
          wholesalerName: currentUser?.displayName || 'Wholesaler',
          at: new Date(),
        },
      });

      // Notify vendor about counter-offer
      if (currentUser) {
        await createNotification({
          userId: request.vendorId,
          title: 'Counter-Offer Received',
          message: `${currentUser.displayName} sent a counter-offer for ${request.productName}: ₹${newPrice}/unit for ${newQty} units.`,
          type: 'bid',
        });
      }

      setCounterOfferMode(null);
      setCounterPrice('');
      setCounterQuantity('');
      await onRefresh();
    } catch (error) {
      console.error('Counter-offer error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const formatUrgency = (urgency: string) => {
    const urgencyMap: Record<string, string> = {
      immediate: 'Immediate',
      today: 'Today',
      tomorrow: 'Tomorrow',
      this_week: 'This Week',
    };
    return urgencyMap[urgency] || urgency;
  };

  const getUrgencyColor = (urgency: string): any => {
    switch (urgency) {
      case 'immediate': return 'destructive';
      case 'today': return 'default';
      case 'tomorrow': return 'secondary';
      default: return 'outline';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white p-4 flex justify-between items-center border-b">
          <div className="flex items-center space-x-3">
            <h3 className="text-xl font-bold">
              💰 Negotiation Requests
              {bidRequests.length > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {bidRequests.length}
                </span>
              )}
            </h3>
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
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-700">No pending bid requests</h3>
              <p className="text-gray-500 mt-1">Vendor bids will appear here for you to accept, reject, or counter</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bidRequests.map((request) => (
                <Card key={request.id} className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{request.productName}</CardTitle>
                      <Badge variant={getUrgencyColor(request.urgency)}>
                        {formatUrgency(request.urgency)}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Vendor:</span>
                        <span className="font-medium">{request.vendorName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Quantity:</span>
                        <span className="font-medium">{request.quantity} units</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Their Bid:</span>
                        <span className="text-lg font-bold text-green-600">₹{request.bidPrice}/unit</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Value:</span>
                        <span className="font-bold text-blue-600">₹{request.bidPrice * request.quantity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Location:</span>
                        <span className="font-medium truncate max-w-[150px]">{request.location}</span>
                      </div>
                      {request.description && (
                        <p className="text-gray-500 text-xs">{request.description}</p>
                      )}
                      <p className="text-xs text-gray-400">
                        {request.createdAt.toLocaleString()}
                      </p>
                    </div>

                    {/* Counter-offer form */}
                    {counterOfferMode === request.id ? (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3 space-y-2">
                        <p className="text-sm font-semibold text-orange-700">Counter-Offer</p>
                        <div>
                          <label className="text-xs text-gray-600">Your Price (₹/unit)</label>
                          <Input
                            type="number"
                            placeholder={`Their bid: ₹${request.bidPrice}`}
                            value={counterPrice}
                            onChange={(e) => setCounterPrice(e.target.value)}
                            className="mt-1 h-8 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Quantity (optional)</label>
                          <Input
                            type="number"
                            placeholder={`${request.quantity} units`}
                            value={counterQuantity}
                            onChange={(e) => setCounterQuantity(e.target.value)}
                            className="mt-1 h-8 text-sm"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white text-xs"
                            onClick={() => handleCounterOffer(request)}
                            disabled={!counterPrice || actionLoading === request.id}
                          >
                            {actionLoading === request.id ? 'Sending...' : 'Send Counter'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => {
                              setCounterOfferMode(null);
                              setCounterPrice('');
                              setCounterQuantity('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    {/* Action buttons */}
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Button
                          className="flex-1 bg-green-600 hover:bg-green-700 text-sm"
                          onClick={() => handleAccept(request)}
                          disabled={actionLoading === request.id}
                        >
                          <Package className="h-3 w-3 mr-1" />
                          {actionLoading === request.id ? 'Processing...' : `Accept (₹${request.bidPrice * request.quantity})`}
                        </Button>
                        <Button
                          variant="outline"
                          className="text-sm"
                          onClick={() => handleReject(request.id, request.vendorId, request.productName)}
                          disabled={actionLoading === request.id}
                        >
                          Reject
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full text-sm border-orange-300 text-orange-700 hover:bg-orange-50"
                        onClick={() => {
                          setCounterOfferMode(counterOfferMode === request.id ? null : request.id);
                          setCounterPrice('');
                          setCounterQuantity('');
                        }}
                        disabled={actionLoading === request.id}
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        {counterOfferMode === request.id ? 'Cancel Counter' : 'Counter-Offer'}
                      </Button>
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

export default WholesalerBidRequestsModal;
