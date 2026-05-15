import { AnimatePresence } from 'framer-motion';
import { Download, FileText, GitCompareArrows } from 'lucide-react';
import { useMemo, useState } from 'react';
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

type CleaningLog = {
    type: string;
    message: string;
    reason?: string;
};

type QualityScore = {
    overall: number;
    completeness: number;
    consistency: number;
    validity: number;
    uniqueness: number;
};

type Dataset = {
    id: number;
    name: string;
    headers: string[];
    original_data: Record<string, unknown>[];
    cleaned_data: Record<string, unknown>[] | null;
    cleaning_log: CleaningLog[] | null;
    row_count: number;
    column_count: number;
};

type Props = {
    dataset: Dataset;
    originalQuality: QualityScore;
    cleanedQuality: QualityScore | null;
};

function serializeRow(row: Record<string, unknown>, headers: string[]): string {
    return headers.map((h) => String(row[h] ?? '')).join('|||');
}

export default function ComparePage({ dataset, originalQuality, cleanedQuality }: Props) {
    const [tab, setTab] = useState<'side-by-side' | 'original' | 'cleaned'>(
        'side-by-side',
    );

    const original = dataset.original_data;
    const cleaned = dataset.cleaned_data ?? [];
    const log = dataset.cleaning_log ?? [];

    const rowsRemoved = original.length - cleaned.length;

    const changesSummary = useMemo(() => {
        let cellsChanged = 0;
        let totalCells = 0;
        const columnsAffected = new Set<string>();

        const compareLength = Math.min(original.length, cleaned.length);
        totalCells = original.length * dataset.headers.length;

        for (let i = 0; i < compareLength; i++) {
            for (const h of dataset.headers) {
                const origVal = String(original[i][h] ?? '');
                const cleanVal = String(cleaned[i][h] ?? '');

                if (origVal !== cleanVal) {
                    cellsChanged++;
                    columnsAffected.add(h);
                }
            }
        }

        // Removed rows count as changed cells too
        const removedRowCells =
            (original.length - compareLength) * dataset.headers.length;
        cellsChanged += removedRowCells;

        const percentageModified =
            totalCells > 0
                ? Math.round((cellsChanged / totalCells) * 10000) / 100
                : 0;

        // If rows were removed, all columns are technically affected
        if (original.length > compareLength) {
            for (const h of dataset.headers) {
                columnsAffected.add(h);
            }
        }

        return {
            cellsChanged,
            percentageModified,
            columnsAffected: columnsAffected.size,
        };
    }, [original, cleaned, dataset.headers]);

    const removedRowIndices = useMemo(() => {
        if (cleaned.length === 0) {
            return new Set<number>();
        }

        const cleanedSet = new Set(
            cleaned.map((row) => serializeRow(row, dataset.headers)),
        );

        const removed = new Set<number>();

        for (let i = 0; i < original.length; i++) {
            const key = serializeRow(original[i], dataset.headers);

            if (!cleanedSet.has(key)) {
                removed.add(i);
            }
        }

        return removed;
    }, [original, cleaned, dataset.headers]);

    if (!dataset.cleaned_data) {
        return (
            <DatasetLayout
                breadcrumbs={[
                    { title: 'Upload', href: '/' },
                    {
                        title: dataset.name,
                        href: `/datasets/${dataset.id}`,
                    },
                    {
                        title: 'Compare',
                        href: `/datasets/${dataset.id}/compare`,
                    },
                ]}
            >
                <FadeIn>
                    <div className="flex flex-col items-center justify-center gap-4 p-8 sm:p-12">
                        <motion.div
                            animate={{
                                y: [0, -8, 0],
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: 'easeInOut',
                            }}
                        >
                            <GitCompareArrows className="size-12 text-muted-foreground" />
                        </motion.div>
                        <h2 className="text-lg font-semibold">
                            No Cleaned Data Yet
                        </h2>
                        <p className="text-center text-sm text-muted-foreground">
                            Go to the Clean tab to apply cleaning operations
                            first.
                        </p>
                        <Button asChild>
                            <a href={`/datasets/${dataset.id}/clean`}>
                                Go to Clean
                            </a>
                        </Button>
                    </div>
                </FadeIn>
            </DatasetLayout>
        );
    }

    return (
        <DatasetLayout
            breadcrumbs={[
                { title: 'Upload', href: '/' },
                { title: dataset.name, href: `/datasets/${dataset.id}` },
                {
                    title: 'Compare',
                    href: `/datasets/${dataset.id}/compare`,
                },
            ]}
        >
            <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-6">
                {/* Export Buttons & Cleaning Summary */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold">
                        Comparison Overview
                    </h2>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <a
                                href={`/datasets/${dataset.id}/export/csv`}
                                download
                            >
                                <Download className="mr-1.5 size-4" />
                                CSV
                            </a>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                            <a
                                href={`/datasets/${dataset.id}/export/xlsx`}
                                download
                            >
                                <Download className="mr-1.5 size-4" />
                                Excel
                            </a>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                            <a
                                href={`/datasets/${dataset.id}/export-report`}
                            >
                                <FileText className="mr-1.5 size-4" />
                                Export Report
                            </a>
                        </Button>
                    </div>
                </div>

                <StaggerContainer className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <StaggerItem>
                        <AnimatedCard className="h-full">
                            <Card className="h-full">
                                <CardContent className="p-4 sm:pt-6">
                                    <p className="text-xs text-muted-foreground sm:text-sm">
                                        Original Rows
                                    </p>
                                    <p className="text-lg font-bold sm:text-2xl">
                                        <CountUp value={original.length} />
                                    </p>
                                </CardContent>
                            </Card>
                        </AnimatedCard>
                    </StaggerItem>
                    <StaggerItem>
                        <AnimatedCard className="h-full">
                            <Card className="relative h-full overflow-hidden">
                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/5" />
                                <CardContent className="relative p-4 sm:pt-6">
                                    <p className="text-xs text-muted-foreground sm:text-sm">
                                        Cleaned Rows
                                    </p>
                                    <p className="text-lg font-bold text-green-600 sm:text-2xl dark:text-green-400">
                                        <CountUp value={cleaned.length} />
                                    </p>
                                </CardContent>
                            </Card>
                        </AnimatedCard>
                    </StaggerItem>
                    <StaggerItem>
                        <AnimatedCard className="h-full">
                            <Card className="relative h-full overflow-hidden">
                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-red-500/10 to-rose-500/5" />
                                <CardContent className="relative p-4 sm:pt-6">
                                    <p className="text-xs text-muted-foreground sm:text-sm">
                                        Rows Removed
                                    </p>
                                    <p className="text-lg font-bold text-red-600 sm:text-2xl dark:text-red-400">
                                        <CountUp value={rowsRemoved} />
                                    </p>
                                </CardContent>
                            </Card>
                        </AnimatedCard>
                    </StaggerItem>
                </StaggerContainer>

                {/* Data Quality Scores */}
                {cleanedQuality && (
                    <FadeIn delay={0.15}>
                        <Card>
                            <CardHeader className="px-4 sm:px-6">
                                <CardTitle>Data Quality Score</CardTitle>
                                <CardDescription>
                                    Quality comparison before and after cleaning
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="px-4 sm:px-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
                                        <p className="text-xs text-red-600 dark:text-red-400 sm:text-sm">
                                            Before
                                        </p>
                                        <p className="text-2xl font-bold text-red-700 dark:text-red-300 sm:text-3xl">
                                            {originalQuality.overall}%
                                        </p>
                                    </div>
                                    <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
                                        <p className="text-xs text-green-600 dark:text-green-400 sm:text-sm">
                                            After
                                        </p>
                                        <p className="text-2xl font-bold text-green-700 dark:text-green-300 sm:text-3xl">
                                            {cleanedQuality.overall}%
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
                                    {(['completeness', 'consistency', 'validity', 'uniqueness'] as const).map((metric) => (
                                        <div key={metric} className="rounded-lg border p-3">
                                            <p className="text-xs font-medium capitalize text-muted-foreground">
                                                {metric}
                                            </p>
                                            <div className="mt-1 flex items-baseline gap-2">
                                                <span className="text-sm text-red-600 dark:text-red-400">
                                                    {originalQuality[metric]}%
                                                </span>
                                                <span className="text-xs text-muted-foreground">&rarr;</span>
                                                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                                    {cleanedQuality[metric]}%
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </FadeIn>
                )}

                {/* Cleaning Log */}
                {log.length > 0 && (
                    <FadeIn delay={0.2}>
                        <Card>
                            <CardHeader className="px-4 sm:px-6">
                                <CardTitle>Cleaning Log</CardTitle>
                            </CardHeader>
                            <CardContent className="px-4 sm:px-6">
                                <StaggerContainer>
                                    <ul className="space-y-2">
                                        {log.map((entry, i) => (
                                            <StaggerItem key={i}>
                                                <li className="flex flex-col gap-1 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/50 sm:flex-row sm:items-start sm:gap-2">
                                                    <Badge
                                                        variant="outline"
                                                        className="w-fit shrink-0"
                                                    >
                                                        {entry.type.replace(
                                                            /_/g,
                                                            ' ',
                                                        )}
                                                    </Badge>
                                                    <div>
                                                        <span>{entry.message}</span>
                                                        {entry.reason && (
                                                            <p className="mt-0.5 border-l-2 border-muted-foreground/30 pl-2 text-xs italic text-muted-foreground">
                                                                Why: {entry.reason}
                                                            </p>
                                                        )}
                                                    </div>
                                                </li>
                                            </StaggerItem>
                                        ))}
                                    </ul>
                                </StaggerContainer>
                            </CardContent>
                        </Card>
                    </FadeIn>
                )}

                {/* Changes Summary */}
                <FadeIn delay={0.25}>
                    <Card>
                        <CardHeader className="px-4 sm:px-6">
                            <CardTitle>Changes Summary</CardTitle>
                            <CardDescription>
                                Overview of modifications applied during
                                cleaning
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="px-4 sm:px-6">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div className="rounded-lg border p-4">
                                    <p className="text-xs text-muted-foreground sm:text-sm">
                                        Total Cells Changed
                                    </p>
                                    <p className="text-lg font-bold sm:text-2xl">
                                        <CountUp
                                            value={changesSummary.cellsChanged}
                                        />
                                    </p>
                                </div>
                                <div className="rounded-lg border p-4">
                                    <p className="text-xs text-muted-foreground sm:text-sm">
                                        Data Modified
                                    </p>
                                    <p className="text-lg font-bold sm:text-2xl">
                                        {changesSummary.percentageModified}%
                                    </p>
                                </div>
                                <div className="rounded-lg border p-4">
                                    <p className="text-xs text-muted-foreground sm:text-sm">
                                        Columns Affected
                                    </p>
                                    <p className="text-lg font-bold sm:text-2xl">
                                        <CountUp
                                            value={
                                                changesSummary.columnsAffected
                                            }
                                        />{' '}
                                        <span className="text-sm font-normal text-muted-foreground">
                                            / {dataset.headers.length}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </FadeIn>

                {/* Tab Controls */}
                <FadeIn delay={0.3}>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant={
                                tab === 'side-by-side' ? 'default' : 'outline'
                            }
                            size="sm"
                            onClick={() => setTab('side-by-side')}
                        >
                            Side by Side
                        </Button>
                        <Button
                            variant={tab === 'original' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setTab('original')}
                        >
                            Original
                        </Button>
                        <Button
                            variant={tab === 'cleaned' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setTab('cleaned')}
                        >
                            Cleaned
                        </Button>
                    </div>
                </FadeIn>

                {/* Data Tables */}
                <AnimatePresence mode="wait">
                    {tab === 'side-by-side' ? (
                        <motion.div
                            key="side-by-side"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="grid grid-cols-1 gap-4 xl:grid-cols-2"
                        >
                            <Card>
                                <CardHeader className="px-4 sm:px-6">
                                    <CardTitle className="text-base">
                                        Original Data
                                    </CardTitle>
                                    <CardDescription>
                                        {original.length} rows
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="px-4 sm:px-6">
                                    <DataTable
                                        headers={dataset.headers}
                                        data={original.slice(0, 50)}
                                    />
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="px-4 sm:px-6">
                                    <CardTitle className="text-base">
                                        Cleaned Data
                                    </CardTitle>
                                    <CardDescription>
                                        {cleaned.length} rows
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="px-4 sm:px-6">
                                    <DataTable
                                        headers={dataset.headers}
                                        data={cleaned.slice(0, 50)}
                                        originalData={original.slice(0, 50)}
                                        highlightChanges
                                    />
                                </CardContent>
                            </Card>
                        </motion.div>
                    ) : (
                        <motion.div
                            key={tab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Card>
                                <CardHeader className="px-4 sm:px-6">
                                    <CardTitle className="text-base">
                                        {tab === 'original'
                                            ? 'Original Data'
                                            : 'Cleaned Data'}
                                    </CardTitle>
                                    <CardDescription>
                                        {tab === 'original'
                                            ? original.length
                                            : cleaned.length}{' '}
                                        rows
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="px-4 sm:px-6">
                                    <DataTable
                                        headers={dataset.headers}
                                        data={(tab === 'original'
                                            ? original
                                            : cleaned
                                        ).slice(
                                            0,
                                            tab === 'original' ? 50 : 100,
                                        )}
                                        originalData={
                                            tab === 'cleaned'
                                                ? original.slice(0, 100)
                                                : undefined
                                        }
                                        highlightChanges={tab === 'cleaned'}
                                        removedRowIndices={
                                            tab === 'original'
                                                ? removedRowIndices
                                                : undefined
                                        }
                                    />
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </DatasetLayout>
    );
}

function DataTable({
    headers,
    data,
    originalData,
    highlightChanges = false,
    removedRowIndices,
}: {
    headers: string[];
    data: Record<string, unknown>[];
    originalData?: Record<string, unknown>[];
    highlightChanges?: boolean;
    removedRowIndices?: Set<number>;
}) {
    return (
        <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
                <thead className="bg-muted/50">
                    <tr>
                        <th className="sticky left-0 bg-muted/50 px-3 py-2 text-left text-xs font-medium">
                            #
                        </th>
                        {headers.map((h) => (
                            <th
                                key={h}
                                className="px-3 py-2 text-left text-xs font-medium whitespace-nowrap"
                            >
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, i) => {
                        const isRemoved = removedRowIndices?.has(i) ?? false;

                        return (
                            <tr
                                key={i}
                                className={`border-t ${isRemoved ? 'bg-rose-50 dark:bg-rose-950/30' : ''}`}
                            >
                                <td
                                    className={`sticky left-0 bg-background px-3 py-1.5 text-xs ${isRemoved ? 'bg-rose-50 text-rose-500 line-through dark:bg-rose-950/30' : 'text-muted-foreground'}`}
                                >
                                    {i + 1}
                                </td>
                                {headers.map((h) => {
                                    const changed =
                                        highlightChanges &&
                                        originalData?.[i] &&
                                        String(originalData[i][h] ?? '') !==
                                            String(row[h] ?? '');

                                    const originalValue = changed
                                        ? String(originalData![i][h] ?? '')
                                        : undefined;

                                    return (
                                        <td
                                            key={h}
                                            className={`max-w-[100px] sm:max-w-[200px] truncate px-3 py-1.5 whitespace-nowrap ${
                                                isRemoved
                                                    ? 'text-rose-500 line-through'
                                                    : changed
                                                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 font-medium'
                                                      : ''
                                            }`}
                                            title={changed ? `Original: ${originalValue}` : undefined}
                                        >
                                            {row[h] != null
                                                ? String(row[h])
                                                : ''}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
