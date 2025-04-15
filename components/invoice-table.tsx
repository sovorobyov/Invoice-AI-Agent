'use client';

import { useState, useEffect } from 'react';
import { Invoice, LineItem } from '@/lib/db/schema';
import { format } from 'date-fns';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronDownIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

type SortField = 'invoice_date' | 'due_date' | 'amount' | 'vendor_name' | 'status' | 'created_at';
type SortDirection = 'asc' | 'desc';

interface InvoiceWithLineItems extends Invoice {
  line_items?: LineItem[];
}

interface InvoiceTableProps {
  invoices: InvoiceWithLineItems[];
  className?: string;
}

export function InvoiceTable({ invoices: initialInvoices, className }: InvoiceTableProps) {
  const [invoices, setInvoices] = useState<InvoiceWithLineItems[]>(initialInvoices);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

  // Apply initial sort
  useEffect(() => {
    const sortedInvoices = [...initialInvoices].sort((a, b) => {
      if (sortField === 'created_at') {
        const aDate = a.created_at instanceof Date ? a.created_at.getTime() : 0;
        const bDate = b.created_at instanceof Date ? b.created_at.getTime() : 0;
        return sortDirection === 'desc' ? bDate - aDate : aDate - bDate;
      }
      return 0;
    });
    setInvoices(sortedInvoices);
  }, [initialInvoices, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);

    const sortedInvoices = [...invoices].sort((a, b) => {
      const aValue = a[field];
      const bValue = b[field];

      if (field === 'invoice_date' || field === 'due_date' || field === 'created_at') {
        const aDate = aValue instanceof Date ? aValue.getTime() : 0;
        const bDate = bValue instanceof Date ? bValue.getTime() : 0;
        return newDirection === 'desc' ? bDate - aDate : aDate - bDate;
      }

      if (field === 'amount') {
        return newDirection === 'desc' 
          ? (Number(bValue) || 0) - (Number(aValue) || 0) 
          : (Number(aValue) || 0) - (Number(bValue) || 0);
      }

      // String comparison for fields like vendor_name, status
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return newDirection === 'desc' 
          ? bValue.localeCompare(aValue) 
          : aValue.localeCompare(bValue);
      }

      return 0;
    });

    setInvoices(sortedInvoices);
  };

  const toggleRowExpand = (invoiceId: number) => {
    setExpandedRows(prev => ({
      ...prev,
      [invoiceId]: !prev[invoiceId]
    }));
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount == null) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusBadgeClass = (status: string | null | undefined) => {
    switch (status) {
      case 'PROCESSED': return 'bg-blue-100 text-blue-800';
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'ERROR': return 'bg-red-100 text-red-800';
      case 'UPLOADED': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return '-';
    return format(date, 'MMM dd, yyyy');
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return <ChevronDownIcon size={16} />;
  };

  return (
    <div className={cn("w-full", className)}>
      <Table>
        <TableCaption>List of invoices in the system</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead className="w-[180px]" onClick={() => handleSort('invoice_date')} role="button">
              Invoice Date <SortIcon field="invoice_date" />
            </TableHead>
            <TableHead className="w-[180px]" onClick={() => handleSort('due_date')} role="button">
              Due Date <SortIcon field="due_date" />
            </TableHead>
            <TableHead onClick={() => handleSort('vendor_name')} role="button">
              Vendor <SortIcon field="vendor_name" />
            </TableHead>
            <TableHead>Invoice #</TableHead>
            <TableHead onClick={() => handleSort('amount')} role="button" className="text-right">
              Amount <SortIcon field="amount" />
            </TableHead>
            <TableHead onClick={() => handleSort('status')} role="button" className="text-center">
              Status <SortIcon field="status" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center">No invoices found</TableCell>
            </TableRow>
          ) : (
            invoices.map((invoice) => (
              <>
                <TableRow key={invoice.id} className="cursor-pointer" onClick={() => toggleRowExpand(invoice.id)}>
                  <TableCell>
                    {expandedRows[invoice.id] ? 
                      <span>▼</span> :
                      <span>▶</span>
                    }
                  </TableCell>
                  <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                  <TableCell>{formatDate(invoice.due_date)}</TableCell>
                  <TableCell>{invoice.vendor_name || '-'}</TableCell>
                  <TableCell>{invoice.invoice_number || '-'}</TableCell>
                  <TableCell className="text-right">{formatCurrency(invoice.amount)}</TableCell>
                  <TableCell className="text-center">
                    <span className={cn("px-2 py-1 rounded-full text-xs font-medium", getStatusBadgeClass(invoice.status))}>
                      {invoice.status || 'UNKNOWN'}
                    </span>
                  </TableCell>
                </TableRow>
                {expandedRows[invoice.id] && (
                  <TableRow key={`${invoice.id}-details`}>
                    <TableCell colSpan={7} className="bg-muted/30 p-4">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <h4 className="font-medium text-sm">Customer Information</h4>
                          <p className="text-sm">{invoice.customer_name || 'No customer information'}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">Additional Information</h4>
                          <p className="text-sm">Created: {formatDate(invoice.created_at)}</p>
                          <p className="text-sm">Last Updated: {formatDate(invoice.updated_at)}</p>
                        </div>
                      </div>
                      
                      {invoice.line_items && invoice.line_items.length > 0 ? (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Line Items</h4>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Quantity</TableHead>
                                <TableHead className="text-right">Unit Price</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {invoice.line_items.map((item, idx) => (
                                <TableRow key={item.id || idx}>
                                  <TableCell>{item.description}</TableCell>
                                  <TableCell className="text-right">{item.quantity}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No line items available</p>
                      )}
                      
                      <div className="mt-4">
                        <Button variant="outline" size="sm" onClick={() => invoice.id && toggleRowExpand(invoice.id)}>
                          Close Details
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
} 