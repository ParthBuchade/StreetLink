// src/components/WholesalerGPT.tsx
import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, MessageCircle, X, Bot, Sparkles, Mic, MicOff } from "lucide-react";
import WholesalerGPT, { WholesalerChatMessage } from "../lib/wholesalerGPT";
import { toast } from "sonner";

interface WholesalerGPTProps {
  wholesalerId: string;
  wholesalerName: string;
  stats: {
    totalOrders: number;
    deliveredOrders: number;
    pendingOrders: number;
    totalRevenue: number;
    totalProducts: number;
  };
  products: Array<{
    name: string;
    price: number;
    quantity: number;
    minOrder: number;
  }>;
  bidRequests: Array<{
    productName: string;
    quantity: number;
    bidPrice: number;
    vendorName: string;
    urgency: string;
    location: string;
    createdAt: Date;
  }>;
  recentOrders: Array<{
    id?: number;
    total_amount?: number;
    order_status?: string;
    vendor_name?: string;
    created_at?: string;
  }>;
}

const WholesalerGPTComponent: React.FC<WholesalerGPTProps> = ({
  wholesalerId,
  wholesalerName,
  stats,
  products,
  bidRequests,
  recentOrders,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<WholesalerChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const gptRef = useRef<WholesalerGPT | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    gptRef.current = new WholesalerGPT();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SR = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SR();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";
      recognitionRef.current.onresult = (event: any) => {
        setInputMessage(event.results[0][0].transcript);
        setIsListening(false);
      };
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const pendingBidCount = bidRequests.length;
      const welcome: WholesalerChatMessage = {
        id: "welcome",
        message: `👋 Hello ${wholesalerName}! I'm **SupplierGPT**, your business intelligence assistant.

Here's a quick snapshot:
• **${stats.totalOrders}** total orders | **${stats.pendingOrders}** pending
• **₹${stats.totalRevenue}** revenue from delivered orders
• **${stats.totalProducts}** products listed
• **${pendingBidCount}** pending bid requests

Ask me anything like:
- *"What were my top selling products?"*
- *"Show me pending bids above ₹500"*
- *"I have 200kg tomatoes expiring — what price should I offer?"*
- *"Draft a message about new onion stock at ₹40/kg"*
- *"Which bids should I accept today?"*`,
        isBot: true,
        timestamp: new Date(),
      };
      setMessages([welcome]);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!inputMessage.trim() || isLoading || !gptRef.current) return;

    const userMsg: WholesalerChatMessage = {
      id: `user_${Date.now()}`,
      message: inputMessage,
      isBot: false,
      timestamp: new Date(),
    };

    const currentInput = inputMessage;
    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const response = await gptRef.current.processMessage(
        currentInput,
        wholesalerId,
        wholesalerName,
        { stats, products, bidRequests, recentOrders },
      );
      setMessages((prev) => [...prev, response]);
    } catch {
      toast.error("Something went wrong. Please try again.");
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          message: "Sorry, I encountered an error. Please try again.",
          isBot: true,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoice = () => {
    if (!recognitionRef.current) return toast.error("Voice not supported.");
    if (isListening) recognitionRef.current.stop();
    else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const formatMessage = (text: string) => {
    // Simple markdown-like bold and line breaks
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br/>");
  };

  return (
    <>
      {/* Toggle Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="relative w-16 h-16 rounded-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 shadow-lg border-0 overflow-hidden"
        >
          {isOpen ? (
            <X className="h-6 w-6 text-white" />
          ) : (
            <>
              <Bot className="h-6 w-6 text-white" />
              <Sparkles className="absolute top-1 right-1 h-3 w-3 text-yellow-300 animate-pulse" />
            </>
          )}
        </Button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[600px] z-40">
          <Card className="h-full flex flex-col shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
            <CardHeader className="pb-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-t-lg">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white/20 rounded-full">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span>SupplierGPT</span>
                    <span className="text-xs font-normal opacity-90">
                      Business Intelligence Assistant
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
                  <span className="text-sm font-normal">Online</span>
                </div>
              </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50/50">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.isBot ? "justify-start" : "justify-end"}`}
                  >
                    {msg.isBot && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-indigo-700 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                        msg.isBot
                          ? "bg-white text-gray-800 rounded-tl-sm"
                          : "bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-tr-sm"
                      }`}
                      dangerouslySetInnerHTML={{
                        __html: formatMessage(msg.message),
                      }}
                    />
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-indigo-700 flex items-center justify-center mr-2 flex-shrink-0">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                      <div className="flex space-x-1.5">
                        {[0, 0.2, 0.4].map((delay, i) => (
                          <div
                            key={i}
                            className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce"
                            style={{ animationDelay: `${delay}s` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick prompts */}
              {messages.length <= 1 && (
                <div className="px-4 py-2 bg-white border-t flex flex-wrap gap-1">
                  {[
                    "Show pending bids",
                    "Revenue this month",
                    "Low stock products",
                    "Draft vendor message",
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => {
                        setInputMessage(prompt);
                      }}
                      className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full hover:bg-blue-100 transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}

              <div className="border-t bg-white p-4">
                <div className="flex space-x-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about your business..."
                    disabled={isLoading}
                    className="flex-1 bg-gray-50 border-gray-200 focus:border-blue-400"
                  />
                  <Button
                    onClick={handleVoice}
                    variant="outline"
                    size="icon"
                    className={isListening ? "bg-red-50 border-red-300" : ""}
                    disabled={isLoading}
                  >
                    {isListening ? (
                      <MicOff className="h-4 w-4 text-red-500" />
                    ) : (
                      <Mic className="h-4 w-4 text-gray-600" />
                    )}
                  </Button>
                  <Button
                    onClick={handleSend}
                    disabled={!inputMessage.trim() || isLoading}
                    className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white"
                    size="icon"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-center text-xs text-gray-400 mt-2">
                  SupplierGPT • Business Intelligence
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default WholesalerGPTComponent;
