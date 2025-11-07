import React, { useMemo } from 'react';
import { Invoice } from '../types';

interface CustomerStatsDashboardProps {
  invoices: Invoice[];
}

interface StatCardProps {
    title: string;
    value: number;
    icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex items-center space-x-4">
        <div className="bg-primary/10 dark:bg-primary/20 p-3 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase">{title}</p>
            <p className="text-3xl font-bold text-gray-800 dark:text-gray-200">{value}</p>
        </div>
    </div>
);

export const CustomerStatsDashboard: React.FC<CustomerStatsDashboardProps> = ({ invoices }) => {
    const stats = useMemo(() => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const dailyCustomers = new Set<string>();
        const monthlyCustomers = new Set<string>();
        const yearlyCustomers = new Set<string>();

        invoices.forEach(invoice => {
            const issueDate = new Date(invoice.issueDate);
            
            // Daily
            if (invoice.issueDate === todayStr) {
                dailyCustomers.add(invoice.billTo.name);
            }

            // Monthly
            if (issueDate.getFullYear() === currentYear && issueDate.getMonth() === currentMonth) {
                monthlyCustomers.add(invoice.billTo.name);
            }

            // Yearly
            if (issueDate.getFullYear() === currentYear) {
                yearlyCustomers.add(invoice.billTo.name);
            }
        });

        return {
            today: dailyCustomers.size,
            thisMonth: monthlyCustomers.size,
            thisYear: yearlyCustomers.size
        };

    }, [invoices]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard 
                title="Today's Customers" 
                value={stats.today} 
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
            />
            <StatCard 
                title="This Month's Customers" 
                value={stats.thisMonth}
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V10zM15 10a1 1 0 011-1h2a1 1 0 011 1v10a1 1 0 01-1 1h-2a1 1 0 01-1-1V10z" /></svg>}
            />
            <StatCard 
                title="This Year's Customers" 
                value={stats.thisYear}
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
            />
        </div>
    );
};
