/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../components/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { creditsService, paymentsService } from "../../services";

// Format currency
function formatCurrency(n, locale = "es-CO", currency = "COP") {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return n;
  }
}

// Calculate discount rate based on quantity
function discountRate(q) {
  if (q >= 50) return 0.2;
  if (q >= 20) return 0.15;
  if (q >= 10) return 0.1;
  if (q >= 5) return 0.05;
  return 0;
}

// Header with KPIs and view switcher
function HeaderSection({
  balance,
  pricing,
  onViewChange,
  currentView,
  onScrollToBuy,
  transactionsLength,
}) {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-[#C7BCE0] bg-white/90 backdrop-blur-sm p-4 mb-4 shadow-lg">
      {/* Top accent stripe */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#B276CA] to-[#5E3FA5]" />

      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent">
          Créditos
        </h1>

        {/* View Switcher */}
        <nav
          aria-label="Cambiar vista"
          className="relative inline-flex rounded-xl p-1 border border-[#C7BCE0] bg-[#F7F1FA]"
        >
          <button
            onClick={() => onViewChange("credits")}
            className={`px-3 py-2 text-sm font-bold rounded-lg transition-all ${
              currentView === "credits"
                ? "bg-white text-[#5E3FA5] shadow-sm"
                : "text-[#4B3284] hover:bg-white/60"
            }`}
            aria-current={currentView === "credits" ? "page" : undefined}
          >
            💰 Créditos
          </button>
          <button
            onClick={() => onViewChange("invoices")}
            className={`px-3 py-2 text-sm font-bold rounded-lg transition-all ${
              currentView === "invoices"
                ? "bg-white text-[#5E3FA5] shadow-sm"
                : "text-[#4B3284] hover:bg-white/60"
            }`}
            aria-current={currentView === "invoices" ? "page" : undefined}
          >
            📄 Facturas
          </button>
        </nav>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="relative overflow-hidden rounded-2xl border border-[#C7BCE0] bg-white p-3 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-xs uppercase tracking-wide text-[#5E3FA5] font-semibold mb-1">
            Saldo
          </div>
          <div className="text-2xl font-black bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent">
            {balance}
          </div>
          <button
            onClick={onScrollToBuy}
            className="mt-2 inline-flex items-center gap-2 text-sm font-bold px-3 py-2 rounded-xl border border-[#C7BCE0] bg-white hover:bg-[#F7F1FA] hover:shadow-md transition-all"
          >
            Comprar créditos
          </button>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-[#C7BCE0] bg-white p-3 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-[#5E3FA5] font-semibold mb-1">
            Precio por crédito
          </div>
          <div className="text-2xl font-black text-[#261942]">
            {pricing
              ? formatCurrency(pricing.unit_price, "es-CO", pricing.currency)
              : "..."}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            IVA incluido · Descuentos por volumen
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-[#C7BCE0] bg-white p-3 shadow-sm hidden sm:block">
          <div className="text-xs uppercase tracking-wide text-[#5E3FA5] font-semibold mb-1">
            Movements
          </div>
          <div className="text-2xl font-black text-[#261942]">
            {transactionsLength}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Compras y usos recientes
          </div>
        </div>
      </div>
    </header>
  );
}

// Purchase section with quantity selector and payment
function PurchaseSection({
  pricing,
  qty,
  setQty,
  accepted,
  setAccepted,
  onPurchase,
  isPurchasing,
}) {
  if (!pricing) {
    return (
      <section className="border border-[#C7BCE0] rounded-2xl bg-white p-4 shadow-lg mb-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
        </div>
      </section>
    );
  }

  const compute = (q) => {
    const unit = pricing.unit_price;
    const subtotal = q * unit;
    const rate = discountRate(q);
    const disc = Math.round(subtotal * rate);
    const total = subtotal - disc;
    return { unit, subtotal, rate, disc, total };
  };

  const { subtotal, rate, disc, total } = compute(qty);

  const handleMinus = () => {
    setQty(Math.max(1, qty - 1));
  };

  const handlePlus = () => {
    setQty(Math.min(100, qty + 1));
  };

  const handleQtyChange = (e) => {
    const val = Math.max(1, Math.min(100, parseInt(e.target.value || "1", 10)));
    setQty(val);
  };

  const handlePay = () => {
    if (!accepted || isPurchasing) return;
    onPurchase(qty);
  };

  return (
    <section
      id="comprar"
      className="relative overflow-hidden border border-[#C7BCE0] rounded-2xl bg-white p-4 shadow-lg mb-4"
    >
      {/* Top accent stripe */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#B276CA] to-[#5E3FA5]" />

      <div className="flex items-center justify-between mb-4 mt-1">
        <h2 className="font-black text-lg text-[#261942]">Comprar créditos</h2>
      </div>

      {/* Quantity selector */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={handleMinus}
          disabled={isPurchasing}
          className="w-11 h-11 grid place-items-center rounded-xl border border-[#C7BCE0] bg-white text-xl font-black hover:bg-[#F7F1FA] hover:border-[#B276CA] transition-all disabled:opacity-50"
          aria-label="Disminuir cantidad"
        >
          −
        </button>
        <input
          type="number"
          min="1"
          max="100"
          value={qty}
          onChange={handleQtyChange}
          disabled={isPurchasing}
          className="w-24 h-11 rounded-xl border border-[#C7BCE0] bg-white text-center font-black text-lg focus:outline-none focus:ring-2 focus:ring-[#B276CA] disabled:opacity-50"
          aria-label="Cantidad de créditos"
        />
        <button
          onClick={handlePlus}
          disabled={isPurchasing}
          className="w-11 h-11 grid place-items-center rounded-xl border border-[#C7BCE0] bg-white text-xl font-black hover:bg-[#F7F1FA] hover:border-[#B276CA] transition-all disabled:opacity-50"
          aria-label="Aumentar cantidad"
        >
          +
        </button>
        <div className="ml-auto text-lg font-black text-[#261942]">
          Total:{" "}
          <span className="bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent">
            {formatCurrency(total, "es-CO", pricing.currency)}
          </span>
        </div>
      </div>

      {/* Discount ladder */}
      <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-[#C7BCE0] bg-[#F7F1FA] text-[#4B3284] font-bold text-xs shadow-sm">
          5+ = 5%
        </span>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-[#C7BCE0] bg-[#F7F1FA] text-[#4B3284] font-bold text-xs shadow-sm">
          10+ = 10%
        </span>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-[#C7BCE0] bg-[#F7F1FA] text-[#4B3284] font-bold text-xs shadow-sm">
          20+ = 15%
        </span>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-[#C7BCE0] bg-[#F7F1FA] text-[#4B3284] font-bold text-xs shadow-sm">
          50+ = 20%
        </span>
      </div>

      {/* Terms acceptance */}
      <div className="mb-2 flex items-center gap-2 text-sm">
        <input
          id="accept"
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          disabled={isPurchasing}
          className="w-5 h-5 rounded border-[#C7BCE0] text-[#5E3FA5] focus:ring-[#B276CA] disabled:opacity-50 cursor-pointer"
        />
        <label htmlFor="accept" className="select-none text-gray-700">
          He leído y acepto las{" "}
          <Link
            href="/pagos"
            className="font-bold text-[#5E3FA5] hover:underline"
          >
            Condiciones de Pago
          </Link>
          .
        </label>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Debes aceptarlas para continuar.
      </p>

      {/* CTA */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-center mb-4">
        <button
          onClick={handlePay}
          disabled={!accepted || isPurchasing}
          className="bg-gradient-to-b from-[#7C55B8] to-[#5E3FA5] text-white font-black px-4 py-3 rounded-xl border border-[#7C55B8] shadow-lg hover:from-[#5E3FA5] hover:to-[#4B3284] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPurchasing ? "Procesando..." : "Pagar ahora"}
        </button>
        <div className="text-xs text-gray-500 sm:text-right">IVA incluido</div>
      </div>

      {/* Breakdown */}
      <div className="pt-3 border-t border-[#C7BCE0] grid gap-1 text-sm">
        <div className="flex items-center justify-between text-gray-700">
          <span>Subtotal</span>
          <span className="font-black">
            {formatCurrency(subtotal, "es-CO", pricing.currency)}
          </span>
        </div>
        {rate > 0 && (
          <div className="flex items-center justify-between text-gray-700">
            <span>
              Descuento{" "}
              <span className="text-[#5E3FA5] font-bold">
                (−{Math.round(rate * 100)}%)
              </span>
            </span>
            <span className="font-black text-green-600">
              −{formatCurrency(disc, "es-CO", pricing.currency)}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between font-black text-[#261942]">
          <span>Total</span>
          <span className="bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent">
            {formatCurrency(total, "es-CO", pricing.currency)}
          </span>
        </div>
      </div>
    </section>
  );
}

// Invoices section with table
function InvoicesSection({ invoices, pricing, isLoading }) {
  if (isLoading) {
    return (
      <section className="border border-[#C7BCE0] rounded-2xl bg-white p-4 shadow-lg mb-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="facturas"
      className="border border-[#C7BCE0] rounded-2xl bg-white p-4 shadow-lg mb-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-black text-lg text-[#261942]">Facturas</h2>
        <span className="text-xs text-gray-500">
          PDF disponible tras el pago
        </span>
      </div>

      {invoices.length === 0 ? (
        <div className="text-sm text-gray-500 text-center py-8">
          No hay facturas todavía.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#C7BCE0]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F7F1FA] text-[#4B3284]">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">Fecha</th>
                  <th className="text-left px-3 py-2 font-semibold">Factura</th>
                  <th className="text-left px-3 py-2 font-semibold">
                    Créditos
                  </th>
                  <th className="text-left px-3 py-2 font-semibold">Importe</th>
                  <th className="text-left px-3 py-2 font-semibold">Estado</th>
                  <th className="text-right px-3 py-2 font-semibold">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E0F2]">
                {invoices.map((inv) => {
                  const date = new Date(inv.created_at).toLocaleDateString(
                    "es-CO",
                  );
                  const statusText =
                    inv.status === "paid"
                      ? "Pagada"
                      : inv.status === "pending"
                      ? "Pendiente"
                      : inv.status === "refunded"
                      ? "Reembolsada"
                      : "Fallida";
                  const statusColor =
                    inv.status === "paid"
                      ? "text-green-600"
                      : inv.status === "pending"
                      ? "text-amber-600"
                      : inv.status === "refunded"
                      ? "text-blue-600"
                      : "text-red-600";

                  return (
                    <tr key={inv.id} className="bg-white hover:bg-[#F7F1FA]">
                      <td className="px-3 py-2">{date}</td>
                      <td className="px-3 py-2 font-medium">
                        {inv.invoice_number}
                      </td>
                      <td className="px-3 py-2 font-semibold">
                        {inv.credits_purchased}
                      </td>
                      <td className="px-3 py-2 font-semibold">
                        {formatCurrency(inv.amount, "es-CO", inv.currency)}
                      </td>
                      <td className={`px-3 py-2 font-semibold ${statusColor}`}>
                        {statusText}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {inv.pdf_url ? (
                          <a
                            href={inv.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-2 py-1 rounded-lg border border-[#C7BCE0] bg-[#F7F1FA] text-[#4B3284] font-semibold hover:bg-[#E6E0F2] transition-colors text-xs"
                          >
                            Descargar PDF ↗
                          </a>
                        ) : (
                          <span className="text-gray-400 text-xs">
                            Pendiente
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

// Transactions section
function TransactionsSection({ transactions, isLoading }) {
  if (isLoading) {
    return (
      <section className="border border-[#C7BCE0] rounded-2xl bg-white p-4 shadow-lg">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </section>
    );
  }

  return (
    <section className="border border-[#C7BCE0] rounded-2xl bg-white p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-black text-lg text-[#261942]">Movimientos</h2>
        <span className="text-xs text-gray-500">Compras y usos recientes</span>
      </div>

      {transactions.length === 0 ? (
        <div className="text-sm text-gray-500 text-center py-8">
          Sin movimientos todavía.
        </div>
      ) : (
        <ul className="divide-y divide-[#E6E0F2]">
          {transactions.map((t) => {
            const when = new Date(t.created_at).toLocaleString("es-CO");
            const sign = t.amount < 0 ? "−" : "+";
            const color = t.amount < 0 ? "text-gray-900" : "text-[#B276CA]";
            const icon = t.amount < 0 ? "−" : "＋";
            const title =
              t.type === "purchase"
                ? "Compra de créditos"
                : t.type === "refund"
                ? "Reembolso"
                : t.type === "use"
                ? "Uso de crédito"
                : t.type === "bonus"
                ? "Bonus"
                : "Ajuste administrativo";

            return (
              <li key={t.id} className="py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl border border-[#C7BCE0] bg-gradient-to-b from-[#F7F1FA] to-white grid place-items-center font-black text-lg text-[#5E3FA5]">
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate text-[#261942]">
                    {title}
                  </div>
                  <div className="text-xs text-[#5E3FA5]">
                    {when}
                    {t.description ? ` · ${t.description}` : ""}
                  </div>
                </div>
                <div className={`font-black ${color}`}>
                  {sign}
                  {Math.abs(t.amount)} cr
                </div>
                <div className="text-xs text-gray-500 w-28 text-right">
                  Saldo: {t.balance_after} cr
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// Status banner for notifications
function StatusBanner({ message, isSuccess, onClose }) {
  if (!message) return null;

  return (
    <div
      className={`mb-4 p-3 rounded-2xl border flex items-center justify-between ${
        isSuccess
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-amber-200 bg-amber-50 text-amber-800"
      }`}
      role="alert"
    >
      <span className="font-semibold">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 text-lg leading-none hover:opacity-70"
        aria-label="Cerrar"
      >
        ×
      </button>
    </div>
  );
}

// Main page component
export default function CreditosPage() {
  const { loading, isAuthenticated } = useAuth();
  const router = useRouter();

  // State
  const [balance, setBalance] = useState(0);
  const [pricing, setPricing] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [qty, setQty] = useState(3);
  const [accepted, setAccepted] = useState(false);
  const [currentView, setCurrentView] = useState("credits");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusSuccess, setStatusSuccess] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Redirect if not authenticated (but wait for auth loading to complete)
  useEffect(() => {
    if (!loading && !isAuthenticated()) {
      router.push("/");
      return;
    }
  }, [loading, isAuthenticated, router]);

  // Load data on mount
  useEffect(() => {
    if (!loading && isAuthenticated()) {
      loadAllData();
    }
  }, [loading, isAuthenticated]);

  const loadAllData = async () => {
    setIsLoadingData(true);
    try {
      // Load all data in parallel
      const [balanceRes, pricingRes, transactionsRes, invoicesRes] =
        await Promise.all([
          creditsService.getBalance(),
          creditsService.getPricing(),
          creditsService.getTransactions({ limit: 50 }),
          creditsService.getInvoices({ limit: 50 }),
        ]);

      if (balanceRes.success) {
        setBalance(balanceRes.data.balance);
      }

      if (pricingRes.success) {
        setPricing(pricingRes.data);
      }

      if (transactionsRes.success) {
        setTransactions(transactionsRes.data.transactions);
      }

      if (invoicesRes.success) {
        setInvoices(invoicesRes.data.invoices);
      }
    } catch (error) {
      console.error("Error loading credits data:", error);
      showBanner("Error al cargar los datos", false);
    } finally {
      setIsLoadingData(false);
    }
  };

  const showBanner = (msg, success = true) => {
    setStatusMessage(msg);
    setStatusSuccess(success);
    setTimeout(() => setStatusMessage(""), 3800);
  };

  const handlePurchase = async (quantity) => {
    setIsPurchasing(true);
    try {
      // Create purchase/invoice
      const purchaseRes = await creditsService.purchaseCredits(quantity);

      if (!purchaseRes.success) {
        showBanner("Error al crear la compra", false);
        setIsPurchasing(false);
        return;
      }

      // Create payment checkout using dLocalGo with proper payment_type
      const checkoutRes = await paymentsService.createCheckout({
        payment_type: "credits_purchase",
        order_id: `CREDITS-${purchaseRes.data.invoice_id}`,
        amount: purchaseRes.data.amount,
        credits_quantity: quantity,
        invoice_id: purchaseRes.data.invoice_id,
        metadata: {
          invoice_number: purchaseRes.data.invoice_number,
          discount_applied: purchaseRes.data.discount_rate > 0,
        },
      });

      if (checkoutRes.success && checkoutRes.data.redirect_url) {
        // Redirect to payment gateway
        window.location.href = checkoutRes.data.redirect_url;
      } else {
        showBanner(
          "Error al iniciar el pago. Por favor, intenta de nuevo.",
          false,
        );
        setIsPurchasing(false);
      }
    } catch (error) {
      console.error("Error purchasing credits:", error);
      showBanner("Error al procesar la compra", false);
      setIsPurchasing(false);
    }
  };

  const handleScrollToBuy = () => {
    const el = document.getElementById("comprar");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      setCurrentView("credits");
    }
  };

  const handleViewChange = (view) => {
    setCurrentView(view);
    const targetId = view === "credits" ? "comprar" : "facturas";
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Show loading state until data is loaded
  if (isLoadingData && !pricing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-2 md:px-4">
        <div className="container max-w-screen-md mx-auto py-2 md:py-4">
          <div className="bg-white shadow-lg p-2 md:p-4">
            <div className="rounded-2xl border border-[#C7BCE0] bg-white p-4 animate-pulse">
              <div className="h-8 w-48 bg-[#F7F1FA] rounded mb-4"></div>
              <div className="h-24 bg-[#F7F1FA] rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-2 md:px-4 text-gray-600 text-sm">
      <div className="container max-w-screen-md mx-auto py-2 md:py-4">
        <div className="bg-white shadow-lg overflow-hidden p-2 md:p-4">
          <HeaderSection
            balance={balance}
            pricing={pricing}
            onViewChange={handleViewChange}
            currentView={currentView}
            onScrollToBuy={handleScrollToBuy}
            transactionsLength={transactions?.length || 0}
          />

          <StatusBanner
            message={statusMessage}
            isSuccess={statusSuccess}
            onClose={() => setStatusMessage("")}
          />

          <PurchaseSection
            pricing={pricing}
            qty={qty}
            setQty={setQty}
            accepted={accepted}
            setAccepted={setAccepted}
            onPurchase={handlePurchase}
            isPurchasing={isPurchasing}
          />

          <InvoicesSection
            invoices={invoices}
            pricing={pricing}
            isLoading={isLoadingData}
          />

          <TransactionsSection
            transactions={transactions}
            isLoading={isLoadingData}
          />
        </div>
      </div>
    </div>
  );
}
