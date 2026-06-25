import { Link } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

export interface VisitEvent {
    id: string;
    visit_number: number;
    date: string;                 // YYYY-MM-DD
    contract_number?: string | null;
    so_number?: string | null;
    wo_id?: string | null;
    wo_number?: string | null;
    technician?: string | null;
    time_in?: string | null;      // HH:MM
    time_out?: string | null;     // HH:MM
    status?: string | null;
}

type View = 'month' | 'week' | 'day' | 'hour';

const VIEW_LABELS: { value: View; label: string }[] = [
    { value: 'month', label: 'Bulan' },
    { value: 'week',  label: 'Minggu' },
    { value: 'day',   label: 'Hari' },
    { value: 'hour',  label: 'Jam' },
];

const DOW = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
// Rentang jam yang ditampilkan pada tampilan Jam (timeline harian).
const DAY_START_HOUR = 6;
const DAY_END_HOUR = 21;

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
};
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfWeek = (d: Date) => addDays(d, -d.getDay()); // Minggu sebagai awal pekan
const isToday = (d: Date) => ymd(d) === ymd(new Date());
const timeToMin = (t?: string | null) => {
    if (!t) return null;
    const [h, m] = String(t).split(':').map(Number);
    if (!Number.isFinite(h)) return null;
    return h * 60 + (Number.isFinite(m) ? m : 0);
};

// Warna chip menurut status WO; visit plan tanpa WO ditandai netral (amber).
const statusStyle = (e: VisitEvent) => {
    if (!e.wo_id) return 'bg-amber-50 border-amber-300 text-amber-800';
    switch (e.status) {
        case 'completed':   return 'bg-emerald-50 border-emerald-300 text-emerald-800';
        case 'in_progress': return 'bg-blue-50 border-blue-300 text-blue-800';
        case 'cancelled':   return 'bg-gray-100 border-gray-300 text-gray-500 line-through';
        default:            return 'bg-red-50 border-red-300 text-red-800'; // pending
    }
};

const timeLabel = (e: VisitEvent) => {
    if (e.time_in && e.time_out) return `${e.time_in}–${e.time_out}`;
    if (e.time_in) return e.time_in;
    return '';
};

// Ringkasan teks untuk atribut title (hover).
const eventTitle = (e: VisitEvent) => {
    const parts = [
        `Visit ${e.visit_number}`,
        e.contract_number ? `Kontrak ${e.contract_number}` : null,
        e.so_number ? `SO ${e.so_number}` : null,
        e.wo_number ? `WO ${e.wo_number}` : 'Belum ada WO',
        e.technician ? `Teknisi: ${e.technician}` : 'Teknisi: -',
        timeLabel(e) ? `Jam ${timeLabel(e)}` : null,
    ].filter(Boolean);
    return parts.join(' • ');
};

function EventChip({ e, compact = false, onSelect }: { e: VisitEvent; compact?: boolean; onSelect: (e: VisitEvent) => void }) {
    return (
        <button
            type="button"
            onClick={() => onSelect(e)}
            title={eventTitle(e)}
            className={`block w-full text-left rounded border px-1.5 py-1 text-xs leading-tight transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-red-400 ${statusStyle(e)}`}
        >
            <div className="flex items-center justify-between gap-1">
                <span className="font-semibold truncate">
                    {e.wo_number ?? e.contract_number ?? `Visit ${e.visit_number}`}
                </span>
                {timeLabel(e) && <span className="shrink-0 tabular-nums opacity-80">{timeLabel(e)}</span>}
            </div>
            {/* Jadwal tanpa WO: tampilkan no kontrak juga pada baris ringkas (mode month/week). */}
            {compact && !e.wo_id && e.contract_number && (
                <div className="truncate opacity-80">Visit {e.visit_number}</div>
            )}
            {!compact && (
                <div className="mt-0.5 space-y-0.5">
                    <div className="truncate">{e.technician ?? 'Teknisi: -'}</div>
                    <div className="truncate opacity-80">{e.contract_number ?? e.so_number ?? '—'}</div>
                </div>
            )}
        </button>
    );
}

