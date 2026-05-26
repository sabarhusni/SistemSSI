<?php
$migrations = [
    'create_contracts_table' => [
        'table' => 'contracts',
        'columns' => <<<'EOF'
            $table->uuid('id')->primary();
            $table->uuid('customer_id');
            $table->string('contract_number')->unique();
            $table->date('start_date');
            $table->date('end_date');
            $table->decimal('contract_value', 12, 2);
            $table->string('service_area');
            $table->integer('visit_frequency')->default(1);
            $table->string('visit_frequency_unit')->default('month');
            $table->enum('status', ['draft', 'active', 'completed', 'cancelled'])->default('draft');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('cascade');
EOF
    ],
    'create_contract_services_table' => [
        'table' => 'contract_services',
        'columns' => <<<'EOF'
            $table->uuid('id')->primary();
            $table->uuid('contract_id');
            $table->uuid('product_id');
            $table->integer('quantity')->default(1);
            $table->decimal('unit_price', 12, 2);
            $table->decimal('total_price', 12, 2);
            $table->timestamps();
            $table->softDeletes();
            $table->foreign('contract_id')->references('id')->on('contracts')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
EOF
    ],
    'create_contract_materials_table' => [
        'table' => 'contract_materials',
        'columns' => <<<'EOF'
            $table->uuid('id')->primary();
            $table->uuid('contract_service_id');
            $table->uuid('product_id');
            $table->integer('quantity')->default(1);
            $table->timestamps();
            $table->softDeletes();
            $table->foreign('contract_service_id')->references('id')->on('contract_services')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
EOF
    ],
    'create_sales_orders_table' => [
        'table' => 'sales_orders',
        'columns' => <<<'EOF'
            $table->uuid('id')->primary();
            $table->uuid('contract_id')->nullable();
            $table->uuid('customer_id');
            $table->uuid('sales_person_id')->nullable();
            $table->uuid('technician_id')->nullable();
            $table->string('so_number')->unique();
            $table->date('service_date');
            $table->string('payment_term');
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->enum('status', ['draft', 'confirmed', 'completed', 'cancelled'])->default('draft');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->foreign('contract_id')->references('id')->on('contracts')->onDelete('set null');
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('cascade');
            $table->foreign('sales_person_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('technician_id')->references('id')->on('users')->onDelete('set null');
EOF
    ],
    'create_sales_order_items_table' => [
        'table' => 'sales_order_items',
        'columns' => <<<'EOF'
            $table->uuid('id')->primary();
            $table->uuid('sales_order_id');
            $table->uuid('product_id');
            $table->integer('quantity')->default(1);
            $table->decimal('unit_price', 12, 2);
            $table->decimal('subtotal', 12, 2);
            $table->timestamps();
            $table->softDeletes();
            $table->foreign('sales_order_id')->references('id')->on('sales_orders')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
EOF
    ],
    'create_work_orders_table' => [
        'table' => 'work_orders',
        'columns' => <<<'EOF'
            $table->uuid('id')->primary();
            $table->uuid('sales_order_id')->nullable();
            $table->uuid('technician_id');
            $table->string('wo_number')->unique();
            $table->date('visit_date');
            $table->string('service_area');
            $table->enum('status', ['pending', 'in_progress', 'completed', 'cancelled'])->default('pending');
            $table->text('technician_notes')->nullable();
            $table->string('signature_path')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->foreign('sales_order_id')->references('id')->on('sales_orders')->onDelete('set null');
            $table->foreign('technician_id')->references('id')->on('users')->onDelete('cascade');
EOF
    ],
    'create_work_order_materials_table' => [
        'table' => 'work_order_materials',
        'columns' => <<<'EOF'
            $table->uuid('id')->primary();
            $table->uuid('work_order_id');
            $table->uuid('product_id');
            $table->integer('quantity_used')->default(1);
            $table->timestamps();
            $table->softDeletes();
            $table->foreign('work_order_id')->references('id')->on('work_orders')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
EOF
    ],
    'create_invoices_table' => [
        'table' => 'invoices',
        'columns' => <<<'EOF'
            $table->uuid('id')->primary();
            $table->uuid('sales_order_id')->nullable();
            $table->uuid('customer_id');
            $table->string('invoice_number')->unique();
            $table->date('invoice_date');
            $table->date('due_date')->nullable();
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('tax', 12, 2)->default(0);
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->decimal('paid_amount', 12, 2)->default(0);
            $table->enum('status', ['draft', 'sent', 'paid', 'cancelled'])->default('draft');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->foreign('sales_order_id')->references('id')->on('sales_orders')->onDelete('set null');
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('cascade');
EOF
    ],
    'create_invoice_items_table' => [
        'table' => 'invoice_items',
        'columns' => <<<'EOF'
            $table->uuid('id')->primary();
            $table->uuid('invoice_id');
            $table->uuid('product_id')->nullable();
            $table->string('description');
            $table->integer('quantity')->default(1);
            $table->decimal('unit_price', 12, 2);
            $table->decimal('amount', 12, 2);
            $table->timestamps();
            $table->softDeletes();
            $table->foreign('invoice_id')->references('id')->on('invoices')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('set null');
EOF
    ],
    'create_payments_table' => [
        'table' => 'payments',
        'columns' => <<<'EOF'
            $table->uuid('id')->primary();
            $table->uuid('invoice_id');
            $table->uuid('customer_id');
            $table->string('payment_number')->unique();
            $table->date('payment_date');
            $table->decimal('amount', 12, 2);
            $table->string('payment_method');
            $table->string('reference')->nullable();
            $table->enum('status', ['pending', 'verified', 'rejected'])->default('pending');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->foreign('invoice_id')->references('id')->on('invoices')->onDelete('cascade');
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('cascade');
EOF
    ],
    'create_stocks_table' => [
        'table' => 'stocks',
        'columns' => <<<'EOF'
            $table->uuid('id')->primary();
            $table->uuid('product_id');
            $table->integer('quantity')->default(0);
            $table->integer('minimum_stock')->default(10);
            $table->string('warehouse_location')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
            $table->unique(['product_id']);
EOF
    ],
    'create_stock_movements_table' => [
        'table' => 'stock_movements',
        'columns' => <<<'EOF'
            $table->uuid('id')->primary();
            $table->uuid('product_id');
            $table->string('type');
            $table->integer('quantity');
            $table->uuid('reference_id')->nullable();
            $table->string('reference_type')->nullable();
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
EOF
    ],
    'create_stock_transfers_table' => [
        'table' => 'stock_transfers',
        'columns' => <<<'EOF'
            $table->uuid('id')->primary();
            $table->uuid('product_id');
            $table->integer('quantity');
            $table->string('from_location');
            $table->string('to_location');
            $table->enum('status', ['pending', 'completed', 'cancelled'])->default('pending');
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
EOF
    ],
    'create_stock_adjustments_table' => [
        'table' => 'stock_adjustments',
        'columns' => <<<'EOF'
            $table->uuid('id')->primary();
            $table->uuid('product_id');
            $table->integer('quantity');
            $table->string('adjustment_type');
            $table->text('reason');
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
EOF
    ],
    'create_stock_opnames_table' => [
        'table' => 'stock_opnames',
        'columns' => <<<'EOF'
            $table->uuid('id')->primary();
            $table->string('opname_number')->unique();
            $table->date('opname_date');
            $table->enum('status', ['draft', 'completed'])->default('draft');
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
EOF
    ],
    'create_stock_opname_items_table' => [
        'table' => 'stock_opname_items',
        'columns' => <<<'EOF'
            $table->uuid('id')->primary();
            $table->uuid('stock_opname_id');
            $table->uuid('product_id');
            $table->integer('quantity_system');
            $table->integer('quantity_physical');
            $table->integer('difference')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->foreign('stock_opname_id')->references('id')->on('stock_opnames')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
EOF
    ],
    'create_purchase_orders_table' => [
        'table' => 'purchase_orders',
        'columns' => <<<'EOF'
            $table->uuid('id')->primary();
            $table->uuid('supplier_id');
            $table->string('po_number')->unique();
            $table->date('po_date');
            $table->date('expected_delivery_date')->nullable();
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->enum('status', ['draft', 'sent', 'received', 'cancelled'])->default('draft');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->foreign('supplier_id')->references('id')->on('suppliers')->onDelete('cascade');
EOF
    ],
    'create_purchase_order_items_table' => [
        'table' => 'purchase_order_items',
        'columns' => <<<'EOF'
            $table->uuid('id')->primary();
            $table->uuid('purchase_order_id');
            $table->uuid('product_id');
            $table->integer('quantity')->default(1);
            $table->decimal('unit_price', 12, 2);
            $table->decimal('subtotal', 12, 2);
            $table->timestamps();
            $table->softDeletes();
            $table->foreign('purchase_order_id')->references('id')->on('purchase_orders')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
EOF
    ],
    'create_cash_transactions_table' => [
        'table' => 'cash_transactions',
        'columns' => <<<'EOF'
            $table->uuid('id')->primary();
            $table->string('transaction_number')->unique();
            $table->enum('type', ['in', 'out'])->default('in');
            $table->string('category');
            $table->decimal('amount', 12, 2);
            $table->date('transaction_date');
            $table->uuid('reference_id')->nullable();
            $table->string('reference_type')->nullable();
            $table->text('description')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
EOF
    ],
    'create_bank_accounts_table' => [
        'table' => 'bank_accounts',
        'columns' => <<<'EOF'
            $table->uuid('id')->primary();
            $table->string('account_number')->unique();
            $table->string('account_name');
            $table->string('bank_name');
            $table->string('account_type');
            $table->decimal('balance', 12, 2)->default(0);
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
            $table->softDeletes();
EOF
    ],
    'create_bank_transactions_table' => [
        'table' => 'bank_transactions',
        'columns' => <<<'EOF'
            $table->uuid('id')->primary();
            $table->uuid('bank_account_id');
            $table->string('transaction_number')->unique();
            $table->enum('type', ['in', 'out'])->default('in');
            $table->decimal('amount', 12, 2);
            $table->date('transaction_date');
            $table->enum('reconciliation_status', ['unmatched', 'matched', 'reconciled'])->default('unmatched');
            $table->uuid('reference_id')->nullable();
            $table->string('reference_type')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->foreign('bank_account_id')->references('id')->on('bank_accounts')->onDelete('cascade');
EOF
    ],
];

$basePath = 'database/migrations';

foreach ($migrations as $name => $config) {
    $files = glob($basePath . "/*_{$name}.php");
    if (!empty($files)) {
        $filepath = $files[0];
        $content = file_get_contents($filepath);

        $newUp = "    public function up(): void\n    {\n        Schema::create('{$config['table']}', function (Blueprint \$table) {\n{$config['columns']}\n        });\n    }";

        $pattern = '/public function up\(\): void\s*\{.*?\n\s*\}/s';
        $content = preg_replace($pattern, $newUp, $content, 1);

        file_put_contents($filepath, $content);
        echo "Updated: $filepath\n";
    }
}

echo "All migrations updated!\n";
?>
