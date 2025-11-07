import React, { useMemo, useEffect } from 'react';
import { Invoice, Template, User } from '../types';
import { Button } from './common/Button';
import { DEFAULT_TEMPLATE } from '../constants';

interface InvoiceViewProps {
  invoice: Invoice;
  templates: Template[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  printOnLoad?: boolean;
  onPrintComplete?: () => void;
  users: User[];
}

const ModernHeader: React.FC<{ invoice: Invoice; template: Template }> = ({ invoice, template }) => (
    <div className="flex justify-between items-start mb-10">
        <div>
            {invoice.billFrom.logoUrl && <img src={invoice.billFrom.logoUrl} alt="Company Logo" className="h-16 mb-4 max-w-xs object-contain" />}
            <h1 className="text-4xl font-bold" style={{ color: template.accentColor }}>{invoice.invoiceNumber}</h1>
            <p className="text-gray-500 dark:text-gray-400">Issued: {new Date(invoice.issueDate).toLocaleDateString()}</p>
        </div>
        <div className="text-right">
            <h2 className="text-2xl font-semibold">{invoice.billFrom.name}</h2>
            <p className="whitespace-pre-line">{invoice.billFrom.address}</p>
            <p>{invoice.billFrom.email}</p>
        </div>
    </div>
);

const ClassicHeader: React.FC<{ invoice: Invoice; template: Template }> = ({ invoice, template }) => (
    <div className="mb-10">
        <div className="flex justify-between items-center pb-6 border-b-2" style={{ borderColor: template.accentColor }}>
            {invoice.billFrom.logoUrl ? 
                <img src={invoice.billFrom.logoUrl} alt="Company Logo" className="h-20 max-w-xs object-contain" /> :
                <div>
                    <h2 className="text-3xl font-bold">{invoice.billFrom.name}</h2>
                    <p className="text-gray-500 dark:text-gray-400">{invoice.billFrom.email}</p>
                </div>
            }
            <div className="text-right">
                <h1 className="text-5xl font-bold" style={{ color: template.accentColor }}>INVOICE</h1>
            </div>
        </div>
        <div className="flex justify-between pt-6">
             <div className="text-left">
                <p className="text-gray-500 dark:text-gray-400">From:</p>
                <p className="whitespace-pre-line">{invoice.billFrom.address}</p>
            </div>
            <div className="text-right">
                <p><span className="font-semibold">Invoice Number:</span> {invoice.invoiceNumber}</p>
                <p><span className="font-semibold">Issue Date:</span> {new Date(invoice.issueDate).toLocaleDateString()}</p>
            </div>
        </div>
    </div>
);

const InvoiceView: React.FC<InvoiceViewProps> = ({ invoice, templates, onClose, onEdit, onDelete, printOnLoad, onPrintComplete, users }) => {
  const template = templates.find(t => t.id === invoice.templateId) || templates.find(t=> t.isDefault) || DEFAULT_TEMPLATE;
  
  const subtotal = useMemo(() => 
    invoice.lineItems.reduce((acc, item) => acc + item.quantity * item.price, 0),
    [invoice.lineItems]
  );
  
  const total = useMemo(() => subtotal, [subtotal]);

  const createdBy = useMemo(() => {
      return users.find(u => u.id === invoice.createdById)?.name || 'Unknown User';
  }, [invoice, users]);

  const accentStyle = { color: template.accentColor };

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    if (printOnLoad) {
      // Use a timeout to allow the component to render fully before printing.
      const timer = setTimeout(() => {
        handlePrint();
        if (onPrintComplete) {
          onPrintComplete();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [printOnLoad, onPrintComplete]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start pt-10 overflow-y-auto z-50 invoice-view-modal">
      <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg shadow-2xl w-full max-w-4xl mx-4 my-8 relative invoice-view-content">
        {/* Actions */}
        <div className="absolute top-4 right-4 flex gap-2 print:hidden">
            <Button onClick={onEdit} variant="secondary" className="text-sm px-3 py-1">Edit</Button>
            <Button onClick={() => { if(confirm('Are you sure you want to delete this invoice?')) onDelete(); }} variant="danger" className="text-sm px-3 py-1">Delete</Button>
            <Button onClick={handlePrint} variant="primary" className="text-sm px-3 py-1">Print</Button>
            <Button onClick={onClose} variant="ghost" className="text-sm px-3 py-1">Close</Button>
        </div>
        
        <div className="p-8 md:p-12" id="invoice-to-print">
            {template.layout === 'classic' ? <ClassicHeader invoice={invoice} template={template} /> : <ModernHeader invoice={invoice} template={template} />}

            {/* Customer Info */}
            <div className="mb-10">
                <h3 className="text-sm font-semibold uppercase text-gray-500 mb-2">Bill To</h3>
                <p className="text-lg font-bold">{invoice.billTo.name}</p>
                <p className="whitespace-pre-line">{invoice.billTo.address}</p>
            </div>

            {/* Line Items Table */}
            <div className="w-full overflow-x-auto">
                <table className="w-full text-left">
                    <thead style={{ backgroundColor: `${template.accentColor}20` /* 12.5% opacity */}}>
                        <tr>
                            <th className="p-3 text-sm font-semibold uppercase" style={accentStyle}>Item</th>
                            <th className="p-3 text-sm font-semibold uppercase text-center w-20" style={accentStyle}>Qty</th>
                            <th className="p-3 text-sm font-semibold uppercase text-right w-28" style={accentStyle}>Price</th>
                            <th className="p-3 text-sm font-semibold uppercase text-right w-32" style={accentStyle}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoice.lineItems.map(item => (
                            <tr key={item.id} className="border-b border-gray-200 dark:border-gray-700">
                                <td className="py-3 px-2">
                                    <p className="font-medium">{item.product.name}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{item.product.description}</p>
                                </td>
                                <td className="py-3 px-2 text-center">{item.quantity}</td>
                                <td className="py-3 px-2 text-right">${item.price.toFixed(2)}</td>
                                <td className="py-3 px-2 text-right font-semibold">${(item.quantity * item.price).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mt-8">
                <div className="w-full max-w-sm">
                    <div className="flex justify-between py-2">
                        <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                        <span className="font-medium">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-3 mt-2" style={{ borderTop: `2px solid ${template.accentColor}` }}>
                        <span className="text-xl font-bold">Total</span>
                        <span className="text-xl font-bold" style={accentStyle}>${total.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Notes and Submitted By */}
             <div className="mt-10 flex justify-between items-end">
                {invoice.notes && (
                    <div>
                        <h4 className="text-sm font-semibold uppercase text-gray-500 mb-2">Notes</h4>
                        <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">{invoice.notes}</p>
                    </div>
                )}
                <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                    <p>Submitted by: <strong>{createdBy}</strong></p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceView;