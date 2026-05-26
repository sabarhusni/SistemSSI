<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\Permission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class RoleController extends Controller
{
    public function index(Request $request)
    {
        $sortable = ['name', 'users_count', 'permissions_count', 'created_at'];
        $sortBy   = in_array($request->sort_by, $sortable) ? $request->sort_by : 'created_at';
        $sortDir  = $request->sort_dir === 'asc' ? 'asc' : 'desc';

        $query = Role::withCount(['users', 'permissions'])
            ->when($request->search, fn($q, $s) => $q->where('name', 'ilike', "%$s%"))
            ->orderBy($sortBy, $sortDir);

        return Inertia::render('Roles/Index', [
            'roles'   => $query->paginate(15)->withQueryString(),
            'filters' => $request->only('search', 'sort_by', 'sort_dir'),
        ]);
    }

    public function create()
    {
        return Inertia::render('Roles/Form', [
            'permissions' => Permission::orderBy('name')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'        => 'required|string|max:100|unique:roles,name',
            'description' => 'nullable|string|max:255',
            'permissions' => 'nullable|array',
            'permissions.*' => 'uuid|exists:permissions,id',
        ]);

        DB::transaction(function () use ($data) {
            $role = Role::create([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
            ]);

            if (!empty($data['permissions'])) {
                $role->permissions()->sync($data['permissions']);
            }
        });

        return redirect('/roles')->with('success', 'Role berhasil ditambahkan.');
    }

    public function edit(Role $role)
    {
        return Inertia::render('Roles/Form', [
            'role'        => $role->load('permissions'),
            'permissions' => Permission::orderBy('name')->get(),
        ]);
    }

    public function update(Request $request, Role $role)
    {
        $data = $request->validate([
            'name'        => 'required|string|max:100|unique:roles,name,' . $role->id,
            'description' => 'nullable|string|max:255',
            'permissions' => 'nullable|array',
            'permissions.*' => 'uuid|exists:permissions,id',
        ]);

        DB::transaction(function () use ($data, $role) {
            $role->update([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
            ]);

            $role->permissions()->sync($data['permissions'] ?? []);
        });

        return redirect('/roles')->with('success', 'Role berhasil diperbarui.');
    }

    public function destroy(Role $role)
    {
        $role->delete();

        return redirect('/roles')->with('success', 'Role berhasil dihapus.');
    }
}
