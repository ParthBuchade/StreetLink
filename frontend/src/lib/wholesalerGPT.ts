// src/lib/wholesalerGPT.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_AI_API_KEY);

export interface WholesalerChatMessage {
  id: string;
  message: string;
  isBot: boolean;
  timestamp: Date;
}

class WholesalerGPT {
  private model: any;

  constructor() {
    this.model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  }

  async processMessage(
    userMessage: string,
    wholesalerId: string,
    wholesalerName: string,
    contextData: {
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
    },
  ): Promise<WholesalerChatMessage> {
    try {
      const intentPrompt = `
        Classify this wholesaler/supplier message intent: "${userMessage}"
        
        Respond ONLY with JSON (no markdown, no extra text):
        {
          "intent": "analytics|inventory|bids|outreach|general|forecast"
        }
        
        Use "analytics" for questions about revenue, orders, performance.
        Use "inventory" for stock, pricing, product advice.
        Use "bids" for bid requests, negotiations, accepting/rejecting bids.
        Use "outreach" for drafting messages to vendors.
        Use "forecast" for demand patterns, what to stock.
        Use "general" for anything else.
      `;

      const intentResult = await this.model.generateContent(intentPrompt);
      const intentData = this.parseJSON(intentResult.response.text());
      const intent = intentData?.intent || "general";

      const statsStr = `
Business Stats:
- Total Orders: ${contextData.stats.totalOrders}
- Delivered: ${contextData.stats.deliveredOrders}
- Pending: ${contextData.stats.pendingOrders}
- Revenue (delivered): ₹${contextData.stats.totalRevenue}
- Total Products Listed: ${contextData.stats.totalProducts}
`;

      const productsStr =
        contextData.products.length > 0
          ? `\nYour Products:\n${contextData.products
              .map(
                (p) =>
                  `- ${p.name}: ₹${p.price}/unit, Stock: ${p.quantity} units`,
              )
              .join("\n")}`
          : "\nNo products listed yet.";

      const bidsStr =
        contextData.bidRequests.length > 0
          ? `\nPending Bid Requests (${contextData.bidRequests.length}):\n${contextData.bidRequests
              .slice(0, 10)
              .map(
                (b) =>
                  `- ${b.vendorName} wants ${b.quantity} units of ${b.productName} at ₹${b.bidPrice}/unit (${b.urgency}), location: ${b.location}`,
              )
              .join("\n")}`
          : "\nNo pending bid requests.";

      const recentOrdersStr =
        contextData.recentOrders.length > 0
          ? `\nRecent Orders:\n${contextData.recentOrders
              .slice(0, 5)
              .map(
                (o) =>
                  `- Order #${o.id}: ₹${o.total_amount} from ${o.vendor_name || "vendor"} — ${o.order_status}`,
              )
              .join("\n")}`
          : "\nNo recent orders.";

      let systemContext = "";
      if (intent === "analytics") {
        systemContext = statsStr + recentOrdersStr;
      } else if (intent === "inventory") {
        systemContext = productsStr + statsStr;
      } else if (intent === "bids" || intent === "forecast") {
        systemContext = bidsStr + productsStr;
      } else if (intent === "outreach") {
        systemContext = productsStr;
      } else {
        systemContext = statsStr + productsStr + bidsStr;
      }

      const responsePrompt = `
You are SupplierGPT, an AI business assistant for ${wholesalerName}, a wholesale supplier on StreetLink platform.

${systemContext}

User asked: "${userMessage}"

Provide a helpful, concise, business-focused response based on ONLY the data provided above.
- For analytics: give specific numbers and insights
- For inventory: give actionable pricing/restocking advice
- For bids: summarize bid patterns or help prioritize
- For outreach: draft a professional message
- For forecasting: give demand insights based on bid request patterns
- Keep responses under 150 words unless drafting a message
- Use ₹ for currency, be specific with numbers
- Do not make up data. Only use the context provided.
      `;

      const result = await this.model.generateContent(responsePrompt);
      const botResponse = result.response.text();

      return {
        id: `bot_${Date.now()}`,
        message: botResponse,
        isBot: true,
        timestamp: new Date(),
      };
    } catch (error: any) {
      console.error("WholesalerGPT Error:", error);

      // Surface a helpful error message based on the error type
      let errorMessage = "Sorry, I'm having trouble right now. Please try again in a moment.";
      if (error?.message?.includes("API_KEY_INVALID") || error?.message?.includes("allowlist")) {
        errorMessage = "⚠️ AI service configuration error. Please check the API key settings.";
      } else if (error?.message?.includes("404") || error?.message?.includes("not found")) {
        errorMessage = "⚠️ AI model unavailable. Please contact support.";
      } else if (error?.message?.includes("quota") || error?.message?.includes("429")) {
        errorMessage = "⚠️ AI quota exceeded. Please try again in a few minutes.";
      }

      return {
        id: `bot_${Date.now()}`,
        message: errorMessage,
        isBot: true,
        timestamp: new Date(),
      };
    }
  }

  private parseJSON(text: string): any {
    try {
      const cleaned = text
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return {};
    } catch (_e) {
      return {};
    }
  }
}

export default WholesalerGPT;