const STATUS_LABEL: Record<string, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
};

function EventDialog({ e, onClose }: { e: VisitEvent; onClose: () => void }) {
    useEffect(() => {
        const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const dateLabel = (() => {
        const d = parseYmd(e.date);
        return `${DOW[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    })();
    const category = e.wo_id ? `WO ${STATUS_LABEL[e.status ?? ''] ?? e.status ?? ''}` : 'Visit Plan (belum ada WO)';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden">
                <div className="flex items-start justify-between px-5 py-4 border-b">
                    <div>
                        <h3 className="font-semibold text-gray-800">Detail Jadwal Visit</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{dateLabel}{timeLabel(e) ? ` • ${timeLabel(e)}` : ''}</p>
                    </div>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
                </div>

                <div className="px-5 py-4 space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${statusStyle(e)}`}>{category}</span>
                        <span className="text-xs text-gray-400">Visit ke-{e.visit_number}</span>
                    </div>

                    <DetailRow label="No. Kontrak" value={e.contract_number} />
                    <DetailRow label="No. SO" value={e.so_number} mono />
                    <DetailRow label="No. WO" value={e.wo_number} mono empty="Belum dibuatkan WO" />
                    <DetailRow label="Nama Teknisi" value={e.technician} empty="Belum ditugaskan" />
                </div>

                <div className="px-5 py-3 bg-gray-50 border-t flex justify-end gap-2">
                    {e.wo_id && (
                        <Link href={`/work-orders/${e.wo_id}`} className="px-4 py-1.5 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700">
                            Buka Work Order
                        </Link>
                    )}
                    <button type="button" onClick={onClose} className="px-4 py-1.5 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-white">Tutup</button>
                </div>
            </div>
        </div>
    );
}

const DetailRow = ({ label, value, mono = false, empty = '—' }: { label: string; value?: string | null; mono?: boolean; empty?: string }) => (
    <div className="flex justify-between gap-4">
        <span className="text-gray-500 shrink-0">{label}</span>
        <span className={`text-gray-800 text-right ${mono ? 'font-mono' : ''} ${!value ? 'text-gray-400 italic font-normal' : ''}`}>{value || empty}</span>
    </div>
);

export default function VisitCalendar({ events = [] }: { events: VisitEvent[] }) {
    const [view, setView] = useState<View>('month');
    const [cursor, setCursor] = useState<Date>(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
    const [technician, setTechnician] = useState<string>('');
    const [selected, setSelected] = useState<VisitEvent | null>(null);

    // Daftar teknisi unik untuk filter.
    const technicians = useMemo(() => {
        const set = new Set<string>();
        events.forEach(e => { if (e.technician) set.add(e.technician); });
        return Array.from(set).sort();
    }, [events]);

    const filtered = useMemo(
        () => (technician ? events.filter(e => e.technician === technician) : events),
        [events, technician]
    );

    // Kelompokkan event per tanggal (YYYY-MM-DD), urut menurut jam mulai.
    const byDate = useMemo(() => {
        const map = new Map<string, VisitEvent[]>();
        for (const e of filtered) {
            if (!e.date) continue;
            if (!map.has(e.date)) map.set(e.date, []);
            map.get(e.date)!.push(e);
        }
        for (const list of map.values()) {
            list.sort((a, b) => (timeToMin(a.time_in) ?? 1e9) - (timeToMin(b.time_in) ?? 1e9) || a.visit_number - b.visit_number);
        }
        return map;
    }, [filtered]);

    const eventsOn = (d: Date) => byDate.get(ymd(d)) ?? [];

    const navigate = (dir: number) => {
        if (view === 'month') { const x = new Date(cursor); x.setMonth(x.getMonth() + dir); setCursor(x); }
        else if (view === 'week') setCursor(addDays(cursor, dir * 7));
        else setCursor(addDays(cursor, dir)); // day & hour
    };
    const goToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); setCursor(d); };

    const title = useMemo(() => {
        if (view === 'month') return `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
        if (view === 'week') {
            const s = startOfWeek(cursor), e = addDays(s, 6);
            return `${s.getDate()} ${MONTHS[s.getMonth()].slice(0, 3)} – ${e.getDate()} ${MONTHS[e.getMonth()].slice(0, 3)} ${e.getFullYear()}`;
        }
        return `${DOW[cursor.getDay()]}, ${cursor.getDate()} ${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
    }, [view, cursor]);

    return (
        <div className="bg-white rounded-xl shadow p-5">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-800">Jadwal Visit Plan</h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {technicians.length > 0 && (
                        <select
                            value={technician}
                            onChange={e => setTechnician(e.target.value)}
                            className="text-sm border rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-400"
                        >
                            <option value="">Semua Teknisi</option>
                            {technicians.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    )}
                    <div className="inline-flex rounded-md border overflow-hidden">
                        {VIEW_LABELS.map(v => (
                            <button
                                key={v.value}
                                type="button"
                                onClick={() => setView(v.value)}
                                className={`px-3 py-1.5 text-sm transition ${view === v.value ? 'bg-red-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                            >
                                {v.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Navigasi */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1">
                    <button type="button" onClick={() => navigate(-1)} className="px-2.5 py-1 rounded border text-gray-600 hover:bg-gray-50">‹</button>
                    <button type="button" onClick={goToday} className="px-3 py-1 rounded border text-sm text-gray-600 hover:bg-gray-50">Hari ini</button>
                    <button type="button" onClick={() => navigate(1)} className="px-2.5 py-1 rounded border text-gray-600 hover:bg-gray-50">›</button>
                </div>
                <div className="text-sm font-medium text-gray-700">{title}</div>
            </div>

            {view === 'month' && <MonthView cursor={cursor} eventsOn={eventsOn} onSelect={setSelected} />}
            {view === 'week'  && <WeekView  cursor={cursor} eventsOn={eventsOn} onSelect={setSelected} />}
            {view === 'day'   && <DayView   cursor={cursor} events={eventsOn(cursor)} onSelect={setSelected} />}
            {view === 'hour'  && <HourView  cursor={cursor} events={eventsOn(cursor)} onSelect={setSelected} />}

            {selected && <EventDialog e={selected} onClose={() => setSelected(null)} />}

            {/* Legenda */}
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500">
                <Legend cls="bg-amber-300" label="Visit plan (belum ada WO)" />
                <Legend cls="bg-red-400" label="WO pending" />
                <Legend cls="bg-blue-400" label="WO in progress" />
                <Legend cls="bg-emerald-400" label="WO completed" />
            </div>
        </div>
    );
}

const Legend = ({ cls, label }: { cls: string; label: string }) => (
    <span className="inline-flex items-center gap-1.5"><span className={`inline-block w-3 h-3 rounded-sm ${cls}`} />{label}</span>
);

function MonthView({ cursor, eventsOn, onSelect }: { cursor: Date; eventsOn: (d: Date) => VisitEvent[]; onSelect: (e: VisitEvent) => void }) {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const gridStart = startOfWeek(first);
    const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

    return (
        <div className="overflow-x-auto">
            <div className="min-w-[760px]">
                <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-500 border-b">
                    {DOW.map(d => <div key={d} className="py-2">{d}</div>)}
                </div>
                <div className="grid grid-cols-7">
                    {days.map((d, i) => {
                        const inMonth = d.getMonth() === cursor.getMonth();
                        const list = eventsOn(d);
                        return (
                            <div key={i} className={`min-h-[112px] border-b border-r p-1.5 ${i % 7 === 0 ? 'border-l' : ''} ${inMonth ? 'bg-white' : 'bg-gray-50'}`}>
                                <div className={`text-xs mb-1 flex items-center justify-center w-6 h-6 rounded-full ${isToday(d) ? 'bg-red-600 text-white' : inMonth ? 'text-gray-700' : 'text-gray-400'}`}>
                                    {d.getDate()}
                                </div>
                                <div className="space-y-1">
                                    {list.slice(0, 3).map(e => <EventChip key={e.id} e={e} compact onSelect={onSelect} />)}
                                    {list.length > 3 && <div className="text-[11px] text-gray-400 pl-1">+{list.length - 3} lainnya</div>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function WeekView({ cursor, eventsOn, onSelect }: { cursor: Date; eventsOn: (d: Date) => VisitEvent[]; onSelect: (e: VisitEvent) => void }) {
    const start = startOfWeek(cursor);
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

    return (
        <div className="overflow-x-auto">
            <div className="grid grid-cols-7 gap-2 min-w-[840px]">
                {days.map((d, i) => {
                    const list = eventsOn(d);
                    return (
                        <div key={i} className="border rounded-lg overflow-hidden flex flex-col">
                            <div className={`text-center py-1.5 text-xs font-medium border-b ${isToday(d) ? 'bg-red-600 text-white' : 'bg-gray-50 text-gray-600'}`}>
                                {DOW[d.getDay()]} {d.getDate()}
                            </div>
                            <div className="p-1.5 space-y-1 flex-1 min-h-[120px]">
                                {list.length === 0
                                    ? <div className="text-[11px] text-gray-300 text-center pt-2">—</div>
                                    : list.map(e => <EventChip key={e.id} e={e} compact onSelect={onSelect} />)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function DayView({ events, onSelect }: { cursor: Date; events: VisitEvent[]; onSelect: (e: VisitEvent) => void }) {
    if (events.length === 0) {
        return <div className="text-center text-gray-400 text-sm py-10 border rounded-lg">Tidak ada jadwal visit pada tanggal ini.</div>;
    }
    return (
        <div className="space-y-2">
            {events.map(e => (
                <button
                    key={e.id}
                    type="button"
                    onClick={() => onSelect(e)}
                    className={`block w-full text-left rounded-lg border px-3 py-2 transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-red-400 ${statusStyle(e)}`}
                >
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <div className="font-semibold truncate">
                                {e.wo_number ? `WO ${e.wo_number}` : `Visit ${e.visit_number} (belum ada WO)`}
                            </div>
                            <div className="text-xs mt-0.5 truncate">
                                Teknisi: {e.technician ?? '-'}
                                {e.contract_number ? ` • Kontrak ${e.contract_number}` : ''}
                                {e.so_number ? ` • SO ${e.so_number}` : ''}
                            </div>
                        </div>
                        <div className="text-sm tabular-nums shrink-0">{timeLabel(e) || 'Tanpa jam'}</div>
                    </div>
                </button>
            ))}
        </div>
    );
}

function HourView({ events, onSelect }: { cursor: Date; events: VisitEvent[]; onSelect: (e: VisitEvent) => void }) {
    const hours = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => DAY_START_HOUR + i);
    const noTime = events.filter(e => timeToMin(e.time_in) === null);
    const byHour = (h: number) => events.filter(e => {
        const m = timeToMin(e.time_in);
        return m !== null && Math.floor(m / 60) === h;
    });

    return (
        <div className="border rounded-lg overflow-hidden">
            {noTime.length > 0 && (
                <div className="flex border-b bg-amber-50/40">
                    <div className="w-16 shrink-0 px-2 py-2 text-xs text-gray-400 border-r">Tanpa jam</div>
                    <div className="flex-1 p-1.5 space-y-1">
                        {noTime.map(e => <EventChip key={e.id} e={e} onSelect={onSelect} />)}
                    </div>
                </div>
            )}
            {hours.map(h => {
                const list = byHour(h);
                return (
                    <div key={h} className="flex border-b last:border-0 min-h-[52px]">
                        <div className="w-16 shrink-0 px-2 py-2 text-xs text-gray-400 border-r tabular-nums">{pad(h)}:00</div>
                        <div className="flex-1 p-1.5 space-y-1">
                            {list.map(e => <EventChip key={e.id} e={e} onSelect={onSelect} />)}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
