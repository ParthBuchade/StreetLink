# VendorGPT - AI-Powered Agricultural Marketplace

**VendorGPT** is an innovative B2B agricultural marketplace platform that connects wholesale suppliers with vendors (buyers) through an intelligent AI assistant. The platform streamlines the procurement process for farm products, enabling efficient discovery, bidding, ordering, and real-time communication between agricultural wholesalers and retail vendors.

---

## 📖 Project Overview

VendorGPT revolutionizes the agricultural supply chain by providing:

- **Smart Product Discovery**: AI-powered search and recommendations for farm products based on location, price, and availability
- **Dual User Roles**: Separate interfaces for wholesalers (suppliers) and vendors (buyers) with role-specific features
- **VendorGPT AI Assistant**: An intelligent chatbot powered by Google's Gemini AI that helps vendors find products, compare prices, and create bid requests
- **Bidding System**: When products aren't available, vendors can create bid requests that wholesalers can accept
- **Real-Time Communication**: Video calling integration using Jitsi for seamless vendor-wholesaler communication
- **Location-Based Services**: Automatic location detection and nearby supplier recommendations
- **Order Management**: Complete order tracking from creation to fulfillment

---

## 🚀 Key Features

### For Vendors (Buyers)
- 🤖 **AI-Powered Shopping Assistant** - VendorGPT helps find products, compare prices, and suggests best deals
- 🔍 **Smart Product Search** - Search by product name, location, price range, and quantity
- 💰 **Bid Request System** - Create bid requests when products aren't available; wholesalers compete for your business
- 📦 **Order Tracking** - Monitor order status from placement to delivery
- 📍 **Location-Based Discovery** - Find suppliers near you automatically
- 🎤 **Voice Input** - Use voice commands to interact with VendorGPT
- 📱 **Video Calls** - Connect directly with wholesalers via integrated video calling

### For Wholesalers (Suppliers)
- 📦 **Product Management** - Upload, edit, and manage product inventory with images
- 🛒 **Order Management** - View and fulfill vendor orders
- 💸 **Bid Request Handling** - Review and accept bid requests from vendors
- 📊 **Inventory Tracking** - Real-time quantity updates and stock management
- 🖼️ **Image Upload** - Cloudinary integration for product images
- 💳 **Payment Integration** - Razorpay payment gateway for secure transactions
- 📞 **Direct Communication** - Video calling capability with vendors

### Platform Features
- 🔐 **Firebase Authentication** - Secure login and signup with role-based access control
- 🎨 **Modern UI/UX** - Built with React, Tailwind CSS, and Shadcn UI components
- ⚡ **Real-time Updates** - Firebase Firestore for real-time data synchronization
- 🌐 **Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices
- 🎭 **Smooth Animations** - Framer Motion for delightful user interactions
- 🔔 **Toast Notifications** - Real-time feedback using Sonner

---

## 🏗️ Technical Architecture

### Frontend Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Routing**: React Router DOM for navigation
- **UI Library**: Shadcn UI components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom configurations
- **Animations**: Framer Motion for smooth transitions
- **State Management**: React Query (TanStack Query) for server state
- **Forms**: React Hook Form with Zod validation

### Backend Services
- **Database**: Firebase Firestore (NoSQL real-time database)
- **Authentication**: Firebase Authentication with email/password
- **Storage**: Cloudinary for image hosting and optimization
- **AI Integration**: Google Gemini AI (Generative AI API)
- **Payments**: Razorpay payment gateway
- **Video Calls**: Jitsi React SDK

### Key Technologies
- **TypeScript**: Type-safe development
- **Firebase SDK**: Real-time data and authentication
- **Google Generative AI**: Powers VendorGPT chatbot
- **Cloudinary**: Image upload and management
- **Razorpay**: Payment processing
- **Jitsi**: Video conferencing

---

## 🧑‍💼 User Flows

### Vendor (Buyer) Journey
1. **Sign Up/Login** - Create an account or log in as a vendor
2. **Browse Products** - Explore available farm products or use VendorGPT to find specific items
3. **Place Order** - Add products to cart and checkout with secure payment
4. **Create Bid Request** - If products aren't available, create a bid request with your requirements
5. **Track Orders** - Monitor order status and communicate with wholesalers
6. **Video Consultation** - Connect with suppliers via video call for product discussions

### Wholesaler (Supplier) Journey
1. **Sign Up/Login** - Create an account as a wholesaler
2. **Upload Products** - Add farm products with details, pricing, images, and inventory
3. **Manage Inventory** - Update product quantities and availability
4. **Receive Orders** - View and fulfill vendor orders
5. **Review Bid Requests** - Accept bid requests that match your inventory
6. **Customer Communication** - Use video calls to discuss product requirements

