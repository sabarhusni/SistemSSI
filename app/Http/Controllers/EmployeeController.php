<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EmployeeController extends Controller
{
    public function index(Request $request)
    {
        $sortable = ['employee_number', 'name', 'position', 'department', 'join_date', 'status', 'created_at'];
        $sortBy   = in_array($request->sort_by, $sortable) ? $request->sort_by : 'name';
        $sortDir  = $request->sort_dir === 'asc' ? 'asc' : 'desc';

        $query = Employee::query()
            ->when($request->search, fn($q, $s) =>
                $q->where('name', 'ilike', "%$s%")
                  ->orWhere('employee_number', 'ilike', "%$s%")
                  ->orWhere('position', 'ilike', "%$s%")
                  ->orWhere('department', 'ilike', "%$s%")
            )
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->orderBy($sortBy, $sortDir);

        return Inertia::render('Employees/Index', [
            'employees' => $query->paginate(20)->withQueryString(),
            'filters'   => $request->only('search', 'status', 'sort_by', 'sort_dir'),
        ]);
    }

    private function generateNextNumber(): string
    {
        $prefix = 'EMP';
        $last   = Employee::where('employee_number', 'like', $prefix . '%')
            ->orderBy('employee_number', 'desc')
            ->value('employee_number');
        $seq = $last ? ((int) substr($last, strlen($prefix)) + 1) : 1;
        return $prefix . str_pad($seq, 4, '0', STR_PAD_LEFT);
    }

    public function create()
    {
        return Inertia::render('Employees/Form', [
            'nextNumber' => $this->generateNextNumber(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'employee_number' => 'required|string|max:50|unique:employees,employee_number',
            'name'            => 'required|string|max:100',
            'position'        => 'nullable|string|max:100',
            'department'      => 'nullable|string|max:100',
            'phone'           => 'nullable|string|max:30',
            'email'           => 'nullable|email|max:100',
            'join_date'       => 'nullable|date',
            'status'          => 'required|in:active,inactive',
            'notes'           => 'nullable|string',
        ]);

        if (empty($data['employee_number'])) {
            $data['employee_number'] = $this->generateNextNumber();
        }

        Employee::create($data);

        return redirect('/employees')->with('success', 'Karyawan berhasil ditambahkan.');
    }

    public function edit(Employee $employee)
    {
        return Inertia::render('Employees/Form', ['employee' => $employee]);
    }

    public function update(Request $request, Employee $employee)
    {
        $data = $request->validate([
            'employee_number' => 'required|string|max:50|unique:employees,employee_number,' . $employee->id,
            'name'            => 'required|string|max:100',
            'position'        => 'nullable|string|max:100',
            'department'      => 'nullable|string|max:100',
            'phone'           => 'nullable|string|max:30',
            'email'           => 'nullable|email|max:100',
            'join_date'       => 'nullable|date',
            'status'          => 'required|in:active,inactive',
            'notes'           => 'nullable|string',
        ]);

        $employee->update($data);

        return redirect('/employees')->with('success', 'Data karyawan berhasil diperbarui.');
    }

    public function destroy(Employee $employee)
    {
        $employee->delete();

        return redirect('/employees')->with('success', 'Karyawan berhasil dihapus.');
    }
}
