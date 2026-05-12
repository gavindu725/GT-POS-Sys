import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "@/utils/axios";
import { toast } from "sonner";
import { API_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Trash2,
  ShoppingCart,
  Search,
  Loader2,
  Pencil,
  Ban,
} from "lucide-react";

const formatToday = () => new Date().toISOString().slice(0, 10);

const parseSerialNumbers = (value) =>
  value
    .split(/\r?\n/)
    .map((serial) => serial.trim())
    .filter(Boolean);

const createItem = () => ({
  localId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  product_id: "",
  variant_id: "",
  quantity: "1",
  cost_price: "",
  serial_numbers: "",
  variants: [],
  is_serialized: false,
});

const createEmptyForm = () => ({
  supplier_id: "",
  purchase_date: formatToday(),
  items: [createItem()],
});

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hydrating, setHydrating] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(createEmptyForm());
  const [itemLoadingId, setItemLoadingId] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      axios.get(`${API_URL}/purchases`),
      axios.get(`${API_URL}/suppliers`),
      axios.get(`${API_URL}/products`),
    ])
      .then(([purchaseRes, supplierRes, productRes]) => {
        setPurchases(purchaseRes.data.data || []);
        setSuppliers(supplierRes.data.data || []);
        setProducts(productRes.data.data || []);
      })
      .catch(() => toast.error("Failed to load purchase data"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setEditId(null);
    setForm(createEmptyForm());
  };

  const openAdd = () => {
    resetForm();
    setSheetOpen(true);
  };

  const updateItem = (index, patch) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], ...patch };
      return { ...prev, items };
    });
  };

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, createItem()],
    }));
  };

  const removeItem = (index) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const syncProductToItem = async (
    index,
    productId,
    { preserveCost = false, keepVariant = false } = {},
  ) => {
    if (!productId) {
      updateItem(index, {
        cost_price: "",
        variants: [],
        variant_id: "",
        serial_numbers: "",
        is_serialized: false,
      });
      return;
    }

    setItemLoadingId(index);
    try {
      const response = await axios.get(`${API_URL}/products/${productId}`);
      const product = response.data.data;
      const productVariants = (product.variants || []).map((variant) => ({
        id: variant.id,
        name: variant.variant_name,
      }));

      setForm((prev) => {
        const items = [...prev.items];
        const current = items[index];
        if (!current) return prev;

        const currentVariantId = current.variant_id
          ? current.variant_id.toString()
          : "";
        const variantStillValid = productVariants.some(
          (variant) => variant.id.toString() === currentVariantId,
        );

        items[index] = {
          ...current,
          variants: productVariants,
          cost_price: preserveCost
            ? current.cost_price
            : (product.cost_price?.toString() ?? ""),
          serial_numbers: product.is_serialized ? current.serial_numbers : "",
          is_serialized: !!product.is_serialized,
          variant_id:
            productVariants.length === 0
              ? ""
              : keepVariant && variantStillValid
                ? currentVariantId
                : variantStillValid
                  ? currentVariantId
                  : "",
        };

        return { ...prev, items };
      });
    } catch {
      toast.error("Failed to load product details");
    } finally {
      setItemLoadingId(null);
    }
  };

  const openEdit = async (purchaseId) => {
    setHydrating(true);
    try {
      const response = await axios.get(`${API_URL}/purchases/${purchaseId}`);
      const purchase = response.data.data;
      const hydratedItems = await Promise.all(
        (purchase.items || []).map(async (item) => {
          let variants = [];
          try {
            const productResponse = await axios.get(
              `${API_URL}/products/${item.product_id}`,
            );
            variants = (productResponse.data.data.variants || []).map(
              (variant) => ({
                id: variant.id,
                name: variant.variant_name,
              }),
            );
          } catch {
            variants = [];
          }

          return {
            localId: `purchase-${item.id}`,
            id: item.id,
            product_id: item.product_id.toString(),
            variant_id: item.variant_id ? item.variant_id.toString() : "",
            quantity: item.quantity.toString(),
            cost_price: item.cost_price.toString(),
            serial_numbers: (item.serial_numbers || []).join("\n"),
            variants,
            is_serialized: !!item.is_serialized,
          };
        }),
      );

      setEditId(purchase.id);
      setForm({
        supplier_id: purchase.supplier_id?.toString() ?? "",
        purchase_date: purchase.purchase_date ?? formatToday(),
        items: hydratedItems.length > 0 ? hydratedItems : [createItem()],
      });
      setSheetOpen(true);
    } catch (err) {
      toast.error(
        err.response?.data?.error || "Failed to load purchase details",
      );
    } finally {
      setHydrating(false);
    }
  };

  const validate = () => {
    if (!form.supplier_id) return "Supplier is required";
    if (form.items.length === 0) return "Add at least one item";

    for (let i = 0; i < form.items.length; i += 1) {
      const item = form.items[i];
      if (!item.product_id) return `Item ${i + 1}: product is required`;
      if (item.variants.length > 0 && !item.variant_id)
        return `Item ${i + 1}: variant is required`;
      if (
        item.cost_price === "" ||
        Number.isNaN(Number(item.cost_price)) ||
        Number(item.cost_price) < 0
      ) {
        return `Item ${i + 1}: valid cost price is required`;
      }

      if (item.is_serialized) {
        const serialCount = parseSerialNumbers(item.serial_numbers).length;
        if (serialCount <= 0) {
          return `Item ${i + 1}: serial numbers are required`;
        }
      } else if (!Number(item.quantity) || Number(item.quantity) <= 0) {
        return `Item ${i + 1}: valid quantity is required`;
      }
    }

    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    setSaving(true);
    const payload = {
      supplier_id: Number(form.supplier_id),
      purchase_date: form.purchase_date,
      items: form.items.map((item) => ({
        product_id: Number(item.product_id),
        variant_id: item.variant_id ? Number(item.variant_id) : null,
        quantity: item.is_serialized
          ? parseSerialNumbers(item.serial_numbers).length
          : Number(item.quantity),
        cost_price: Number(item.cost_price),
        serial_numbers: item.is_serialized
          ? parseSerialNumbers(item.serial_numbers)
          : [],
      })),
    };

    try {
      if (editId) {
        await axios.put(`${API_URL}/purchases/${editId}`, payload);
        toast.success("Purchase updated");
      } else {
        await axios.post(`${API_URL}/purchases`, payload);
        toast.success("Purchase created");
      }

      setSheetOpen(false);
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelPurchase = async () => {
    if (!cancelTarget) return;

    try {
      await axios.patch(`${API_URL}/purchases/${cancelTarget.id}/cancel`);
      toast.success("Purchase canceled");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Cancel failed");
    } finally {
      setCancelTarget(null);
    }
  };

  const filteredPurchases = useMemo(() => {
    const query = search.toLowerCase();
    return purchases.filter((purchase) =>
      [
        purchase.invoice_no,
        purchase.supplier_name,
        purchase.purchase_date,
        purchase.status,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [purchases, search]);

  const totalAmount = useMemo(
    () =>
      form.items.reduce((sum, item) => {
        const itemQuantity = item.is_serialized
          ? parseSerialNumbers(item.serial_numbers).length
          : Number(item.quantity || 0);
        return sum + itemQuantity * Number(item.cost_price || 0);
      }, 0),
    [form.items],
  );

  return (
    <main className="overflow-y-auto p-5">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold">Purchases</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create, edit, and cancel supplier purchases.
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" /> New Purchase
        </Button>
      </div>

      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" /> Purchase Register
            </CardTitle>
            <Badge variant="secondary">{purchases.length} total</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search invoice, supplier, date, status..."
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className="py-16 text-center text-muted-foreground">Loading…</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPurchases.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-12 text-center text-muted-foreground"
                  >
                    No purchases yet
                  </TableCell>
                </TableRow>
              ) : (
                filteredPurchases.map((purchase) => {
                  const isCanceled = purchase.status === "canceled";
                  return (
                    <TableRow
                      key={purchase.id}
                      className={isCanceled ? "opacity-70" : ""}
                    >
                      <TableCell className="font-medium font-mono">
                        {purchase.invoice_no}
                      </TableCell>
                      <TableCell>{purchase.supplier_name || "—"}</TableCell>
                      <TableCell>{purchase.purchase_date || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={isCanceled ? "secondary" : "default"}>
                          {purchase.status || "active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {purchase.item_count || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        Rs.{" "}
                        {Number(purchase.total_amount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => void openEdit(purchase.id)}
                          disabled={isCanceled || hydrating}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setCancelTarget(purchase)}
                          disabled={isCanceled}
                        >
                          <Ban className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) {
            resetForm();
          }
        }}
      >
        <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-4xl">
          <SheetHeader className="mb-4 px-6 pt-6">
            <SheetTitle>
              {editId ? "Edit Purchase" : "Create Purchase"}
            </SheetTitle>
            <SheetDescription>
              Select a supplier and add products received into stock.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-6 px-6 pb-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>
                  Supplier <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.supplier_id}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, supplier_id: value }))
                  }
                  disabled={hydrating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem
                        key={supplier.id}
                        value={supplier.id.toString()}
                      >
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Purchase Date</Label>
                <Input
                  type="date"
                  value={form.purchase_date}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      purchase_date: event.target.value,
                    }))
                  }
                  disabled={hydrating}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Items
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Add products and quantities received from the supplier.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  className="gap-2"
                  disabled={hydrating}
                >
                  <Plus className="h-3 w-3" /> Add Item
                </Button>
              </div>

              <div className="space-y-3">
                {form.items.map((item, index) => {
                  const selectedProduct = products.find(
                    (product) => product.id.toString() === item.product_id,
                  );
                  const itemQuantity = item.is_serialized
                    ? parseSerialNumbers(item.serial_numbers).length
                    : Number(item.quantity || 0);
                  const rowSubtotal =
                    itemQuantity * Number(item.cost_price || 0);
                  return (
                    <div
                      key={item.localId}
                      className="rounded-lg border p-4 space-y-4 relative"
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => removeItem(index)}
                        disabled={form.items.length === 1 || hydrating}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>

                      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                        <div className="space-y-1 lg:col-span-5">
                          <Label>
                            Product <span className="text-destructive">*</span>
                          </Label>
                          <Select
                            value={item.product_id}
                            onValueChange={(value) =>
                              void syncProductToItem(index, value)
                            }
                            disabled={hydrating}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((product) => (
                                <SelectItem
                                  key={product.id}
                                  value={product.id.toString()}
                                >
                                  {product.name}{" "}
                                  {product.sku ? `(${product.sku})` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1 lg:col-span-3">
                          <Label>Variant</Label>
                          <Select
                            value={item.variant_id}
                            onValueChange={(value) =>
                              updateItem(index, { variant_id: value })
                            }
                            disabled={
                              hydrating || !selectedProduct?.variant_count
                            }
                          >
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  selectedProduct?.variant_count
                                    ? "Select variant"
                                    : "No variants"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {(item.variants || []).map((variant) => (
                                <SelectItem
                                  key={variant.id}
                                  value={variant.id.toString()}
                                >
                                  {variant.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1 lg:col-span-2">
                          <Label>Qty</Label>
                          <Input
                            type="number"
                            min="1"
                            value={
                              item.is_serialized ? itemQuantity : item.quantity
                            }
                            onChange={(event) =>
                              updateItem(index, {
                                quantity: event.target.value,
                              })
                            }
                            disabled={hydrating || item.is_serialized}
                          />
                        </div>

                        <div className="space-y-1 lg:col-span-2">
                          <Label>Cost</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.cost_price}
                            onChange={(event) =>
                              updateItem(index, {
                                cost_price: event.target.value,
                              })
                            }
                            disabled={hydrating}
                          />
                        </div>

                        {selectedProduct?.is_serialized && (
                          <div className="space-y-1 lg:col-span-12">
                            <Label>Serial Numbers</Label>
                            <Textarea
                              value={item.serial_numbers}
                              onChange={(event) =>
                                updateItem(index, {
                                  serial_numbers: event.target.value,
                                })
                              }
                              rows={3}
                              placeholder={"One serial per line"}
                              disabled={hydrating}
                            />
                            <p className="text-xs text-muted-foreground">
                              Enter one unique serial per unit. Quantity is
                              derived automatically.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>
                          {itemLoadingId === index ? (
                            <span className="inline-flex items-center gap-2">
                              <Loader2 className="h-3 w-3 animate-spin" />{" "}
                              Loading product details
                            </span>
                          ) : selectedProduct ? (
                            `Selected: ${selectedProduct.name}`
                          ) : (
                            "Choose a product to auto-fill cost and variants"
                          )}
                        </span>
                        <span className="font-medium text-foreground">
                          Subtotal: Rs. {rowSubtotal.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between rounded-md bg-muted/60 px-4 py-3 text-sm">
                <span>Total Amount</span>
                <span className="font-semibold">
                  Rs. {totalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            <SheetFooter className="px-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSheetOpen(false);
                  resetForm();
                }}
                disabled={saving || hydrating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving || hydrating}>
                {saving
                  ? "Saving…"
                  : editId
                    ? "Save Changes"
                    : "Create Purchase"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Purchase?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{cancelTarget?.invoice_no}</strong> will be marked
              canceled and all stock will be reversed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelPurchase}
              className="bg-destructive hover:bg-destructive/90"
            >
              Cancel Purchase
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
