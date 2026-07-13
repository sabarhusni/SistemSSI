<?php

namespace App\Http\Controllers;

use App\Models\JournalSetting;
use Illuminate\Http\Request;
use Inertia\Inertia;

class JournalSettingController extends Controller
{
    public function index(Request $request)
    {
        $sortable = ['account_code', 'account_name', 'account_type', 'is_active', 'created_at'];
        $sortBy   = in_array($request->sort_by, $sortable) ? $request->sort_by : 'account_code';
        $sortDir  = $request->sort_dir === 'asc' ? 'asc' : 'desc';

        $query = JournalSetting::query()
            ->when($request->search, fn($q, $s) =>
                $q->where('account_code', 'ilike', "%$s%")
                  ->orWhere('account_name', 'ilike', "%$s%")
            )
            ->when($request->account_type, fn($q, $t) => $q->where('account_type', $t))
            ->when($request->is_active !== null, fn($q) => $q->where('is_active', (bool) $request->is_active))
            ->orderBy($sortBy, $sortDir);

        return Inertia::render('JournalSettings/Index', [
            'journalSettings' => $query->paginate(20)->withQueryString(),
            'filters'         => $request->only('search', 'account_type', 'is_active', 'sort_by', 'sort_dir'),
        ]);
    }

    public function create()
    {
        return Inertia::render('JournalSettings/Form', [
            'accountTypes' => [
                'asset' => 'Asset (Aktiva)',
                'liability' => 'Liability (Kewajiban)',
                'equity' => 'Equity (Modal)',
                'revenue' => 'Revenue (Pendapatan)',
                'expense' => 'Expense (Biaya)',
                'cogs' => 'COGS (Harga Pokok Penjualan)',
            ],
            'accountCategories' => [
                'current' => 'Current (Lancar)',
                'fixed' => 'Fixed (Tetap)',
            ],
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'account_code'    => 'required|string|max:20|unique:journal_settings,account_code',
            'account_name'    => 'required|string|max:255',
            'account_type'    => 'required|in:asset,liability,equity,revenue,expense',
            'account_category' => 'nullable|in:current,fixed',
            'description'     => 'nullable|string',
            'is_active'       => 'boolean',
        ]);

        JournalSetting::create($data);

        return redirect('/journal-settings')->with('success', 'Akun jurnal berhasil ditambahkan.');
    }

    public function edit(JournalSetting $journalSetting)
    {
        return Inertia::render('JournalSettings/Form', [
            'journalSetting' => $journalSetting,
            'accountTypes' => [
                'asset' => 'Asset (Aktiva)',
                'liability' => 'Liability (Kewajiban)',
                'equity' => 'Equity (Modal)',
                'revenue' => 'Revenue (Pendapatan)',
                'expense' => 'Expense (Biaya)',
                'cogs' => 'COGS (Harga Pokok Penjualan)',
            ],
            'accountCategories' => [
                'current' => 'Current (Lancar)',
                'fixed' => 'Fixed (Tetap)',
            ],
        ]);
    }

    public function update(Request $request, JournalSetting $journalSetting)
    {
        $data = $request->validate([
            'account_code'    => 'required|string|max:20|unique:journal_settings,account_code,' . $journalSetting->id,
            'account_name'    => 'required|string|max:255',
            'account_type'    => 'required|in:asset,liability,equity,revenue,expense',
            'account_category' => 'nullable|in:current,fixed',
            'description'     => 'nullable|string',
            'is_active'       => 'boolean',
        ]);

        $journalSetting->update($data);

        return redirect('/journal-settings')->with('success', 'Akun jurnal berhasil diperbarui.');
    }

    public function destroy(JournalSetting $journalSetting)
    {
        $journalSetting->delete();

        return redirect('/journal-settings')->with('success', 'Akun jurnal berhasil dihapus.');
    }

    /**
     * Get accounts by type (untuk dropdown)
     */
    public function getByType(string $type)
    {
        return JournalSetting::where('account_type', $type)
            ->active()
            ->orderBy('account_code')
            ->get(['id', 'account_code', 'account_name']);
    }
}
