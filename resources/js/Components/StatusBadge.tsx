const colors: Record<string, string> = {
    active:      'bg-emerald-100 text-emerald-800',
    inactive:    'bg-gray-100 text-gray-600',
    draft:       'bg-yellow-100 text-yellow-800',
    confirmed:   'bg-blue-100 text-blue-800',
    completed:   'bg-emerald-100 text-emerald-800',
    cancelled:   'bg-red-100 text-red-800',
    pending:     'bg-orange-100 text-orange-800',
    in_progress: 'bg-blue-100 text-blue-800',
    sent:        'bg-purple-100 text-purple-800',
    paid:        'bg-emerald-100 text-emerald-800',
    received:    'bg-emerald-100 text-emerald-800',
    verified:    'bg-emerald-100 text-emerald-800',
    rejected:    'bg-red-100 text-red-800',
    matched:     'bg-blue-100 text-blue-800',
    reconciled:  'bg-emerald-100 text-emerald-800',
    unmatched:   'bg-red-100 text-red-800',
};

const labels: Record<string, string> = {
    active: 'Aktif', inactive: 'Tidak Aktif', draft: 'Draft',
    confirmed: 'Dikonfirmasi', completed: 'Selesai', cancelled: 'Dibatalkan',
    pending: 'Menunggu', in_progress: 'Dikerjakan', sent: 'Dikirim',
    paid: 'Lunas', received: 'Diterima', verified: 'Terverifikasi',
    rejected: 'Ditolak', matched: 'Cocok', reconciled: 'Rekonsiliasi',
    unmatched: 'Tidak Cocok',
};

export default function StatusBadge({ status }: { status: string }) {
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-700'}`}>
            {labels[status] ?? status}
        </span>
    );
}
