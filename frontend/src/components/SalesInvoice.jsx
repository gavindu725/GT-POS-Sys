import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";

export default function SalesInvoice({ sale, open, onClose }) {
  if (!sale || !open) return null;

  const subtotal = Number(sale.total_amount || 0);
  const discount = Number(sale.discount || 0);
  const finalAmount = Number(sale.final_amount || 0);
  const saleDate = sale.sale_date
    ? new Date(sale.sale_date).toLocaleString("en-LK", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  const receipt = (
    <div style={{ width: "72mm", fontFamily: "'Courier New', Courier, monospace", fontSize: "11px", color: "#000" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "6px" }}>
        <img
          src="/logo.png"
          alt="GT Electricals"
          style={{ width: "48px", height: "48px", objectFit: "contain", display: "block", margin: "0 auto 4px" }}
        />
        <div style={{ fontWeight: "bold", fontSize: "15px", letterSpacing: "0.5px" }}>GT ELECTRICALS</div>
        <div style={{ fontSize: "10px" }}>Electrical Supplies &amp; Solutions</div>
        <div style={{ fontSize: "10px", marginTop: "2px" }}>Tel: +94 XX XXX XXXX</div>
      </div>

      <HR />
      <Row label="Invoice" value={sale.invoice_no} bold />
      <Row label="Date" value={saleDate} />
      <Row label="Customer" value={sale.customer_name || "Walk-in"} />
      <Row label="Payment" value={(sale.payment_method || "cash").replace("_", " ").toUpperCase()} />
      <HR />

      {/* Column headers */}
      <div style={{ display: "flex", fontWeight: "bold", marginBottom: "2px" }}>
        <span style={{ flex: 1 }}>Item</span>
        <span style={{ width: "24px", textAlign: "right" }}>Qty</span>
        <span style={{ width: "54px", textAlign: "right" }}>Price</span>
        <span style={{ width: "58px", textAlign: "right" }}>Total</span>
      </div>
      <HR dashed />

      {(sale.items || []).map((item, i) => {
        const name = [item.product_name, item.variant_name].filter(Boolean).join(" – ");
        const qty = Number(item.quantity);
        const price = Number(item.unit_price);
        const total = Number(item.subtotal || qty * price);
        return (
          <div key={i} style={{ marginBottom: "3px" }}>
            <div style={{ display: "flex" }}>
              <span style={{ flex: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", maxWidth: "108px" }}>{name}</span>
              <span style={{ width: "24px", textAlign: "right" }}>{qty}</span>
              <span style={{ width: "54px", textAlign: "right" }}>{price.toLocaleString()}</span>
              <span style={{ width: "58px", textAlign: "right" }}>{total.toLocaleString()}</span>
            </div>
            {item.product_sku && <div style={{ fontSize: "9px", color: "#555", paddingLeft: "2px" }}>SKU: {item.product_sku}</div>}
            {item.serial_numbers?.length > 0 && <div style={{ fontSize: "9px", color: "#555", paddingLeft: "2px" }}>S/N: {item.serial_numbers.join(", ")}</div>}
          </div>
        );
      })}

      <HR dashed />
      <Row label="Subtotal" value={`Rs. ${subtotal.toLocaleString()}`} />
      {discount > 0 && <Row label="Discount" value={`- Rs. ${discount.toLocaleString()}`} />}
      <HR />
      <Row label="TOTAL" value={`Rs. ${finalAmount.toLocaleString()}`} bold large />
      <HR />

      <div style={{ textAlign: "center", marginTop: "8px", fontSize: "10px" }}>
        <div>Thank you for your purchase!</div>
        <div style={{ color: "#555", marginTop: "2px" }}>Goods once sold are not returnable</div>
        <div style={{ fontSize: "9px", color: "#888", marginTop: "6px" }}>*** GT Electricals POS ***</div>
      </div>
    </div>
  );

  return (
    <>
      {/* Portal into #invoice-print-root — only visible during print */}
      {createPortal(receipt, document.getElementById("invoice-print-root"))}

      {/* Screen-only preview panel */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 print:hidden">
        <div className="bg-white rounded-lg shadow-xl w-[340px] max-h-[90vh] flex flex-col">
          {/* Title bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="font-semibold text-sm">Invoice — {sale.invoice_no}</span>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable receipt preview */}
          <div className="overflow-y-auto flex-1 px-4 py-3 bg-gray-50">
            <div style={{ border: "1px dashed #ccc", padding: "10px", background: "#fff" }}>
              {receipt}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 px-4 py-3 border-t">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              <X className="h-4 w-4 mr-1.5" /> Close
            </Button>
            <Button className="flex-1" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1.5" /> Print
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ label, value, bold, large }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      marginBottom: "2px",
      fontWeight: bold ? "bold" : "normal",
      fontSize: large ? "13px" : "11px",
    }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function HR({ dashed }) {
  return <div style={{ borderTop: `1px ${dashed ? "dashed #555" : "solid #000"}`, margin: "4px 0" }} />;
}
