import { useForm } from '@inertiajs/react';
import { AnimatePresence } from 'framer-motion';
import { Layers, Plus, Sparkles, Trash2, Wrench } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import {
    AnimatedCard,
    FadeIn,
    FadeInScale,
    motion,
    PulseGlow,
    StaggerContainer,
    StaggerItem,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import DatasetLayout from '@/layouts/dataset-layout';

type Operation = {
    type: string;
    column?: string;
    value?: string;
    target_type?: string;
    format?: string;
    rule?: string;
};

type Dataset = {
    id: number;
    name: string;
    headers: string[];
    original_data: Record<string, unknown>[];
    row_count: number;
    column_count: number;
};

type Props = {
    dataset: Dataset;
};

const operationTypes = [
    {
        value: 'remove_duplicates',
        label: 'Remove Duplicates',
        needsColumn: false,
    },
    {
        value: 'remove_missing_rows',
        label: 'Remove Missing Rows',
        needsColumn: true,
    },
    {
        value: 'fill_missing',
        label: 'Fill Missing Values',
        needsColumn: true,
    },
    {
        value: 'convert_type',
        label: 'Convert Data Type',
        needsColumn: true,
    },
    { value: 'trim_spaces', label: 'Trim Spaces', needsColumn: true },
    {
        value: 'capitalize',
        label: 'Standardize Capitalization',
        needsColumn: true,
    },
    {
        value: 'filter_invalid',
        label: 'Filter Invalid Data',
        needsColumn: true,
    },
];

const stepColors = [
    'bg-blue-500',
    'bg-violet-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-cyan-500',
    'bg-pink-500',
];

export default function CleanPage({ dataset }: Props) {
    const [operations, setOperations] = useState<Operation[]>([]);

    const manualForm = useForm<{ operations: Operation[] }>({ operations: [] });
    const autoCleanForm = useForm({});

    function addOperation() {
        setOperations([...operations, { type: 'remove_duplicates' }]);
    }

    function updateOperation(index: number, updates: Partial<Operation>) {
        const updated = [...operations];
        updated[index] = { ...updated[index], ...updates };
        setOperations(updated);
    }

    function removeOperation(index: number) {
        setOperations(operations.filter((_, i) => i !== index));
    }

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        manualForm.transform(() => ({ operations }));
        manualForm.post(`/datasets/${dataset.id}/clean`);
    }

    function handleAutoClean() {
        autoCleanForm.post(`/datasets/${dataset.id}/auto-clean`);
    }

    const opMeta = (type: string) =>
        operationTypes.find((o) => o.value === type);

    return (
        <DatasetLayout
            breadcrumbs={[
                { title: 'Upload', href: '/' },
                { title: dataset.name, href: `/datasets/${dataset.id}` },
                {
                    title: 'Clean',
                    href: `/datasets/${dataset.id}/clean`,
                },
            ]}
        >
            <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-6">
                {/* Auto Clean Card */}
                <AnimatedCard>
                    <PulseGlow className="rounded-xl">
                        <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5">
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent" />
                            <CardHeader className="relative px-4 sm:px-6">
                                <CardTitle className="flex items-center gap-2">
                                    <motion.div
                                        animate={{ rotate: [0, 15, -15, 0] }}
                                        transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                            ease: 'easeInOut',
                                        }}
                                    >
                                        <Sparkles className="size-5 text-primary" />
                                    </motion.div>
                                    Auto Clean Engine
                                </CardTitle>
                                <CardDescription>
                                    Automatically clean your dataset using best
                                    practices: handle missing values (mean for
                                    numeric, mode for categorical), remove
                                    duplicates, standardize text, convert data
                                    types, cap outliers using IQR, and filter
                                    invalid data.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="relative px-4 sm:px-6">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <StaggerContainer className="flex flex-wrap gap-2 text-xs">
                                        {[
                                            'Missing Values',
                                            'Duplicates',
                                            'Type Conversion',
                                            'Text Standardization',
                                            'Outlier Capping',
                                            'Invalid Data Removal',
                                        ].map((label) => (
                                            <StaggerItem key={label}>
                                                <Badge variant="secondary">
                                                    {label}
                                                </Badge>
                                            </StaggerItem>
                                        ))}
                                    </StaggerContainer>
                                    <motion.div
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                    >
                                        <Button
                                            onClick={handleAutoClean}
                                            disabled={autoCleanForm.processing}
                                            className="relative w-full overflow-hidden bg-gradient-to-r from-primary via-primary/90 to-primary sm:w-auto"
                                        >
                                            <span className="pointer-events-none absolute inset-0 animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                                            <Sparkles className="size-4" />
                                            {autoCleanForm.processing
                                                ? 'Cleaning...'
                                                : 'Auto Clean'}
                                        </Button>
                                    </motion.div>
                                </div>
                            </CardContent>
                        </Card>
                    </PulseGlow>
                </AnimatedCard>

                {/* Manual Pipeline */}
                <FadeIn delay={0.15}>
                    <Card>
                        <CardHeader className="px-4 sm:px-6">
                            <CardTitle className="flex items-center gap-2">
                                <Wrench className="size-5" />
                                Manual Cleaning Pipeline
                            </CardTitle>
                            <CardDescription>
                                Add individual cleaning operations to process
                                your dataset. Operations run in order from top
                                to bottom.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="px-4 sm:px-6">
                            <form onSubmit={handleSubmit}>
                                <div className="flex flex-col gap-4">
                                    <AnimatePresence mode="popLayout">
                                        {operations.length === 0 && (
                                            <motion.div
                                                key="empty-state"
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
                                                className="flex flex-col items-center justify-center gap-3 py-10 sm:py-14"
                                            >
                                                <motion.div
                                                    animate={{
                                                        y: [0, -6, 0],
                                                    }}
                                                    transition={{
                                                        duration: 2.5,
                                                        repeat: Infinity,
                                                        ease: 'easeInOut',
                                                    }}
                                                    className="flex size-14 items-center justify-center rounded-full bg-muted"
                                                >
                                                    <Layers className="size-7 text-muted-foreground" />
                                                </motion.div>
                                                <p className="text-center text-sm text-muted-foreground">
                                                    No operations added yet.
                                                    Click the button below to
                                                    start building your cleaning
                                                    pipeline.
                                                </p>
                                            </motion.div>
                                        )}

                                        {operations.map((op, index) => {
                                            const meta = opMeta(op.type);
                                            const colorClass =
                                                stepColors[
                                                    index % stepColors.length
                                                ];

                                            return (
                                                <motion.div
                                                    key={index}
                                                    layout
                                                    initial={{
                                                        opacity: 0,
                                                        height: 0,
                                                    }}
                                                    animate={{
                                                        opacity: 1,
                                                        height: 'auto',
                                                    }}
                                                    exit={{
                                                        opacity: 0,
                                                        height: 0,
                                                    }}
                                                    transition={{
                                                        duration: 0.3,
                                                    }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="flex flex-col gap-3 rounded-lg border p-3 sm:p-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <span
                                                                    className={`flex size-7 items-center justify-center rounded-full text-xs font-bold text-white ${colorClass}`}
                                                                >
                                                                    {index + 1}
                                                                </span>
                                                                <span className="text-sm font-medium text-muted-foreground">
                                                                    {meta?.label ??
                                                                        'Operation'}
                                                                </span>
                                                            </div>
                                                            <motion.div
                                                                whileHover={{
                                                                    scale: 1.1,
                                                                }}
                                                                whileTap={{
                                                                    scale: 0.9,
                                                                }}
                                                            >
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        removeOperation(
                                                                            index,
                                                                        )
                                                                    }
                                                                    className="text-muted-foreground hover:text-destructive"
                                                                >
                                                                    <Trash2 className="size-4" />
                                                                </Button>
                                                            </motion.div>
                                                        </div>

                                                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                                            <div>
                                                                <Label>
                                                                    Operation
                                                                </Label>
                                                                <Select
                                                                    value={
                                                                        op.type
                                                                    }
                                                                    onValueChange={(
                                                                        v,
                                                                    ) =>
                                                                        updateOperation(
                                                                            index,
                                                                            {
                                                                                type: v,
                                                                            },
                                                                        )
                                                                    }
                                                                >
                                                                    <SelectTrigger className="mt-1 w-full">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {operationTypes.map(
                                                                            (
                                                                                ot,
                                                                            ) => (
                                                                                <SelectItem
                                                                                    key={
                                                                                        ot.value
                                                                                    }
                                                                                    value={
                                                                                        ot.value
                                                                                    }
                                                                                >
                                                                                    {
                                                                                        ot.label
                                                                                    }
                                                                                </SelectItem>
                                                                            ),
                                                                        )}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>

                                                            {meta?.needsColumn && (
                                                                <div>
                                                                    <Label>
                                                                        Column
                                                                    </Label>
                                                                    <Select
                                                                        value={
                                                                            op.column ??
                                                                            ''
                                                                        }
                                                                        onValueChange={(
                                                                            v,
                                                                        ) =>
                                                                            updateOperation(
                                                                                index,
                                                                                {
                                                                                    column: v,
                                                                                },
                                                                            )
                                                                        }
                                                                    >
                                                                        <SelectTrigger className="mt-1 w-full">
                                                                            <SelectValue placeholder="Select column" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {dataset.headers.map(
                                                                                (
                                                                                    h,
                                                                                ) => (
                                                                                    <SelectItem
                                                                                        key={
                                                                                            h
                                                                                        }
                                                                                        value={
                                                                                            h
                                                                                        }
                                                                                    >
                                                                                        {
                                                                                            h
                                                                                        }
                                                                                    </SelectItem>
                                                                                ),
                                                                            )}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                            )}

                                                            {op.type ===
                                                                'fill_missing' && (
                                                                <div>
                                                                    <Label>
                                                                        Fill
                                                                        Value
                                                                    </Label>
                                                                    <Input
                                                                        value={
                                                                            op.value ??
                                                                            ''
                                                                        }
                                                                        onChange={(
                                                                            e,
                                                                        ) =>
                                                                            updateOperation(
                                                                                index,
                                                                                {
                                                                                    value: e
                                                                                        .target
                                                                                        .value,
                                                                                },
                                                                            )
                                                                        }
                                                                        placeholder="e.g. 0, N/A"
                                                                        className="mt-1"
                                                                    />
                                                                </div>
                                                            )}

                                                            {op.type ===
                                                                'convert_type' && (
                                                                <div>
                                                                    <Label>
                                                                        Target
                                                                        Type
                                                                    </Label>
                                                                    <Select
                                                                        value={
                                                                            op.target_type ??
                                                                            'string'
                                                                        }
                                                                        onValueChange={(
                                                                            v,
                                                                        ) =>
                                                                            updateOperation(
                                                                                index,
                                                                                {
                                                                                    target_type:
                                                                                        v,
                                                                                },
                                                                            )
                                                                        }
                                                                    >
                                                                        <SelectTrigger className="mt-1 w-full">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="string">
                                                                                Text
                                                                            </SelectItem>
                                                                            <SelectItem value="number">
                                                                                Number
                                                                            </SelectItem>
                                                                            <SelectItem value="integer">
                                                                                Integer
                                                                            </SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                            )}

                                                            {op.type ===
                                                                'capitalize' && (
                                                                <div>
                                                                    <Label>
                                                                        Format
                                                                    </Label>
                                                                    <Select
                                                                        value={
                                                                            op.format ??
                                                                            'ucfirst'
                                                                        }
                                                                        onValueChange={(
                                                                            v,
                                                                        ) =>
                                                                            updateOperation(
                                                                                index,
                                                                                {
                                                                                    format: v,
                                                                                },
                                                                            )
                                                                        }
                                                                    >
                                                                        <SelectTrigger className="mt-1 w-full">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="uppercase">
                                                                                UPPERCASE
                                                                            </SelectItem>
                                                                            <SelectItem value="lowercase">
                                                                                lowercase
                                                                            </SelectItem>
                                                                            <SelectItem value="ucfirst">
                                                                                First
                                                                                letter
                                                                            </SelectItem>
                                                                            <SelectItem value="ucwords">
                                                                                Title
                                                                                Case
                                                                            </SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                            )}

                                                            {op.type ===
                                                                'filter_invalid' && (
                                                                <div>
                                                                    <Label>
                                                                        Rule
                                                                    </Label>
                                                                    <Select
                                                                        value={
                                                                            op.rule ??
                                                                            'not_empty'
                                                                        }
                                                                        onValueChange={(
                                                                            v,
                                                                        ) =>
                                                                            updateOperation(
                                                                                index,
                                                                                {
                                                                                    rule: v,
                                                                                },
                                                                            )
                                                                        }
                                                                    >
                                                                        <SelectTrigger className="mt-1 w-full">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="not_empty">
                                                                                Not
                                                                                Empty
                                                                            </SelectItem>
                                                                            <SelectItem value="numeric">
                                                                                Numeric
                                                                                Only
                                                                            </SelectItem>
                                                                            <SelectItem value="positive">
                                                                                Positive
                                                                                Numbers
                                                                            </SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>

                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                        <motion.div
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={addOperation}
                                                className="w-full sm:w-auto"
                                            >
                                                <Plus className="size-4" />
                                                Add Operation
                                            </Button>
                                        </motion.div>

                                        <AnimatePresence>
                                            {operations.length > 0 && (
                                                <motion.div
                                                    initial={{
                                                        opacity: 0,
                                                        x: -10,
                                                    }}
                                                    animate={{
                                                        opacity: 1,
                                                        x: 0,
                                                    }}
                                                    exit={{
                                                        opacity: 0,
                                                        x: -10,
                                                    }}
                                                    transition={{
                                                        duration: 0.2,
                                                    }}
                                                >
                                                    <Button
                                                        type="submit"
                                                        disabled={
                                                            manualForm.processing
                                                        }
                                                        className="w-full sm:w-auto"
                                                    >
                                                        <Wrench className="size-4" />
                                                        {manualForm.processing
                                                            ? 'Cleaning...'
                                                            : `Apply ${operations.length} Operation${operations.length > 1 ? 's' : ''}`}
                                                    </Button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </FadeIn>

                {/* Preview */}
                <FadeInScale delay={0.3}>
                    <Card>
                        <CardHeader className="px-4 sm:px-6">
                            <CardTitle>Current Data Preview</CardTitle>
                            <CardDescription>
                                {dataset.row_count} rows, {dataset.column_count}{' '}
                                columns
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="px-4 sm:px-6">
                            <div className="overflow-x-auto rounded-md border">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50">
                                        <tr>
                                            <th className="sticky left-0 bg-muted/50 px-3 py-2 text-left text-xs font-medium">
                                                #
                                            </th>
                                            {dataset.headers.map((h) => (
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
                                        {dataset.original_data
                                            .slice(0, 50)
                                            .map((row, i) => (
                                                <tr
                                                    key={i}
                                                    className="border-t"
                                                >
                                                    <td className="sticky left-0 bg-background px-3 py-1.5 text-xs text-muted-foreground">
                                                        {i + 1}
                                                    </td>
                                                    {dataset.headers.map(
                                                        (h) => (
                                                            <td
                                                                key={h}
                                                                className="max-w-[200px] truncate px-3 py-1.5 whitespace-nowrap"
                                                            >
                                                                {row[h] != null
                                                                    ? String(
                                                                          row[
                                                                              h
                                                                          ],
                                                                      )
                                                                    : ''}
                                                            </td>
                                                        ),
                                                    )}
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </FadeInScale>
            </div>
        </DatasetLayout>
    );
}
