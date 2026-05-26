<?php
$models = [
    'Role' => ['uses_uuid' => true, 'soft_delete' => true],
    'Permission' => ['uses_uuid' => true, 'soft_delete' => true],
    'RolePermission' => ['uses_uuid' => true, 'soft_delete' => true],
    'Customer' => ['uses_uuid' => true, 'soft_delete' => true],
    'Supplier' => ['uses_uuid' => true, 'soft_delete' => true],
    'ProductCategory' => ['uses_uuid' => true, 'soft_delete' => true],
    'Product' => ['uses_uuid' => true, 'soft_delete' => true],
    'Contract' => ['uses_uuid' => true, 'soft_delete' => true],
    'ContractService' => ['uses_uuid' => true, 'soft_delete' => true],
    'ContractMaterial' => ['uses_uuid' => true, 'soft_delete' => true],
    'SalesOrder' => ['uses_uuid' => true, 'soft_delete' => true],
    'SalesOrderItem' => ['uses_uuid' => true, 'soft_delete' => true],
    'WorkOrder' => ['uses_uuid' => true, 'soft_delete' => true],
    'WorkOrderMaterial' => ['uses_uuid' => true, 'soft_delete' => true],
    'Invoice' => ['uses_uuid' => true, 'soft_delete' => true],
    'InvoiceItem' => ['uses_uuid' => true, 'soft_delete' => true],
    'Payment' => ['uses_uuid' => true, 'soft_delete' => true],
    'Stock' => ['uses_uuid' => true, 'soft_delete' => true],
    'StockMovement' => ['uses_uuid' => true, 'soft_delete' => true],
    'StockTransfer' => ['uses_uuid' => true, 'soft_delete' => true],
    'StockAdjustment' => ['uses_uuid' => true, 'soft_delete' => true],
    'StockOpname' => ['uses_uuid' => true, 'soft_delete' => true],
    'StockOpnameItem' => ['uses_uuid' => true, 'soft_delete' => true],
    'PurchaseOrder' => ['uses_uuid' => true, 'soft_delete' => true],
    'PurchaseOrderItem' => ['uses_uuid' => true, 'soft_delete' => true],
    'CashTransaction' => ['uses_uuid' => true, 'soft_delete' => true],
    'BankAccount' => ['uses_uuid' => true, 'soft_delete' => true],
    'BankTransaction' => ['uses_uuid' => true, 'soft_delete' => true],
];

foreach ($models as $model => $config) {
    $filepath = "app/Models/{$model}.php";

    if (file_exists($filepath)) {
        $content = file_get_contents($filepath);
        $needsUpdate = false;

        // Check if we need to add UUID trait
        if ($config['uses_uuid'] && !str_contains($content, 'HasUuids')) {
            $needsUpdate = true;
            $content = str_replace(
                'use HasFactory;',
                'use HasFactory, HasUuids;',
                $content
            );
            $content = str_replace(
                'use Illuminate\Database\Eloquent\Factories\HasFactory;',
                "use Illuminate\Database\Eloquent\Concerns\HasUuids;\nuse Illuminate\Database\Eloquent\Factories\HasFactory;",
                $content
            );
        }

        // Check if we need to add SoftDeletes
        if ($config['soft_delete'] && !str_contains($content, 'SoftDeletes')) {
            $needsUpdate = true;
            $content = str_replace(
                'use HasFactory, HasUuids;',
                'use HasFactory, HasUuids, SoftDeletes;',
                $content
            );
            $content = str_replace(
                'use Illuminate\Database\Eloquent\Factories\HasFactory;',
                "use Illuminate\Database\Eloquent\Factories\HasFactory;\nuse Illuminate\Database\Eloquent\SoftDeletes;",
                $content
            );
        }

        // Ensure proper fillable attribute
        if (!str_contains($content, 'protected $fillable')) {
            $needsUpdate = true;
            $classPos = strpos($content, 'class ' . $model);
            $openBrace = strpos($content, '{', $classPos);
            if ($classPos && $openBrace) {
                $insertion = "\n    protected \$fillable = [];\n";
                $content = substr_replace($content, $insertion, $openBrace + 1, 0);
            }
        }

        if ($needsUpdate) {
            file_put_contents($filepath, $content);
            echo "Updated: $model\n";
        }
    }
}

echo "Model configuration complete!\n";
?>
