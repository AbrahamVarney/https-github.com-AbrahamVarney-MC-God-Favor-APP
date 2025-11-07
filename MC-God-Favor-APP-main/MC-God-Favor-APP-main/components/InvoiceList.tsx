import React from 'react';
import { Invoice, User } from '../types';

interface InvoiceListProps {
  invoices: Invoice[];
  onSelectInvoice: (invoice: Invoice) => void;
  users: User[];
  totalInvoiceCount: number;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({ invoices, onSelectInvoice, users, totalInvoiceCount }) => {
    if (invoices.length === 0) {
        return (
            <div className="text-center py-16 px-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                {totalInvoiceCount > 0 ? (
                    <>
                        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">No Matching Invoices</h3>
                        <p className="text-gray-500 mt-2">Try adjusting your search criteria.</p>
                    </>
                ) : (
                    <>
                        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">No Invoices Found</h3>
                        <p className="text-gray-500 mt-2">Click "Create New Invoice" to get started.</p>
                    </>
                )}
            </div>
        );
    }

    const sortedInvoices = [...invoices].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const getUserName = (userId: string) => {
        return users.find(u => u.id === userId)?.name || 'Unknown';
    }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-gray-700 dark:text-gray-300">
                <thead className="bg-gray-50 dark:bg-gray-700 text-sm text-gray-500 uppercase">
                    <tr>
                        <th className="p-4 font-semibold">Invoice #</th>
                        <th className="p-4 font-semibold">Client</th>
                        <th className="p-4 font-semibold">Issue Date</th>
                        <th className="p-4 font-semibold">Submitted By</th>
                        <th className="p-4 font-semibold text-right">Amount</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {sortedInvoices.map(invoice => {
                        const total = invoice.lineItems.reduce((acc, item) => acc + item.quantity * item.price, 0);
                        return (
                            <tr key={invoice.id} onClick={() => onSelectInvoice(invoice)} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors duration-200">
                                <td className="p-4 font-mono text-primary">{invoice.invoiceNumber}</td>
                                <td className="p-4 font-medium">{invoice.billTo.name}</td>
                                <td className="p-4">{new Date(invoice.issueDate).toLocaleDateString()}</td>
                                <td className="p-4">{getUserName(invoice.createdById)}</td>
                                <td className="p-4 text-right font-semibold">${total.toFixed(2)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    </div>
  );
};