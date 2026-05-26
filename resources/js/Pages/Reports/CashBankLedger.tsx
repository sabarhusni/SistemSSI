import AppLayout from '@/Layouts/AppLayout';
import { Head } from '@inertiajs/react';
import { useState } from 'react';
import { fmt, fmtDate, SummaryCard, FilterBar, FilterDate, FilterSelect, ReportTable, applyFilters } from './_shared';

export default function CashBankLedger({ rows, summary, bankAccounts, filters }: any) {
    const today = new Date().toISOString().slice(0, 10);
    const firstDay = today.slice(0, 8) + '01';

    const [f, setF] = useState({ from: filters?.from ?? firstDay, to: filters?.to ?? today, source: filters?.source ?? '', bank_account_id: filters?.bank_account_id ?? '' });

    return (
        <AppLayout header="Buku Kas / Bank">
            <Head title="Buku Kas/Bank" />
            <FilterBar onApply={() => applyFilters('/reports/cash-bank-ledger', f)}>
                <FilterDate label="Dari" value={f.from} onChange={v => setF({ ...f, from: v })} />
                <FilterDate label="Sampai" value={f.to} onChange={v => setF({ ...f, to: v })} />
                <FilterSelect label="Sumber" value={f.source} onChange={v => setF({ ...f, source: v, bank_account_id: '' })}>
                    <option value="">Kas + Bank</option>
                    <option value="cash">Kas saja</option>
                    <option value="bank">Bank saja</option>
                </FilterSelect>
                {f.source !== 'cash' && (
                    <FilterSelect label="Rekening Bank" value={f.bank_account_id} onChange={v => setF({ ...f, bank_account_id: v })}>
                        <option value="">Semua Rekening</option>
                        {bankAccounts?.map((b: any) => <option key={b.id} value={b.id}>{b.bank_name} - {b.account_number}</option>)}
                    </FilterSelect>
                )}
            </FilterBar>

            <div className="grid grid-cols-3 gap-4 mb-4">
                <SummaryCard label="Total Debit (Masuk)" value={fmt(summary?.total_debit)} color="emerald" />
                <SummaryCard label="Total Kredit (Keluar)" value={fmt(summary?.total_credit)} color="red" />
                <SummaryCard label="Saldo Akhir" value={fmt(summary?.balance)} color={summary?.balance >= 0 ? 'blue' : 'red'} />
            </div>

            <ReportTable
                headers={['Tanggal', 'Sumber', 'Referensi', 'Keterangan', 'Debit (Masuk)', 'Kredit (Keluar)', 'Saldo']}
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
