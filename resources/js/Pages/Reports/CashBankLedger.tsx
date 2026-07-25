import AppLayout from '@/Layouts/AppLayout';
import { Head } from '@inertiajs/react';
import { useState } from 'react';
import { fmt, fmtDate, SummaryCard, FilterBar, FilterDate, FilterSelect, ReportTable, applyFilters, exportToExcel } from './_shared';

export default function CashBankLedger({ rows, summary, bankAccounts, filters }: any) {
    const today = new Date().toISOString().slice(0, 10);
    const firstDay = today.slice(0, 8) + '01';

    const [f, setF] = useState({ from: filters?.from ?? firstDay, to: filters?.to ?? today, source: filters?.source ?? '', bank_account_id: filters?.bank_account_id ?? '' });

    const handleExport = () => exportToExcel('Cash_Bank_Ledger', [{
        name: 'Ledger',
        headers: ['Date', 'Source', 'Reference', 'Description', 'Debit (In)', 'Credit (Out)', 'Balance'],
        rows: (rows ?? []).map((r: any) => [
            r.date, r.source_name, r.reference ?? '-', r.description ?? '-',
            Number(r.debit ?? 0), Number(r.credit ?? 0), Number(r.balance ?? 0),
        ]),
    }]);

    return (
        <AppLayout header="Cash / Bank Ledger">
            <Head title="Cash/Bank Ledger" />
            <FilterBar onApply={() => applyFilters('/reports/cash-bank-ledger', f)} onExport={handleExport}>
                <FilterDate label="From" value={f.from} onChange={v => setF({ ...f, from: v })} />
                <FilterDate label="To" value={f.to} onChange={v => setF({ ...f, to: v })} />
                <FilterSelect label="Source" value={f.source} onChange={v => setF({ ...f, source: v, bank_account_id: '' })}>
                    <option value="">Cash + Bank</option>
                    <option value="cash">Cash only</option>
                    <option value="bank">Bank only</option>
                </FilterSelect>
                {f.source !== 'cash' && (
                    <FilterSelect label="Bank Account" value={f.bank_account_id} onChange={v => setF({ ...f, bank_account_id: v })}>
                        <option value="">All Accounts</option>
                        {bankAccounts?.map((b: any) => <option key={b.id} value={b.id}>{b.bank_name} - {b.account_number}</option>)}
                    </FilterSelect>
                )}
            </FilterBar>

            <div className="grid grid-cols-3 gap-4 mb-4">
                <SummaryCard label="Total Debit (In)" value={fmt(summary?.total_debit)} color="emerald" />
                <SummaryCard label="Total Credit (Out)" value={fmt(summary?.total_credit)} color="red" />
                <SummaryCard label="Closing Balance" value={fmt(summary?.balance)} color={summary?.balance >= 0 ? 'blue' : 'red'} />
            </div>

            <ReportTable
                headers={['Date', 'Source', 'Reference', 'Description', 'Debit (In)', 'Credit (Out)', 'Balance']}
                empty={!rows?.length}
            >
                {rows?.map((r: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap">{fmtDate(r.date)}</td>
                        <td className="px-4 py-2 text-xs text-gray-500">{r.source_name}</td>
                        <td className="px-4 py-2 text-xs text-gray-500">{r.reference ?? '—'}</td>
                        <td className="px-4 py-2">{r.description}</td>
                        <td className="px-4 py-2 text-right font-medium text-emerald-700">{r.debit ? fmt(r.debit) : ''}</td>
                        <td className="px-4 py-2 text-right font-medium text-red-600">{r.credit ? fmt(r.credit) : ''}</td>
                        <td className="px-4 py-2 text-right font-bold">{fmt(r.balance)}</td>
                    </tr>
                ))}
                {rows?.length > 0 && (
                    <tr className="bg-gray-50 font-semibold border-t">
                        <td colSpan={4} className="px-4 py-2 text-right">Total</td>
                        <td className="px-4 py-2 text-right text-emerald-700">{fmt(summary?.total_debit)}</td>
                        <td className="px-4 py-2 text-right text-red-600">{fmt(summary?.total_credit)}</td>
                        <td className="px-4 py-2 text-right text-blue-700">{fmt(summary?.balance)}</td>
                    </tr>
                )}
            </ReportTable>
        </AppLayout>
    );
}
