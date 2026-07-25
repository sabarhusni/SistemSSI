import { Head, Link } from '@inertiajs/react';
import { Fragment, useEffect } from 'react';

const fmtRp = (n: any) =>
    'Rp. ' + new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Number(n ?? 0));

// Tanggal gaya dokumen: DD/MM/YYYY (mis. 08/08/2025).
const fmtShort = (d: string) => {
    if (!d) return '—';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '—';
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${dt.getFullYear()}`;
};

function monthsBetween(start: string, end: string): number | null {
    if (!start || !end) return null;
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
    let m = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    if (e.getDate() < s.getDate()) m -= 1;
    return m > 0 ? m : null;
}

const productUnit = (p: any) => p?.unit_of_measure?.symbol ?? p?.unit ?? '';

// Identitas perusahaan penerbit kontrak (kop surat, sama untuk semua tipe layanan).
const COMPANY = {
    name: 'CV. SINERGY SERVE INDONESIA',
    addressLines: ['Sekedengdeur No. 15, Ujungberung', 'Kota Bandung, Jawa Barat 40167'],
};

// Identitas brand & susunan dokumen berbeda per tipe layanan (Pest Control vs Scenting).
const BRANDS: Record<string, { brand: string; tagline: string; signerTitle: string; internalLabel: string }> = {
    pest_control: { brand: 'U-PEST', tagline: 'Pest Management', signerTitle: 'Business Consultant', internalLabel: 'U-Pest' },
    scenting:     { brand: 'U-SCENT', tagline: 'Oil Aroma',       signerTitle: 'Sales Consultant',    internalLabel: 'U-Scent' },
};

// Satu baris dalam kotak informasi: Label : Value.
function InfoRow({ label, value, hint }: { label: string; value?: any; hint?: string }) {
    return (
        <tr>
            <td className="border border-gray-500 px-2 py-1 align-top text-gray-700 w-[42%]">
                {label}
                {hint && <span className="block text-[9px] leading-tight text-gray-400">{hint}</span>}
            </td>
            <td className="border border-gray-500 px-1 py-1 align-top text-center w-3">:</td>
            <td className="border border-gray-500 px-2 py-1 align-top font-medium break-words">{value || ' '}</td>
        </tr>
    );
}

// Judul seksi gaya letterhead (oranye, tebal, garis bawah).
function SectionTitle({ children }: { children: any }) {
    return (
        <h3 className="text-[11px] font-bold uppercase text-amber-600 border-b border-amber-600 mb-1 mt-3">
            {children}
        </h3>
    );
}

// Isi ketentuan kontrak (poin 1–3) dipakai di kotak "Perjanjian".
function PerjanjianItems({ months, start, end, paymentTerms, extra }: { months: number; start: string; end: string; paymentTerms: any; extra?: string }) {
    return (
        <ol className="list-decimal ml-4 space-y-1">
            <li>Jangka waktu kontrak adalah {months} Bulan.</li>
            <li>Dimulai pada tanggal {fmtShort(start)} s/d {fmtShort(end)}, atau terhitung mulai tanggal pekerjaan pertama dilakukan.</li>
            <li>Ketentuan Pembayaran maksimal {paymentTerms} hari setelah invoice diterima.</li>
            {extra && <li>{extra}</li>}
        </ol>
    );
}

// 13 ketentuan baku perjanjian kontrak Scenting (halaman 2).
const SYARAT_SCENTING: string[] = [
    'Pihak Pelanggan sepakat untuk melakukan kerjasama sewa alat mesin Scenting dan Refill Oil Aroma kepada CV. Sinergy Serve Indonesia. Dalam kerja sama tersebut, CV. Sinergy Serve Indonesia akan menyewakan unit mesin Scenting berlaku selama periode kontrak berjalan.',
    'Pihak Pelanggan mengijinkan CV. Sinergy Serve Indonesia untuk melakukan pemasangan mesin Scenting, dan pihak pelanggan mengijinkan CV. Sinergy Serve Indonesia untuk melakukan pelepasan dan penarikan unit apabila kontrak kerjasama tersebut telah berakhir.',
    'Kontrak baru mulai efektif apabila unit mesin Scenting telah terpasang dan terisi Oil Aroma oleh CV. Sinergy Serve Indonesia, atau terhitung sejak pekerjaan pertama dilakukan dan Pelanggan telah menandatangani laporan pekerjaan untuk periode kontrak yang telah disepakati.',
    'Karyawan CV. Sinergy Serve Indonesia yang telah terlatih akan melakukan kunjungan untuk melakukan pengecekan atau perbaikan unit mesin Scenting, pengisian refill Oil Aroma sesuai jadwal dan frekuensi service yang telah disepakati kedua belah pihak untuk memastikan unit yang ada di lokasi pelanggan dapat berfungsi dengan baik selama masa periode kontrak.',
    'CV. Sinergy Serve Indonesia akan mengirimkan invoice dan faktur pajak sebagai bukti penagihan melalui email/WA/ekspedisi.',
    'Semua penagihan akan di bayarkan di awal periode sesuai TOP (term of payment) atau jangka waktu pembayaran yang di sepakati kedua belah pihak.',
    'Pembayaran dilakukan melalui transfer ke bank dan nomor rekening yang tercantum dalam dokumen Invoice.',
    'Pelanggan wajib menjaga semua unit milik CV. Sinergy Serve Indonesia yang terpasang agar terhindar dari pengrusakan atau kehilangan. Apabila terjadi kerusakan dan kehilangan unit mesin Scenting yang disebabkan oleh kelalaian Pihak Pelanggan dimana kerusakan tersebut dapat dibuktikan dan mencapai 75% (tujuh puluh lima persen), maka akan dikenakan biaya denda kehilangan unit sesuai harga yang berlaku di CV. Sinergy Serve Indonesia.',
    'Periode kontrak diberlakukan sesuai jangka waktu di atas dan selanjutnya dapat diperpanjang berdasarkan kesepakatan yang telah disetujui kedua belah pihak pada saat perpanjangan kontrak. Apabila pihak pelanggan tidak ingin melanjutkan kontrak kerjasama, maka pihak pelanggan wajib memberitahukan secara tertulis kepada CV. Sinergy Serve Indonesia minimum 30 hari sebelum jatuh tempo kontrak berakhir. Apabila tidak ada pemberitahuan secara tertulis dari pelanggan, maka kontrak ini akan secara otomatis diperpanjang dengan syarat dan kondisi yang sama dan telah disetujui pihak CV. Sinergy Serve Indonesia.',
    'Hanya pihak CV. Sinergy Serve Indonesia yang berwenang dan berhak melakukan pemasangan, pemindahan, perbaikan, dan pelepasan unit. Apabila terjadi pemindahan atau pelepasan unit oleh pihak lain di lokasi pelanggan, maka CV. Sinergy Serve Indonesia akan memberikan surat teguran kepada Pelanggan.',
    'Apabila terjadi dan atau sampai terjadi kehilangan akibat kelalaian Pelanggan maka CV. Sinergy Serve Indonesia akan mengenakan sanksi berupa penggantian administrasi berdasarkan list harga untuk setiap unitnya.',
    'Segala peristiwa force majeure (banjir, gempa bumi, kebakaran, huru-hara, perubahan peraturan pemerintahan, devaluasi), yaitu peristiwa yang tidak dikehendaki dan terjadi di luar kemampuan kedua belah pihak untuk mencegahnya. Apabila peristiwa force majeure tidak dapat diatasi, sehingga salah satu pihak tidak dapat melakukan kewajibannya berkelanjutan, maka kontrak ini dapat diberhentikan berdasarkan kesepakatan bersama.',
    'Perjanjian ini disetujui dan ditandatangani oleh kedua belah pihak dalam keadaan sehat jasmani dan rohani tanpa ada paksaan dari pihak manapun.',
];

// 12 ketentuan baku perjanjian kontrak Pest Control (halaman 2).
const SYARAT_PEST: string[] = [
    'Seluruh persyaratan dan kondisi dalam perjanjian ini berlaku selama masa perjanjian yang disepakati antara CV. Sinergy Serve Indonesia dan Pelanggan.',
    'CV. Sinergy Serve Indonesia bertanggung jawab melaksanakan pengendalian terhadap semua jenis hama yang telah disepakati kedua belah pihak pada perjanjian ini.',
    'Pelanggan bertanggung jawab untuk bekerjasama dalam hal pelaksanaan rekomendasi tertulis guna memperbaiki sanitasi, menutup akses masuk hama dan lainnya yang bertujuan demi keberhasilan program pengendalian hama ini. Pengguna jasa bertanggung jawab untuk membantu kelancaran semua proses pengendalian hama pada setiap kedatangan teknisi yakni dengan membuka akses masuk ruangan yang akan dikendalikan dan lainnya.',
    'CV. Sinergy Serve Indonesia memberikan garansi pekerjaan berupa pekerjaan ulang tanpa biaya tambahan, jika masih ditemukan adanya permasalahan hama selama masa kontrak berlangsung. Garansi ini tidak berlaku untuk jenis hama serangga terbang dikarenakan daya re-infestasi dan daya jangkaunya sangat tinggi. Garansi ini tidak berlaku untuk kontrak kurang dari 12 bulan. CV. Sinergy Serve Indonesia tidak memberikan garansi kerusakan dan perbaikan bangunan serta isinya. Garansi ini berlaku hanya pada lokasi dan luas area yang tertera dalam perjanjian ini. Garansi berlaku selama kontrak.',
    'CV. Sinergy Serve Indonesia melaksanakan jasanya berdasarkan kepada peraturan perundangan yang berlaku. Jika oleh karena sesuatu hal terdapat perubahaan peraturan perundangan tersebut, CV. Sinergy Serve Indonesia berhak untuk merevisi biaya ataupun membatalkan perjanjian yang telah disepakati.',
    'Jika Pelanggan tidak memenuhi kewajiban pembayarannya pada batas waktu yang telah disetujui, CV. Sinergy Serve Indonesia berhak membatalkan perjanjian atau penundaan pekerjaan sampai kewajiban pembayaran terselesaikan.',
    'Apabila dikemudian hari terjadi perselisihan dalam penafsiran atau pelaksanaan ketentuan-ketentuan dari perjanjian ini, CV. Sinergy Serve Indonesia dan Pelanggan sepakat untuk menyelesaikannya secara musyawarah.',
    'Yang dimaksud dengan force majeure adalah hal-hal darurat yang secara langsung maupun tidak langsung dapat mempengaruhi pelaksanaan pekerjaan yang terjadi di luar kekuasaan/kemampuan manusia serta tidak dapat diduga sebelumnya. Hal-hal yang dapat dikategorikan dalam keadaan force majeure adalah peristiwa-peristiwa yang termasuk, tetapi tidak terbatas pada: Bencana alam (gempa bumi, banjir, wabah penyakit); Tindakan sabotase, peperangan, huru hara nasional; Tindakan pemerintah dalam bidang ekonomi dan keuangan; Curah hujan yang terus menerus sehingga menghambat pelaksanaan pekerjaan.',
    'Force Majeure harus diberitahukan secara tertulis oleh pihak yang terkena kepada pihak lainnya, serta menyertakan bukti-bukti yang sah dari instansi yang berwenang.',
    'Tanggung jawab kedua belah pihak dalam perjanjian ini akan gugur jika masing-masing pihak mengalami hambatan dalam melaksanakan tugas dan kewajibannya dikarenakan peristiwa yang termasuk dalam kategori force majeure pada ayat diatas.',
    'Kedua belah pihak berhak memutuskan kontrak perjanjian jika salah satu pihak tidak melaksanakan ketentuan dan syarat-syarat yang telah disepakati bersama. Pemberitahuan pembatalan diajukan secara tertulis 1 (satu) bulan sebelumnya dan pihak penerima pembatalan wajib memberikan jawaban paling lambat 14 (empatbelas) hari sejak pemberitahuan secara tertulis itu diterima. Pembatalan perjanjian ini dapat terlaksana setelah kedua belah pihak menyelesaikan kewajiban terakhirnya terlebih dahulu.',
    'Perjanjian ini disetujui dan ditandatangani oleh kedua belah pihak dalam keadaan sehat jasmani dan rohani tanpa ada paksaan dari pihak manapun.',
];

export default function Print({ contract, companyName, taxType = 'exclude' }: any) {
    useEffect(() => {
        const t = setTimeout(() => window.print(), 400);
        return () => clearTimeout(t);
    }, []);

    const isPest = contract.service_type === 'pest_control';
    const BRAND = BRANDS[contract.service_type] ?? BRANDS.scenting;
    const SYARAT = isPest ? SYARAT_PEST : SYARAT_SCENTING;

    const customer = contract.customer ?? {};
    const premises = contract.premises ?? [];
    const work = premises[0] ?? {};       // lokasi pekerjaan utama
    const allServices = premises.flatMap((p: any) => p.services ?? []);

    const subtotal = allServices.reduce((s: number, it: any) => s + Number(it.total_price || 0), 0);
    const taxTotal = allServices.reduce((s: number, it: any) => s + Number(it.tax_amount || 0), 0);
    const grandMonthly = taxType === 'exclude' ? subtotal + taxTotal : subtotal;

    const months = contract.duration_months ?? monthsBetween(contract.start_date, contract.end_date) ?? 0;

    // Pest Control ditagih untuk seluruh masa kontrak sekaligus (bukan per bulan),
    // jadi tiap baris & total dikalikan jumlah bulan kontrak.
    const lineContractTotal = (svc: any) => {
        const monthly = taxType === 'exclude' ? Number(svc.total_price || 0) + Number(svc.tax_amount || 0) : Number(svc.total_price || 0);
        return monthly * months;
    };
    const grandContractTotal = Number(contract.contract_value ?? grandMonthly * months);

    const paymentTerms = customer.payment_terms ?? 30;
    const companyNameResolved = companyName || COMPANY.name;

    const workAddress = [work.location, work.address].filter(Boolean).join('\n');
    const custAddress = [customer.address, customer.city, customer.province].filter(Boolean).join(', ');

    const internalOptions = isPest
        ? [{ label: 'Contract', on: true }, { label: 'Job', on: false }, { label: 'Other', on: false }]
        : [{ label: 'Contract', on: true }, { label: 'Job', on: false }, { label: 'Trial', on: false }, { label: 'Other', on: false }];

    return (
        <div className="min-h-screen bg-gray-100 print:bg-white py-8 print:py-0 text-[11px] leading-snug text-gray-900">
            <Head title={`Service Contract ${contract.contract_number}`} />

            <style>{`@media print { @page { size: A4; margin: 12mm; } }`}</style>

            {/* Toolbar — disembunyikan saat mencetak */}
            <div className="max-w-[800px] mx-auto mb-4 flex gap-3 print:hidden">
                <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700"
                >
                    🖨 Print / Save as PDF
                </button>
                <Link href="/contracts" className="px-4 py-2 rounded-md border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50">
                    ← Back to List
                </Link>
            </div>

            {/* ===================== HALAMAN 1 ===================== */}
            <div className="max-w-[800px] mx-auto bg-white shadow print:shadow-none px-10 py-8 print:p-0">

                {/* Kop surat */}
                <div className="flex items-start justify-between border-b-2 border-amber-600 pb-3">
                    <div className="flex items-start gap-2">
                        <img src="/images/logo_ssi_new.png" alt="" className="h-10 w-10 object-contain shrink-0" />
                        <div>
                            <h1 className="text-base font-bold text-amber-700">{companyNameResolved}</h1>
                            {COMPANY.addressLines.map((l, i) => (
                                <p key={i} className="text-[10px] text-gray-600">{l}</p>
                            ))}
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-2xl font-extrabold tracking-tight text-amber-600">{BRAND.brand}</h2>
                        <p className="text-[10px] text-gray-500 -mt-1">{BRAND.tagline}</p>
                    </div>
                </div>

                <h2 className="text-center text-base font-bold uppercase tracking-wide my-3">Service Contract</h2>
                <p className="mb-2">Tanggal: <span className="font-medium">{fmtShort(contract.created_at ?? contract.start_date)}</span></p>

                {/* Dua kotak "Diisi Oleh Internal" */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <table className="w-full border-collapse">
                        <tbody>
                            <tr>
                                <td className="border border-gray-500 bg-amber-100 text-center font-bold text-[10px] px-2 py-1" colSpan={internalOptions.length}>
                                    Diisi Oleh Internal {BRAND.internalLabel}
                                </td>
                            </tr>
                            <tr>
                                {internalOptions.map(o => (
                                    <td key={o.label} className="border border-gray-500 px-2 py-1 whitespace-nowrap">
                                        <span className="inline-block w-3 h-3 border border-gray-600 text-center leading-3 mr-1 align-middle">
                                            {o.on ? '✓' : ' '}
                                        </span>
                                        {o.label}
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                    <table className="w-full border-collapse">
                        <tbody>
                            <tr>
                                <td className="border border-gray-500 bg-amber-100 text-center font-bold text-[10px] px-2 py-1" colSpan={3}>
                                    Diisi Oleh Internal {BRAND.internalLabel}
                                </td>
                            </tr>
                            <InfoRow label="Nomor Contract/Job" value={contract.contract_number} />
                            <InfoRow label="Nomor Akun" value={customer.code} />
                        </tbody>
                    </table>
                </div>

                {isPest ? (
                    /* ── Pest Control: 2x2 — Alamat Pekerjaan / Identitas Pelanggan / Invoice / Perjanjian ── */
                    <div className="grid grid-cols-2 gap-3 items-start">
                        <div>
                            <SectionTitle>Kontak & Alamat Pekerjaan</SectionTitle>
                            <table className="w-full border-collapse">
                                <tbody>
                                    <InfoRow label="Alamat" value={<span className="whitespace-pre-line">{workAddress || custAddress}</span>} />
                                    <InfoRow label="PIC Servis" value={work.pic} />
                                    <InfoRow label="Jabatan" value={customer.jabatan_kontak} />
                                    <InfoRow label="Nomor Telepon" value={work.phone} />
                                    <InfoRow label="Nomor HP" value={work.phone} />
                                    <InfoRow label="Email" value={work.email} />
                                </tbody>
                            </table>
                        </div>

                        <div>
                            <SectionTitle>Identitas Pelanggan</SectionTitle>
                            <table className="w-full border-collapse">
                                <tbody>
                                    <InfoRow label="Nama Perusahaan" hint="(Untuk Badan Usaha PT/CV/Usaha Perorangan)" value={customer.company_name || customer.name} />
                                    <InfoRow label="Nama Perwakilan/Kuasa" value={customer.name} />
                                    <InfoRow label="Alamat" value={<span className="whitespace-pre-line">{custAddress}</span>} />
                                    <InfoRow label="Jabatan" value={customer.jabatan_kontak} />
                                    <InfoRow label="Nomor Telepon" value={customer.phone} />
                                    <InfoRow label="Nomor HP" value={customer.phone} />
                                    <InfoRow label="E-mail" value={customer.email} />
                                    <InfoRow label="Nomor NPWP - KTP" value={customer.npwp} />
                                </tbody>
                            </table>
                        </div>

                        <div>
                            <SectionTitle>Kontak & Alamat Pengiriman Invoice</SectionTitle>
                            <table className="w-full border-collapse">
                                <tbody>
                                    <InfoRow label="Alamat" value={<span className="whitespace-pre-line">{custAddress || workAddress}</span>} />
                                    <InfoRow label="PIC Penagihan" value={customer.name} />
                                    <InfoRow label="Jabatan" value={customer.jabatan_kontak} />
                                    <InfoRow label="Nomor Telepon" value={customer.phone} />
                                    <InfoRow label="Nomor HP" value={customer.phone} />
                                    <InfoRow label="Email" value={customer.email} />
                                </tbody>
                            </table>
                        </div>

                        <div>
                            <SectionTitle>Perjanjian</SectionTitle>
                            <div className="border border-gray-500 px-2 py-1.5 mt-0.5">
                                <PerjanjianItems months={months} start={contract.start_date} end={contract.end_date} paymentTerms={paymentTerms} />
                            </div>
                        </div>
                    </div>
                ) : (
                    /* ── Scenting: 2 kolom — Invoice / Identitas Pelanggan ── */
                    <div className="grid grid-cols-2 gap-3 items-start">
                        <div>
                            <SectionTitle>Kontak & Alamat Pengiriman Invoice</SectionTitle>
                            <table className="w-full border-collapse">
                                <tbody>
                                    <InfoRow label="Alamat" value={<span className="whitespace-pre-line">{custAddress || workAddress}</span>} />
                                    <InfoRow label="PIC Penagihan" value={customer.name} />
                                    <InfoRow label="Jabatan" value={customer.jabatan_kontak} />
                                    <InfoRow label="Nomor Telepon" value={customer.phone} />
                                    <InfoRow label="Nomor HP" value={customer.phone} />
                                    <InfoRow label="Email" value={customer.email} />
                                </tbody>
                            </table>
                        </div>

                        <div>
                            <SectionTitle>Identitas Pelanggan</SectionTitle>
                            <table className="w-full border-collapse">
                                <tbody>
                                    <InfoRow label="Nama Perusahaan" hint="(Untuk Badan Usaha PT/CV/Usaha Perorangan)" value={customer.company_name || customer.name} />
                                    <InfoRow label="Nama Perwakilan/Kuasa" value={customer.name} />
                                    <InfoRow label="Alamat" value={<span className="whitespace-pre-line">{custAddress}</span>} />
                                    <InfoRow label="Jabatan" value={customer.jabatan_kontak} />
                                    <InfoRow label="Nomor Telepon" value={customer.phone} />
                                    <InfoRow label="Nomor HP" value={customer.phone} />
                                    <InfoRow label="E-mail" value={customer.email} />
                                    <InfoRow label="Nomor NPWP - KTP" value={customer.npwp} />
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Biaya pelayanan pekerjaan */}
                <SectionTitle>Biaya Pelayanan Pekerjaan</SectionTitle>
                {isPest ? (
                    <table className="w-full border-collapse text-center">
                        <thead>
                            <tr className="bg-amber-100">
                                <th className="border border-gray-500 px-2 py-1">JENIS LAYANAN</th>
                                <th className="border border-gray-500 px-2 py-1">CAKUPAN HAMA</th>
                                <th className="border border-gray-500 px-2 py-1 w-32">SUB TOTAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allServices.length === 0 && (
                                <tr><td colSpan={3} className="border border-gray-500 px-2 py-2 text-gray-400">Belum ada produk.</td></tr>
                            )}
                            {premises.map((prem: any, pi: number) => {
                                const svcs = prem.services ?? [];
                                if (svcs.length === 0) return null;
                                return (
                                    <Fragment key={pi}>
                                        {premises.length > 1 && (
                                            <tr className="bg-gray-100">
                                                <td className="border border-gray-500 px-2 py-1 text-left font-semibold" colSpan={3}>
                                                    Premis: {prem.location || '—'}
                                                    {prem.address && <span className="font-normal text-gray-600"> — {prem.address}</span>}
                                                </td>
                                            </tr>
                                        )}
                                        {svcs.map((svc: any, i: number) => (
                                            <tr key={i}>
                                                <td className="border border-gray-500 px-2 py-1 text-left">{svc.product?.name ?? '—'}</td>
                                                <td className="border border-gray-500 px-2 py-1 text-left">{svc.location || '—'}</td>
                                                <td className="border border-gray-500 px-2 py-1 text-right">{fmtRp(lineContractTotal(svc))}</td>
                                            </tr>
                                        ))}
                                    </Fragment>
                                );
                            })}
                            <tr className="font-bold bg-amber-50">
                                <td className="border border-gray-500 px-2 py-1 text-right" colSpan={2}>TOTAL HARGA</td>
                                <td className="border border-gray-500 px-2 py-1 text-right">{fmtRp(grandContractTotal)}</td>
                            </tr>
                        </tbody>
                    </table>
                ) : (
                    <table className="w-full border-collapse text-center">
                        <thead>
                            <tr className="bg-amber-100">
                                <th className="border border-gray-500 px-2 py-1">PRODUCT NAME</th>
                                <th className="border border-gray-500 px-2 py-1 w-12">QTY</th>
                                <th className="border border-gray-500 px-2 py-1 w-28">LOKASI</th>
                                <th className="border border-gray-500 px-2 py-1 w-28">UNIT PRICE</th>
                                <th className="border border-gray-500 px-2 py-1 w-32">TOTAL PRICE /BULAN</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allServices.length === 0 && (
                                <tr><td colSpan={5} className="border border-gray-500 px-2 py-2 text-gray-400">Belum ada produk.</td></tr>
                            )}
                            {premises.map((prem: any, pi: number) => {
                                const svcs = prem.services ?? [];
                                if (svcs.length === 0) return null;
                                return (
                                    <Fragment key={pi}>
                                        <tr className="bg-gray-100">
                                            <td className="border border-gray-500 px-2 py-1 text-left font-semibold" colSpan={5}>
                                                Premis: {prem.location || '—'}
                                                {prem.address && <span className="font-normal text-gray-600"> — {prem.address}</span>}
                                                {prem.pic && <span className="font-normal text-gray-600"> | PIC: {prem.pic}</span>}
                                                {prem.phone && <span className="font-normal text-gray-600"> | Telp: {prem.phone}</span>}
                                            </td>
                                        </tr>
                                        {svcs.map((svc: any, i: number) => (
                                            <Fragment key={i}>
                                                <tr>
                                                    <td className="border border-gray-500 px-2 py-1 text-left">
                                                        {svc.product?.name ?? '—'}
                                                        {productUnit(svc.product) && <span className="text-gray-500"> {productUnit(svc.product)}</span>}
                                                    </td>
                                                    <td className="border border-gray-500 px-2 py-1">{svc.quantity}</td>
                                                    <td className="border border-gray-500 px-2 py-1">{svc.location || '—'}</td>
                                                    <td className="border border-gray-500 px-2 py-1 text-right">{fmtRp(svc.unit_price)}</td>
                                                    <td className="border border-gray-500 px-2 py-1 text-right">{fmtRp(svc.total_price)}</td>
                                                </tr>
                                                {(svc.sub_products ?? svc.subProducts ?? []).length > 0 && (
                                                    <tr>
                                                        <td className="border border-gray-500 px-2 py-1 text-left" colSpan={5}>
                                                            <span className="text-[9px] font-semibold text-gray-500">Sub Produk: </span>
                                                            <span className="text-[9px] text-gray-700">
                                                                {(svc.sub_products ?? svc.subProducts).map((sp: any) =>
                                                                    `${sp.product?.name ?? '—'} (${sp.quantity} ${productUnit(sp.product)})`).join(', ')}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        ))}
                                    </Fragment>
                                );
                            })}
                            <tr className="font-bold bg-amber-50">
                                <td className="border border-gray-500 px-2 py-1 text-right" colSpan={4}>TOTAL /BULAN</td>
                                <td className="border border-gray-500 px-2 py-1 text-right">{fmtRp(grandMonthly)}</td>
                            </tr>
                        </tbody>
                    </table>
                )}

                {/* Keterangan & Perjanjian */}
                {isPest ? (
                    <div className="mt-2">
                        <p className="underline font-medium">Keterangan:</p>
                        <ul className="text-[10px] text-gray-700 mt-0.5 space-y-0.5">
                            <li>*Harga sudah termasuk Pajak</li>
                            <li>*Sistem pembayaran full payment / per bulan</li>
                            <li>*Respon keluhan 1x24 Jam</li>
                            {contract.notes && <li className="whitespace-pre-line">*{contract.notes}</li>}
                        </ul>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3 mt-2 items-start">
                        <div>
                            <p className="underline font-medium">Keterangan:</p>
                            <ul className="text-[10px] text-gray-700 mt-0.5 space-y-0.5">
                                <li>*Harga sudah termasuk Pajak</li>
                                <li>*Sistem pembayaran per bulan</li>
                                <li>*Servis dan refill oil aroma 1x / Bulan dan respon keluhan 1x24 Jam</li>
                                {contract.notes && <li className="whitespace-pre-line">*{contract.notes}</li>}
                            </ul>
                        </div>

                        <div>
                            <p className="underline font-medium">Perjanjian:</p>
                            <div className="border border-gray-500 px-2 py-1.5 mt-0.5">
                                <PerjanjianItems
                                    months={months} start={contract.start_date} end={contract.end_date} paymentTerms={paymentTerms}
                                    extra="Durasi dan nominal kontrak dapat berubah sewaktu-waktu sesuai dengan kesepakatan bersama."
                                />
                            </div>
                        </div>
                    </div>
                )}

                <p className="text-justify mt-4">
                    Dengan ini kami menegaskan telah membaca dan setuju dengan syarat ketentuan umum dan ketentuan khusus dan
                    menyatakan bahwa yang bertanda tangan di bawah ini telah berwenang untuk menandatangani perjanjian ini.
                </p>

                {/* Tanda tangan */}
                <div className="grid grid-cols-2 gap-8 mt-6 text-center">
                    <div>
                        <p>{companyNameResolved},</p>
                        <div className="h-16" />
                        <p className="font-medium underline">{contract.sales_employee?.name ?? '(______________)'}</p>
                        <p className="text-gray-600">{BRAND.signerTitle}</p>
                    </div>
                    <div>
                        <p>Pelanggan,</p>
                        <div className="h-16" />
                        <p className="font-medium underline">{customer.name ?? '(______________)'}</p>
                        <p className="text-gray-600">{customer.jabatan_kontak ?? ' '}</p>
                    </div>
                </div>
            </div>

            {/* ===================== HALAMAN 2 ===================== */}
            <div className="max-w-[800px] mx-auto bg-white shadow print:shadow-none px-10 py-8 print:p-0 mt-8 print:mt-0 break-before-page">
                <div className="flex items-start justify-between border-b-2 border-amber-600 pb-3 mb-4">
                    <div className="flex items-start gap-2">
                        <img src="/images/logo_ssi_new.png" alt="" className="h-10 w-10 object-contain shrink-0" />
                        <div>
                            <h1 className="text-base font-bold text-amber-700">{companyNameResolved}</h1>
                            {COMPANY.addressLines.map((l, i) => (
                                <p key={i} className="text-[10px] text-gray-600">{l}</p>
                            ))}
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-2xl font-extrabold tracking-tight text-amber-600">{BRAND.brand}</h2>
                        <p className="text-[10px] text-gray-500 -mt-1">{BRAND.tagline}</p>
                    </div>
                </div>

                <h3 className="text-center font-bold uppercase">Persyaratan</h3>
                <h3 className="text-center font-bold uppercase mb-3">Perjanjian Kontrak</h3>

                <ol className="list-decimal ml-5 space-y-2 text-justify">
                    {SYARAT.map((s, i) => <li key={i}>{s}</li>)}
                </ol>

                <div className="flex justify-end mt-10">
                    <div className="text-center">
                        <p className="mb-1">Paraf Pihak Pelanggan</p>
                        <div className="w-32 h-20 border border-gray-500" />
                    </div>
                </div>
            </div>
        </div>
    );
}
