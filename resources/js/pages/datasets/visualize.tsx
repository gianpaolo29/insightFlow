import { AnimatePresence } from 'framer-motion';
import {
    BarChart3,
    Circle,
    Filter,
    Hash,
    LineChart,
    PieChart,
    Sparkles,
    TrendingUp,
    X,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import {
    AnimatedCard,
    FadeIn,
    FadeInScale,
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
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import DatasetLayout from '@/layouts/dataset-layout';

type Dataset = {
    id: number;
    name: string;
    headers: string[];
    row_count: number;
    column_count: number;
};

type Props = {
    dataset: Dataset;
    data: Record<string, unknown>[];
};

type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'donut' | 'scatter';
type AggregationType = 'sum' | 'avg' | 'count' | 'min' | 'max';

const chartTypeConfig: Record<
    ChartType,
    { label: string; icon: typeof BarChart3; gradient: string }
> = {
    bar: {
        label: 'Bar Chart',
        icon: BarChart3,
        gradient: 'from-blue-500/20 to-cyan-500/20',
    },
    line: {
        label: 'Line Chart',
        icon: TrendingUp,
        gradient: 'from-emerald-500/20 to-teal-500/20',
    },
    area: {
        label: 'Area Chart',
        icon: TrendingUp,
        gradient: 'from-sky-500/20 to-indigo-500/20',
    },
    pie: {
        label: 'Pie Chart',
        icon: PieChart,
        gradient: 'from-violet-500/20 to-purple-500/20',
    },
    donut: {
        label: 'Donut Chart',
        icon: Circle,
        gradient: 'from-rose-500/20 to-pink-500/20',
    },
    scatter: {
        label: 'Scatter Plot',
        icon: Hash,
        gradient: 'from-amber-500/20 to-orange-500/20',
    },
};

const aggregationOptions: { value: AggregationType; label: string }[] = [
    { value: 'sum', label: 'Sum' },
    { value: 'avg', label: 'Average' },
    { value: 'count', label: 'Count' },
    { value: 'min', label: 'Min' },
    { value: 'max', label: 'Max' },
];

function isNumeric(values: unknown[]): boolean {
    let numericCount = 0;
    const sample = values.slice(0, 50);
    for (const v of sample) {
        if (v !== null && v !== '' && !isNaN(Number(v))) {
            numericCount++;
        }
    }
    return numericCount / sample.length > 0.5;
}

function formatNumber(n: number): string {
    if (Number.isInteger(n)) return n.toLocaleString();
    return n.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
}

export default function VisualizePage({ dataset, data }: Props) {
    const [labelColumn, setLabelColumn] = useState(dataset.headers[0] ?? '');
    const [valueColumns, setValueColumns] = useState<string[]>([
        dataset.headers[1] ?? '',
    ]);
    const [chartType, setChartType] = useState<ChartType>('bar');
    const [aggregation, setAggregation] = useState<AggregationType>('sum');
    const [filterColumn, setFilterColumn] = useState('');
    const [filterValue, setFilterValue] = useState('');
    const [limit, setLimit] = useState(20);

    // Detect numeric columns
    const numericColumns = useMemo(() => {
        return dataset.headers.filter((h) => {
            const values = data.map((row) => row[h]);
            return isNumeric(values);
        });
    }, [dataset.headers, data]);

    const categoricalColumns = useMemo(() => {
        return dataset.headers.filter((h) => !numericColumns.includes(h));
    }, [dataset.headers, numericColumns]);

    // Filter unique values
    const filterUniqueValues = useMemo(() => {
        if (!filterColumn || data.length === 0) return [];
        const unique = new Set<string>();
        for (const row of data) {
            unique.add(String(row[filterColumn] ?? ''));
        }
        return Array.from(unique).sort();
    }, [data, filterColumn]);

    // Apply filter
    const filteredData = useMemo(() => {
        if (!filterColumn || !filterValue) return data;
        return data.filter(
            (row) => String(row[filterColumn] ?? '') === filterValue,
        );
    }, [data, filterColumn, filterValue]);

    // Aggregate data for each value column
    const aggregate = useCallback(
        (values: number[], type: AggregationType): number => {
            if (values.length === 0) return 0;
            switch (type) {
                case 'sum':
                    return values.reduce((a, b) => a + b, 0);
                case 'avg':
                    return values.reduce((a, b) => a + b, 0) / values.length;
                case 'count':
                    return values.length;
                case 'min':
                    return Math.min(...values);
                case 'max':
                    return Math.max(...values);
            }
        },
        [],
    );

    // Build chart data (multi-series)
    const chartData = useMemo(() => {
        const primaryValue = valueColumns[0];
        if (!labelColumn || !primaryValue || filteredData.length === 0) {
            return { categories: [] as string[], series: [] as number[][] };
        }

        // Group by label
        const grouped: Record<string, Record<string, number[]>> = {};
        for (const row of filteredData) {
            const label = String(row[labelColumn] ?? 'Unknown');
            if (!grouped[label]) grouped[label] = {};
            for (const vc of valueColumns) {
                if (!grouped[label][vc]) grouped[label][vc] = [];
                grouped[label][vc].push(Number(row[vc]) || 0);
            }
        }

        // Aggregate and sort by first value column
        const entries = Object.entries(grouped)
            .map(([label, cols]) => ({
                label,
                values: valueColumns.map((vc) =>
                    Math.round(aggregate(cols[vc] ?? [], aggregation) * 100) /
                    100,
                ),
                sortValue: aggregate(cols[primaryValue] ?? [], aggregation),
            }))
            .sort((a, b) => b.sortValue - a.sortValue)
            .slice(0, limit);

        return {
            categories: entries.map((e) => e.label),
            series: valueColumns.map((_, i) => entries.map((e) => e.values[i])),
        };
    }, [
        filteredData,
        labelColumn,
        valueColumns,
        aggregation,
        limit,
        aggregate,
    ]);

    // Scatter data (paired numeric columns)
    const scatterData = useMemo(() => {
        if (
            chartType !== 'scatter' ||
            valueColumns.length === 0 ||
            !labelColumn
        )
            return [];
        const xCol = labelColumn;
        const yCol = valueColumns[0];
        return filteredData
            .map((row) => ({
                x: Number(row[xCol]) || 0,
                y: Number(row[yCol]) || 0,
            }))
            .slice(0, 500);
    }, [chartType, filteredData, labelColumn, valueColumns]);

    // Summary stats
    const stats = useMemo(() => {
        const primaryValue = valueColumns[0];
        if (!primaryValue || filteredData.length === 0) return null;
        const values = filteredData
            .map((row) => Number(row[primaryValue]))
            .filter((v) => !isNaN(v));
        if (values.length === 0) return null;
        const sum = values.reduce((a, b) => a + b, 0);
        const sorted = [...values].sort((a, b) => a - b);
        return {
            count: values.length,
            sum,
            avg: sum / values.length,
            min: sorted[0],
            max: sorted[sorted.length - 1],
            median:
                sorted.length % 2 === 0
                    ? (sorted[sorted.length / 2 - 1] +
                          sorted[sorted.length / 2]) /
                      2
                    : sorted[Math.floor(sorted.length / 2)],
        };
    }, [filteredData, valueColumns]);

    // Toggle value column for multi-series
    function toggleValueColumn(col: string) {
        setValueColumns((prev) => {
            if (prev.includes(col)) {
                return prev.length > 1 ? prev.filter((c) => c !== col) : prev;
            }
            return [...prev, col];
        });
    }

    const hasData =
        chartType === 'scatter'
            ? scatterData.length > 0
            : chartData.series.length > 0 && chartData.series[0].length > 0;
    const isPieType = chartType === 'pie' || chartType === 'donut';

    const barLineOptions: ApexCharts.ApexOptions = {
        chart: {
            type:
                chartType === 'area'
                    ? 'area'
                    : chartType === 'line'
                      ? 'line'
                      : 'bar',
            toolbar: {
                show: true,
                tools: {
                    download: true,
                    selection: true,
                    zoom: true,
                    zoomin: true,
                    zoomout: true,
                    pan: true,
                    reset: true,
                },
                export: {
                    png: { filename: `${dataset.name}-chart` },
                    svg: { filename: `${dataset.name}-chart` },
                    csv: { filename: `${dataset.name}-data` },
                },
            },
            fontFamily: 'inherit',
            animations: { enabled: true, speed: 500 },
        },
        xaxis: {
            categories: chartData.categories,
            labels: {
                rotate: -45,
                maxHeight: 120,
                style: { fontSize: '11px' },
            },
        },
        yaxis: {
            title: {
                text:
                    valueColumns.length === 1
                        ? valueColumns[0]
                        : `${aggregation.toUpperCase()}`,
            },
            labels: {
                formatter: (v: number) => formatNumber(v),
            },
        },
        dataLabels: { enabled: false },
        colors: [
            '#3b82f6',
            '#22c55e',
            '#f59e0b',
            '#ef4444',
            '#8b5cf6',
            '#06b6d4',
        ],
        plotOptions: {
            bar: { borderRadius: 4, columnWidth: '60%' },
        },
        stroke:
            chartType === 'area'
                ? { curve: 'smooth', width: 2 }
                : { curve: 'smooth' },
        fill:
            chartType === 'area'
                ? { type: 'gradient', gradient: { opacityFrom: 0.5, opacityTo: 0.1 } }
                : {},
        tooltip: { theme: 'dark' },
        legend: {
            show: valueColumns.length > 1,
            position: 'top',
        },
    };

    const pieOptions: ApexCharts.ApexOptions = {
        chart: {
            type: chartType === 'donut' ? 'donut' : 'pie',
            fontFamily: 'inherit',
            toolbar: {
                show: true,
                tools: { download: true },
                export: {
                    png: { filename: `${dataset.name}-pie-chart` },
                    svg: { filename: `${dataset.name}-pie-chart` },
                },
            },
            animations: { enabled: true, speed: 500 },
        },
        labels: chartData.categories,
        legend: { position: 'bottom' },
        tooltip: { theme: 'dark' },
        colors: [
            '#3b82f6',
            '#22c55e',
            '#f59e0b',
            '#ef4444',
            '#8b5cf6',
            '#06b6d4',
            '#ec4899',
            '#14b8a6',
        ],
        plotOptions:
            chartType === 'donut'
                ? {
                      pie: {
                          donut: {
                              size: '55%',
                              labels: { show: true, total: { show: true } },
                          },
                      },
                  }
                : {},
    };

    const scatterOptions: ApexCharts.ApexOptions = {
        chart: {
            type: 'scatter',
            toolbar: { show: true },
            fontFamily: 'inherit',
            zoom: { enabled: true },
        },
        xaxis: { title: { text: labelColumn }, tickAmount: 10 },
        yaxis: {
            title: { text: valueColumns[0] ?? '' },
            labels: { formatter: (v: number) => formatNumber(v) },
        },
        colors: ['#3b82f6'],
        tooltip: { theme: 'dark' },
    };

    function renderChart(
        type: ChartType,
        height: number,
        animate = true,
    ) {
        const wrapper = (content: React.ReactNode) =>
            animate ? (
                <AnimatePresence mode="wait">
                    <motion.div
                        key={type}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                    >
                        {content}
                    </motion.div>
                </AnimatePresence>
            ) : (
                content
            );

        if (type === 'scatter') {
            return wrapper(
                <ReactApexChart
                    type="scatter"
                    options={scatterOptions}
                    series={[
                        {
                            name: `${labelColumn} vs ${valueColumns[0]}`,
                            data: scatterData,
                        },
                    ]}
                    height={height}
                />,
            );
        }

        if (type === 'pie' || type === 'donut') {
            return wrapper(
                <ReactApexChart
                    type={type}
                    options={{
                        ...pieOptions,
                        chart: { ...pieOptions.chart, type },
                    }}
                    series={chartData.series[0] ?? []}
                    height={height}
                />,
            );
        }

        const apexType = type === 'area' ? 'area' : type === 'line' ? 'line' : 'bar';
        return wrapper(
            <ReactApexChart
                type={apexType}
                options={{
                    ...barLineOptions,
                    chart: { ...barLineOptions.chart, type: apexType },
                    stroke:
                        type === 'area'
                            ? { curve: 'smooth' as const, width: 2 }
                            : { curve: 'smooth' as const },
                    fill:
                        type === 'area'
                            ? {
                                  type: 'gradient',
                                  gradient: { opacityFrom: 0.5, opacityTo: 0.1 },
                              }
                            : {},
                }}
                series={valueColumns.map((vc, i) => ({
                    name: vc,
                    data: chartData.series[i] ?? [],
                }))}
                height={height}
            />,
        );
    }

    const alternateTypes = (
        Object.keys(chartTypeConfig) as ChartType[]
    ).filter((t) => t !== chartType && t !== 'scatter');

    return (
        <DatasetLayout
            breadcrumbs={[
                { title: 'Upload', href: '/' },
                { title: dataset.name, href: `/datasets/${dataset.id}` },
                {
                    title: 'Visualize',
                    href: `/datasets/${dataset.id}/visualize`,
                },
            ]}
        >
            <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-6">
                {/* Controls */}
                <FadeIn>
                    <AnimatedCard>
                        <Card className="overflow-hidden border-border/40">
                            <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
                            <CardHeader className="px-4 sm:px-6">
                                <CardTitle className="flex items-center gap-2">
                                    <motion.div
                                        animate={{ rotate: [0, 10, -10, 0] }}
                                        transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                            repeatDelay: 3,
                                        }}
                                    >
                                        <Sparkles className="size-5 text-purple-500" />
                                    </motion.div>
                                    Dashboard Controls
                                </CardTitle>
                                <CardDescription>
                                    Select columns, aggregation, and chart type.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="px-4 sm:px-6">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                    <div>
                                        <Label>Labels (X-Axis)</Label>
                                        <Select
                                            value={labelColumn}
                                            onValueChange={setLabelColumn}
                                        >
                                            <SelectTrigger className="mt-1 w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {dataset.headers.map((h) => (
                                                    <SelectItem
                                                        key={h}
                                                        value={h}
                                                    >
                                                        <span className="flex items-center gap-1.5">
                                                            {numericColumns.includes(
                                                                h,
                                                            ) ? (
                                                                <Hash className="size-3 text-blue-500" />
                                                            ) : (
                                                                <span className="size-3" />
                                                            )}
                                                            {h}
                                                        </span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>Values (Y-Axis)</Label>
                                        <Select
                                            value={valueColumns[0]}
                                            onValueChange={(v) =>
                                                setValueColumns([v])
                                            }
                                        >
                                            <SelectTrigger className="mt-1 w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {dataset.headers.map((h) => (
                                                    <SelectItem
                                                        key={h}
                                                        value={h}
                                                    >
                                                        <span className="flex items-center gap-1.5">
                                                            {numericColumns.includes(
                                                                h,
                                                            ) ? (
                                                                <Hash className="size-3 text-blue-500" />
                                                            ) : (
                                                                <span className="size-3" />
                                                            )}
                                                            {h}
                                                        </span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>Aggregation</Label>
                                        <Select
                                            value={aggregation}
                                            onValueChange={(v) =>
                                                setAggregation(
                                                    v as AggregationType,
                                                )
                                            }
                                        >
                                            <SelectTrigger className="mt-1 w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {aggregationOptions.map((o) => (
                                                    <SelectItem
                                                        key={o.value}
                                                        value={o.value}
                                                    >
                                                        {o.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>Chart Type</Label>
                                        <Select
                                            value={chartType}
                                            onValueChange={(v) =>
                                                setChartType(v as ChartType)
                                            }
                                        >
                                            <SelectTrigger className="mt-1 w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(
                                                    Object.entries(
                                                        chartTypeConfig,
                                                    ) as [
                                                        ChartType,
                                                        (typeof chartTypeConfig)[ChartType],
                                                    ][]
                                                ).map(([key, config]) => {
                                                    const Icon = config.icon;
                                                    return (
                                                        <SelectItem
                                                            key={key}
                                                            value={key}
                                                        >
                                                            <span className="flex items-center gap-2">
                                                                <Icon className="size-4" />
                                                                {config.label}
                                                            </span>
                                                        </SelectItem>
                                                    );
                                                })}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Multi-series toggle */}
                                {!isPieType &&
                                    chartType !== 'scatter' &&
                                    numericColumns.length > 1 && (
                                        <div className="mt-4">
                                            <Label className="text-xs text-muted-foreground">
                                                Compare columns (click to
                                                toggle)
                                            </Label>
                                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                                                {numericColumns.map((col) => (
                                                    <Badge
                                                        key={col}
                                                        variant={
                                                            valueColumns.includes(
                                                                col,
                                                            )
                                                                ? 'default'
                                                                : 'outline'
                                                        }
                                                        className="cursor-pointer select-none transition-all hover:scale-105"
                                                        onClick={() =>
                                                            toggleValueColumn(
                                                                col,
                                                            )
                                                        }
                                                    >
                                                        {col}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                {/* Limit control */}
                                <div className="mt-4 flex items-center gap-3">
                                    <Label className="shrink-0 text-xs text-muted-foreground">
                                        Show top
                                    </Label>
                                    <Select
                                        value={String(limit)}
                                        onValueChange={(v) =>
                                            setLimit(Number(v))
                                        }
                                    >
                                        <SelectTrigger className="w-20">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[10, 20, 30, 50, 100].map((n) => (
                                                <SelectItem
                                                    key={n}
                                                    value={String(n)}
                                                >
                                                    {n}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <span className="text-xs text-muted-foreground">
                                        entries
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </AnimatedCard>
                </FadeIn>

                {/* Summary Stats */}
                {stats && (
                    <FadeIn delay={0.05}>
                        <StaggerContainer className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                            {[
                                { label: 'Count', value: stats.count },
                                { label: 'Sum', value: stats.sum },
                                { label: 'Average', value: stats.avg },
                                { label: 'Median', value: stats.median },
                                { label: 'Min', value: stats.min },
                                { label: 'Max', value: stats.max },
                            ].map((s) => (
                                <StaggerItem key={s.label}>
                                    <Card className="border-border/40">
                                        <CardContent className="p-3 text-center">
                                            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                                {s.label}
                                            </p>
                                            <p className="mt-0.5 text-lg font-bold tabular-nums">
                                                {formatNumber(s.value)}
                                            </p>
                                        </CardContent>
                                    </Card>
                                </StaggerItem>
                            ))}
                        </StaggerContainer>
                    </FadeIn>
                )}

                {/* Filter Section */}
                <FadeIn>
                    <AnimatedCard delay={0.1}>
                        <Card className="overflow-hidden border-border/40">
                            <div className="h-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20" />
                            <CardHeader className="px-4 sm:px-6">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Filter className="size-4 text-amber-500" />
                                    Filter Data
                                    {filterColumn && filterValue && (
                                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-normal text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                            Active
                                        </span>
                                    )}
                                </CardTitle>
                                <CardDescription>
                                    Narrow down the data by filtering on a
                                    specific column value.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="px-4 sm:px-6">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                                    <div className="flex-1">
                                        <Label>Filter Column</Label>
                                        <Select
                                            value={filterColumn}
                                            onValueChange={(v) => {
                                                setFilterColumn(v);
                                                setFilterValue('');
                                            }}
                                        >
                                            <SelectTrigger className="mt-1 w-full">
                                                <SelectValue placeholder="Select a column to filter" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {dataset.headers.map((h) => (
                                                    <SelectItem
                                                        key={h}
                                                        value={h}
                                                    >
                                                        {h}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex-1">
                                        <Label>Filter Value</Label>
                                        <Select
                                            value={filterValue}
                                            onValueChange={setFilterValue}
                                            disabled={!filterColumn}
                                        >
                                            <SelectTrigger className="mt-1 w-full">
                                                <SelectValue
                                                    placeholder={
                                                        filterColumn
                                                            ? 'Select a value'
                                                            : 'Choose a column first'
                                                    }
                                                />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {filterUniqueValues.map((v) => (
                                                    <SelectItem
                                                        key={v}
                                                        value={v}
                                                    >
                                                        {v}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {filterColumn && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setFilterColumn('');
                                                setFilterValue('');
                                            }}
                                        >
                                            <X className="size-4" />
                                            Clear
                                        </Button>
                                    )}
                                </div>
                                {filterColumn && filterValue && (
                                    <motion.p
                                        className="mt-3 text-sm text-muted-foreground"
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                    >
                                        Showing{' '}
                                        <span className="font-medium text-foreground">
                                            {filteredData.length}
                                        </span>{' '}
                                        of{' '}
                                        <span className="font-medium text-foreground">
                                            {data.length}
                                        </span>{' '}
                                        rows where{' '}
                                        <span className="font-medium text-foreground">
                                            {filterColumn}
                                        </span>{' '}
                                        ={' '}
                                        <span className="font-medium text-foreground">
                                            {filterValue}
                                        </span>
                                    </motion.p>
                                )}
                            </CardContent>
                        </Card>
                    </AnimatedCard>
                </FadeIn>

                {/* Main Chart */}
                {hasData ? (
                    <FadeInScale delay={0.15}>
                        <AnimatedCard delay={0.15}>
                            <Card className="overflow-hidden border-border/40">
                                <div
                                    className={`h-1 bg-gradient-to-r ${chartTypeConfig[chartType].gradient}`}
                                />
                                <CardHeader className="px-4 sm:px-6">
                                    <CardTitle className="flex items-center gap-2">
                                        {(() => {
                                            const Icon =
                                                chartTypeConfig[chartType].icon;
                                            return (
                                                <Icon className="size-5 text-muted-foreground" />
                                            );
                                        })()}
                                        {chartTypeConfig[chartType].label}
                                        {valueColumns.length > 1 && (
                                            <Badge
                                                variant="secondary"
                                                className="text-xs"
                                            >
                                                {valueColumns.length} series
                                            </Badge>
                                        )}
                                    </CardTitle>
                                    <CardDescription>
                                        {aggregation.charAt(0).toUpperCase() +
                                            aggregation.slice(1)}{' '}
                                        of {valueColumns.join(', ')} by{' '}
                                        {labelColumn} (top{' '}
                                        {chartType === 'scatter'
                                            ? scatterData.length
                                            : chartData.categories.length}{' '}
                                        entries)
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="px-4 sm:px-6">
                                    {renderChart(chartType, 380)}
                                </CardContent>
                            </Card>
                        </AnimatedCard>
                    </FadeInScale>
                ) : (
                    <FadeInScale delay={0.15}>
                        <Card className="border-border/40">
                            <CardContent className="py-16 text-center">
                                <motion.div
                                    className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted"
                                    animate={{
                                        scale: [1, 1.05, 1],
                                        opacity: [0.7, 1, 0.7],
                                    }}
                                    transition={{
                                        duration: 2.5,
                                        repeat: Infinity,
                                        ease: 'easeInOut',
                                    }}
                                >
                                    <BarChart3 className="size-8 text-muted-foreground" />
                                </motion.div>
                                <motion.p
                                    className="text-muted-foreground"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    Select a label column and a numeric value
                                    column to generate charts.
                                </motion.p>
                            </CardContent>
                        </Card>
                    </FadeInScale>
                )}

                {/* Alternative charts */}
                {hasData && chartType !== 'scatter' && (
                    <StaggerContainer className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {alternateTypes.slice(0, 4).map((type, i) => {
                            const config = chartTypeConfig[type];
                            const Icon = config.icon;
                            return (
                                <StaggerItem key={type}>
                                    <AnimatedCard delay={0.25 + i * 0.05}>
                                        <Card className="overflow-hidden border-border/40">
                                            <div
                                                className={`h-1 bg-gradient-to-r ${config.gradient}`}
                                            />
                                            <CardHeader className="px-4 sm:px-6">
                                                <CardTitle className="flex items-center gap-2 text-base">
                                                    <Icon className="size-4 text-muted-foreground" />
                                                    {config.label}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="px-4 sm:px-6">
                                                {renderChart(type, 300, false)}
                                            </CardContent>
                                        </Card>
                                    </AnimatedCard>
                                </StaggerItem>
                            );
                        })}
                    </StaggerContainer>
                )}
            </div>
        </DatasetLayout>
    );
}
