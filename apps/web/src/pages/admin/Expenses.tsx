import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useToast } from "../../components/Toast";

const money = (n: any) =>
  `SAR ${Number(n || 0).toLocaleString("en-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const label = (s: any) =>
  String(s || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (x) => x.toUpperCase());
const badge = (s: string) =>
  s === "approved" || s === "paid"
    ? "active"
    : s === "pending" || s === "partial"
      ? "pending"
      : s === "rejected"
        ? "danger"
        : "grey";
const headings: any = {
  dashboard: "Expense Dashboard",
  all: "All Expenses",
  new: "Create Expense",
  suppliers: "Supplier Payments",
  recurring: "Recurring Expenses",
  reimbursements: "Employee Reimbursements",
  petty: "Petty Cash",
  categories: "Expense Categories",
  approvals: "Approval Queue",
  schedule: "Payment Schedule",
  reports: "Expense Reports",
};

function Field({ title, children }: { title: string; children: any }) {
  return (
    <label className="expense-field">
      <span>{title}</span>
      {children}
    </label>
  );
}
function Modal({ title, close, children, save, disabled }: any) {
  return (
    <div className="expense-modal" onMouseDown={close}>
      <div onMouseDown={(e) => e.stopPropagation()}>
        <header>
          <div>
            <h2>{title}</h2>
            <p>Company-scoped record with complete activity trail</p>
          </div>
          <button onClick={close}>
            <i className="ti ti-x" />
          </button>
        </header>
        <main>{children}</main>
        <footer>
          <button className="btn-nx ghost" onClick={close}>
            Cancel
          </button>
          <button className="btn-nx primary" disabled={disabled} onClick={save}>
            Save
          </button>
        </footer>
      </div>
    </div>
  );
}

function CreateExpense({ kind, categories, branches, suppliers, close }: any) {
  const qc = useQueryClient(),
    { toast } = useToast();
  const [f, setF] = useState<any>({
    type: kind || "general",
    expense_date: new Date().toISOString().slice(0, 10),
    due_date: "",
    category_id: "",
    branch_id: "",
    supplier_id: "",
    employee_name: "",
    vendor: "",
    description: "",
    subtotal: "",
    vat_amount: "",
    payment_method: "bank_transfer",
    recurring_frequency: "",
    next_run_date: "",
    reference: "",
    receipt_url: "",
    notes: "",
    status: "draft",
  });
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const mut = useMutation({
    mutationFn: () =>
      api.post("/expenses", {
        ...f,
        subtotal: Number(f.subtotal),
        vat_amount: Number(f.vat_amount || 0),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expense-list"] });
      qc.invalidateQueries({ queryKey: ["expense-dashboard"] });
      toast("Expense saved");
      close();
    },
    onError: (e: any) =>
      toast(e.response?.data?.message || "Could not save expense", "error"),
  });
  return (
    <Modal
      title="Create Expense"
      close={close}
      save={() => mut.mutate()}
      disabled={!f.description || !Number(f.subtotal) || mut.isPending}
    >
      <div className="expense-form">
        <Field title="Expense type">
          <select value={f.type} onChange={(e) => set("type", e.target.value)}>
            <option value="general">General expense</option>
            <option value="supplier">Supplier expense</option>
            <option value="reimbursement">Employee reimbursement</option>
            <option value="petty_cash">Petty cash</option>
          </select>
        </Field>
        <Field title="Category">
          <select
            value={f.category_id}
            onChange={(e) => set("category_id", e.target.value)}
          >
            <option value="">Select category</option>
            {categories.map((x: any) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </Field>
        <Field title="Branch / cost centre">
          <select
            value={f.branch_id}
            onChange={(e) => set("branch_id", e.target.value)}
          >
            <option value="">Head Office</option>
            {branches.map((x: any) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </Field>
        <Field title="Supplier">
          <select
            value={f.supplier_id}
            onChange={(e) => set("supplier_id", e.target.value)}
          >
            <option value="">No linked supplier</option>
            {suppliers.map((x: any) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </Field>
        {f.type === "reimbursement" && (
          <Field title="Employee">
            <input
              value={f.employee_name}
              onChange={(e) => set("employee_name", e.target.value)}
            />
          </Field>
        )}
        <Field title="Vendor / payee">
          <input
            value={f.vendor}
            onChange={(e) => set("vendor", e.target.value)}
          />
        </Field>
        <Field title="Description">
          <input
            value={f.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Business purpose"
          />
        </Field>
        <Field title="Expense date">
          <input
            type="date"
            value={f.expense_date}
            onChange={(e) => set("expense_date", e.target.value)}
          />
        </Field>
        <Field title="Due date">
          <input
            type="date"
            value={f.due_date}
            onChange={(e) => set("due_date", e.target.value)}
          />
        </Field>
        <Field title="Subtotal">
          <input
            type="number"
            min="0"
            value={f.subtotal}
            onChange={(e) => set("subtotal", e.target.value)}
          />
        </Field>
        <Field title="Input VAT">
          <input
            type="number"
            min="0"
            value={f.vat_amount}
            onChange={(e) => set("vat_amount", e.target.value)}
          />
        </Field>
        <Field title="Payment method">
          <select
            value={f.payment_method}
            onChange={(e) => set("payment_method", e.target.value)}
          >
            <option value="bank_transfer">Bank transfer</option>
            <option value="cash">Cash</option>
            <option value="card">Corporate card</option>
            <option value="petty_cash">Petty cash</option>
          </select>
        </Field>
        <Field title="Recurring">
          <select
            value={f.recurring_frequency}
            onChange={(e) => set("recurring_frequency", e.target.value)}
          >
            <option value="">One-time</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
        </Field>
        {f.recurring_frequency && (
          <Field title="Next run">
            <input
              type="date"
              value={f.next_run_date}
              onChange={(e) => set("next_run_date", e.target.value)}
            />
          </Field>
        )}
        <Field title="Invoice / reference">
          <input
            value={f.reference}
            onChange={(e) => set("reference", e.target.value)}
          />
        </Field>
        <Field title="Receipt attachment URL">
          <input
            value={f.receipt_url}
            onChange={(e) => set("receipt_url", e.target.value)}
          />
        </Field>
        <Field title="Approval">
          <select
            value={f.status}
            onChange={(e) => set("status", e.target.value)}
          >
            <option value="draft">Save draft</option>
            <option value="pending">Submit for approval</option>
          </select>
        </Field>
        <Field title="Notes">
          <textarea
            value={f.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}

function Pay({ item, supplier, close }: any) {
  const qc = useQueryClient(),
    { toast } = useToast();
  const due = Number(item.total) - Number(item.paid_amount || 0);
  const [f, setF] = useState({
    amount: String(due),
    method: "bank_transfer",
    reference: "",
    notes: "",
  });
  const mut = useMutation({
    mutationFn: () =>
      api.post(
        supplier
          ? `/purchasing/orders/${item.id}/payments`
          : `/expenses/${item.id}/payments`,
        { ...f, amount: Number(f.amount) },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expense-list"] });
      qc.invalidateQueries({ queryKey: ["expense-suppliers"] });
      qc.invalidateQueries({ queryKey: ["expense-dashboard"] });
      toast("Payment recorded");
      close();
    },
    onError: (e: any) =>
      toast(e.response?.data?.message || "Payment failed", "error"),
  });
  return (
    <Modal
      title={supplier ? "Pay Supplier" : "Pay Expense"}
      close={close}
      save={() => mut.mutate()}
      disabled={!Number(f.amount) || Number(f.amount) > due || mut.isPending}
    >
      <div className="expense-form">
        <Field title="Outstanding">
          <input disabled value={money(due)} />
        </Field>
        <Field title="Amount">
          <input
            type="number"
            value={f.amount}
            onChange={(e) => setF((x) => ({ ...x, amount: e.target.value }))}
          />
        </Field>
        <Field title="Method">
          <select
            value={f.method}
            onChange={(e) => setF((x) => ({ ...x, method: e.target.value }))}
          >
            <option value="bank_transfer">Bank transfer</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="cheque">Cheque</option>
          </select>
        </Field>
        <Field title="Reference">
          <input
            value={f.reference}
            onChange={(e) => setF((x) => ({ ...x, reference: e.target.value }))}
          />
        </Field>
        <Field title="Notes">
          <textarea
            value={f.notes}
            onChange={(e) => setF((x) => ({ ...x, notes: e.target.value }))}
          />
        </Field>
      </div>
    </Modal>
  );
}

function CreateCategory({ close }: any) {
  const qc = useQueryClient(),
    { toast } = useToast();
  const [f, setF] = useState({
    name: "",
    code: "",
    type: "operating",
    budget_monthly: "",
  });
  const mut = useMutation({
    mutationFn: () =>
      api.post("/expenses/categories", {
        ...f,
        budget_monthly: Number(f.budget_monthly || 0),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expense-categories"] });
      toast("Expense category created");
      close();
    },
    onError: (e: any) =>
      toast(e.response?.data?.message || "Could not create category", "error"),
  });
  return (
    <Modal
      title="New Expense Category"
      close={close}
      save={() => mut.mutate()}
      disabled={!f.name || mut.isPending}
    >
      <div className="expense-form">
        <Field title="Category name">
          <input
            value={f.name}
            onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))}
            placeholder="Rent, utilities, marketing…"
          />
        </Field>
        <Field title="Code">
          <input
            value={f.code}
            onChange={(e) =>
              setF((x) => ({ ...x, code: e.target.value.toUpperCase() }))
            }
            placeholder="RENT"
          />
        </Field>
        <Field title="Category type">
          <select
            value={f.type}
            onChange={(e) => setF((x) => ({ ...x, type: e.target.value }))}
          >
            <option value="operating">Operating expense</option>
            <option value="supplier">Supplier expense</option>
            <option value="reimbursement">Reimbursement</option>
            <option value="petty_cash">Petty cash</option>
          </select>
        </Field>
        <Field title="Monthly budget">
          <input
            type="number"
            min="0"
            value={f.budget_monthly}
            onChange={(e) =>
              setF((x) => ({ ...x, budget_monthly: e.target.value }))
            }
          />
        </Field>
      </div>
    </Modal>
  );
}

function ReportView({ records, categories, purchaseOrders }: any) {
  const now = new Date(),
    monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
  const [from, setFrom] = useState(monthStart),
    [to, setTo] = useState(now.toISOString().slice(0, 10)),
    [report, setReport] = useState("ledger"),
    [category, setCategory] = useState(""),
    [branch, setBranch] = useState(""),
    [payment, setPayment] = useState(""),
    [approval, setApproval] = useState("");
  const rows = useMemo(
    () =>
      records.filter(
        (x: any) =>
          (!from || x.expense_date >= from) &&
          (!to || x.expense_date <= to) &&
          (!category || x.category_id === category) &&
          (!branch ||
            (branch === "head" ? !x.branch_id : x.branch_id === branch)) &&
          (!payment || x.payment_status === payment) &&
          (!approval || x.status === approval),
      ),
    [records, from, to, category, branch, payment, approval],
  );
  const total = rows.reduce((s: number, x: any) => s + Number(x.total || 0), 0),
    vat = rows.reduce((s: number, x: any) => s + Number(x.vat_amount || 0), 0),
    paid = rows.reduce(
      (s: number, x: any) => s + Number(x.paid_amount || 0),
      0,
    ),
    outstanding = Math.max(0, total - paid);
  const group = (key: (x: any) => string) =>
    Object.entries(
      rows.reduce((m: any, x: any) => {
        const k = key(x) || "Not set";
        m[k] = (m[k] || 0) + Number(x.total || 0);
        return m;
      }, {}),
    ).sort((a: any, b: any) => b[1] - a[1]);
  const groups: any =
    report === "category"
      ? group((x) => x.category_name || "Uncategorized")
      : report === "branch"
        ? group((x) => x.branch_name || "Head Office")
        : report === "vendor"
          ? group(
              (x) =>
                x.supplier_name || x.vendor || x.employee_name || "Internal",
            )
          : report === "payment"
            ? group((x) => label(x.payment_status))
            : report === "approval"
              ? group((x) => label(x.status))
              : [];
  const budget = categories.reduce(
    (s: number, x: any) => s + Number(x.budget_monthly || 0),
    0,
  );
  const branchOptions = Array.from(
    new Map(
      records
        .filter((x: any) => x.branch_id)
        .map((x: any) => [x.branch_id, x.branch_name || "Branch"]),
    ),
  );
  const aging = [
    ["Not due", rows.filter((x: any) => !x.due_date || x.due_date >= to)],
    [
      "1–30 days",
      rows.filter(
        (x: any) =>
          x.due_date &&
          Math.ceil(
            (new Date(to).getTime() - new Date(x.due_date).getTime()) /
              86400000,
          ) >= 1 &&
          Math.ceil(
            (new Date(to).getTime() - new Date(x.due_date).getTime()) /
              86400000,
          ) <= 30,
      ),
    ],
    [
      "31–60 days",
      rows.filter(
        (x: any) =>
          x.due_date &&
          Math.ceil(
            (new Date(to).getTime() - new Date(x.due_date).getTime()) /
              86400000,
          ) > 30 &&
          Math.ceil(
            (new Date(to).getTime() - new Date(x.due_date).getTime()) /
              86400000,
          ) <= 60,
      ),
    ],
    [
      "60+ days",
      rows.filter(
        (x: any) =>
          x.due_date &&
          Math.ceil(
            (new Date(to).getTime() - new Date(x.due_date).getTime()) /
              86400000,
          ) > 60,
      ),
    ],
  ];
  const exportCsv = () => {
    const data = [
      [
        "Expense Number",
        "Date",
        "Due Date",
        "Type",
        "Description",
        "Category",
        "Branch",
        "Vendor",
        "Approval",
        "Payment",
        "Subtotal",
        "VAT",
        "Total",
        "Paid",
        "Outstanding",
      ],
      ...rows.map((x: any) => [
        x.expense_number,
        x.expense_date,
        x.due_date,
        x.type,
        x.description,
        x.category_name,
        x.branch_name,
        x.supplier_name || x.vendor || x.employee_name,
        x.status,
        x.payment_status,
        x.subtotal,
        x.vat_amount,
        x.total,
        x.paid_amount,
        Number(x.total) - Number(x.paid_amount || 0),
      ]),
    ];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob(
        [
          data
            .map((r) =>
              r
                .map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`)
                .join(","),
            )
            .join("\n"),
        ],
        { type: "text/csv" },
      ),
    );
    a.download = `expense-${report}-${from}-${to}.csv`;
    a.click();
  };
  return (
    <div className="expense-report">
      <section className="nx-card expense-report-controls">
        <div>
          <Field title="Report">
            <select value={report} onChange={(e) => setReport(e.target.value)}>
              <option value="ledger">Detailed Expense Ledger</option>
              <option value="category">Expenses by Category</option>
              <option value="branch">Expenses by Branch</option>
              <option value="vendor">Expenses by Vendor</option>
              <option value="payment">Payment Status Summary</option>
              <option value="approval">Approval Status Summary</option>
              <option value="vat">Input VAT Report</option>
              <option value="budget">Budget vs Actual</option>
              <option value="aging">Outstanding Ageing</option>
              <option value="recurring">Recurring Expense Report</option>
              <option value="supplier">Supplier Payables</option>
            </select>
          </Field>
          <Field title="From">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </Field>
          <Field title="To">
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </Field>
          <Field title="Category">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((x: any) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </Field>
          <Field title="Branch">
            <select value={branch} onChange={(e) => setBranch(e.target.value)}>
              <option value="">All branches</option>
              <option value="head">Head Office</option>
              {branchOptions.map(([id, name]: any) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </Field>
          <Field title="Approval">
            <select
              value={approval}
              onChange={(e) => setApproval(e.target.value)}
            >
              <option value="">All approvals</option>
              {["draft", "pending", "approved", "rejected"].map((x) => (
                  <option key={x} value={x}>{label(x)}</option>
              ))}
            </select>
          </Field>
          <Field title="Payment">
            <select
              value={payment}
              onChange={(e) => setPayment(e.target.value)}
            >
              <option value="">All payments</option>
              {["unpaid", "partial", "paid"].map((x) => (
                  <option key={x} value={x}>{label(x)}</option>
              ))}
            </select>
          </Field>
        </div>
        <aside>
          <button className="btn-nx ghost" onClick={() => window.print()}>
            <i className="ti ti-printer" /> Print / PDF
          </button>
          <button className="btn-nx primary" onClick={exportCsv}>
            <i className="ti ti-file-spreadsheet" /> Export Excel/CSV
          </button>
        </aside>
      </section>
      <div className="nx-stats cols-4 expense-report-stats">
        <div className="nx-stat">
          <div className="nx-stat-body">
            <b className="nx-stat-val">{money(total)}</b>
            <span className="nx-stat-lbl">Total Expense</span>
          </div>
        </div>
        <div className="nx-stat">
          <div className="nx-stat-body">
            <b className="nx-stat-val">{money(paid)}</b>
            <span className="nx-stat-lbl">Paid</span>
          </div>
        </div>
        <div className="nx-stat">
          <div className="nx-stat-body">
            <b className="nx-stat-val">{money(outstanding)}</b>
            <span className="nx-stat-lbl">Outstanding</span>
          </div>
        </div>
        <div className="nx-stat">
          <div className="nx-stat-body">
            <b className="nx-stat-val">{money(vat)}</b>
            <span className="nx-stat-lbl">Recoverable Input VAT</span>
          </div>
        </div>
      </div>
      {groups.length > 0 && (
        <section className="nx-card expense-report-summary">
          <header>
            <div>
              <h3>{label(report)} Summary</h3>
              <p>
                {from} to {to} · {rows.length} records
              </p>
            </div>
            <b>{money(total)}</b>
          </header>
          {groups.map(([name, amount]: any) => (
            <div className="expense-report-line" key={name}>
              <span>{name}</span>
              <i>
                <em
                  style={{
                    width: `${Math.min(100, (Number(amount) / Math.max(1, total)) * 100)}%`,
                  }}
                />
              </i>
              <b>{money(amount)}</b>
              <small>
                {total
                  ? `${((Number(amount) / total) * 100).toFixed(1)}%`
                  : "0%"}
              </small>
            </div>
          ))}
        </section>
      )}
      {report === "budget" && (
        <section className="nx-card expense-report-summary">
          <header>
            <div>
              <h3>Monthly Budget vs Actual</h3>
              <p>Category budgets compared with filtered expenses</p>
            </div>
            <b className={total > budget ? "expense-negative" : ""}>
              {money(total - budget)} variance
            </b>
          </header>
          {categories.map((c: any) => {
            const actual = rows
                .filter((x: any) => x.category_id === c.id)
                .reduce((s: number, x: any) => s + Number(x.total || 0), 0),
              limit = Number(c.budget_monthly || 0),
              pct = limit ? (actual / limit) * 100 : 0;
            return (
              <div className="expense-report-line" key={c.id}>
                <span>{c.name}</span>
                <i>
                  <em
                    className={pct > 100 ? "over" : ""}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </i>
                <b>
                  {money(actual)} / {money(limit)}
                </b>
                <small>{limit ? `${pct.toFixed(0)}%` : "No budget"}</small>
              </div>
            );
          })}
        </section>
      )}
      {report === "aging" && (
        <section className="expense-aging">
          {aging.map(([name, set]: any) => (
            <article className="nx-card" key={name}>
              <span>{name}</span>
              <b>
                {money(
                  set.reduce(
                    (s: number, x: any) =>
                      s +
                      Math.max(0, Number(x.total) - Number(x.paid_amount || 0)),
                    0,
                  ),
                )}
              </b>
              <small>{set.length} expenses</small>
            </article>
          ))}
        </section>
      )}
      {report === "supplier" && (
        <section className="nx-card expense-table">
          <table>
            <thead>
              <tr>
                <th>PO</th>
                <th>Supplier</th>
                <th>Due Date</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Outstanding</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrders.map((x: any) => (
                <tr key={x.id}>
                  <td>
                    <b>{x.po_number}</b>
                  </td>
                  <td>{x.supplier_name}</td>
                  <td>{x.due_date || "—"}</td>
                  <td>{money(x.total)}</td>
                  <td>{money(x.paid_amount)}</td>
                  <td>
                    <b>{money(x.outstanding)}</b>
                  </td>
                  <td>
                    <span className={`nx-badge ${badge(x.payment_status)}`}>
                      {label(x.payment_status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      {report === "recurring" ? (
        <ExpenseTable
          rows={rows.filter((x: any) => x.recurring_frequency)}
          action={{ mutate: () => {} }}
          pay={() => {}}
          readOnly
        />
      ) : report === "vat" ? (
        <section className="nx-card expense-table">
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Date</th>
                <th>Supplier / Vendor</th>
                <th>Description</th>
                <th>Taxable Amount</th>
                <th>VAT</th>
                <th>Gross Total</th>
                <th>Evidence</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .filter((x: any) => Number(x.vat_amount) > 0)
                .map((x: any) => (
                  <tr key={x.id}>
                    <td>{x.reference || x.expense_number}</td>
                    <td>{x.expense_date}</td>
                    <td>{x.supplier_name || x.vendor || "—"}</td>
                    <td>{x.description}</td>
                    <td>{money(x.subtotal)}</td>
                    <td>
                      <b>{money(x.vat_amount)}</b>
                    </td>
                    <td>{money(x.total)}</td>
                    <td>{x.receipt_url ? "Attached" : "Missing"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      ) : (
        report === "ledger" && (
          <ExpenseTable
            rows={rows}
            action={{ mutate: () => {} }}
            pay={() => {}}
            readOnly
          />
        )
      )}
    </div>
  );
}

export default function Expenses({
  initialTab = "dashboard",
}: {
  initialTab?: string;
}) {
  const qc = useQueryClient(),
    { toast } = useToast();
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [modal, setModal] = useState<any>(
      initialTab === "new" ? { type: "new" } : null,
    );
  const from = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .slice(0, 10),
    to = new Date().toISOString().slice(0, 10);
  const tab = initialTab === "new" ? "all" : initialTab;
  const { data: dash = {} } = useQuery<any>({
    queryKey: ["expense-dashboard"],
    queryFn: () =>
      api.get(`/expenses/dashboard?from=${from}&to=${to}`).then((r) => r.data),
  });
  const { data: all = [] } = useQuery<any[]>({
    queryKey: ["expense-list"],
    queryFn: () => api.get("/expenses").then((r) => r.data),
  });
  const { data: cats = [] } = useQuery<any[]>({
    queryKey: ["expense-categories"],
    queryFn: () => api.get("/expenses/categories/list").then((r) => r.data),
  });
  const { data: branches = [] } = useQuery<any[]>({
    queryKey: ["branches"],
    queryFn: () => api.get("/branches").then((r) => r.data),
  });
  const { data: suppliers = [] } = useQuery<any[]>({
    queryKey: ["suppliers"],
    queryFn: () => api.get("/purchasing/suppliers").then((r) => r.data),
  });
  const { data: po = [] } = useQuery<any[]>({
    queryKey: ["expense-suppliers"],
    queryFn: () =>
      api.get("/expenses/supplier-payments/list").then((r) => r.data),
  });
  const action = useMutation({
    mutationFn: ({ id, a }: any) => api.patch(`/expenses/${id}/${a}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expense-list"] });
      qc.invalidateQueries({ queryKey: ["expense-dashboard"] });
      toast("Expense updated");
    },
    onError: (e: any) =>
      toast(e.response?.data?.message || "Action failed", "error"),
  });
  const list = useMemo(
    () =>
      all.filter((x: any) => {
        if (tab === "recurring" && !x.recurring_frequency) return false;
        if (tab === "reimbursements" && x.type !== "reimbursement")
          return false;
        if (tab === "petty" && x.type !== "petty_cash") return false;
        if (tab === "approvals" && x.status !== "pending") return false;
        if (
          tab === "schedule" &&
          (x.status !== "approved" || x.payment_status === "paid")
        )
          return false;
        if (status && x.status !== status) return false;
        return (
          !search ||
          `${x.expense_number} ${x.description} ${x.vendor} ${x.category_name} ${x.branch_name}`
            .toLowerCase()
            .includes(search.toLowerCase())
        );
      }),
    [all, tab, status, search],
  );
  const csv = () => {
    const rows = [
      [
        "Number",
        "Date",
        "Type",
        "Description",
        "Category",
        "Branch",
        "Status",
        "Payment",
        "Subtotal",
        "VAT",
        "Total",
      ],
      ...list.map((x: any) => [
        x.expense_number,
        x.expense_date,
        x.type,
        x.description,
        x.category_name,
        x.branch_name,
        x.status,
        x.payment_status,
        x.subtotal,
        x.vat_amount,
        x.total,
      ]),
    ];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob(
        [
          rows
            .map((r) =>
              r
                .map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`)
                .join(","),
            )
            .join("\n"),
        ],
        { type: "text/csv" },
      ),
    );
    a.download = `expense-report-${to}.csv`;
    a.click();
  };
  return (
    <div className="expense-page">
      <div className="nx-page-head">
        <div>
          <h1 className="nx-page-title">
            {headings[initialTab] || "Expense Management"}
          </h1>
          <p className="nx-page-sub">
            Company expenses, approvals, supplier dues, reimbursements, petty
            cash and VAT evidence.
          </p>
        </div>
        <div className="expense-head">
          {tab === "reports" && (
            <>
              <button className="btn-nx ghost" onClick={() => window.print()}>
                <i className="ti ti-printer" /> Print / PDF
              </button>
              <button className="btn-nx primary" onClick={csv}>
                <i className="ti ti-file-spreadsheet" /> Export Report
              </button>
            </>
          )}
          {tab === "categories" && (
            <button
              className="btn-nx primary"
              onClick={() => setModal({ type: "category" })}
            >
              <i className="ti ti-plus" /> New Category
            </button>
          )}
          {tab === "suppliers" && (
            <button className="btn-nx ghost" onClick={csv}>
              <i className="ti ti-download" /> Export Payables
            </button>
          )}
          {[
            "dashboard",
            "all",
            "recurring",
            "reimbursements",
            "petty",
          ].includes(tab) && (
            <button
              className="btn-nx primary"
              onClick={() =>
                setModal({
                  type: "new",
                  kind:
                    tab === "reimbursements"
                      ? "reimbursement"
                      : tab === "petty"
                        ? "petty_cash"
                        : "general",
                })
              }
            >
              <i className="ti ti-plus" />{" "}
              {tab === "recurring"
                ? "New Recurring Expense"
                : tab === "reimbursements"
                  ? "New Reimbursement"
                  : tab === "petty"
                    ? "Add Petty Cash Entry"
                    : "New Expense"}
            </button>
          )}
        </div>
      </div>
      {tab === "approvals" && (
        <div className="expense-guide">
          <i className="ti ti-checklist" />
          <div>
            <b>Approval Queue</b>
            <span>
              Use the green check or red cross in each row to approve or reject
              submitted expenses.
            </span>
          </div>
        </div>
      )}
      {tab === "schedule" && (
        <div className="expense-guide">
          <i className="ti ti-calendar-dollar" />
          <div>
            <b>Payment Schedule</b>
            <span>
              Only approved unpaid expenses appear here. Use the cash button in
              Actions to record full or partial payment.
            </span>
          </div>
        </div>
      )}
      {tab === "suppliers" && (
        <div className="expense-guide">
          <i className="ti ti-building-bank" />
          <div>
            <b>Supplier Payments</b>
            <span>
              Supplier invoices come directly from Purchasing. Use Pay Supplier
              against the relevant purchase order.
            </span>
          </div>
        </div>
      )}
      {tab === "recurring" && (
        <div className="expense-guide">
          <i className="ti ti-repeat" />
          <div>
            <b>Recurring Expenses</b>
            <span>
              Create rent, utilities or subscriptions and select weekly,
              monthly, quarterly or yearly frequency.
            </span>
          </div>
        </div>
      )}
      {tab === "dashboard" && (
        <>
          <div className="nx-stats cols-4 expense-stats">
            {[
              [dash.total_expenses, "Month Expenses", "ti-receipt", "red"],
              [dash.outstanding, "Outstanding", "ti-clock", "amber"],
              [
                dash.pending_approvals,
                "Pending Approval",
                "ti-checklist",
                "indigo",
              ],
              [dash.input_vat, "Input VAT", "ti-file-invoice", "green"],
            ].map((x: any, i) => (
              <div className="nx-stat" key={i}>
                <div className={`nx-stat-icon ${x[3]}`}>
                  <i className={`ti ${x[2]}`} />
                </div>
                <div className="nx-stat-body">
                  <b className="nx-stat-val">
                    {i === 2 ? Number(x[0] || 0) : money(x[0])}
                  </b>
                  <span className="nx-stat-lbl">{x[1]}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="expense-dash">
            <section className="nx-card">
              <header>
                <h3>Spend by Category</h3>
                <span>This month</span>
              </header>
              {(dash.by_category || []).map((x: any) => (
                <div className="expense-progress" key={x.name}>
                  <div>
                    <span>{x.name}</span>
                    <b>{money(x.amount)}</b>
                  </div>
                  <i>
                    <em
                      style={{
                        width: `${Math.min(100, (Number(x.amount) / Math.max(1, Number(dash.total_expenses))) * 100)}%`,
                      }}
                    />
                  </i>
                </div>
              ))}
              {!(dash.by_category || []).length && <Empty />}
            </section>
            <section className="nx-card">
              <header>
                <h3>Branch Cost Centres</h3>
                <span>Company view</span>
              </header>
              {(dash.by_branch || []).map((x: any) => (
                <div className="expense-branch" key={x.name}>
                  <span>
                    <i className="ti ti-building-store" />
                    {x.name}
                  </span>
                  <b>{money(x.amount)}</b>
                </div>
              ))}
              {!(dash.by_branch || []).length && <Empty />}
            </section>
          </div>
        </>
      )}
      {tab === "suppliers" ? (
        <SupplierTable
          rows={po}
          search={search}
          setSearch={setSearch}
          pay={(x: any) => setModal({ type: "paySupplier", item: x })}
        />
      ) : tab === "categories" ? (
        <div className="expense-cats">
          {cats.map((x: any) => (
            <article className="nx-card" key={x.id}>
              <i className="ti ti-category" />
              <div>
                <h3>{x.name}</h3>
                <p>{x.code || label(x.type)}</p>
              </div>
              <dl>
                <span>
                  <dt>This month</dt>
                  <dd>{money(x.actual)}</dd>
                </span>
                <span>
                  <dt>Budget</dt>
                  <dd>{money(x.budget_monthly)}</dd>
                </span>
              </dl>
            </article>
          ))}
        </div>
      ) : tab === "reports" ? (
        <ReportView records={all} categories={cats} purchaseOrders={po} />
      ) : (
        tab !== "dashboard" && (
          <>
            <div className="expense-toolbar">
              <div>
                <i className="ti ti-search" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search expense, vendor or branch…"
                />
              </div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <ExpenseTable
              rows={list}
              action={action}
              pay={(x: any) => setModal({ type: "pay", item: x })}
            />
          </>
        )
      )}
      {modal?.type === "new" && (
        <CreateExpense
          kind={modal.kind}
          categories={cats}
          branches={branches}
          suppliers={suppliers}
          close={() => setModal(null)}
        />
      )}{" "}
      {modal?.type === "category" && (
        <CreateCategory close={() => setModal(null)} />
      )}{" "}
      {modal?.type === "pay" && (
        <Pay item={modal.item} close={() => setModal(null)} />
      )}{" "}
      {modal?.type === "paySupplier" && (
        <Pay item={modal.item} supplier close={() => setModal(null)} />
      )}
    </div>
  );
}

function Empty() {
  return (
    <div className="expense-empty">
      <i className="ti ti-receipt-off" />
      No expense data yet
    </div>
  );
}
function ExpenseTable({ rows, action, pay, readOnly = false }: any) {
  return (
    <section className="nx-card expense-table">
      <table>
        <thead>
          <tr>
            <th>Expense</th>
            <th>Date / Due</th>
            <th>Payee & Category</th>
            <th>Branch</th>
            <th>Total</th>
            <th>Payment</th>
            <th>Approval</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((x: any) => (
              <tr key={x.id}>
                <td>
                  <b>{x.expense_number}</b>
                  <small>{x.description}</small>
                </td>
                <td>
                  <b>{new Date(x.expense_date).toLocaleDateString()}</b>
                  <small>
                    Due{" "}
                    {x.due_date
                      ? new Date(x.due_date).toLocaleDateString()
                      : "—"}
                  </small>
                </td>
                <td>
                  <b>
                    {x.supplier_name ||
                      x.vendor ||
                      x.employee_name ||
                      "Internal"}
                  </b>
                  <small>{x.category_name || label(x.type)}</small>
                </td>
                <td>{x.branch_name || "Head Office"}</td>
                <td>
                  <b>{money(x.total)}</b>
                  <small>VAT {money(x.vat_amount)}</small>
                </td>
                <td>
                  <span className={`nx-badge ${badge(x.payment_status)}`}>
                    {label(x.payment_status)}
                  </span>
                  <small>
                    {money(Number(x.total) - Number(x.paid_amount || 0))} due
                  </small>
                </td>
                <td>
                  <span className={`nx-badge ${badge(x.status)}`}>
                    {label(x.status)}
                  </span>
                </td>
                <td>
                  {!readOnly && <div className="expense-actions">
                    {["draft", "rejected"].includes(x.status) && (
                      <button
                        title="Submit"
                        onClick={() => action.mutate({ id: x.id, a: "submit" })}
                      >
                        <i className="ti ti-send" />
                      </button>
                    )}
                    {x.status === "pending" && (
                      <>
                        <button
                          title="Approve"
                          onClick={() =>
                            action.mutate({ id: x.id, a: "approve" })
                          }
                        >
                          <i className="ti ti-check" />
                        </button>
                        <button
                          className="danger"
                          title="Reject"
                          onClick={() =>
                            action.mutate({ id: x.id, a: "reject" })
                          }
                        >
                          <i className="ti ti-x" />
                        </button>
                      </>
                    )}
                    {x.status === "approved" && x.payment_status !== "paid" && (
                      <button title="Pay" onClick={() => pay(x)}>
                        <i className="ti ti-cash" />
                      </button>
                    )}
                  </div>}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={8}>
                <Empty />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
function SupplierTable({ rows, search, setSearch, pay }: any) {
  const shown = rows.filter(
    (x: any) =>
      !search ||
      `${x.po_number} ${x.supplier_name}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="expense-toolbar">
        <div>
          <i className="ti ti-search" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search supplier or PO…"
          />
        </div>
      </div>
      <section className="nx-card expense-table">
        <table>
          <thead>
            <tr>
              <th>PO</th>
              <th>Supplier</th>
              <th>Due Date</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Outstanding</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((x: any) => (
              <tr key={x.id}>
                <td>
                  <b>{x.po_number}</b>
                </td>
                <td>{x.supplier_name}</td>
                <td>
                  {x.due_date ? new Date(x.due_date).toLocaleDateString() : "—"}
                </td>
                <td>{money(x.total)}</td>
                <td>{money(x.paid_amount)}</td>
                <td>
                  <b>{money(x.outstanding)}</b>
                </td>
                <td>
                  <span className={`nx-badge ${badge(x.payment_status)}`}>
                    {label(x.payment_status)}
                  </span>
                </td>
                <td>
                  {x.payment_status !== "paid" && (
                    <button
                      className="btn-nx primary sm"
                      onClick={() => pay(x)}
                    >
                      Pay Supplier
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
