import React, { useState, useMemo } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { Navbar } from '@/components/common/Navbar';
import { Sidebar } from '@/components/common/Sidebar';
import { Product } from '@/lib/types';
import { formatCurrency, downloadCSV, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Download,
  Search,
  AlertTriangle,
  ArrowUpRight,
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
  const [formStock, setFormStock] = useState<number>(20);
  const [formImage, setFormImage] = useState<string>('');
  const [formBarcode, setFormBarcode] = useState<string>('');

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
    setFormStock(p.stock);
    setFormImage(p.image);
    setFormBarcode(p.barcode || '');
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormName('');
    setFormCategory(categories[0] || 'Soft Toys');
    setFormPrice(299);
    setFormStock(25);
    setFormImage('https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=400&auto=format&fit=crop&q=80');
    setFormBarcode(`89012340${products.length + 1}`);
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
        stock: formStock,
        image: formImage,
        barcode: formBarcode,
        active: true,
      });
      setIsAddModalOpen(false);
    }
  };

  const handleExportCSV = () => {
    const rows = products.map((p) => ({
      ID: p.id,
      Name: p.name,
      Category: p.category,
      Price: p.price,
      Stock: p.stock,
      Status: p.stock > 0 ? 'In Stock' : 'Out of Stock',
      Barcode: p.barcode || '',
    }));
    downloadCSV('toy_inventory', rows);
  };

  return (
    <div className="h-screen max-h-screen w-full flex flex-col bg-background text-foreground overflow-hidden">
      <Navbar />

      <div className="flex-1 flex overflow-hidden min-h-0 w-full">
        <Sidebar />

        <main className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-6 gap-4 min-h-0">
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

            <div className="flex items-center gap-2">
              <Button
                onClick={handleExportCSV}
                variant="outline"
                className="h-10 px-3.5 rounded-xl font-bold flex items-center gap-1.5"
              >
                <Download className="h-4 w-4" /> Export CSV
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

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
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

          {/* Product Inventory Table */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border font-black text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Toy</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Price</th>
                    <th className="py-3 px-4">Current Stock</th>
                    <th className="py-3 px-4">Quick Restock</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredProducts.map((p) => {
                    const isOut = p.stock <= 0;
                    const isLow = p.stock > 0 && p.stock <= 5;

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

                        <td className="py-3 px-4 font-black text-sm text-foreground">
                          {formatCurrency(p.price)}
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
                  Price (₹):
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formPrice}
                  onChange={(e) => setFormPrice(Number(e.target.value) || 0)}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm font-mono font-bold focus:ring-2 focus:ring-brand focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">
                  Stock Quantity:
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

            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">
                Image URL:
              </label>
              <input
                type="url"
                required
                value={formImage}
                onChange={(e) => setFormImage(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs font-mono focus:ring-2 focus:ring-brand focus:outline-none"
              />
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

