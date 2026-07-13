/**
 * Format a date/datetime string to dd/mm/yyyy HH:MM.
 * For date-only strings (YYYY-MM-DD), time is omitted.
 */
export function fmtDate(value: string | null | undefined): string {
    if (!value) return '—';

    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value.trim());

    if (isDateOnly) {
        const [y, m, d] = value.split('-');
        return `${d}/${m}/${y}`;
    }

    const dt = new Date(value);
    if (isNaN(dt.getTime())) return value;

    const dd  = String(dt.getDate()).padStart(2, '0');
    const mm  = String(dt.getMonth() + 1).padStart(2, '0');
    const yyyy = dt.getFullYear();
    const HH  = String(dt.getHours()).padStart(2, '0');
    const MM  = String(dt.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${HH}:${MM}`;
}
