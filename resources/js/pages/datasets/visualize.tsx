import { AnimatePresence } from 'framer-motion';
import {
    BarChart3,
    Filter,
    LineChart,
    PieChart,
    Sparkles,
    TrendingUp,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import {
    AnimatedCard,
    FadeIn,
    FadeInScale,
    StaggerContainer,
    StaggerItem,
    motion,
} from '@/components/ui/animations';
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

const chartTypeConfig = {
    bar: { label: 'Bar Chart', icon: BarChart3, gradient: 'from-blue-500/20 to-cyan-500/20' },
    line: { label: 'Line Chart', icon: TrendingUp, gradient: 'from-emerald-500/20 to-teal-500/20' },
    pie: { label: 'Pie Chart', icon: PieChart, gradient: 'from-violet-500/20 to-purple-500/20' },
} as const;

export default function VisualizePage({ dataset, data }: Props) {
    const [labelColumn, setLabelColumn] = useState(
        dataset.headers[0] ?? '',
    );
    const [valueColumn, setValueColumn] = useState(
        dataset.headers[1] ?? '',
    );
    const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');
    const [filterColumn, setFilterColumn] = useState('');
    const [filterValue, setFilterValue] = useState('');

    const filterUniqueValues = useMemo(() => {
        if (!filterColumn || data.length === 0) {
            return [];
        }
        const unique = new Set<string>();
        for (const row of data) {
            unique.add(String(row[filterColumn] ?? ''));
        }
        return Array.from(unique).sort();
    }, [data, filterColumn]);

    const filteredData = useMemo(() => {
        if (!filterColumn || !filterValue) {
            return data;
        }
        return data.filter(
            (row) => String(row[filterColumn] ?? '') === filterValue,
        );
    }, [data, filterColumn, filterValue]);

    const chartData = useMemo(() => {
        if (!labelColumn || !valueColumn || filteredData.length === 0) {
            return { categories: [] as string[], values: [] as number[] };
        }

        const aggregated: Record<string, number> = {};
        for (const row of filteredData) {
            const label = String(row[labelColumn] ?? 'Unknown');
            const val = Number(row[valueColumn]) || 0;
            aggregated[label] = (aggregated[label] ?? 0) + val;
        }

        const entries = Object.entries(aggregated)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20);

        return {
            categories: entries.map(([k]) => k),
            values: entries.map(([, v]) => Math.round(v * 100) / 100),
        };
    }, [filteredData, labelColumn, valueColumn]);

    const barLineOptions: ApexCharts.ApexOptions = {
        chart: {
            type: chartType === 'line' ? 'line' : 'bar',
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
            title: { text: valueColumn },
        },
        dataLabels: { enabled: false },
        colors: [
            'var(--chart-1, #3b82f6)',
            'var(--chart-2, #22c55e)',
            'var(--chart-3, #6366f1)',
        ],
        plotOptions: {
            bar: {
                borderRadius: 4,
                columnWidth: '60%',
            },
        },
        tooltip: { theme: 'dark' },
    };

    const pieOptions: ApexCharts.ApexOptions = {
        chart: {
            type: 'pie',
            fontFamily: 'inherit',
            toolbar: {
                show: true,
                tools: {
                    download: true,
                },
                export: {
                    png: { filename: `${dataset.name}-pie-chart` },
                    svg: { filename: `${dataset.name}-pie-chart` },
                },
            },
        },
        labels: chartData.categories,
        legend: {
            position: 'bottom',
        },
        tooltip: { theme: 'dark' },
    };

    const hasData = chartData.values.length > 0;

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
                        <Card className="overflow-hidden">
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
                                    Select columns and chart type to visualize
                                    your data.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="px-4 sm:px-6">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                                                        {h}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>Values (Y-Axis)</Label>
                                        <Select
                                            value={valueColumn}
                                            onValueChange={setValueColumn}
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
                                                        {h}
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
                                                setChartType(
                                                    v as
                                                        | 'bar'
                                                        | 'line'
                                                        | 'pie',
                                                )
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
                                                        'bar' | 'line' | 'pie',
                                                        (typeof chartTypeConfig)[keyof typeof chartTypeConfig],
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
                            </CardContent>
                        </Card>
                    </AnimatedCard>
                </FadeIn>

                {/* Filter Section */}
                <FadeIn>
                    <AnimatedCard delay={0.1}>
                        <Card className="overflow-hidden">
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
                                                <SelectValue placeholder={filterColumn ? 'Select a value' : 'Choose a column first'} />
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
                                            Clear Filter
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
                            <Card className="overflow-hidden">
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
                                    </CardTitle>
                                    <CardDescription>
                                        {valueColumn} by {labelColumn} (top{' '}
                                        {chartData.categories.length} entries)
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="px-4 sm:px-6">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={chartType}
                                            initial={{
                                                opacity: 0,
                                                scale: 0.95,
                                            }}
                                            animate={{
                                                opacity: 1,
                                                scale: 1,
                                            }}
                                            exit={{
                                                opacity: 0,
                                                scale: 0.95,
                                            }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            {chartType === 'pie' ? (
                                                <ReactApexChart
                                                    type="pie"
                                                    options={pieOptions}
                                                    series={chartData.values}
                                                    height={350}
                                                />
                                            ) : (
                                                <ReactApexChart
                                                    type={chartType}
                                                    options={barLineOptions}
                                                    series={[
                                                        {
                                                            name: valueColumn,
                                                            data: chartData.values,
                                                        },
                                                    ]}
                                                    height={350}
                                                />
                                            )}
                                        </motion.div>
                                    </AnimatePresence>
                                </CardContent>
                            </Card>
                        </AnimatedCard>
                    </FadeInScale>
                ) : (
                    <FadeInScale delay={0.15}>
                        <Card>
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

                {/* Additional charts */}
                {hasData && (
                    <StaggerContainer className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {chartType !== 'bar' && (
                            <StaggerItem>
                                <AnimatedCard delay={0.25}>
                                    <Card className="overflow-hidden">
                                        <div className="h-1 bg-gradient-to-r from-blue-500/20 to-cyan-500/20" />
                                        <CardHeader className="px-4 sm:px-6">
                                            <CardTitle className="flex items-center gap-2 text-base">
                                                <BarChart3 className="size-4 text-muted-foreground" />
                                                Bar Chart
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="px-4 sm:px-6">
                                            <ReactApexChart
                                                type="bar"
                                                options={{
                                                    ...barLineOptions,
                                                    chart: {
                                                        ...barLineOptions.chart,
                                                        type: 'bar',
                                                    },
                                                }}
                                                series={[
                                                    {
                                                        name: valueColumn,
                                                        data: chartData.values,
                                                    },
                                                ]}
                                                height={300}
                                            />
                                        </CardContent>
                                    </Card>
                                </AnimatedCard>
                            </StaggerItem>
                        )}
                        {chartType !== 'line' && (
                            <StaggerItem>
                                <AnimatedCard delay={0.3}>
                                    <Card className="overflow-hidden">
                                        <div className="h-1 bg-gradient-to-r from-emerald-500/20 to-teal-500/20" />
                                        <CardHeader className="px-4 sm:px-6">
                                            <CardTitle className="flex items-center gap-2 text-base">
                                                <LineChart className="size-4 text-muted-foreground" />
                                                Line Chart
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="px-4 sm:px-6">
                                            <ReactApexChart
                                                type="line"
                                                options={{
                                                    ...barLineOptions,
                                                    chart: {
                                                        ...barLineOptions.chart,
                                                        type: 'line',
                                                    },
                                                }}
                                                series={[
                                                    {
                                                        name: valueColumn,
                                                        data: chartData.values,
                                                    },
                                                ]}
                                                height={300}
                                            />
                                        </CardContent>
                                    </Card>
                                </AnimatedCard>
                            </StaggerItem>
                        )}
                        {chartType !== 'pie' && (
                            <StaggerItem>
                                <AnimatedCard delay={0.35}>
                                    <Card className="overflow-hidden">
                                        <div className="h-1 bg-gradient-to-r from-violet-500/20 to-purple-500/20" />
                                        <CardHeader className="px-4 sm:px-6">
                                            <CardTitle className="flex items-center gap-2 text-base">
                                                <PieChart className="size-4 text-muted-foreground" />
                                                Pie Chart
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="px-4 sm:px-6">
                                            <ReactApexChart
                                                type="pie"
                                                options={pieOptions}
                                                series={chartData.values}
                                                height={300}
                                            />
                                        </CardContent>
                                    </Card>
                                </AnimatedCard>
                            </StaggerItem>
                        )}
                    </StaggerContainer>
                )}
            </div>
        </DatasetLayout>
    );
}
