import {
    AlertTriangle,
    BarChart3,
    GitCompareArrows,
    Lightbulb,
    TrendingDown,
    TrendingUp,
} from 'lucide-react';
import { useState } from 'react';
import {
    AnimatedCard,
    FadeIn,
    motion,
    StaggerContainer,
    StaggerItem,
} from '@/components/ui/animations';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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

type Trend = {
    direction: 'increasing' | 'decreasing' | 'stable';
    change_pct: number;
};

type Correlation = {
    column_a: string;
    column_b: string;
    coefficient: number;
    strength: string;
};

type Anomaly = {
    value: number;
    z_score: number;
    row_index: number;
};

type Insights = {
    summary: Record<string, SummaryStats>;
    frequent_values: Record<string, Record<string, number>>;
    trends: Record<string, Trend>;
    interpretations: string[];
    correlations: Correlation[];
    anomalies: Record<string, Anomaly[]>;
};

type Dataset = {
    id: number;
    name: string;
    headers: string[];
    row_count: number;
    column_count: number;
};

type Props = {
    dataset: Dataset;
    insights: Insights;
};

function SectionHeader({
    icon,
    title,
    description,
}: {
    icon?: React.ReactNode;
    title: string;
    description: string;
}) {
    return (
        <CardHeader className="px-4 sm:px-6">
            <CardTitle className="flex items-center gap-2">
                {icon}
                <span className="bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent dark:from-purple-400 dark:to-blue-300">
                    {title}
                </span>
            </CardTitle>
            <CardDescription>{description}</CardDescription>
        </CardHeader>
    );
}

function getCorrelationColor(coefficient: number, strength: string): string {
    const isPositive = coefficient >= 0;

    if (strength === 'Very strong' || strength === 'Strong') {
        return isPositive
            ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
            : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300';
    }

    if (strength === 'Moderate') {
        return isPositive
            ? 'bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-400'
            : 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400';
    }

    return 'bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400';
}

function getCorrelationBorder(coefficient: number, strength: string): string {
    const isPositive = coefficient >= 0;

    if (strength === 'Very strong' || strength === 'Strong') {
        return isPositive
            ? 'border-green-300 dark:border-green-700'
            : 'border-red-300 dark:border-red-700';
    }

    if (strength === 'Moderate') {
        return isPositive
            ? 'border-green-200 dark:border-green-800'
            : 'border-red-200 dark:border-red-800';
    }

    return 'border-slate-200 dark:border-slate-700';
}

