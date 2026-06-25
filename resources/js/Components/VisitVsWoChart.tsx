import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export interface VisitVsWoData {
    year: number;
    months: string[];
    visit_plans: number[];
    work_orders: number[];
}

export default function VisitVsWoChart({ data }: { data: VisitVsWoData }) {
    const { year, months, visit_plans, work_orders } = data;

    const chartData = {
        labels: months,
        datasets: [
            {
                label: 'Visit Plan',
                data: visit_plans,
                backgroundColor: 'rgba(139, 92, 246, 0.85)', // violet-500
                borderRadius: 4,
                maxBarThickness: 28,
            },
            {
                label: 'Work Order',
                data: work_orders,
                backgroundColor: 'rgba(249, 115, 22, 0.85)', // orange-500
                borderRadius: 4,
                maxBarThickness: 28,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index' as const, intersect: false },
        plugins: {
            legend: {
                position: 'top' as const,
                align: 'end' as const,
                labels: { usePointStyle: true, pointStyle: 'rectRounded' as const, boxWidth: 10, padding: 16 },
            },
            tooltip: {
                callbacks: {
                    title: (items: any[]) => `${items[0]?.label} ${year}`,
                },
            },
        },
        scales: {
            x: { grid: { display: false } },
            y: {
                beginAtZero: true,
                ticks: { precision: 0 },
                grid: { color: 'rgba(0,0,0,0.05)' },
            },
        },
    };

    return (
        <div className="bg-white rounded-xl shadow p-5">
            <div className="mb-4">
                <h3 className="font-semibold text-gray-800">Visit Plan vs Work Order</h3>
                <p className="text-xs text-gray-500 mt-0.5">Perbandingan per bulan — tahun {year}</p>
            </div>
            <div style={{ height: 280 }}>
                <Bar data={chartData} options={options} />
            </div>
        </div>
    );
}
