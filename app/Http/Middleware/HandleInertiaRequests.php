<?php

namespace App\Http\Middleware;

use App\Models\Menu;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        $navGroups = [];
        $permissions = [];

        if ($user = $request->user()) {
            // Ambil permission names milik role user ini
            if ($user->role_id) {
                $permissions = DB::table('role_permission')
                    ->join('permissions', 'role_permission.permission_id', '=', 'permissions.id')
                    ->where('role_permission.role_id', $user->role_id)
                    ->whereNull('permissions.deleted_at')
                    ->pluck('permissions.name')
                    ->all();
            }

            $permissionSet = collect($permissions);

            // Ambil semua menu aktif, filter sesuai permission
            $navGroups = Menu::where('is_active', true)
                ->orderBy('group_order')
                ->orderBy('sort_order')
                ->get()
                ->filter(fn($m) => !$m->permission || $permissionSet->contains($m->permission))
                ->groupBy('group')
                ->map(fn($items, $group) => [
                    'label' => $group,
                    'items' => $items->values()->map(fn($m) => [
                        'label' => $m->label,
                        'href'  => $m->href,
                        'icon'  => $m->icon,
                    ]),
                ])
                ->values();
        }

        return [
            ...parent::share($request),
            'auth' => [
                'user'        => $request->user(),
                'permissions' => $permissions,
            ],
            'navGroups' => $navGroups,
            'flash' => [
                'success' => $request->session()->get('success'),
                'error'   => $request->session()->get('error'),
            ],
        ];
    }
}