---

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn package manager
- Firebase account with project setup
- Google AI API key (for Gemini)
- Cloudinary account (for image uploads)
- Razorpay account (for payments)

### Environment Variables
Create a `.env` file in the root directory with the following variables:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Google AI (Gemini)
VITE_GOOGLE_AI_API_KEY=your_google_ai_api_key

# Cloudinary
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset

# Razorpay
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
```

### Installation Steps

```bash
# 1. Clone the repository
git clone https://github.com/Gautam-cpp/vendorGPT.git

# 2. Navigate into the project directory
cd vendorGPT

# 3. Install dependencies
npm install

# 4. Configure environment variables
# Create a `.env` file with the variables listed above

# 5. Start the development server
npm run dev

# 6. Build for production
npm run build

# 7. Preview production build
npm run preview

# 8. Lint the code
npm run lint
```

---

## 📱 Application Pages

### Public Pages
- **Landing Page (`/`)** - Showcases featured products, categories, and platform benefits
- **Login Page (`/login`)** - User authentication
- **Sign Up Page (`/signup`)** - New user registration with role selection (Vendor/Wholesaler)

### Protected Pages (Vendor Role)
- **Vendor Dashboard (`/vendor`)** - Main interface for vendors with:
  - Product browsing and search
  - VendorGPT AI assistant
  - Order management
  - Bid request creation and tracking
  - Video call functionality
  - Profile management

### Protected Pages (Wholesaler Role)
- **Wholesaler Dashboard (`/wholesaler`)** - Main interface for wholesalers with:
  - Product upload and management
  - Order fulfillment
  - Bid request management
  - Inventory tracking
  - Video call functionality
  - Profile management

---

## 🤖 VendorGPT AI Features

The VendorGPT chatbot is the core innovation of this platform, powered by Google's Gemini AI:

### Natural Language Understanding
- Understands complex queries like "I need 10kg onions within ₹300"
- Extracts product requirements, quantities, budgets, and urgency from conversational input
- Supports voice input for hands-free interaction

### Intelligent Recommendations
- Location-aware product suggestions
- Price comparison across multiple suppliers
- Quality-based recommendations

### Automated Workflows
- **Product Search**: "Show me tomato suppliers near me"
- **Price Inquiry**: "What's the price of potatoes?"
- **Bid Creation**: "Create a bid for 50kg potatoes at ₹25/kg"
- **Supplier Discovery**: "Find vegetables suppliers in Mumbai"

### Context-Aware Responses
- Remembers user location from profile
- Adapts responses based on product availability
- Provides fallback options when products aren't found

---

## 💾 Database Schema

### Collections in Firebase Firestore

#### Users Collection
```typescript
{
  uid: string;
  email: string;
  displayName: string;
  role: 'vendor' | 'wholesaler';
  phone?: string;
  location?: {
    pincode?: string;
    address?: string;
    city?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
  };
  createdAt: timestamp;
}
```

#### Products Collection
```typescript
{
  id: string;
  name: string;
  description: string;
  price: number;
  minOrder: number;
  quantity: number;
  imageUrl: string;
  wholesalerId: string;
  address: string;
  city: string;
  mobileNo: string;
  countryCode: string;
  createdAt: timestamp;
}
```

#### Orders Collection
```typescript
{
  id: string;
  vendorId: string;
  wholesalerId: string;
  productId: string;
  productName: string;
  quantity: number;
  amount: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: timestamp;
  updatedAt: timestamp;
}
```

#### Bid Requests Collection
```typescript
{
  id: string;
  vendorId: string;
  vendorName: string;
  vendorEmail: string;
  productName: string;
  description: string;
  quantity: number;
  bidPrice: number;
  urgency: 'immediate' | 'today' | 'tomorrow' | 'this_week';
  location: string;
  status: 'open' | 'accepted' | 'closed';
  createdAt: timestamp;
}
```

---

## 🎨 UI Components

Built with **Shadcn UI** and **Radix UI** primitives:

- `Button`, `Input`, `Select`, `Textarea` - Form controls
- `Dialog`, `Sheet`, `Popover` - Overlays and modals
- `Card`, `Badge`, `Avatar` - Content display
- `Dropdown Menu`, `Navigation Menu` - Navigation
- `Toast`, `Alert Dialog` - Notifications
- `Tabs`, `Accordion`, `Collapsible` - Content organization
- `Progress`, `Slider` - Interactive controls
- `Tooltip`, `Hover Card` - Contextual information

---

## 🔒 Security Features

- **Firebase Authentication** - Secure user management
- **Role-Based Access Control** - Separate routes for vendors and wholesalers
- **Protected Routes** - AuthRoute component prevents unauthorized access
- **Environment Variables** - Sensitive credentials stored securely
- **Input Validation** - Zod schema validation for forms
- **Secure Payments** - Razorpay integration for payment processing

---

## 🌐 Deployment

### Netlify Configuration
The project includes a `netlify.toml` configuration file for easy deployment:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Deployment Steps
1. Push code to GitHub repository
2. Connect repository to Netlify
3. Configure environment variables in Netlify dashboard
4. Deploy automatically on push to main branch

---

## 🧪 Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Build for development (with source maps)
npm run build:dev

# Preview production build
npm run preview

# Run ESLint
npm run lint
```

