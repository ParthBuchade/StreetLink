// src/lib/vendorGPT.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { collection, getDocs, addDoc, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { Product, ChatMessage, BidRequest } from "../types";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_AI_API_KEY);

class VendorGPT {
  private model: any;

  constructor() {
    this.model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  async processMessage(
    userMessage: string,
    userLocation?: string,
    userId?: string,
    userName?: string,
    userEmail?: string,
  ): Promise<ChatMessage> {
    try {
      const extractionPrompt = `
        Extract product requirements from this vendor/buyer message: "${userMessage}"
        
        Respond ONLY with valid JSON (no markdown, no extra text):
        {
          "product_type": "extracted product name or null",
          "quantity": "extracted quantity with unit or null",
          "budget": "extracted budget as number string or null",
          "urgency": "immediate|today|tomorrow|this_week",
          "intent": "buy|bid|inquiry|price_check|general"
        }
        
        Set intent to "bid" if:
        - user says "bid", "negotiate", "request", "quote"
        - quantity is large (>= 10 kg or units)
        - product not found and user wants to request it
        
        Set intent to "buy" if user wants to see available products.
        If budget is missing, set to null (do NOT guess).
      `;

      const extractionResult = await this.model.generateContent(extractionPrompt);
      const rawText = extractionResult.response.text();
      const extractedData = this.parseAIResponse(rawText);

      let botResponse = "";
      let relevantProducts: Product[] = [];

      const quantity = this.parseQuantity(extractedData?.quantity);
      const isBulkOrder = quantity >= 10;

      const isBidIntent =
        extractedData?.intent === "bid" ||
        isBulkOrder ||
        userMessage.toLowerCase().includes("bid") ||
        userMessage.toLowerCase().includes("negotiat") ||
        userMessage.toLowerCase().includes("request") ||
        userMessage.toLowerCase().includes("quote");

      if (extractedData?.intent === "buy" && extractedData?.product_type && !isBulkOrder) {
        relevantProducts = await this.fetchRelevantProducts(
          extractedData.product_type,
          extractedData.budget,
          userLocation,
        );

        if (relevantProducts.length > 0) {
          botResponse = this.generateProductResponse(extractedData, relevantProducts);
        } else {
          botResponse = `I couldn't find any **${extractedData.product_type}** suppliers right now.\n\nWould you like to create a **Bid Request**? Wholesalers will see your request and respond directly.\n\nJust say: *"Bid ₹30/kg for 20kg ${extractedData.product_type}"* and I'll create it instantly!`;
        }
      } else if (isBidIntent) {
        if (!extractedData?.product_type) {
          botResponse = `Please tell me what product you need and the quantity.\n\nExample: *"I need 20kg onions, bid ₹25/kg"*`;
        } else if (!extractedData.budget) {
          botResponse = `What is your **expected price per unit** for **${extractedData.product_type}**?\n\nExample: *"Bid ₹30/kg for ${extractedData?.quantity || "20kg"} ${extractedData.product_type}"*`;
        } else if (userId && userName && userEmail) {
          const parsedQty = this.parseQuantity(extractedData.quantity) || 10;
          const parsedBudget = this.parseBudget(extractedData.budget) || 0;

          if (parsedBudget === 0) {
            botResponse = `Please specify a valid price. Example: *"Bid ₹30/kg for 20kg ${extractedData.product_type}"*`;
          } else {
            const bidId = await this.createBidRequest({
              vendorId: userId,
              vendorName: userName,
              vendorEmail: userEmail,
              productName: extractedData.product_type,
              description: `Looking for ${extractedData.product_type} — ${extractedData.quantity || parsedQty + " units"}`,
              quantity: parsedQty,
              bidPrice: parsedBudget,
              urgency: (extractedData.urgency as BidRequest["urgency"]) || "this_week",
              location: userLocation || "Not specified",
            });

            botResponse = `✅ **Bid Request Created!**\n\n**Details:**\n- 🛒 Product: ${extractedData.product_type}\n- 📦 Quantity: ${parsedQty} units\n- 💰 Your Bid: ₹${parsedBudget}/unit\n- ⏰ Urgency: ${this.formatUrgency(extractedData.urgency)}\n- 📍 Location: ${userLocation || "Not specified"}\n\nYour request has been sent to all nearby wholesalers. You'll be notified when someone responds!\n\n**Bid ID:** \`${bidId}\`\n\nYou can track your bids by clicking **📋 My Bids** at the top.`;
          }
        } else {
          botResponse = `To create a bid, please tell me:\n- What product do you need?\n- How much quantity?\n- Your budget per unit\n\nExample: *"I need 20kg onions, bid ₹30/kg, needed tomorrow"*`;
        }
      } else {
        const conversationPrompt = `
          You are VendorGPT, an AI assistant helping street food vendors and buyers find wholesale suppliers in India.
          User message: "${userMessage}"
          User location: ${userLocation || "unknown"}
          
          You help vendors:
          1. Find products from wholesalers (say "show me onions" or "find tomatoes")
          2. Create bid requests (say "bid ₹30/kg for 20kg onions")
          3. Compare prices
          4. Place orders
          
          Respond helpfully and concisely in 2-4 sentences. Guide them to either search for products or create a bid.
          Do not use markdown formatting.
        `;

        const result = await this.model.generateContent(conversationPrompt);
        botResponse = result.response.text();
      }

      return {
        id: `bot_${Date.now()}`,
        message: botResponse,
        isBot: true,
        timestamp: new Date(),
        products: relevantProducts.length > 0 ? relevantProducts : undefined,
      };
    } catch (error: any) {
      console.error("VendorGPT Error:", error);

      let errorMessage = "Sorry, I'm having trouble processing your request right now. Please try again in a moment.";
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

  private formatUrgency(urgency: string): string {
    const map: Record<string, string> = {
      immediate: "Immediate",
      today: "Today",
      tomorrow: "Tomorrow",
      this_week: "This Week",
    };
    return map[urgency] || "This Week";
  }

  private async createBidRequest(
    bidData: Omit<BidRequest, "id" | "status" | "createdAt">,
  ): Promise<string> {
    try {
      const bidRequest: Omit<BidRequest, "id"> = {
        ...bidData,
        status: "pending",
        createdAt: new Date(),
      };
      const docRef = await addDoc(collection(db, "bidRequests"), bidRequest);
      return docRef.id;
    } catch (error) {
      console.error("Error creating bid request:", error);
      throw error;
    }
  }

  private parseQuantity(quantityStr: string): number {
    if (!quantityStr) return 0;
    const numbers = quantityStr.match(/\d+(\.\d+)?/g);
    return numbers ? parseFloat(numbers[0]) : 0;
  }

  private parseBudget(budgetStr: string): number {
    if (!budgetStr) return 0;
    const numbers = budgetStr.match(/\d+(\.\d+)?/g);
    return numbers ? parseFloat(numbers[0]) : 0;
  }

  private parseAIResponse(response: string): any {
    try {
      const cleaned = response
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { intent: "general" };
    } catch {
      return { intent: "general" };
    }
  }

  private async fetchRelevantProducts(
    productType: string,
    budget?: string,
    userLocation?: string,
  ): Promise<Product[]> {
    try {
      const productsRef = collection(db, "products");
      const querySnapshot = await getDocs(productsRef);

      const products: Product[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if ((data.quantity || 0) > 0) {
          products.push({
            id: doc.id,
            name: data.name || "",
            description: data.description || "",
            address: data.address || "",
            city: data.city || "",
            mobileNo: data.mobileNo || "",
            countryCode: data.countryCode || "+91",
            price: data.price || 0,
            minOrder: data.minOrder || 1,
            quantity: data.quantity || 0,
            imageUrl: data.imageUrl || "",
            wholesalerId: data.wholesalerId || "",
            wholesalerName: data.wholesalerName || "",
            wholesalerPhoto: data.wholesalerPhoto || "",
          });
        }
      });

      const filtered = products.filter((product) => {
        const nameMatch =
          product.name.toLowerCase().includes(productType.toLowerCase()) ||
          product.description.toLowerCase().includes(productType.toLowerCase());
        const budgetMatch = budget
          ? this.checkBudgetMatch(product.price, budget)
          : true;
        return nameMatch && budgetMatch;
      });

      if (userLocation) {
        const loc = userLocation.toLowerCase();
        filtered.sort((a, b) => {
          const aMatch =
            a.city?.toLowerCase().includes(loc) ||
            a.address?.toLowerCase().includes(loc)
              ? -1
              : 1;
          const bMatch =
            b.city?.toLowerCase().includes(loc) ||
            b.address?.toLowerCase().includes(loc)
              ? -1
              : 1;
          return aMatch - bMatch;
        });
      }

      return filtered.slice(0, 5);
    } catch (error) {
      console.error("Error fetching products:", error);
      return [];
    }
  }

  private checkBudgetMatch(price: number, budgetString: string): boolean {
    const budgetNumbers = budgetString.match(/\d+/g);
    if (!budgetNumbers) return true;
    const budget = parseInt(budgetNumbers[0]);
    return price <= budget * 1.2;
  }

  private generateProductResponse(
    extractedData: any,
    products: Product[],
  ): string {
    const count = products.length;
    const productType = extractedData.product_type;

    return `Found **${count} supplier${count > 1 ? "s" : ""}** for **${productType}**:\n\n${products
      .map(
        (p, i) =>
          `${i + 1}. **${p.name}** — ₹${p.price}/unit\n   📍 ${p.address || p.city}\n   👤 ${p.wholesalerName || "Supplier"}\n   📦 Stock: ${p.quantity} units (Min: ${p.minOrder})\n   📞 ${p.countryCode} ${p.mobileNo}`,
      )
      .join("\n\n")}\n\nWould you like to place an order or need a different quantity? I can also create a **Bid Request** if you want a custom price.`;
  }
}

export default VendorGPT;
