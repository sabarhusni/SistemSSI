<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ContractController;
use App\Http\Controllers\SalesOrderController;
use App\Http\Controllers\WorkOrderController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\StockController;
use App\Http\Controllers\StockTransferController;
use App\Http\Controllers\StockAdjustmentController;
use App\Http\Controllers\StockOpnameController;
use App\Http\Controllers\PurchaseOrderController;
use App\Http\Controllers\CashTransactionController;
use App\Http\Controllers\BankTransactionController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\UnitOfMeasureController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\JournalSettingController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/dashboard');

// Authenticated routes
Route::middleware('auth')->group(function () {
    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Masters (Modul 3-5)
    Route::resource('customers', CustomerController::class);
    Route::resource('suppliers', SupplierController::class);
    Route::resource('products', ProductController::class);
    Route::resource('unit-of-measures', UnitOfMeasureController::class);

    // Operations (Modul 6-9)
    Route::resource('contracts', ContractController::class);
    Route::post('contracts/{contract}/generate-work-orders', [ContractController::class, 'generateWorkOrders'])->name('contracts.generate-work-orders');
    Route::resource('sales-orders', SalesOrderController::class);
    Route::resource('work-orders', WorkOrderController::class);
    Route::resource('invoices', InvoiceController::class);

    // Financial (Modul 9, 15-16)
    Route::resource('payments', PaymentController::class);
    Route::resource('cash-transactions', CashTransactionController::class);
    Route::resource('bank-transactions', BankTransactionController::class);

    // Inventory (Modul 10-14)
    Route::resource('stocks', StockController::class);
    Route::resource('stock-transfers', StockTransferController::class);
    Route::resource('stock-adjustments', StockAdjustmentController::class);
    Route::resource('stock-opnames', StockOpnameController::class);
    Route::resource('purchase-orders', PurchaseOrderController::class);
    Route::get('purchase-orders/{purchaseOrder}/receive', [PurchaseOrderController::class, 'receiveForm'])->name('purchase-orders.receive');
    Route::post('purchase-orders/{purchaseOrder}/receive', [PurchaseOrderController::class, 'receiveStore'])->name('purchase-orders.receive.store');

    // Laporan
    Route::prefix('reports')->name('reports.')->group(function () {
        Route::get('/sales',            [ReportController::class, 'sales'])->name('sales');
        Route::get('/purchase',         [ReportController::class, 'purchase'])->name('purchase');
        Route::get('/stock',            [ReportController::class, 'stock'])->name('stock');
        Route::get('/stock-card',       [ReportController::class, 'stockCard'])->name('stock-card');
        Route::get('/cash-flow',        [ReportController::class, 'cashFlow'])->name('cash-flow');
        Route::get('/cash-bank-ledger', [ReportController::class, 'cashBankLedger'])->name('cash-bank-ledger');
        Route::get('/costs',            [ReportController::class, 'costs'])->name('costs');
        Route::get('/insentif',         [ReportController::class, 'insentif'])->name('insentif');
    });

    // Karyawan
    Route::resource('employees', EmployeeController::class);

    // Administration (Modul 17-18)
    Route::resource('users', UserController::class);
    Route::resource('roles', RoleController::class);

    // Settings
    Route::get('settings/general',  [SettingController::class, 'general'])->name('settings.general');
    Route::post('settings/general', [SettingController::class, 'update'])->name('settings.update');
    Route::resource('journal-settings', JournalSettingController::class);

    // Profile
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
