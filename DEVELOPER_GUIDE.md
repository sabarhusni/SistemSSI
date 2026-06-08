# SSI ERP - Developer Quick Reference

## Quick Commands

```bash
# Database
php artisan migrate --seed           # Run migrations with seeders
php artisan migrate:fresh --seed     # Reset and seed database
php artisan migrate:rollback         # Undo last migration batch
php artisan tinker                   # Interactive shell

# Controllers
php artisan make:controller Name --resource       # Create resource controller
php artisan make:controller Name --model=Model   # With model binding

# Models
php artisan make:model Name -m                   # Model with migration
php artisan make:model Name -mfsc                # With migration, factory, seeder, controller

# Views & Components
php artisan make:component ComponentName          # Create React/Blade component
php artisan make:view name.path.to.view          # Create Blade template

# Configuration
php artisan config:cache            # Cache configuration
php artisan config:clear            # Clear config cache
php artisan cache:clear             # Clear all caches
php artisan route:cache              # Cache routes

# Frontend
npm run dev                          # Start dev server
npm run build                        # Production build
npm run lint                         # Check code
```

## Model Template

```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Model;

class ModelName extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = ['field1', 'field2'];

    // Relationships
    public function relation()
    {
        return $this->hasMany(RelatedModel::class);
    }
}
```

## Controller Template

```php
<?php
namespace App\Http\Controllers;

use App\Models\ModelName;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ModelNameController extends Controller
{
    public function index()
    {
        $items = ModelName::paginate();
        return Inertia::render('ModelName/Index', ['items' => $items]);
    }

    public function create()
    {
        return Inertia::render('ModelName/Create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate(['field' => 'required']);
        ModelName::create($validated);
        return redirect()->route('modelname.index');
    }

    public function show(ModelName $modelName)
    {
        return Inertia::render('ModelName/Show', ['item' => $modelName]);
    }

    public function edit(ModelName $modelName)
    {
        return Inertia::render('ModelName/Edit', ['item' => $modelName]);
    }

    public function update(Request $request, ModelName $modelName)
    {
        $modelName->update($request->validate(['field' => 'required']));
        return redirect()->route('modelname.index');
    }

    public function destroy(ModelName $modelName)
    {
        $modelName->delete();
        return redirect()->route('modelname.index');
    }
}
```

## React Component Template

```jsx
import React from 'react';
import { Head, Link } from '@inertiajs/react';

export default function Index({ items }) {
  return (
    <>
      <Head title="Items" />
      <div className="container mx-auto">
        <h1 className="text-2xl font-bold">Items</h1>
        <Link href="/items/create" className="btn btn-primary">
          Create
        </Link>
        <table className="w-full">
          <thead>
            <tr>
              <th>Name</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.data.map(item => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>
                  <Link href={`/items/${item.id}/edit`}>Edit</Link>
                  <button onClick={() => deleteItem(item.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
```

## Migration Template

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('table_name', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('foreign_id')->nullable();
            $table->string('name');
            $table->text('description')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
            $table->softDeletes();
            $table->foreign('foreign_id')->references('id')->on('other_table')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('table_name');
    }
};
```

## Blade Component Template

```blade
{{-- resources/views/components/button.blade.php --}}
<button {{ $attributes->merge(['class' => 'btn btn-primary']) }}>
    {{ $slot }}
</button>
```

## Common Patterns

### Pagination with Search & Filter
```php
$query = Model::query();

if ($request->search) {
    $query->where('name', 'like', "%{$request->search}%");
}

if ($request->status) {
    $query->where('status', $request->status);
}

$items = $query->paginate(15);
```

### Soft Delete Restoration
```php
// Get soft deleted
Model::onlyTrashed()->get();

// Restore
$item->restore();

// Force delete
$item->forceDelete();

// With soft deleted
Model::withTrashed()->get();
```

### Relationship Loading
```php
// Eager loading
$items = Model::with('relation1', 'relation2')->get();

// Lazy loading (avoid N+1)
foreach ($items as $item) {
    $item->relation; // Triggers query!
}

// Chunk for large datasets
Model::chunk(100, function ($items) {
    foreach ($items as $item) {
        // Process
    }
});
```

### Request Validation
```php
public function store(Request $request)
{
    $validated = $request->validate([
        'name' => 'required|string|max:255',
        'email' => 'required|email|unique:users',
        'age' => 'required|integer|min:18',
        'status' => 'required|in:active,inactive',
    ]);

    Model::create($validated);
}
```

## Error Handling

```php
// Try-catch
try {
    Model::create($data);
} catch (\Exception $e) {
    return back()->with('error', 'Error message');
}

// Validation errors
return back()->withErrors($validator)->withInput();

// Http status codes
return response('Unauthorized', 401);
return response('Not found', 404);
return response('Server error', 500);
```

## Debugging

```php
// Log
Log::info('Message', ['data' => $data]);
Log::error('Error', ['exception' => $e]);

// Dump & die
dd($variable);

// Dump
dump($variable);

// Tinker
php artisan tinker
>>> Model::count()
>>> $item = Model::first()
>>> $item->relation
```

## Performance Tips

1. **Use Select** - Only fetch needed columns
   ```php
   Model::select('id', 'name')->get();
   ```

2. **Eager Load** - Avoid N+1 queries
   ```php
   Model::with('relation')->get();
   ```

3. **Index** - Add indexes to frequently queried columns
   ```php
   $table->index('email');
   $table->unique('code');
   ```

4. **Pagination** - Limit result sets
   ```php
   Model::paginate(15);
   ```

5. **Cache** - Cache expensive queries
   ```php
   Cache::remember('key', 3600, fn() => Model::all());
   ```

## Best Practices

✅ **Do**
- Use type hints
- Use soft deletes for audit trails
- Use transactions for multi-table operations
- Use factories for testing
- Use seeders for demo data
- Validate input data
- Handle exceptions gracefully
- Use meaningful variable names
- Keep controllers thin
- Use models for business logic

❌ **Don't**
- Query in loops (N+1 problem)
- Store sensitive data in code
- Use * in select queries
- Hardcode configuration
- Catch all exceptions silently
- Create God models
- Skip validation
- Ignore security warnings
- Commit .env files
- Use raw SQL (unless necessary)

## File Organization

```
app/
├── Console/
│   └── Commands/
├── Exceptions/
├── Http/
│   ├── Controllers/        # Application controllers
│   ├── Middleware/
│   └── Requests/           # Form request validation
├── Models/                 # Eloquent models
├── Services/               # Business logic services
├── Traits/                 # Reusable traits
└── Providers/

database/
├── factories/              # Model factories
├── migrations/             # Schema migrations
└── seeders/                # Database seeders

resources/
├── css/                    # Stylesheets
├── js/
│   ├── Components/         # Reusable React components
│   ├── Layouts/            # Page layouts
│   ├── Pages/              # Inertia pages
│   └── app.tsx             # App entry point
└── views/                  # Blade templates

routes/
├── api.php                 # API routes (v1, v2, etc)
├── web.php                 # Web routes
└── auth.php                # Auth routes

tests/
├── Feature/                # Feature/integration tests
└── Unit/                   # Unit tests
```

## Testing

```php
// Feature test
php artisan make:test CustomerTest

public function test_can_create_customer()
{
    $response = $this->post('/customers', [
        'name' => 'Test Customer',
        'email' => 'test@example.com',
    ]);

    $response->assertRedirect('/customers');
    $this->assertDatabaseHas('customers', ['email' => 'test@example.com']);
}

// Run tests
php artisan test
php artisan test --filter=test_can_create_customer
```

---

**Keep this reference handy during development!**
