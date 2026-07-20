export type Lang = 'en' | 'ar';

export const t: Record<string, Record<Lang, string>> = {
  // Nav
  dashboard:   { en: 'Dashboard',   ar: 'لوحة التحكم' },
  pos:         { en: 'Point of Sale', ar: 'نقطة البيع' },
  products:    { en: 'Products',    ar: 'المنتجات' },
  inventory:   { en: 'Inventory',   ar: 'المخزون' },
  customers:   { en: 'Customers',   ar: 'العملاء' },
  purchasing:  { en: 'Purchasing',  ar: 'المشتريات' },
  hr:          { en: 'HR & Staff',  ar: 'الموارد البشرية' },
  finance:     { en: 'Finance',     ar: 'المالية' },
  reports:     { en: 'Reports',     ar: 'التقارير' },
  settings:    { en: 'Settings',    ar: 'الإعدادات' },
  logout:      { en: 'Logout',      ar: 'تسجيل الخروج' },
  // Auth
  login:       { en: 'Login',       ar: 'تسجيل الدخول' },
  email:       { en: 'Email',       ar: 'البريد الإلكتروني' },
  password:    { en: 'Password',    ar: 'كلمة المرور' },
  welcome:     { en: 'Welcome back', ar: 'مرحباً بعودتك' },
  // Dashboard
  todaySales:  { en: "Today's Sales", ar: 'مبيعات اليوم' },
  monthSales:  { en: 'This Month',  ar: 'هذا الشهر' },
  invValue:    { en: 'Inventory Value', ar: 'قيمة المخزون' },
  customers_:  { en: 'Total Customers', ar: 'إجمالي العملاء' },
  orders:      { en: 'Orders',      ar: 'الطلبات' },
  revenue:     { en: 'Revenue',     ar: 'الإيرادات' },
  discounts:   { en: 'Discounts',   ar: 'الخصومات' },
  // POS
  search:      { en: 'Search products…', ar: 'ابحث عن المنتجات…' },
  cart:        { en: 'Cart',        ar: 'السلة' },
  total:       { en: 'Total',       ar: 'الإجمالي' },
  subtotal:    { en: 'Subtotal',    ar: 'المجموع الفرعي' },
  vat:         { en: 'VAT 15%',     ar: 'ضريبة القيمة المضافة 15%' },
  pay:         { en: 'Pay',         ar: 'ادفع' },
  cash:        { en: 'Cash',        ar: 'نقداً' },
  card:        { en: 'Card',        ar: 'بطاقة' },
  clearCart:   { en: 'Clear',       ar: 'مسح' },
  qty:         { en: 'Qty',         ar: 'الكمية' },
  price:       { en: 'Price',       ar: 'السعر' },
  sar:         { en: 'SAR',         ar: 'ر.س' },
  // Common
  add:         { en: 'Add',         ar: 'إضافة' },
  save:        { en: 'Save',        ar: 'حفظ' },
  cancel:      { en: 'Cancel',      ar: 'إلغاء' },
  edit:        { en: 'Edit',        ar: 'تعديل' },
  delete:      { en: 'حذف',         ar: 'حذف' },
  name:        { en: 'Name',        ar: 'الاسم' },
  status:      { en: 'Status',      ar: 'الحالة' },
  actions:     { en: 'Actions',     ar: 'الإجراءات' },
  loading:     { en: 'Loading…',    ar: 'جار التحميل…' },
  noData:      { en: 'No data found', ar: 'لا توجد بيانات' },
  sku:         { en: 'SKU',         ar: 'رمز المنتج' },
  category:    { en: 'Category',    ar: 'الفئة' },
  brand:       { en: 'Brand',       ar: 'العلامة التجارية' },
  warehouse:   { en: 'Warehouse',   ar: 'المستودع' },
  supplier:    { en: 'Supplier',    ar: 'المورد' },
  date:        { en: 'Date',        ar: 'التاريخ' },
  amount:      { en: 'Amount',      ar: 'المبلغ' },
  phone:       { en: 'Phone',       ar: 'الهاتف' },
  lowStock:    { en: 'Low Stock Alerts', ar: 'تنبيهات المخزون المنخفض' },
  openPOs:     { en: 'Open Purchase Orders', ar: 'أوامر الشراء المفتوحة' },
};

export function tr(key: string, lang: Lang): string {
  return t[key]?.[lang] ?? key;
}
