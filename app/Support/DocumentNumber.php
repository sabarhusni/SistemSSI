<?php

namespace App\Support;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Penomoran dokumen format [NNNN]/[UP|US]-[KIND]/[MMYYYY], mis. 0001/UP-SSI/092026.
 * No urut dipakai bersama untuk UP & US dan tidak di-reset saat ganti tahun.
 */
class DocumentNumber
{
    public static function typeCode(?string $serviceType): string
    {
        return $serviceType === 'scenting' ? 'US' : 'UP';
    }

    /**
     * No urut berikutnya. Baris soft-deleted ikut dihitung agar nomor tidak dipakai
     * ulang; nomor format lama tidak cocok pola sehingga diabaikan.
     */
    public static function nextSequence(string $table, string $column, string $kind): int
    {
        $max = DB::table($table)
            ->whereRaw("{$column} ~ ?", ['^[0-9]{4,}/U[PS]-' . $kind . '/[0-9]{6}$'])
            ->selectRaw("MAX(split_part({$column}, '/', 1)::int) as max_seq")
            ->value('max_seq');

        return ((int) $max) + 1;
    }

    /**
     * Kunci per jenis dokumen selama transaksi berjalan, agar simpan bersamaan
     * tidak mendapat nomor yang sama. Wajib dipanggil di dalam DB::transaction.
     */
    public static function lock(string $table): void
    {
        DB::select('SELECT pg_advisory_xact_lock(hashtext(?))', ['doc_number:' . $table]);
    }

    public static function next(string $table, string $column, string $kind, ?string $serviceType, ?Carbon $date = null): string
    {
        $seq  = self::nextSequence($table, $column, $kind);
        $date = $date ?? Carbon::now();

        return str_pad((string) $seq, 4, '0', STR_PAD_LEFT)
            . '/' . self::typeCode($serviceType) . '-' . $kind
            . '/' . $date->format('mY');
    }
}
