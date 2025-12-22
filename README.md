# Codeteak Store - E-Commerce MVP

A simple, production-style e-commerce MVP frontend built with Next.js 14+ (App Router), Tailwind CSS, and JavaScript.

## Features

- 🏠 **Home Page** - Hero section with featured products
- 📦 **Product Listing** - Browse all products with category filters and search
- 🔍 **Product Details** - Detailed product view with quantity selector
- 🛒 **Shopping Cart** - Add, update, and remove items with localStorage persistence
- 💳 **Checkout** - Complete checkout form with order summary
- ✅ **Order Success** - Confirmation page after order placement
- 📱 **Responsive Design** - Works on mobile, tablet, and desktop

## Tech Stack

- **Next.js 14+** - React framework with App Router
- **Tailwind CSS** - Utility-first CSS framework
- **JavaScript** - No TypeScript
- **React Context API** - State management for cart
- **localStorage** - Client-side cart persistence

## Project Structure

```
ecommerce/
├── app/
│   ├── layout.js              # Root layout with Navbar and Footer
│   ├── page.js                # Home page
│   ├── globals.css            # Global styles with Tailwind
│   ├── products/
│   │   ├── page.js            # Products listing page
│   │   └── [id]/
│   │       └── page.js        # Product details page
│   ├── cart/
│   │   └── page.js            # Shopping cart page
│   ├── checkout/
│   │   └── page.js            # Checkout page
│   ├── order-success/
│   │   └── page.js            # Order success page
│   └── not-found.js           # 404 page
├── components/
│   ├── Container.jsx          # Layout container component
│   ├── Navbar.jsx             # Navigation bar
│   ├── Footer.jsx              # Footer component
│   ├── ProductCard.jsx         # Product card component
│   ├── ProductGrid.jsx         # Product grid layout
│   └── CartItem.jsx            # Cart item component
├── context/
│   └── CartContext.jsx        # Cart state management
├── data/
│   └── products.js            # Mock product data
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── next.config.js
```

## Installation & Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Key Features Explained

### Cart Management
- Cart state is managed using React Context API
- Cart items persist to localStorage on the client side
- Cart count badge in navbar updates in real-time
- Cart persists across page refreshes

### Product Data
- Mock product data stored in `data/products.js`
- 12 sample products across Men, Women, and Accessories categories
- Each product includes: id, name, slug, price, category, description, image, and inStock status

### Responsive Design
- Mobile: Single column layout
- Tablet: 2-3 column grid
- Desktop: 3-4 column grid
- All pages are fully responsive

## Routes

- `/` - Home page with featured products
- `/products` - All products with filters and search
- `/products/[id]` - Individual product details
- `/cart` - Shopping cart
- `/checkout` - Checkout form
- `/order-success` - Order confirmation
- Any other route - 404 page

## Notes

- This is a frontend-only MVP with no real backend
- Cart data is stored in browser localStorage
- Product images use Unsplash placeholder URLs
- Checkout form submission simulates order placement (no real payment processing)
- All product data is mock data for demonstration purposes

## License

This project is for demonstration purposes.

