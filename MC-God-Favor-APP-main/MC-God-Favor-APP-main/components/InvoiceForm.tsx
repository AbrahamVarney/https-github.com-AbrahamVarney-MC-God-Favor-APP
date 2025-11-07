import React, { useState, useMemo } from 'react';
import { Invoice, LineItem, Customer, Product, Template, BusinessProfile, User } from '../types';
import { Button } from './common/Button';
import { DEFAULT_TEMPLATE } from '../constants';

interface InvoiceFormProps {
  onSave: (invoice: Invoice) => void;
  onCancel: () => void;
  invoiceToEdit?: Invoice | null;
  products: Product[];
  templates: Template[];
  invoices: Invoice[];
  onAddNewProduct: (productName: string) => Product;
  businessProfile: BusinessProfile;
  users: User[];
  currentUser: User;
}

interface ProductSelectorProps {
    products: Product[];
    onSelect: (product: Product) => void;
    onAddNewProduct: (productName: string) => Product;
}

const ProductSelector: React.FC<ProductSelectorProps> = ({ products, onSelect, onAddNewProduct }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const filteredProducts = useMemo(() =>
        products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())),
        [products, searchTerm]
    );
    
    const handleAddNew = () => {
        if (searchTerm.trim() === '') return;
        const newProduct = onAddNewProduct(searchTerm);
        onSelect(newProduct);
        setSearchTerm('');
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                placeholder="Search for a product or add a new one..."
                className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {isOpen && (
                <ul className="absolute z-10 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
                    {filteredProducts.map(product => (
                        <li
                            key={product.id}
                            className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                            onMouseDown={() => {
                                onSelect(product);
                                setSearchTerm('');
                                setIsOpen(false);
                            }}
                        >
                            <p className="font-semibold">{product.name}</p>
                        </li>
                    ))}
                    {filteredProducts.length === 0 && searchTerm.trim() !== '' && (
                        <li
                            className="px-4 py-2 cursor-pointer text-secondary hover:bg-emerald-50 dark:hover:bg-emerald-900/50"
                            onMouseDown={handleAddNew}
                        >
                            <p className="font-semibold flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                                Add new item: "{searchTerm}"
                            </p>
                        </li>
                    )}
                </ul>
            )}
        </div>
    );
};