---

## 📦 Key Dependencies

### Production Dependencies
- `react` & `react-dom` - UI framework
- `firebase` - Backend services
- `@google/generative-ai` - AI chatbot
- `@radix-ui/*` - UI primitives
- `framer-motion` - Animations
- `react-router-dom` - Routing
- `@tanstack/react-query` - Server state management
- `react-hook-form` & `zod` - Form handling
- `cloudinary` - Image management
- `razorpay` - Payment processing
- `@jitsi/react-sdk` - Video calling
- `lucide-react` - Icons
- `tailwindcss` - Styling

### Dev Dependencies
- `typescript` - Type safety
- `vite` - Build tool
- `eslint` - Code linting
- `tailwindcss` & `autoprefixer` - CSS processing

---

## 🗺️ Project Structure

```
vendorGPT/
├── public/              # Static assets
├── src/
│   ├── api/             # API integration (Razorpay)
│   ├── components/      # React components
│   │   ├── ui/          # Shadcn UI components
│   │   ├── VendorGPT.tsx       # AI chatbot component
│   │   ├── ProductList.tsx     # Product listings
│   │   ├── VideoCall.tsx       # Jitsi integration
│   │   └── ...
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utility libraries
│   │   ├── firebase.ts         # Firebase configuration
│   │   ├── vendorGPT.ts        # AI logic
│   │   └── utils.ts            # Helper functions
│   ├── pages/           # Page components
│   │   ├── Index.tsx           # Landing page
│   │   ├── Login.tsx           # Login page
│   │   ├── SignUp.tsx          # Registration page
│   │   ├── VendorPage.tsx      # Vendor dashboard
│   │   └── WholesalerPage.tsx  # Wholesaler dashboard
│   ├── services/        # Business logic services
│   ├── types/           # TypeScript type definitions
│   ├── App.tsx          # Main app component
│   └── main.tsx         # Entry point
├── .env                 # Environment variables
├── package.json         # Dependencies and scripts
├── vite.config.ts       # Vite configuration
├── tailwind.config.ts   # Tailwind CSS configuration
├── tsconfig.json        # TypeScript configuration
└── netlify.toml         # Netlify deployment config
```

---

## 🎯 Use Cases

### Small Retail Vendors
- Order fresh produce directly from wholesalers
- Compare prices across multiple suppliers
- Save time with AI-assisted product discovery
- Track deliveries and manage orders efficiently

### Wholesale Suppliers
- Reach more customers without intermediaries
- Manage inventory digitally
- Accept bulk orders and bid requests
- Build direct relationships with buyers

### Restaurant Owners
- Source ingredients at wholesale prices
- Ensure consistent supply through regular orders
- Verify quality through video calls with suppliers
- Negotiate prices through the bidding system

---

## 🚧 Future Enhancements

- [ ] **Mobile Apps** - Native iOS and Android applications
- [ ] **Advanced Analytics** - Sales insights and trends for wholesalers
- [ ] **Multi-Language Support** - Regional language options
- [ ] **Delivery Tracking** - Real-time GPS tracking for orders
- [ ] **Ratings & Reviews** - Supplier and product review system
- [ ] **Bulk Upload** - CSV/Excel import for product listings
- [ ] **Advanced Filters** - More search and filter options
- [ ] **Notification System** - Push notifications for orders and bids
- [ ] **Credit System** - Buy now, pay later for trusted vendors
- [ ] **Contract Management** - Long-term supply agreements

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👨‍💻 Author

**Gautam** - [GitHub Profile](https://github.com/Gautam-cpp)

---

## 📞 Support

For issues, questions, or suggestions:
- Create an issue on GitHub
- Contact the development team

---

## 🙏 Acknowledgments

- **Firebase** - For backend infrastructure
- **Google Gemini AI** - For powering VendorGPT
- **Shadcn UI** - For beautiful UI components
- **Cloudinary** - For image management
- **Razorpay** - For payment processing
- **Jitsi** - For video calling capabilities

---

**Built with ❤️ for the agricultural community**
