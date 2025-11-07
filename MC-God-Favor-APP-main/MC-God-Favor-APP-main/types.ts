export interface Product {
  id: string;
  name: string;
  description: string;
}

export interface Customer {
  name: string;
  email?: string;
  address: string;
  logoUrl?: string;
}

export interface BusinessProfile {
  name: string;
  email: string;
  address: string;
  logoUrl?: string;
}

export interface LineItem {
  id: string;
  product: Product;
  quantity: number;
  price: number; // Price can be overridden from product price
}

export interface Template {
  id:string;
  name: string;
  isDefault: boolean;
  accentColor: string;
  defaultNotes: string;
  layout: 'modern' | 'classic';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
}

export interface Invoice {
  id:string;
  invoiceNumber: string;
  issueDate: string;
  billFrom: Customer;
  billTo: Customer;
  lineItems: LineItem[];
  notes: string;
  createdAt: string;
  templateId: string;
  createdById: string;
}