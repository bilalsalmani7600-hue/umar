import React, { useState, useMemo, useRef } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { Navbar } from '@/components/common/Navbar';
import { Sidebar } from '@/components/common/Sidebar';
import { Product } from '@/lib/types';
import { formatCurrency, downloadCSV, cn } from '@/lib/utils';
import { exportStyledInventoryReport } from '@/lib/excelExport';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { compressImageFile } from '@/lib/imageCompressor';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Download,
  Search,
  AlertTriangle,
  ArrowUpRight,
  Camera,
  Upload,
  FileSpreadsheet,
} from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const { products, updateProduct, createProduct, adjustStock, deleteProduct, isLoading } =
    useProducts();

  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Form state for editing or creating
  const [formName, setFormName] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('Soft Toys');
  const [formPrice, setFormPrice] = useState<number>(499);
  const [formCostPrice, setFormCostPrice] = useState<number>(299);
  const [formStock, setFormStock] = useState<number>(20);
  const [formImage, setFormImage] = useState<string>('');
  const [formBarcode, setFormBarcode] = useState<string>('');
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [showManualUrl, setShowManualUrl] = useState<boolean>(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      const compressedDataUrl = await compressImageFile(file, 480, 0.82);
      setFormImage(compressedDataUrl);
    } catch (err) {
      console.error('Failed to process image:', err);
    } finally {
      setIsCompressing(false);
      // Reset input value so same file can be selected again if needed
      e.target.value = '';
    }
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.category && set.add(p.category));
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = categoryFilter === 'All' || p.category === categoryFilter;
      const matchSearch =
        search.trim() === '' ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.barcode && p.barcode.includes(search.trim()));
      return matchCat && matchSearch;
    });
  }, [products, categoryFilter, search]);

  const outOfStockCount = products.filter((p) => p.stock <= 0).length;
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= 5).length;

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormCategory(p.category);
    setFormPrice(p.price);
    setFormCostPrice(p.cost_price ?? Math.round(p.price * 0.6));
    setFormStock(p.stock);
    setFormImage(p.image);
    setFormBarcode(p.barcode || '');
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormName('');
    setFormCategory(categories[0] || 'Squishy & Stress Toys');
    setFormPrice(50);
    setFormCostPrice(30);
    setFormStock(20);
    setFormImage('https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=400&auto=format&fit=crop&q=80');
    setFormBarcode(`89020${products.length + 1}`);
    setIsAddModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      await updateProduct({
        id: editingProduct.id,
        updates: {
          name: formName,
          category: formCategory,
          price: formPrice,
          cost_price: formCostPrice,
          stock: formStock,
          image: formImage,
          barcode: formBarcode,
        },
      });
      setEditingProduct(null);
    } else {
      await createProduct({
        name: formName,
        category: formCategory,
        price: formPrice,
        cost_price: formCostPrice,
        stock: formStock,
        image: formImage,
        barcode: formBarcode,
        active: true,
      });
      setIsAddModalOpen(false);
    }
  };

  const totalStockCapital = useMemo(() => {
    return products.reduce((sum, p) => {
      const cost = p.cost_price ?? Math.round(p.price * 0.6);
      return sum + p.stock * cost;
    }, 0);
  }, [products]);

  const totalStockRetail = useMemo(() => {
    return products.reduce((sum, p) => sum + p.stock * p.price, 0);
  }, [products]);

  const totalPotentialProfit = totalStockRetail - totalStockCapital;

  const handleExportCSV = () => {
    const rows = products.map((p) => {
      const cost = p.cost_price ?? Math.round(p.price * 0.6);
      const profit = p.price - cost;
      const margin = p.price > 0 ? Math.round((profit / p.price) * 100) : 0;
      return {
        ID: p.id,
        Toy_Name: p.name,
        Category: p.category,
        Current_Stock: p.stock,
        Stock_Status: p.stock > 0 ? (p.stock <= 5 ? 'Low Stock' : 'In Stock') : 'Out of Stock',
        Wholesale_Cost_INR: cost,
        Selling_Price_INR: p.price,
        Profit_Per_Piece_INR: profit,
        Profit_Margin_Pct: `${margin}%`,
        Total_Capital_Cost_INR: p.stock * cost,
        Total_Retail_Value_INR: p.stock * p.price,
        Barcode_SKU: p.barcode || '',
      };
    });
    downloadCSV('toy_inventory_with_margins', rows);
  };

  const handleExportExcel = () => {
    exportStyledInventoryReport(products);
  };

  return (
    <div className="h-screen max-h-screen w-full flex flex-col bg-background text-foreground overflow-hidden">
      <Navbar />

      <div className="flex-1 flex overflow-hidden min-h-0 w-full">
        <Sidebar />

        <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden p-3.5 sm:p-6 gap-4 min-h-0 h-full scroll-smooth pb-24 md:pb-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                <Package className="h-5 w-5 text-brand" /> Live Toy Inventory
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real-time stock level synchronization across Phone and Counter devices
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={handleExportExcel}
                className="h-10 px-3.5 rounded-xl font-black flex items-center gap-1.5 shadow-md bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                <FileSpreadsheet className="h-4 w-4" /> Full Color Excel (.xls)
              </Button>
              <Button
                onClick={handleExportCSV}
                variant="outline"
                className="h-10 px-3 rounded-xl font-bold flex items-center gap-1.5"
              >
                <Download className="h-4 w-4" /> CSV File
              </Button>
              <Button
                onClick={handleOpenAdd}
                variant="default"
                className="h-10 px-4 rounded-xl font-bold flex items-center gap-1.5 shadow-md"
              >
                <Plus className="h-4 w-4" /> Add New Toy
              </Button>
            </div>
          </div>

          {/* Low stock notice alert */}
          {(outOfStockCount > 0 || lowStockCount > 0) && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-amber-400 font-bold">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  Inventory Alert: {outOfStockCount} toys are Out of Stock and {lowStockCount} toys are Low in Stock!
                </span>
              </div>
            </div>
          )}

          {/* Inventory Valuation KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-card border border-border">
              <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
                Total Buying Capital (Stock Cost)
              </span>
              <div className="text-xl sm:text-2xl font-black text-foreground">
                {formatCurrency(totalStockCapital)}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Total money invested in {products.reduce((sum, p) => sum + p.stock, 0)} units
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-card border border-border">
              <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
                Total Retail Value (At Selling Price)
              </span>
              <div className="text-xl sm:text-2xl font-black text-foreground">
                {formatCurrency(totalStockRetail)}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Expected revenue if all stock sold
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-card border border-border">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 block mb-1">
                Potential Gross Profit
              </span>
              <div className="text-xl sm:text-2xl font-black text-emerald-400">
                +{formatCurrency(totalPotentialProfit)}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {totalStockRetail > 0 ? Math.round((totalPotentialProfit / totalStockRetail) * 100) : 0}% Projected Margin
              </p>
            </div>
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-3 rounded-2xl bg-card border border-border">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search toys by name or barcode..."
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-input bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setCategoryFilter('All')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap',
                  categoryFilter === 'All'
                    ? 'bg-brand text-white shadow-sm'
                    : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                All ({products.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap',
                    categoryFilter === cat
                      ? 'bg-brand text-white shadow-sm'
                      : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* 1. MOBILE INVENTORY CARDS (Phone-Optimized with Zero Side-Scrolling) */}
          <div className="block md:hidden space-y-3">
            {filteredProducts.map((p) => {
              const isOut = p.stock <= 0;
              const isLow = p.stock > 0 && p.stock <= 5;
              const cost = p.cost_price ?? Math.round(p.price * 0.6);
              const profit = p.price - cost;
              const margin = p.price > 0 ? Math.round((profit / p.price) * 100) : 0;
              const isProfit = profit >= 0;

              return (
                <div key={p.id} className="p-3.5 rounded-2xl bg-card border border-border shadow-xs space-y-2.5">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={p.image}
                        alt={p.name}
                        className="h-12 w-12 rounded-xl object-cover bg-muted border border-border shrink-0"
                      />
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-sm text-foreground truncate">{p.name}</h4>
                        <p className="text-[11px] text-muted-foreground">{p.category}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-black text-base text-foreground">{formatCurrency(p.price)}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">Cost: {formatCurrency(cost)}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-border/50 text-xs">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black',
                        isProfit
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-red-500/15 text-red-400 border border-red-500/30'
                      )}
                    >
                      {isProfit ? `+₹${profit}` : `-₹${Math.abs(profit)}`} ({margin}% Margin)
                    </span>

                    <div>
                      {isOut ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-red-500/15 text-red-400 border border-red-500/30">
                          Out of Stock (0)
                        </span>
                      ) : isLow ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          Low Stock ({p.stock})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          Stock: {p.stock}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Restock & Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-muted-foreground">Restock:</span>
                      {[+5, +10, +25].map((delta) => (
                        <button
                          key={delta}
                          type="button"
                          onClick={() => adjustStock({ id: p.id, delta, reason: 'RESTOCK' })}
                          className="px-2 py-1 rounded-lg border border-border bg-muted/60 hover:bg-muted text-[11px] font-bold"
                        >
                          +{delta}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button onClick={() => handleOpenEdit(p)} size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        onClick={() => {
                          if (window.confirm(`Delete product ${p.name}?`)) {
                            deleteProduct(p.id);
                          }
                        }}
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 2. DESKTOP PRODUCT TABLE (Hidden on Mobile, Smooth Sticky-Header on Desktop) */}
          <div className="hidden md:flex flex-col min-h-0 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[58vh] sm:max-h-[66vh]">
              <table className="w-full text-left text-xs relative">
                <thead className="bg-muted/95 backdrop-blur-md border-b border-border font-black text-muted-foreground uppercase tracking-wider sticky top-0 z-10 shadow-xs">
                  <tr>
                    <th className="py-3 px-4">Toy</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Real Cost</th>
                    <th className="py-3 px-4">Selling Price</th>
                    <th className="py-3 px-4">Profit / Margin</th>
                    <th className="py-3 px-4">Current Stock</th>
                    <th className="py-3 px-4">Quick Restock</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredProducts.map((p) => {
                    const isOut = p.stock <= 0;
                    const isLow = p.stock > 0 && p.stock <= 5;
                    const cost = p.cost_price ?? Math.round(p.price * 0.6);
                    const profit = p.price - cost;
                    const margin = p.price > 0 ? Math.round((profit / p.price) * 100) : 0;
                    const isProfit = profit >= 0;

                    return (
                      <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={p.image}
                              alt={p.name}
                              className="h-10 w-10 rounded-lg object-cover bg-muted border border-border"
                            />
                            <div>
                              <div className="font-extrabold text-sm text-foreground">
                                {p.name}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono">
                                SKU: {p.barcode || p.id}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-semibold text-muted-foreground">
                          {p.category}
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-muted-foreground text-xs">
                          {formatCurrency(cost)}
                        </td>

                        <td className="py-3 px-4 font-mono font-black text-sm text-foreground">
                          {formatCurrency(p.price)}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black',
                              isProfit
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-red-500/15 text-red-400 border border-red-500/30'
                            )}
                          >
                            {isProfit ? `+₹${profit}` : `-₹${Math.abs(profit)}`} ({margin}%)
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          {isOut ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-red-500/15 text-red-400 border border-red-500/30">
                              OUT OF STOCK (0)
                            </span>
                          ) : isLow ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              Low Stock ({p.stock})
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              In Stock ({p.stock})
                            </span>
                          )}
                        </td>

                        {/* Quick restock buttons */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            {[+5, +10, +25].map((delta) => (
                              <button
                                key={delta}
                                type="button"
                                onClick={() => adjustStock({ id: p.id, delta, reason: 'RESTOCK' })}
                                className="px-2 py-1 rounded-lg border border-border bg-muted/40 hover:bg-muted text-[11px] font-bold"
                              >
                                +{delta}
                              </button>
                            ))}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              onClick={() => handleOpenEdit(p)}
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              onClick={() => {
                                if (window.confirm(`Delete product ${p.name}?`)) {
                                  deleteProduct(p.id);
                                }
                              }}
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-400 hover:text-red-500 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Edit / Add Product Modal */}
      <Dialog
        open={Boolean(editingProduct) || isAddModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditingProduct(null);
            setIsAddModalOpen(false);
          }
        }}
      >
        <DialogContent
          className="max-w-md p-6"
          onClose={() => {
            setEditingProduct(null);
            setIsAddModalOpen(false);
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Edit Toy Product' : 'Add New Toy to Catalog'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveProduct} className="space-y-3.5 mt-2">
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">
                Toy Name:
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm font-semibold focus:ring-2 focus:ring-brand focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">
                  Category:
                </label>
                <input
                  type="text"
                  required
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm font-semibold focus:ring-2 focus:ring-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">
                  Barcode / SKU:
                </label>
                <input
                  type="text"
                  value={formBarcode}
                  onChange={(e) => setFormBarcode(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm font-mono focus:ring-2 focus:ring-brand focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">
                  Real Cost (₹):
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formCostPrice}
                  onChange={(e) => setFormCostPrice(Number(e.target.value) || 0)}
                  placeholder="e.g. 25"
                  className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm font-mono font-bold focus:ring-2 focus:ring-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">
                  Selling Price (₹):
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formPrice}
                  onChange={(e) => setFormPrice(Number(e.target.value) || 0)}
                  placeholder="e.g. 50"
                  className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm font-mono font-black text-foreground focus:ring-2 focus:ring-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">
                  Stock Qty:
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formStock}
                  onChange={(e) => setFormStock(Number(e.target.value) || 0)}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm font-mono font-bold focus:ring-2 focus:ring-brand focus:outline-none"
                />
              </div>
            </div>

            {/* Live Profit Margin Badge */}
            <div className="p-2.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-xs">
              <span className="font-bold text-muted-foreground">Profit per Toy:</span>
              <span
                className={cn(
                  'font-black text-xs px-2.5 py-0.5 rounded-lg',
                  formPrice >= formCostPrice
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-red-400 bg-red-500/10'
                )}
              >
                {formPrice >= formCostPrice
                  ? `+₹${formPrice - formCostPrice} (${formPrice > 0 ? Math.round(((formPrice - formCostPrice) / formPrice) * 100) : 0}% Margin)`
                  : `-₹${formCostPrice - formPrice} (Loss: Below Cost!)`}
              </span>
            </div>

            {/* Toy Photo / Camera Capture Section */}
            <div className="space-y-2 p-3 rounded-2xl bg-muted/30 border border-border">
              <label className="text-xs font-bold text-foreground block">
                Toy Photo (Mobile Camera / Upload):
              </label>

              <div className="flex items-center gap-3">
                {/* Photo Preview Thumbnail */}
                <div className="relative h-20 w-20 rounded-xl bg-card border-2 border-dashed border-border overflow-hidden shrink-0 flex items-center justify-center">
                  {formImage ? (
                    <img
                      src={formImage}
                      alt="Toy preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Camera className="h-7 w-7 text-muted-foreground opacity-50" />
                  )}
                  {isCompressing && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-[10px] text-white font-bold animate-pulse text-center p-1 leading-tight">
                      Compressing...
                    </div>
                  )}
                </div>

                {/* Camera & File Buttons */}
                <div className="flex-1 space-y-1.5">
                  {/* Hidden file inputs: one with capture for direct camera, one for gallery */}
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />

                  <div className="flex gap-2">
                    {/* Take Photo button (triggers rear camera directly on phone) */}
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={isCompressing}
                      className="flex-1 h-9 rounded-xl text-xs font-black bg-brand hover:bg-brand/90 text-white flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Camera className="h-4 w-4" />
                      <span>Take Photo</span>
                    </Button>

                    {/* Choose from gallery button */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isCompressing}
                      className="flex-1 h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>Gallery</span>
                    </Button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowManualUrl(!showManualUrl)}
                    className="text-[11px] font-bold text-muted-foreground hover:text-foreground inline-block pt-0.5"
                  >
                    {showManualUrl ? '▲ Hide URL input' : '▼ Or paste image URL'}
                  </button>
                </div>
              </div>

              {showManualUrl && (
                <div className="pt-1">
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={formImage}
                    onChange={(e) => setFormImage(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs font-mono focus:ring-1 focus:ring-brand focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingProduct(null);
                  setIsAddModalOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="default" className="font-bold">
                {editingProduct ? 'Save Changes' : 'Create Product'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

