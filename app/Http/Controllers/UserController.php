<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $sortable = ['name', 'username', 'email', 'status', 'created_at'];
        $sortBy   = in_array($request->sort_by, $sortable) ? $request->sort_by : 'created_at';
        $sortDir  = $request->sort_dir === 'asc' ? 'asc' : 'desc';

        $query = User::with('role')
            ->when($request->search, fn($q, $s) => $q->where('name', 'ilike', "%$s%")->orWhere('email', 'ilike', "%$s%")->orWhere('username', 'ilike', "%$s%"))
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->orderBy($sortBy, $sortDir);

        return Inertia::render('Users/Index', [
            'users'   => $query->paginate(15)->withQueryString(),
            'filters' => $request->only('search', 'status', 'sort_by', 'sort_dir'),
        ]);
    }

    public function create()
    {
        return Inertia::render('Users/Form', [
            'roles' => Role::orderBy('name')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'                  => 'required|string|max:255',
            'username'              => 'required|string|max:50|unique:users,username',
            'email'                 => 'required|email|max:255|unique:users,email',
            'role_id'               => 'nullable|uuid|exists:roles,id',
            'status'                => 'required|in:active,inactive',
            'password'              => 'required|string|min:8|confirmed',
        ]);

        $data['password'] = Hash::make($data['password']);
        unset($data['password_confirmation']);

        User::create($data);

        return redirect('/users')->with('success', 'Pengguna berhasil ditambahkan.');
    }

    public function edit(User $user)
    {
        return Inertia::render('Users/Form', [
            'user'  => $user,
            'roles' => Role::orderBy('name')->get(),
        ]);
    }

    public function update(Request $request, User $user)
    {
        $data = $request->validate([
            'name'     => 'required|string|max:255',
            'username' => 'required|string|max:50|unique:users,username,' . $user->id,
            'email'    => 'required|email|max:255|unique:users,email,' . $user->id,
            'role_id'  => 'nullable|uuid|exists:roles,id',
            'status'   => 'required|in:active,inactive',
            'password' => 'nullable|string|min:8|confirmed',
        ]);

        if (!empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }
        unset($data['password_confirmation']);

        $user->update($data);

        return redirect('/users')->with('success', 'Pengguna berhasil diperbarui.');
    }

    public function destroy(User $user)
    {
        $user->delete();

        return redirect('/users')->with('success', 'Pengguna berhasil dihapus.');
    }
}
