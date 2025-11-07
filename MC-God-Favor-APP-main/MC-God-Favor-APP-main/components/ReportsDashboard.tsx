import React, { useMemo, useState } from 'react';
import { Invoice } from '../types';

interface ReportItem {
  customers: Set<string>;
  invoiceCount: number;
  totalBilled: number;
}

interface ReportRow extends ReportItem {
    date: string;
    uniqueCustomers: number;
}

const ReportsTable: React.FC<{ reports: ReportRow[], isMonthly?: boolean }> = ({ reports, isMonthly = false }) => {
    const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
    const formatMonth = (monthKey: string) => {
        const [year, month] = monthKey.split('-');
        return new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    };

    if (reports.length === 0) {
        return <p className="text-gray-500 dark:text-gray-400 mt-4 text-center">No historical data to display for this period.</p>;
    }

    return (
        <div className="w-full overflow-x-auto mt-4">
            <table className="w-full text-left text-gray-700 dark:text-gray-300">
                <thead className="bg-gray-50 dark:bg-gray-700 text-sm text-gray-500 uppercase">
                    <tr>
                        <th className="p-3 font-semibold">{isMonthly ? 'Month' : 'Date'}</th>
                        <th className="p-3 font-semibold text-center">Invoices</th>
                        <th className="p-3 font-semibold text-center">Unique Customers</th>
                        <th className="p-3 font-semibold text-right">Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {reports.map(report => (
                        <tr key={report.date}>
                            <td className="p-3 font-medium">{isMonthly ? formatMonth(report.date) : new Date(report.date).toLocaleDateString()}</td>
                            <td className="p-3 text-center">{report.invoiceCount}</td>
                            <td className="p-3 text-center">{report.uniqueCustomers}</td>
                            <td className="p-3 text-right font-semibold">{formatCurrency(report.totalBilled)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export const ReportsDashboard: React.FC<{ invoices: Invoice[] }> = ({ invoices }) => {
    const [activeTab, setActiveTab] = useState<'daily' | 'monthly'>('daily');

    const reports = useMemo(() => {
        const daily = new Map<string, ReportItem>();
        const monthly = new Map<string, ReportItem>();

        invoices.forEach(invoice => {
            const issueDate = new Date(invoice.issueDate + 'T00:00:00'); // Ensure date is parsed in local timezone
            const dayKey = invoice.issueDate;
            const monthKey = `${issueDate.getFullYear()}-${String(issueDate.getMonth() + 1).padStart(2, '0')}`;
            const invoiceTotal = invoice.lineItems.reduce((acc, item) => acc + item.quantity * item.price, 0);

            // Daily
            if (!daily.has(dayKey)) {
                daily.set(dayKey, { customers: new Set(), invoiceCount: 0, totalBilled: 0 });
            }
            const dailyReport = daily.get(dayKey)!;
            dailyReport.customers.add(invoice.billTo.name);
            dailyReport.invoiceCount++;
            dailyReport.totalBilled += invoiceTotal;
            
            // Monthly
            if (!monthly.has(monthKey)) {
                monthly.set(monthKey, { customers: new Set(), invoiceCount: 0, totalBilled: 0 });
            }
            const monthlyReport = monthly.get(monthKey)!;
            monthlyReport.customers.add(invoice.billTo.name);
            monthlyReport.invoiceCount++;
            monthlyReport.totalBilled += invoiceTotal;
        });

        const dailyReports: ReportRow[] = Array.from(daily.entries())
            .map(([date, data]) => ({ date, ...data, uniqueCustomers: data.customers.size }))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const monthlyReports: ReportRow[] = Array.from(monthly.entries())
            .map(([date, data]) => ({ date, ...data, uniqueCustomers: data.customers.size }))
            .sort((a, b) => new Date(b.date + '-01').getTime() - new Date(a.date + '-01').getTime());

        return { dailyReports, monthlyReports };
    }, [invoices]);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">Historical Reports</h3>
            
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('daily')}
                        className={`${
                            activeTab === 'daily'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:hover:text-gray-300 dark:hover:border-gray-600'
                        } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}
                    >
                        Daily Reports
                    </button>
                    <button
                        onClick={() => setActiveTab('monthly')}
                        className={`${
                            activeTab === 'monthly'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:hover:text-gray-300 dark:hover:border-gray-600'
                        } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors`}
                    >
                        Monthly Reports
                    </button>
                </nav>
            </div>

            {activeTab === 'daily' && <ReportsTable reports={reports.dailyReports} />}
            {activeTab === 'monthly' && <ReportsTable reports={reports.monthlyReports} isMonthly />}
        </div>
    );
};