export default function AnalyzePage({ dataset, insights }: Props) {
    const [selectedColumn, setSelectedColumn] = useState<string>('');

    const frequentValueColumns = Object.keys(insights.frequent_values);
    const selectedFrequentValues = selectedColumn
        ? insights.frequent_values[selectedColumn]
        : null;

    const sortedCorrelations = [...(insights.correlations ?? [])].sort(
        (a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient),
    );

    const anomalyEntries = Object.entries(insights.anomalies ?? {}).filter(
        ([, anomalies]) => anomalies.length > 0,
    );

    return (
        <DatasetLayout
            breadcrumbs={[
                { title: 'Upload', href: '/' },
                { title: dataset.name, href: `/datasets/${dataset.id}` },
                {
                    title: 'Analyze',
                    href: `/datasets/${dataset.id}/analyze`,
                },
            ]}
        >
            <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-6">
                {/* Interpretations */}
                <AnimatedCard>
                    <Card className="overflow-hidden">
                        <SectionHeader
                            icon={
                                <Lightbulb className="size-5 text-amber-500" />
                            }
                            title="Key Insights"
                            description="Automatically generated interpretations of your data."
                        />
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

                {/* Value Distribution */}
                {frequentValueColumns.length > 0 && (
                    <AnimatedCard delay={0.1}>
                        <Card>
                            <SectionHeader
                                icon={
                                    <BarChart3 className="size-5 text-indigo-500" />
                                }
                                title="Value Distribution"
                                description="Select a column to explore the distribution of its most frequent values."
                            />
                            <CardContent className="px-4 sm:px-6">
                                <div className="mb-4">
                                    <Select
                                        value={selectedColumn}
                                        onValueChange={setSelectedColumn}
                                    >
                                        <SelectTrigger className="w-full sm:w-64">
                                            <SelectValue placeholder="Select a column to group by" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {frequentValueColumns.map((col) => (
                                                <SelectItem
                                                    key={col}
                                                    value={col}
                                                >
                                                    {col}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {selectedFrequentValues && (
                                    <FadeIn>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20">
                                                        <th className="px-3 py-2.5 text-left font-semibold">
                                                            Value
                                                        </th>
                                                        <th className="px-3 py-2.5 text-left font-semibold">
                                                            Count
                                                        </th>
                                                        <th className="px-3 py-2.5 text-left font-semibold">
                                                            Distribution
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {Object.entries(
                                                        selectedFrequentValues,
                                                    ).map(([value, count]) => {
                                                        const maxCount =
                                                            Math.max(
                                                                ...Object.values(
                                                                    selectedFrequentValues,
                                                                ),
                                                            );
                                                        const percentage =
                                                            maxCount > 0
                                                                ? (count /
                                                                      maxCount) *
                                                                  100
                                                                : 0;

                                                        return (
                                                            <motion.tr
                                                                key={value}
                                                                className="border-t transition-colors hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10"
                                                                initial={{
                                                                    opacity: 0,
                                                                    x: -10,
                                                                }}
                                                                animate={{
                                                                    opacity: 1,
                                                                    x: 0,
                                                                }}
                                                                transition={{
                                                                    duration: 0.3,
                                                                    ease: 'easeOut',
                                                                }}
                                                            >
                                                                <td className="px-3 py-2 font-medium">
                                                                    {value}
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    <Badge
                                                                        variant="secondary"
                                                                        className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                                                                    >
                                                                        {count}
                                                                    </Badge>
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="h-2 w-full max-w-[140px] sm:max-w-[200px] rounded-full bg-slate-100 dark:bg-slate-800">
                                                                            <motion.div
                                                                                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                                                                                initial={{
                                                                                    width: 0,
                                                                                }}
                                                                                animate={{
                                                                                    width: `${percentage}%`,
                                                                                }}
                                                                                transition={{
                                                                                    duration: 0.6,
                                                                                    ease: 'easeOut',
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </motion.tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </FadeIn>
                                )}

                                {!selectedColumn && (
                                    <p className="py-4 text-center text-sm text-muted-foreground">
                                        Choose a column above to view its value
                                        distribution.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </AnimatedCard>
                )}

                {/* Trends */}
                {Object.keys(insights.trends).length > 0 && (
                    <AnimatedCard delay={0.15}>
                        <Card>
                            <SectionHeader
                                title="Trends"
                                description="Detected patterns across numeric columns."
                            />
                            <CardContent className="px-4 sm:px-6">
                                <StaggerContainer className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                                    {Object.entries(insights.trends).map(
                                        ([col, trend]) => (
                                            <StaggerItem key={col}>
                                                <motion.div
                                                    whileHover={{
                                                        scale: 1.03,
                                                        transition: {
                                                            duration: 0.2,
                                                        },
                                                    }}
                                                    className={`flex items-center gap-3 rounded-lg border p-3 transition-shadow sm:p-4 ${
                                                        trend.direction ===
                                                        'increasing'
                                                            ? 'border-green-200 shadow-[0_0_12px_-3px_rgba(34,197,94,0.3)] dark:border-green-800 dark:shadow-[0_0_12px_-3px_rgba(34,197,94,0.2)]'
                                                            : trend.direction ===
                                                                'decreasing'
                                                              ? 'border-red-200 shadow-[0_0_12px_-3px_rgba(239,68,68,0.3)] dark:border-red-800 dark:shadow-[0_0_12px_-3px_rgba(239,68,68,0.2)]'
                                                              : 'border-border'
                                                    }`}
                                                >
                                                    {trend.direction ===
                                                    'increasing' ? (
                                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
                                                            <TrendingUp className="size-5 text-green-600 dark:text-green-400" />
                                                        </div>
                                                    ) : trend.direction ===
                                                      'decreasing' ? (
                                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
                                                            <TrendingDown className="size-5 text-red-600 dark:text-red-400" />
                                                        </div>
                                                    ) : (
                                                        <div className="size-10 shrink-0 rounded-full bg-muted" />
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="truncate font-medium">
                                                            {col}
                                                        </p>
                                                        <p
                                                            className={`text-xs sm:text-sm ${
                                                                trend.direction ===
                                                                'increasing'
                                                                    ? 'text-green-600 dark:text-green-400'
                                                                    : trend.direction ===
                                                                        'decreasing'
                                                                      ? 'text-red-600 dark:text-red-400'
                                                                      : 'text-muted-foreground'
                                                            }`}
                                                        >
                                                            {trend.direction} (
                                                            {trend.change_pct >
                                                            0
                                                                ? '+'
                                                                : ''}
                                                            {trend.change_pct}%)
                                                        </p>
                                                    </div>
                                                </motion.div>
                                            </StaggerItem>
                                        ),
                                    )}
                                </StaggerContainer>
                            </CardContent>
                        </Card>
                    </AnimatedCard>
                )}

                {/* Correlation Analysis */}
                {sortedCorrelations.length > 0 && (
                    <AnimatedCard delay={0.2}>
                        <Card>
                            <SectionHeader
                                icon={
                                    <GitCompareArrows className="size-5 text-blue-500" />
                                }
                                title="Correlation Analysis"
                                description="Pairwise correlations between numeric columns, sorted by strength."
                            />
                            <CardContent className="px-4 sm:px-6">
                                {/* Mobile card layout */}
                                <StaggerContainer className="flex flex-col gap-3 sm:hidden">
                                    {sortedCorrelations.map((corr, i) => (
                                        <StaggerItem key={i}>
                                            <div
                                                className={`rounded-lg border p-3 ${getCorrelationBorder(corr.coefficient, corr.strength)}`}
                                            >
                                                <div className="mb-2 flex items-center justify-between">
                                                    <p className="text-sm font-medium">
                                                        {corr.column_a}{' '}
                                                        <span className="text-muted-foreground">
                                                            &harr;
                                                        </span>{' '}
                                                        {corr.column_b}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge
                                                        className={getCorrelationColor(
                                                            corr.coefficient,
                                                            corr.strength,
                                                        )}
                                                    >
                                                        {corr.coefficient > 0
                                                            ? '+'
                                                            : ''}
                                                        {corr.coefficient.toFixed(
                                                            3,
                                                        )}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground">
                                                        {corr.strength}
                                                    </span>
                                                </div>
                                            </div>
                                        </StaggerItem>
                                    ))}
                                </StaggerContainer>

                                {/* Desktop table layout */}
                                <div className="hidden overflow-x-auto sm:block">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20">
                                                <th className="px-3 py-2.5 text-left font-semibold">
                                                    Column A
                                                </th>
                                                <th className="px-3 py-2.5 text-left font-semibold">
                                                    Column B
                                                </th>
                                                <th className="px-3 py-2.5 text-left font-semibold">
                                                    Coefficient
                                                </th>
                                                <th className="px-3 py-2.5 text-left font-semibold">
                                                    Strength
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedCorrelations.map(
                                                (corr, i) => (
                                                    <motion.tr
                                                        key={i}
                                                        className="border-t transition-colors hover:bg-blue-50/30 dark:hover:bg-blue-950/10"
                                                        initial={{
                                                            opacity: 0,
                                                            x: -10,
                                                        }}
                                                        animate={{
                                                            opacity: 1,
                                                            x: 0,
                                                        }}
                                                        transition={{
                                                            duration: 0.4,
                                                            delay: i * 0.05,
                                                            ease: 'easeOut',
                                                        }}
                                                    >
                                                        <td className="px-3 py-2 font-medium text-blue-600 dark:text-blue-400">
                                                            {corr.column_a}
                                                        </td>
                                                        <td className="px-3 py-2 font-medium text-blue-600 dark:text-blue-400">
                                                            {corr.column_b}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <Badge
                                                                className={getCorrelationColor(
                                                                    corr.coefficient,
                                                                    corr.strength,
                                                                )}
                                                            >
                                                                {corr.coefficient >
                                                                0
                                                                    ? '+'
                                                                    : ''}
                                                                {corr.coefficient.toFixed(
                                                                    3,
                                                                )}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <span
                                                                className={`text-xs font-medium ${
                                                                    corr.strength ===
                                                                        'Very strong' ||
                                                                    corr.strength ===
                                                                        'Strong'
                                                                        ? corr.coefficient >=
                                                                          0
                                                                            ? 'text-green-600 dark:text-green-400'
                                                                            : 'text-red-600 dark:text-red-400'
                                                                        : corr.strength ===
                                                                            'Moderate'
                                                                          ? 'text-amber-600 dark:text-amber-400'
                                                                          : 'text-muted-foreground'
                                                                }`}
                                                            >
                                                                {corr.strength}
                                                            </span>
                                                        </td>
                                                    </motion.tr>
                                                ),
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </AnimatedCard>
                )}

                {/* Summary Statistics */}
                {Object.keys(insights.summary).length > 0 && (
                    <AnimatedCard delay={0.3}>
                        <Card>
                            <SectionHeader
                                title="Summary Statistics"
                                description="Statistical measures for numeric columns."
                            />
                            <CardContent className="px-4 sm:px-6">
                                {/* Mobile card layout */}
                                <StaggerContainer className="flex flex-col gap-3 sm:hidden">
                                    {Object.entries(insights.summary).map(
                                        ([col, stats]) => (
                                            <StaggerItem key={col}>
                                                <div className="rounded-lg border p-3">
                                                    <p className="mb-2 font-medium text-purple-600 dark:text-purple-400">
                                                        {col}
                                                    </p>
                                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                                        <div>
                                                            <span className="text-muted-foreground">
                                                                Count
                                                            </span>
                                                            <p className="font-medium">
                                                                {stats.count}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground">
                                                                Mean
                                                            </span>
                                                            <p className="font-medium">
                                                                {stats.mean}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground">
                                                                Median
                                                            </span>
                                                            <p className="font-medium">
                                                                {stats.median}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground">
                                                                Min
                                                            </span>
                                                            <p className="font-medium">
                                                                {stats.min}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground">
                                                                Max
                                                            </span>
                                                            <p className="font-medium">
                                                                {stats.max}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground">
                                                                Std Dev
                                                            </span>
                                                            <p className="font-medium">
                                                                {stats.std_dev}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </StaggerItem>
                                        ),
                                    )}
                                </StaggerContainer>

                                {/* Desktop table layout */}
                                <div className="hidden overflow-x-auto sm:block">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-gradient-to-r from-purple-50/50 to-blue-50/50 dark:from-purple-950/20 dark:to-blue-950/20">
                                                <th className="px-3 py-2.5 text-left font-semibold">
                                                    Column
                                                </th>
                                                <th className="px-3 py-2.5 text-left font-semibold">
                                                    Count
                                                </th>
                                                <th className="px-3 py-2.5 text-left font-semibold">
                                                    Mean
                                                </th>
                                                <th className="px-3 py-2.5 text-left font-semibold">
                                                    Median
                                                </th>
                                                <th className="px-3 py-2.5 text-left font-semibold">
                                                    Std Dev
                                                </th>
                                                <th className="px-3 py-2.5 text-left font-semibold">
                                                    Min
                                                </th>
                                                <th className="px-3 py-2.5 text-left font-semibold">
                                                    Max
                                                </th>
                                                <th className="px-3 py-2.5 text-left font-semibold">
                                                    Range
                                                </th>
                                                <th className="px-3 py-2.5 text-left font-semibold">
                                                    Sum
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(
                                                insights.summary,
                                            ).map(([col, stats], index) => (
                                                <motion.tr
                                                    key={col}
                                                    className="border-t transition-colors hover:bg-purple-50/30 dark:hover:bg-purple-950/10"
                                                    initial={{
                                                        opacity: 0,
                                                        x: -10,
                                                    }}
                                                    animate={{
                                                        opacity: 1,
                                                        x: 0,
                                                    }}
                                                    transition={{
                                                        duration: 0.4,
                                                        delay: index * 0.05,
                                                        ease: 'easeOut',
                                                    }}
                                                >
                                                    <td className="px-3 py-2 font-medium text-purple-600 dark:text-purple-400">
                                                        {col}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        {stats.count}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        {stats.mean}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        {stats.median}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        {stats.std_dev}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        {stats.min}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        {stats.max}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        {stats.range}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        {stats.sum}
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </AnimatedCard>
                )}

                {/* Anomaly Detection */}
                {anomalyEntries.length > 0 && (
                    <AnimatedCard delay={0.35}>
                        <Card>
                            <SectionHeader
                                icon={
                                    <AlertTriangle className="size-5 text-amber-500" />
                                }
                                title="Anomaly Detection"
                                description="Outlier values detected using Z-score analysis."
                            />
                            <CardContent className="px-4 sm:px-6">
                                <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {anomalyEntries.map(([col, anomalies]) => (
                                        <StaggerItem key={col}>
                                            <div className="rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/30 p-4 dark:border-amber-800 dark:from-amber-950/20 dark:to-orange-950/10">
                                                <div className="mb-3 flex items-center gap-2">
                                                    <AlertTriangle className="size-4 text-amber-500" />
                                                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                                                        {col}
                                                    </p>
                                                    <Badge className="ml-auto bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                                        {anomalies.length}{' '}
                                                        outlier
                                                        {anomalies.length !== 1
                                                            ? 's'
                                                            : ''}
                                                    </Badge>
                                                </div>
                                                <div className="space-y-2">
                                                    {anomalies.map(
                                                        (anomaly, i) => (
                                                            <motion.div
                                                                key={i}
                                                                initial={{
                                                                    opacity: 0,
                                                                    x: -10,
                                                                }}
                                                                animate={{
                                                                    opacity: 1,
                                                                    x: 0,
                                                                }}
                                                                transition={{
                                                                    duration: 0.3,
                                                                    delay:
                                                                        0.4 +
                                                                        i *
                                                                            0.05,
                                                                    ease: 'easeOut',
                                                                }}
                                                                className="flex items-center justify-between rounded border border-amber-100 bg-white/60 px-3 py-1.5 text-sm dark:border-amber-900 dark:bg-amber-950/30"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium text-amber-800 dark:text-amber-300">
                                                                        {
                                                                            anomaly.value
                                                                        }
                                                                    </span>
                                                                    <span className="text-xs text-muted-foreground">
                                                                        row{' '}
                                                                        {
                                                                            anomaly.row_index
                                                                        }
                                                                    </span>
                                                                </div>
                                                                <Badge
                                                                    variant="outline"
                                                                    className="border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400"
                                                                >
                                                                    Z:{' '}
                                                                    {anomaly.z_score.toFixed(
                                                                        2,
                                                                    )}
                                                                </Badge>
                                                            </motion.div>
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                        </StaggerItem>
                                    ))}
                                </StaggerContainer>
                            </CardContent>
                        </Card>
                    </AnimatedCard>
                )}

                {/* Frequent Values */}
                {Object.keys(insights.frequent_values).length > 0 && (
                    <FadeIn delay={0.45}>
                        <Card>
                            <SectionHeader
                                title="Most Frequent Values"
                                description="Top 5 most common values per column."
                            />
                            <CardContent className="px-4 sm:px-6">
                                <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                                    {Object.entries(
                                        insights.frequent_values,
                                    ).map(([col, values]) => (
                                        <StaggerItem key={col}>
                                            <div className="rounded-lg border border-transparent bg-gradient-to-br from-slate-50 to-white p-4 transition-colors hover:border-purple-200 dark:from-slate-900 dark:to-slate-950 dark:hover:border-purple-800">
                                                <p className="mb-3 text-sm font-semibold text-purple-600 dark:text-purple-400">
                                                    {col}
                                                </p>
                                                <div className="space-y-2">
                                                    {Object.entries(values).map(
                                                        ([val, count], i) => (
                                                            <motion.div
                                                                key={val}
                                                                initial={{
                                                                    opacity: 0,
                                                                    x: -10,
                                                                }}
                                                                animate={{
                                                                    opacity: 1,
                                                                    x: 0,
                                                                }}
                                                                transition={{
                                                                    duration: 0.3,
                                                                    delay:
                                                                        0.5 +
                                                                        i *
                                                                            0.05,
                                                                    ease: 'easeOut',
                                                                }}
                                                                className="flex items-center justify-between text-sm"
                                                            >
                                                                <span className="max-w-[160px] truncate">
                                                                    {val}
                                                                </span>
                                                                <motion.div
                                                                    initial={{
                                                                        scale: 0,
                                                                    }}
                                                                    animate={{
                                                                        scale: 1,
                                                                    }}
                                                                    transition={{
                                                                        type: 'spring',
                                                                        stiffness: 200,
                                                                        damping: 15,
                                                                        delay:
                                                                            0.6 +
                                                                            i *
                                                                                0.05,
                                                                    }}
                                                                >
                                                                    <Badge
                                                                        variant="secondary"
                                                                        className="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                                                                    >
                                                                        {count}
                                                                    </Badge>
                                                                </motion.div>
                                                            </motion.div>
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                        </StaggerItem>
                                    ))}
                                </StaggerContainer>
                            </CardContent>
                        </Card>
                    </FadeIn>
                )}
            </div>
        </DatasetLayout>
    );
}
