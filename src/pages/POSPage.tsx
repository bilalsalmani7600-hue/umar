import React, { useState, useMemo, useRef } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { useOrders } from '@/hooks/useOrders';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Navbar } from '@/components/common/Navbar';
import { Sidebar } from '@/components/common/Sidebar';
import { ProductCard } from '@/components/pos/ProductCard';
import { CartSidebar } from '@/components/pos/CartSidebar';
import { CategoryPills } from '@/components/pos/CategoryPills';
import { MobilePOSView } from '@/components/pos/MobilePOSView';
import { TokenGeneratedModal } from '@/components/pos/TokenGeneratedModal';
import { QuantityAdjustModal } from '@/components/pos/QuantityAdjustModal';
import { ThermalReceiptModal } from '@/components/common/ThermalReceiptModal';
import { Product, Order } from '@/lib/types';
import { ShoppingBag, Loader2 } from 'lucide-react';

export const POSPage: React.FC = () => {
  const { products, isLoading: isProductsLoading } = useProducts();
  const { orders, createOrder, isCreating } = useOrders();
  const { items, addToCart, decrementQuantity, updateQuantity, clearCart, getItemQuantity } = useCart();
  const { currentUser } = useAuth();
  const { counterId, autoPrintReceipt } = useSettings();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeModalProduct, setActiveModalProduct] = useState<Product | null>(null);

  // Completed Token Modal State
  const [generatedOrder, setGeneratedOrder] = useState<Order | null>(null);
  const [showTokenModal, setShowTokenModal] = useState<boolean>(false);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);

  // Mobile cart sheet toggle
  const [isMobileCartOpen, setIsMobileCartOpen] = useState<boolean>(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Extract distinct categories (only active products)
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.active !== false && p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filter products by category, search, and active status
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.active === false) return false;
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchQuery.trim()));
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Handle Token Generation (Instant checkout)
  const handleGenerateToken = async () => {
    if (items.length === 0 || isCreating) return;

    try {
      const payload = {
        items: items.map((i) => ({
          product_id: i.product.id,
          product_name: i.product.name,
          unit_price: i.product.price,
          quantity: i.quantity,
          subtotal: i.product.price * i.quantity,
          image: i.product.image,
        })),
        counter_id: counterId,
        staff_id: currentUser.id,
        staff_name: currentUser.name,
      };

      const order = await createOrder(payload);
      setGeneratedOrder(order);
      setShowTokenModal(true);
      clearCart();
      setIsMobileCartOpen(false);

      if (autoPrintReceipt) {
        setShowReceiptModal(true);
      }
    } catch (e) {
      // Error handled in useOrders hook
    }
  };

  // Barcode scanner integration
  const handleBarcodeScan = (barcode: string) => {
    const matched = products.find((p) => p.barcode === barcode || p.id === barcode);
    if (matched && matched.stock > 0) {
      addToCart(matched);
    }
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onGenerateToken: handleGenerateToken,
    onClearCart: clearCart,
    onSearchFocus: () => searchInputRef.current?.focus(),
    onBarcodeScan: handleBarcodeScan,
  });

  return (
    <>
      {/* 1. MOBILE POS VIEW (Exact match to uploaded design media_1794932906880_68b6dbca.jpg) */}
      <div className="block lg:hidden min-h-screen w-full bg-[#FAF6F0] dark:bg-zinc-950">
        <MobilePOSView
          products={filteredProducts}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          cartItems={items}
          onAddToCart={addToCart}
          onDecrementQuantity={decrementQuantity}
          onUpdateQuantity={updateQuantity}
          onClearCart={clearCart}
          getItemQuantity={getItemQuantity}
          onGenerateToken={handleGenerateToken}
          isGenerating={isCreating}
          recentOrders={orders}
          onOpenReceipt={() => setShowReceiptModal(true)}
        />
      </div>

      {/* 2. DESKTOP POS VIEW (Preserved multi-column desktop layout) */}
      <div className="hidden lg:flex h-screen max-h-screen w-full flex-col bg-background text-foreground overflow-hidden">
        {/* Top Navbar */}
        <Navbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchInputRef={searchInputRef}
        />

        <div className="flex-1 flex overflow-hidden min-h-0 w-full">
          {/* Desktop Navigation Sidebar */}
          <Sidebar />

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 min-w-0 p-3 sm:p-4 lg:p-5 gap-3.5 sm:gap-4">
            {/* Left / Center Product Catalog */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
              {/* Category Filter Pills */}
              <div className="mb-2.5 sm:mb-3 shrink-0">
                <CategoryPills
                  categories={categories}
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                />
              </div>

              {/* Products Grid */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden pr-1 scrollbar-thin min-h-0">
                {isProductsLoading ? (
                  <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin text-brand mb-2" />
                    <p className="text-xs font-bold">Loading Toy Inventory...</p>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-muted-foreground border-2 border-dashed border-border rounded-2xl">
                    <div className="text-4xl mb-2">🔍</div>
                    <h4 className="font-extrabold text-foreground">No toys found</h4>
                    <p className="text-xs mt-1">Try another search term or select "All Toys"</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3 pb-4">
                    {filteredProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        quantityInCart={getItemQuantity(product.id)}
                        onAddToCart={addToCart}
                        onDecrement={decrementQuantity}
                        onOpenQuantityModal={setActiveModalProduct}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Desktop Right Cart Sidebar */}
            <div className="flex flex-col w-80 xl:w-96 shrink-0 h-full min-h-0 overflow-hidden">
              <CartSidebar
                onGenerateToken={handleGenerateToken}
                isGenerating={isCreating}
              />
            </div>
          </main>
        </div>
      </div>

      {/* Shared Modals */}
      {/* Large Fullscreen Token Generated Modal */}
      <TokenGeneratedModal
        order={generatedOrder}
        open={showTokenModal}
        onClose={() => setShowTokenModal(false)}
        onPrint={() => setShowReceiptModal(true)}
      />

      {/* Thermal Receipt Print Modal */}
      <ThermalReceiptModal
        order={generatedOrder}
        open={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
      />

      {/* Quantity Long-Press Adjust Keypad Modal */}
      <QuantityAdjustModal
        product={activeModalProduct}
        currentQuantity={activeModalProduct ? getItemQuantity(activeModalProduct.id) : 1}
        open={Boolean(activeModalProduct)}
        onClose={() => setActiveModalProduct(null)}
        onSave={(qty) => {
          if (activeModalProduct) {
            updateQuantity(activeModalProduct.id, qty);
          }
        }}
      />
    </>
  );
};

