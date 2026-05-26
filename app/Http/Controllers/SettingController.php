<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use App\Models\JournalSetting;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SettingController extends Controller
{
    public function general()
    {
        return Inertia::render('Settings/General', [
            'settings'        => Setting::allKeyed(),
            'journalAccounts' => JournalSetting::active()
                ->orderBy('account_code')
                ->get(['id', 'account_code', 'account_name', 'account_type']),
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'tax_type'                  => 'required|in:include,exclude',
            'tax_rate_po'               => 'required|numeric|min:0|max:100',
            'tax_rate_so'               => 'required|numeric|min:0|max:100',
            'company_name'              => 'nullable|string|max:255',
            'journal_account_inventory' => 'nullable|string|max:20',
            'journal_account_ap'        => 'nullable|string|max:20',
        ]);

        foreach ($data as $key => $value) {
            Setting::set($key, $value);
        }

        return back()->with('success', 'Pengaturan berhasil disimpan.');
    }
}
