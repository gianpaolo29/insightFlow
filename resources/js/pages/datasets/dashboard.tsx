import {
    ArrowDown,
    ArrowRight,
    ArrowUp,
    BarChart3,
    Columns3,
    Lightbulb,
    Rows3,
    Shield,
    TrendingUp,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import {
    AnimatedCard,
    CountUp,
    FadeIn,
    StaggerContainer,
    StaggerItem,
    motion,
} from '@/components/ui/animations';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import DatasetLayout from '@/layouts/dataset-layout';

type SummaryStats = {
    count: number;
    mean: number;
    median: number;
    std_dev: number;
    min: number;
    max: number;
    range: number;
    sum: number;
};

type Props = {
    dataset: {
        id: number;
        name: string;
        headers: string[];
        row_count: number;
        column_count: number;
    };
    data: Record<string, unknown>[];
    insights: {
        summary: Record<string, SummaryStats>;
        frequent_values: Record<string, Record<string, number>>;
        trends: Record<string, { direction: string; change_pct: number }>;
        correlations: { column_a: string; column_b: string; coefficient: number; strength: string }[];
        anomalies: Record<string, { value: number; z_score: number; row_index: number }[]>;
        interpretations: string[];
    };
    qualityScore: {
        overall: number;
        completeness: number;
        consistency: number;
        validity: number;
        uniqueness: number;
    };
};

function QualityRing({ score, size = 140 }: { score: number; size?: number }) {
    const strokeWidth = 10;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';

    return (
        <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none" strokeWidth={strokeWidth}
                    className="stroke-muted"
                />
                <motion.circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none" stroke={color} strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                />
            </svg>
            <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-bold">{score}</span>
                <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
        </div>
    );
}

function SubScoreBar({ label, value }: { label: string; value: number }) {
    const color = value >= 80 ? 'bg-green-500' : value >= 60 ? 'bg-amber-500' : 'bg-red-500';
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
                <span className="capitalize text-muted-foreground">{label}</span>
                <span className="font-medium">{value}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted">
                <motion.div
                    className={`h-full rounded-full ${color}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
                />
            </div>
        </div>
    );
}

function isNumeric(values: unknown[]): boolean {
    let numericCount = 0;
    const sample = values.slice(0, 50);
    for (const v of sample) {
        if (v !== null && v !== '' && !isNaN(Number(v))) {
            numericCount++;
        }
    }
    return sample.length > 0 && numericCount / sample.length > 0.5;
}

export default function DashboardPage({ dataset, data, insights, qualityScore }: Props) {
    const numericColumns = useMemo(() => {
        return dataset.headers.filter((h) => {
            const values = data.map((row) => row[h]);
            return isNumeric(values);
        });
    }, [dataset.headers, data]);

    const categoricalColumns = useMemo(() => {
        return dataset.headers.filter((h) => !numericColumns.includes(h));
    }, [dataset.headers, numericColumns]);

    const frequentValueColumns = Object.keys(insights.frequent_values);
    const [selectedCategorical, setSelectedCategorical] = useState(frequentValueColumns[0] ?? '');
    const [selectedNumeric, setSelectedNumeric] = useState(numericColumns[0] ?? '');

    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

    const qualityColor = qualityScore.overall >= 80
        ? 'text-green-600 dark:text-green-400'
        : qualityScore.overall >= 60
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-red-600 dark:text-red-400';

    // Bar chart: top 5 frequent values for selected categorical column
    const barChartData = useMemo(() => {
        const freqValues = insights.frequent_values[selectedCategorical];
        if (!freqValues) return { categories: [] as string[], values: [] as number[] };
        const entries = Object.entries(freqValues).slice(0, 5);
        return { categories: entries.map(([k]) => k), values: entries.map(([, v]) => v) };
    }, [insights.frequent_values, selectedCategorical]);

    const barChartOptions: ApexCharts.ApexOptions = {
        chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 500 } },
        xaxis: { categories: barChartData.categories, labels: { style: { fontSize: '11px' } } },
        yaxis: { labels: { formatter: (v: number) => Math.round(v).toLocaleString() } },
        plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
        colors: ['#8b5cf6'],
        dataLabels: { enabled: false },
        tooltip: { theme: isDark ? 'dark' : 'light' },
    };

    // Line chart: first 20 data points for selected numeric column
    const lineChartData = useMemo(() => {
        return data.slice(0, 20).map((row) => Number(row[selectedNumeric]) || 0);
    }, [data, selectedNumeric]);

    const lineChartOptions: ApexCharts.ApexOptions = {
        chart: { type: 'line', toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: true, speed: 500 } },
        xaxis: { labels: { show: false } },
        yaxis: { labels: { formatter: (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 2 }) } },
        stroke: { curve: 'smooth', width: 2 },
        colors: ['#3b82f6'],
        dataLabels: { enabled: false },
        tooltip: { theme: isDark ? 'dark' : 'light' },
    };

    // Correlation heatmap helpers
    const sortedCorrelations = [...(insights.correlations ?? [])].sort(
        (a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient),
    );

    function getCorrBg(coefficient: number): string {
        const abs = Math.abs(coefficient);
        if (abs >= 0.7) {
            return coefficient > 0
                ? 'bg-green-200 dark:bg-green-900/60'
                : 'bg-red-200 dark:bg-red-900/60';
        }
        if (abs >= 0.4) {
            return coefficient > 0
                ? 'bg-green-100 dark:bg-green-950/40'
                : 'bg-red-100 dark:bg-red-950/40';
        }
        return 'bg-slate-50 dark:bg-slate-900';
    }

    return (
        <DatasetLayout
            breadcrumbs={[
                { title: 'Upload', href: '/' },
                { title: dataset.name, href: `/datasets/${dataset.id}` },
                { title: 'Dashboard', href: `/datasets/${dataset.id}/dashboard` },
            ]}
        >
            <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-6">
                {/* Stat Cards */}
                <StaggerContainer className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {[
                        { label: 'Total Rows', value: dataset.row_count, icon: Rows3, color: 'text-blue-500' },
                        { label: 'Total Columns', value: dataset.column_count, icon: Columns3, color: 'text-emerald-500' },
                        { label: 'Quality Score', value: qualityScore.overall, icon: Shield, color: qualityColor },
                        { label: 'Numeric Columns', value: numericColumns.length, icon: TrendingUp, color: 'text-purple-500' },
                    ].map((stat) => (
                        <StaggerItem key={stat.label}>
                            <Card className="border-border/40">
                                <CardContent className="flex items-center gap-3 p-4">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                                        <stat.icon className={`size-5 ${stat.color}`} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-xs text-muted-foreground">{stat.label}</p>
                                        <p className="text-xl font-bold tabular-nums">
                                            <CountUp value={stat.value} />
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </StaggerItem>
                    ))}
                </StaggerContainer>

                {/* Quality Score Ring + Charts Row */}
                <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
                    {/* Quality Ring */}
                    <AnimatedCard delay={0.1}>
                        <Card className="border-border/40">
                            <CardHeader className="px-4 sm:px-6">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Shield className="size-4 text-blue-500" />
                                    Data Quality
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center gap-4 px-4 sm:px-6">
                                <QualityRing score={qualityScore.overall} />
                                <div className="w-full space-y-2">
                                    <SubScoreBar label="completeness" value={qualityScore.completeness} />
                                    <SubScoreBar label="consistency" value={qualityScore.consistency} />
                                    <SubScoreBar label="validity" value={qualityScore.validity} />
                                    <SubScoreBar label="uniqueness" value={qualityScore.uniqueness} />
                                </div>
                            </CardContent>
                        </Card>
                    </AnimatedCard>

                    {/* Categorical Bar Chart */}
                    <AnimatedCard delay={0.15}>
                        <Card className="border-border/40">
                            <CardHeader className="px-4 sm:px-6">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <BarChart3 className="size-4 text-violet-500" />
                                    Top Values
                                </CardTitle>
                                <CardDescription>
                                    {frequentValueColumns.length > 1 && (
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {frequentValueColumns.map((col) => (
                                                <Button
                                                    key={col}
                                                    variant={selectedCategorical === col ? 'default' : 'outline'}
                                                    size="sm"
                                                    className="h-6 text-xs"
                                                    onClick={() => setSelectedCategorical(col)}
                                                >
                                                    {col}
                                                </Button>
                                            ))}
                                        </div>
                                    )}
                                    {frequentValueColumns.length <= 1 && selectedCategorical && (
                                        <span>{selectedCategorical}</span>
                                    )}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="px-4 sm:px-6">
                                {barChartData.categories.length > 0 ? (
                                    <ReactApexChart
                                        type="bar"
                                        options={barChartOptions}
                                        series={[{ name: 'Count', data: barChartData.values }]}
                                        height={220}
                                    />
                                ) : (
                                    <p className="py-8 text-center text-sm text-muted-foreground">No categorical data available.</p>
                                )}
                            </CardContent>
                        </Card>
                    </AnimatedCard>

                    {/* Numeric Line Chart */}
                    <AnimatedCard delay={0.2}>
                        <Card className="border-border/40">
                            <CardHeader className="px-4 sm:px-6">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <TrendingUp className="size-4 text-blue-500" />
                                    Data Points
                                </CardTitle>
                                <CardDescription>
                                    {numericColumns.length > 1 && (
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {numericColumns.map((col) => (
                                                <Button
                                                    key={col}
                                                    variant={selectedNumeric === col ? 'default' : 'outline'}
                                                    size="sm"
                                                    className="h-6 text-xs"
                                                    onClick={() => setSelectedNumeric(col)}
                                                >
                                                    {col}
                                                </Button>
                                            ))}
                                        </div>
                                    )}
                                    {numericColumns.length <= 1 && selectedNumeric && (
                                        <span>First 20 rows of {selectedNumeric}</span>
                                    )}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="px-4 sm:px-6">
                                {lineChartData.length > 0 ? (
                                    <ReactApexChart
                                        type="line"
                                        options={lineChartOptions}
                                        series={[{ name: selectedNumeric, data: lineChartData }]}
                                        height={220}
                                    />
                                ) : (
                                    <p className="py-8 text-center text-sm text-muted-foreground">No numeric data available.</p>
                                )}
                            </CardContent>
                        </Card>
                    </AnimatedCard>
                </div>

                {/* Key Insights */}
                {insights.interpretations.length > 0 && (
                    <AnimatedCard delay={0.25}>
                        <Card className="overflow-hidden border-border/40">
                            <CardHeader className="px-4 sm:px-6">
                                <CardTitle className="flex items-center gap-2">
                                    <Lightbulb className="size-5 text-amber-500" />
                                    <span className="bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent dark:from-purple-400 dark:to-blue-300">
                                        Key Insights
                                    </span>
                                </CardTitle>
                                <CardDescription>Automatically generated interpretations of your data.</CardDescription>
                            </CardHeader>
                            <CardContent className="px-4 sm:px-6">
                                <StaggerContainer className="space-y-3">
                                    {insights.interpretations.map((text, i) => (
                                        <StaggerItem key={i}>
                                            <div className="flex items-start gap-3 rounded-lg border-l-4 border-l-amber-400 bg-amber-50/50 p-3 text-sm transition-colors hover:bg-amber-50 dark:border-l-amber-500 dark:bg-amber-950/20 dark:hover:bg-amber-950/30">
                                                <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-500" />
                                                <span>{text}</span>
                                            </div>
                                        </StaggerItem>
                                    ))}
                                </StaggerContainer>
                            </CardContent>
                        </Card>
                    </AnimatedCard>
                )}

                {/* Correlation Heatmap */}
                {sortedCorrelations.length > 0 && (
                    <AnimatedCard delay={0.3}>
                        <Card className="border-border/40">
                            <CardHeader className="px-4 sm:px-6">
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="size-5 text-blue-500" />
                                    <span className="bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent dark:from-purple-400 dark:to-blue-300">
                                        Correlation Heatmap
                                    </span>
                                </CardTitle>
                                <CardDescription>Pairwise correlations between numeric columns.</CardDescription>
                            </CardHeader>
                            <CardContent className="px-4 sm:px-6">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20">
                                                <th className="px-3 py-2.5 text-left font-semibold">Column A</th>
                                                <th className="px-3 py-2.5 text-left font-semibold">Column B</th>
                                                <th className="px-3 py-2.5 text-left font-semibold">Coefficient</th>
                                                <th className="px-3 py-2.5 text-left font-semibold">Strength</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedCorrelations.map((corr, i) => (
                                                <motion.tr
                                                    key={i}
                                                    className={`border-t transition-colors ${getCorrBg(corr.coefficient)}`}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ duration: 0.3, delay: i * 0.04, ease: 'easeOut' }}
                                                >
                                                    <td className="px-3 py-2 font-medium">{corr.column_a}</td>
                                                    <td className="px-3 py-2 font-medium">{corr.column_b}</td>
                                                    <td className="px-3 py-2">
                                                        <Badge variant="secondary">
                                                            {corr.coefficient > 0 ? '+' : ''}{corr.coefficient.toFixed(3)}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-3 py-2 text-xs font-medium">{corr.strength}</td>
                                                </motion.tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </AnimatedCard>
                )}

                {/* Trends */}
                {Object.keys(insights.trends).length > 0 && (
                    <AnimatedCard delay={0.35}>
                        <Card className="border-border/40">
                            <CardHeader className="px-4 sm:px-6">
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="size-5 text-emerald-500" />
                                    <span className="bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent dark:from-purple-400 dark:to-blue-300">
                                        Trends
                                    </span>
                                </CardTitle>
                                <CardDescription>Detected patterns across numeric columns.</CardDescription>
                            </CardHeader>
                            <CardContent className="px-4 sm:px-6">
                                <StaggerContainer className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                                    {Object.entries(insights.trends).map(([col, trend]) => {
                                        const isUp = trend.direction === 'increasing';
                                        const isDown = trend.direction === 'decreasing';
                                        const TrendIcon = isUp ? ArrowUp : isDown ? ArrowDown : ArrowRight;
                                        const trendColor = isUp
                                            ? 'text-green-600 dark:text-green-400'
                                            : isDown
                                              ? 'text-red-600 dark:text-red-400'
                                              : 'text-muted-foreground';
                                        const borderColor = isUp
                                            ? 'border-green-200 dark:border-green-800'
                                            : isDown
                                              ? 'border-red-200 dark:border-red-800'
                                              : 'border-border';

                                        return (
                                            <StaggerItem key={col}>
                                                <motion.div
                                                    whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
                                                    className={`flex items-center gap-3 rounded-lg border p-3 sm:p-4 ${borderColor}`}
                                                >
                                                    <div className={`flex size-10 shrink-0 items-center justify-center rounded-full bg-muted`}>
                                                        <TrendIcon className={`size-5 ${trendColor}`} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate font-medium">{col}</p>
                                                        <p className={`text-xs sm:text-sm ${trendColor}`}>
                                                            {trend.direction} ({trend.change_pct > 0 ? '+' : ''}{trend.change_pct}%)
                                                        </p>
                                                    </div>
                                                </motion.div>
                                            </StaggerItem>
                                        );
                                    })}
                                </StaggerContainer>
                            </CardContent>
                        </Card>
                    </AnimatedCard>
                )}
            </div>
        </DatasetLayout>
    );
}