const InvoiceForm: React.FC<InvoiceFormProps> = ({ onSave, onCancel, invoiceToEdit, products, templates, invoices, onAddNewProduct, businessProfile, users, currentUser }) => {
  
  const getNewInvoiceTemplate = (): Omit<Invoice, 'paid'> => {
      const defaultTemplate = templates.find(t => t.isDefault) || templates[0] || DEFAULT_TEMPLATE;
      
      let nextInvoiceNumber = 1;
      if (invoices && invoices.length > 0) {
        const invoiceNumbers = invoices.map(inv => {
            const numPart = inv.invoiceNumber.replace(/[^0-9]/g, '');
            return numPart ? parseInt(numPart, 10) : 0;
        });
        const maxNumber = Math.max(0, ...invoiceNumbers);
        nextInvoiceNumber = maxNumber + 1;
      }
      
      const formattedInvoiceNumber = String(nextInvoiceNumber).padStart(3, '0');

      return {
          id: `INV-${Date.now()}`,
          invoiceNumber: `#${formattedInvoiceNumber}`,
          issueDate: new Date().toISOString().split('T')[0],
          billFrom: { 
              name: businessProfile.name, 
              email: businessProfile.email, 
              address: businessProfile.address,
              logoUrl: businessProfile.logoUrl
          },
          billTo: { name: '', address: '' },
          lineItems: [],
          notes: defaultTemplate.defaultNotes,
          createdAt: new Date().toISOString(),
          templateId: defaultTemplate.id,
          createdById: currentUser.id,
      };
  };
  
  const [invoice, setInvoice] = useState<Omit<Invoice, 'paid'>>(invoiceToEdit || getNewInvoiceTemplate());

  const handleCustomerChange = (party: 'billFrom' | 'billTo', field: keyof Customer, value: string) => {
    setInvoice(prev => ({ ...prev, [party]: { ...prev[party], [field]: value } }));
  };

  const handleLineItemChange = (index: number, field: keyof LineItem, value: any) => {
    const updatedLineItems = [...invoice.lineItems];
    (updatedLineItems[index] as any)[field] = value;
    setInvoice(prev => ({ ...prev, lineItems: updatedLineItems }));
  };
  
  const addLineItemFromProduct = (product: Product) => {
      const newLineItem: LineItem = {
          id: `LI-${Date.now()}`,
          product: product,
          quantity: 1,
          price: 0,
      };
      setInvoice(prev => ({ ...prev, lineItems: [...prev.lineItems, newLineItem] }));
  };
  
  const removeLineItem = (index: number) => {
    setInvoice(prev => ({ ...prev, lineItems: prev.lineItems.filter((_, i) => i !== index) }));
  };

  const subtotal = useMemo(() => 
    invoice.lineItems.reduce((acc, item) => acc + item.quantity * item.price, 0),
    [invoice.lineItems]
  );
  
  const total = useMemo(() => subtotal, [subtotal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(invoice as Invoice);
  };
  
  return (
    <div className="p-4 md:p-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl text-gray-800 dark:text-gray-200 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-primary mb-6">{invoiceToEdit ? 'Edit Invoice' : 'Create New Invoice'}</h2>
      <form onSubmit={handleSubmit}>
        {/* Invoice Header */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <input type="text" value={invoice.invoiceNumber} readOnly className="text-xl font-mono p-2 bg-gray-100 dark:bg-gray-700 rounded-md"/>
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-500">Issue Date</label>
                    <input type="date" value={invoice.issueDate} onChange={e => setInvoice({...invoice, issueDate: e.target.value})} className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-md border border-gray-300 dark:border-gray-600" />
                </div>
            </div>
        </div>
        
        {/* Customer Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
                <h3 className="font-bold text-lg mb-2 border-b pb-2 border-gray-200 dark:border-gray-700">Bill From</h3>
                <input value={invoice.billFrom.name} onChange={e => handleCustomerChange('billFrom', 'name', e.target.value)} placeholder="Your Name/Company" className="w-full mb-2 bg-transparent p-1 border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-primary" />
                <input value={invoice.billFrom.email} onChange={e => handleCustomerChange('billFrom', 'email', e.target.value)} placeholder="Your Email" className="w-full mb-2 bg-transparent p-1 border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-primary" />
                <textarea value={invoice.billFrom.address} onChange={e => handleCustomerChange('billFrom', 'address', e.target.value)} placeholder="Your Address" rows={3} className="w-full bg-transparent p-1 border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-primary" />
            </div>
            <div>
                <h3 className="font-bold text-lg mb-2 border-b pb-2 border-gray-200 dark:border-gray-700">Bill To</h3>
                <input value={invoice.billTo.name} onChange={e => handleCustomerChange('billTo', 'name', e.target.value)} placeholder="Client's Name/Company" className="w-full mb-2 bg-transparent p-1 border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-primary" required/>
                <textarea value={invoice.billTo.address} onChange={e => handleCustomerChange('billTo', 'address', e.target.value)} placeholder="Client's Address" rows={3} className="w-full bg-transparent p-1 border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-primary" required/>
            </div>
        </div>

        {/* Line Items */}
        <div className="mb-8">
            <h3 className="font-bold text-lg mb-2">Items</h3>
            <div className="w-full overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-100 dark:bg-gray-700 text-left text-sm text-gray-500 uppercase">
                        <tr>
                            <th className="p-3 font-semibold">Item</th>
                            <th className="p-3 font-semibold w-24">Qty</th>
                            <th className="p-3 font-semibold w-32">Price</th>
                            <th className="p-3 font-semibold w-32 text-right">Total</th>
                            <th className="p-3 w-12"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoice.lineItems.map((item, index) => (
                            <tr key={item.id} className="border-b border-gray-200 dark:border-gray-700">
                                <td className="p-2">
                                  <p className="font-semibold">{item.product.name}</p>
                                  <p className="text-sm text-gray-500">{item.product.description}</p>
                                </td>
                                <td className="p-2"><input type="number" min="1" value={item.quantity} onChange={e => handleLineItemChange(index, 'quantity', parseInt(e.target.value) || 1)} className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-md" /></td>
                                <td className="p-2"><input type="number" step="0.01" value={item.price} onChange={e => handleLineItemChange(index, 'price', parseFloat(e.target.value) || 0)} className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-md" /></td>
                                <td className="p-2 text-right font-medium">${(item.quantity * item.price).toFixed(2)}</td>
                                <td className="p-2 text-center"><Button type="button" variant="danger" onClick={() => removeLineItem(index)} className="px-2 py-1 text-sm">X</Button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-4">
                <ProductSelector products={products} onSelect={addLineItemFromProduct} onAddNewProduct={onAddNewProduct} />
            </div>
        </div>

        {/* Totals and Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
                 <div className="mb-4">
                    <label htmlFor="template" className="block text-sm font-medium text-gray-500 mb-1">Invoice Template</label>
                    <select
                        id="template"
                        value={invoice.templateId}
                        onChange={e => setInvoice(prev => ({...prev, templateId: e.target.value}))}
                        className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-md border border-gray-300 dark:border-gray-600"
                    >
                        {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                 <div className="mb-4">
                    <label htmlFor="user" className="block text-sm font-medium text-gray-500 mb-1">Submitted By</label>
                    <input
                        id="user"
                        type="text"
                        value={currentUser.name}
                        readOnly
                        className="w-full bg-gray-200 dark:bg-gray-600 p-2 rounded-md border border-gray-300 dark:border-gray-500 cursor-not-allowed"
                    />
                </div>
                <label className="block text-sm font-medium text-gray-500">Notes</label>
                <textarea value={invoice.notes} onChange={e => setInvoice({ ...invoice, notes: e.target.value })} rows={3} className="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-md border border-gray-300 dark:border-gray-600"></textarea>
            </div>
            <div className="flex flex-col items-end">
                <div className="w-full max-w-xs space-y-2">
                    <div className="flex justify-between"><span>Subtotal:</span><span>${subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between text-xl font-bold border-t pt-2 mt-2 border-gray-300 dark:border-gray-600"><span>Total:</span><span>${total.toFixed(2)}</span></div>
                </div>
            </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 mt-8">
          <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button type="submit" variant="primary">Save And Print Invoice</Button>
        </div>
      </form>
    </div>
  );
};

export default InvoiceForm;