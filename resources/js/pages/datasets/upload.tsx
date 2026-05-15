import { Link, router, useForm } from '@inertiajs/react';
import {
    BarChart3,
    ChevronLeft,
    ChevronRight,
    Database,
    FileUp,
    GitCompareArrows,
    Lightbulb,
    Link2,
    Plus,
    Sparkles,
    Trash2,
    Upload,
    Wrench,
    X,
} from 'lucide-react';
import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import {
    AnimatedCard,
    FadeIn,
    FadeInScale,
    motion,
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
import DatasetLayout from '@/layouts/dataset-layout';

type DatasetSummary = {
    id: number;
    name: string;
    original_filename: string;
    file_type: string;
    row_count: number;
    column_count: number;
    created_at: string;
};

type PaginatedData = {
    data: DatasetSummary[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
};

type DataPagination = {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
};

type RelatedDataset = {
    id: number;
    name: string;
    file_type: string;
    row_count: number;
    column_count: number;
    type: string;
    description: string | null;
};

type DatasetDetail = {
    id: number;
    name: string;
    original_filename: string;
    headers: string[];
    original_data: Record<string, unknown>[];
    row_count: number;
    column_count: number;
    data_pagination?: DataPagination;
    related_datasets?: RelatedDataset[];
    parent_datasets?: RelatedDataset[];
};

type SimpleDataset = {
    id: number;
    name: string;
};

type Props = {
    datasets: PaginatedData | null;
    dataset?: DatasetDetail;
    allDatasets?: SimpleDataset[];
};

const features = [
    {
        icon: Upload,
        title: 'Multi-File Upload',
        description:
            'Upload multiple CSV or Excel files at once and auto-link them.',
        gradient: 'from-blue-500 to-indigo-600',
    },
    {
        icon: Wrench,
        title: 'Data Cleaning',
        description: 'Auto-clean or manually apply 7+ cleaning operations.',
        gradient: 'from-violet-500 to-purple-600',
    },
    {
        icon: Lightbulb,
        title: 'Smart Analysis',
        description: 'Anomaly detection, correlations, and trend discovery.',
        gradient: 'from-amber-500 to-orange-600',
    },
    {
        icon: BarChart3,
        title: 'Visualization',
        description: 'Create interactive charts and visual insights.',
        gradient: 'from-emerald-500 to-teal-600',
    },
    {
        icon: Link2,
        title: 'File Relationships',
        description: 'Link related datasets and track data lineage.',
        gradient: 'from-rose-500 to-pink-600',
    },
    {
        icon: GitCompareArrows,
        title: 'Merge & Compare',
        description:
            'Merge datasets with joins and compare before/after cleaning.',
        gradient: 'from-cyan-500 to-blue-600',
    },
];

const relationshipTypes = [
    { value: 'related', label: 'Related' },
    { value: 'derived', label: 'Derived From' },
    { value: 'merged', label: 'Merged' },
    { value: 'subset', label: 'Subset' },
];

export default function UploadPage({
    datasets,
    dataset,
    allDatasets = [],
}: Props) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const { data, setData, processing, errors, reset } = useForm<{
        files: File[];
    }>({
        files: [],
    });

    const deleteForm = useForm({});

    const relationshipForm = useForm<{
        related_dataset_id: string;
        type: string;
        description: string;
    }>({
        related_dataset_id: '',
        type: 'related',
        description: '',
    });

    const [showRelationshipForm, setShowRelationshipForm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
    const [unlinkTarget, setUnlinkTarget] = useState<number | null>(null);
    const [loadingSample, setLoadingSample] = useState(false);

    function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? []);
        setSelectedFiles(files);
        setData('files', files);
    }

    function removeFile(index: number) {
        const newFiles = selectedFiles.filter((_, i) => i !== index);
        setSelectedFiles(newFiles);
        setData('files', newFiles);

        if (fileRef.current) {
            fileRef.current.value = '';
        }
    }

    function handleSubmit(e: FormEvent) {
        e.preventDefault();

        if (selectedFiles.length === 0) {
            toast.error('Please select at least one file to upload.');
            return;
        }

        setUploading(true);
        router.post(
            '/datasets/upload',
            { files: selectedFiles },
            {
                forceFormData: true,
                onFinish: () => setUploading(false),
            },
        );
    }

    function handleAddRelationship(e: FormEvent) {
        e.preventDefault();

        if (!dataset) {
            return;
        }

        relationshipForm.post(`/datasets/${dataset.id}/relationships`, {
            onSuccess: () => {
                relationshipForm.reset();
                setShowRelationshipForm(false);
            },
        });
    }

    function handleRemoveRelationship(relatedId: number) {
        if (!dataset) {
            return;
        }

        setUnlinkTarget(relatedId);
    }

    function handleDataPageChange(page: number) {
        const url = new URL(window.location.href);
        url.searchParams.set('data_page', String(page));
        router.visit(url.toString(), {
            preserveState: true,
            preserveScroll: true,
        });
    }

    const datasetsList = datasets?.data ?? [];
    const displayData = dataset?.original_data ?? [];
    const displayHeaders = dataset?.headers ?? [];

    const datasetsFrom =
        datasets && datasets.total > 0
            ? (datasets.current_page - 1) * datasets.per_page + 1
            : 0;
    const datasetsTo = datasets
        ? Math.min(
              datasets.current_page * datasets.per_page,
              datasets.total,
          )
        : 0;

    const dataPagination = dataset?.data_pagination;
    const dataFrom =
        dataPagination && dataPagination.total > 0
            ? (dataPagination.current_page - 1) * dataPagination.per_page + 1
            : 0;
    const dataTo = dataPagination
        ? Math.min(
              dataPagination.current_page * dataPagination.per_page,
              dataPagination.total,
          )
        : 0;

    const allRelationships = [
        ...(dataset?.related_datasets ?? []),
        ...(dataset?.parent_datasets ?? []),
    ];

    const availableForRelationship = allDatasets.filter(
        (d) =>
            d.id !== dataset?.id &&
            !allRelationships.some((r) => r.id === d.id),
    );

    return (
        <DatasetLayout breadcrumbs={[{ title: 'Upload', href: '/' }]}>
            <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-6">
                {/* System Overview */}
                {!dataset && (
                    <FadeIn>
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-primary/90 to-violet-700 p-6 text-white shadow-xl shadow-primary/25 sm:p-8">
                            {/* Decorative elements */}
                            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
                            <div className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-white/5 blur-2xl" />
                            <div className="pointer-events-none absolute -bottom-16 -left-16 size-48 rounded-full bg-violet-400/10 blur-2xl" />
                            <motion.div
                                className="pointer-events-none absolute top-4 right-8 size-2 rounded-full bg-white/30"
                                animate={{
                                    y: [0, -12, 0],
                                    opacity: [0.3, 0.7, 0.3],
                                }}
                                transition={{
                                    duration: 3,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                }}
                            />
                            <motion.div
                                className="pointer-events-none absolute right-24 bottom-6 size-1.5 rounded-full bg-white/25"
                                animate={{
                                    y: [0, -8, 0],
                                    opacity: [0.2, 0.6, 0.2],
                                }}
                                transition={{
                                    duration: 4,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                    delay: 1,
                                }}
                            />
                            <div className="relative">
                                <motion.div
                                    className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-sm"
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    <Sparkles className="size-3.5" />
                                    InsightFlow
                                </motion.div>
                                <h1 className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">
                                    Your Data Analytics Platform
                                </h1>
                                <p className="max-w-2xl text-sm leading-relaxed text-white/70">
                                    Upload datasets, clean and transform your
                                    data, discover hidden patterns, link related
                                    files, and create stunning visualizations —
                                    all in one place.
                                </p>
                            </div>
                        </div>
                    </FadeIn>
                )}

                {/* Features Grid */}
                {!dataset && (
                    <FadeIn delay={0.1}>
                        <StaggerContainer className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {features.map((feature) => {
                                const Icon = feature.icon;

                                return (
                                    <StaggerItem key={feature.title}>
                                        <Card className="group relative h-full overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                                            <div
                                                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-[0.03]`}
                                            />
                                            <CardContent className="relative flex h-full flex-col p-3 sm:p-4">
                                                <div
                                                    className={`mb-2.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} text-white shadow-md shadow-black/10 transition-transform duration-300 group-hover:scale-110 sm:size-10`}
                                                >
                                                    <Icon className="size-4 sm:size-[18px]" />
                                                </div>
                                                <h3 className="text-xs font-semibold sm:text-sm">
                                                    {feature.title}
                                                </h3>
                                                <p className="mt-0.5 flex-1 text-[10px] leading-relaxed text-muted-foreground sm:text-xs">
                                                    {feature.description}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    </StaggerItem>
                                );
                            })}
                        </StaggerContainer>
                    </FadeIn>
                )}

                {/* Upload Form */}
                <FadeIn delay={dataset ? 0.05 : 0.2}>
                    <Card className="overflow-hidden border-border/40 shadow-sm">
                        <div className="h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
                        <CardHeader className="px-4 pb-4 sm:px-6">
                            <CardTitle className="flex items-center gap-2">
                                <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                    <FileUp className="size-4" />
                                </div>
                                Upload Dataset
                            </CardTitle>
                            <CardDescription>
                                Upload one or more CSV/Excel files to begin your
                                data analysis workflow.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="px-4 sm:px-6">
                            <form
                                onSubmit={handleSubmit}
                                className="flex flex-col gap-4"
                            >
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                                    <div className="min-w-0 flex-1">
                                        <Label htmlFor="files">
                                            Files (CSV, XLSX) — select multiple
                                        </Label>
                                        <Input
                                            ref={fileRef}
                                            id="files"
                                            type="file"
                                            accept=".csv,.xlsx,.xls"
                                            multiple
                                            onChange={handleFilesChange}
                                            className="mt-1"
                                        />
                                        {errors.files && (
                                            <p className="mt-1 text-sm text-destructive">
                                                {errors.files}
                                            </p>
                                        )}
                                        {(errors as Record<string, string>)[
                                            'files.0'
                                        ] && (
                                            <p className="mt-1 text-sm text-destructive">
                                                {
                                                    (
                                                        errors as Record<
                                                            string,
                                                            string
                                                        >
                                                    )['files.0']
                                                }
                                            </p>
                                        )}
                                    </div>
                                    <Button
                                        type="submit"
                                        disabled={uploading}
                                        className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md transition-shadow hover:from-blue-600 hover:to-purple-700 hover:shadow-lg sm:w-auto"
                                    >
                                        <Upload className="size-4" />
                                        {uploading ? 'Uploading...' : 'Upload'}
                                    </Button>
                                </div>

                                {/* Selected Files Preview */}
                                {selectedFiles.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {selectedFiles.map((file, index) => (
                                            <div
                                                key={index}
                                                className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1 text-xs"
                                            >
                                                <FileUp className="size-3 text-muted-foreground" />
                                                <span className="max-w-[120px] sm:max-w-[200px] truncate">
                                                    {file.name}
                                                </span>
                                                <span className="text-muted-foreground">
                                                    (
                                                    {(file.size / 1024).toFixed(
                                                        0,
                                                    )}{' '}
                                                    KB)
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        removeFile(index)
                                                    }
                                                    className="ml-0.5 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                                >
                                                    <X className="size-3" />
                                                </button>
                                            </div>
                                        ))}
                                        <span className="self-center text-xs text-muted-foreground">
                                            {selectedFiles.length} file
                                            {selectedFiles.length > 1
                                                ? 's'
                                                : ''}{' '}
                                            selected
                                        </span>
                                    </div>
                                )}
                            </form>
                        </CardContent>
                    </Card>
                </FadeIn>

                {/* Load Sample Data */}
                {!dataset && (
                    <FadeIn delay={0.25}>
                        <div className="flex items-center gap-3 rounded-lg border border-dashed border-border/60 bg-muted/30 px-4 py-3">
                            <p className="flex-1 text-sm text-muted-foreground">
                                No data to upload? Try with built-in sample
                                datasets to explore the platform.
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={loadingSample}
                                onClick={() => {
                                    setLoadingSample(true);
                                    router.post(
                                        '/datasets/sample',
                                        {},
                                        {
                                            onFinish: () =>
                                                setLoadingSample(false),
                                        },
                                    );
                                }}
                            >
                                <Database className="size-4" />
                                {loadingSample
                                    ? 'Loading...'
                                    : 'Load Sample Data'}
                            </Button>
                        </div>
                    </FadeIn>
                )}

                {/* Dataset Relationships */}
                {dataset && (
                    <FadeIn delay={0.1}>
                        <Card>
                            <CardHeader className="px-4 sm:px-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 text-white">
                                                <Link2 className="size-3.5" />
                                            </div>
                                            Linked Datasets
                                        </CardTitle>
                                        <CardDescription>
                                            Datasets related to{' '}
                                            <span className="font-medium">
                                                {dataset.name}
                                            </span>
                                        </CardDescription>
                                    </div>
                                    {availableForRelationship.length > 0 && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                setShowRelationshipForm(
                                                    !showRelationshipForm,
                                                )
                                            }
                                        >
                                            <Plus className="size-3.5" />
                                            Link Dataset
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="px-4 sm:px-6">
                                {/* Add Relationship Form */}
                                {showRelationshipForm && (
                                    <form
                                        onSubmit={handleAddRelationship}
                                        className="mb-4 rounded-lg border border-dashed p-4"
                                    >
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                            <div className="min-w-0 flex-1">
                                                <Label htmlFor="related_dataset_id">
                                                    Dataset
                                                </Label>
                                                <select
                                                    id="related_dataset_id"
                                                    value={
                                                        relationshipForm.data
                                                            .related_dataset_id
                                                    }
                                                    onChange={(e) =>
                                                        relationshipForm.setData(
                                                            'related_dataset_id',
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                                                >
                                                    <option value="">
                                                        Select a dataset...
                                                    </option>
                                                    {availableForRelationship.map(
                                                        (d) => (
                                                            <option
                                                                key={d.id}
                                                                value={d.id}
                                                            >
                                                                {d.name}
                                                            </option>
                                                        ),
                                                    )}
                                                </select>
                                            </div>
                                            <div className="w-full sm:w-40">
                                                <Label htmlFor="rel_type">
                                                    Type
                                                </Label>
                                                <select
                                                    id="rel_type"
                                                    value={
                                                        relationshipForm.data
                                                            .type
                                                    }
                                                    onChange={(e) =>
                                                        relationshipForm.setData(
                                                            'type',
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                                                >
                                                    {relationshipTypes.map(
                                                        (rt) => (
                                                            <option
                                                                key={rt.value}
                                                                value={rt.value}
                                                            >
                                                                {rt.label}
                                                            </option>
                                                        ),
                                                    )}
                                                </select>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <Label htmlFor="rel_description">
                                                    Description (optional)
                                                </Label>
                                                <Input
                                                    id="rel_description"
                                                    value={
                                                        relationshipForm.data
                                                            .description
                                                    }
                                                    onChange={(e) =>
                                                        relationshipForm.setData(
                                                            'description',
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="e.g., Same survey data"
                                                    className="mt-1"
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    type="submit"
                                                    size="sm"
                                                    disabled={
                                                        relationshipForm.processing
                                                    }
                                                    className="bg-gradient-to-r from-rose-500 to-pink-600 text-white"
                                                >
                                                    <Plus className="size-3.5" />
                                                    Link
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        setShowRelationshipForm(
                                                            false,
                                                        )
                                                    }
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                        {relationshipForm.errors
                                            .related_dataset_id && (
                                            <p className="mt-2 text-sm text-destructive">
                                                {
                                                    relationshipForm.errors
                                                        .related_dataset_id
                                                }
                                            </p>
                                        )}
                                    </form>
                                )}

                                {/* Relationships List */}
                                {allRelationships.length > 0 ? (
                                    <StaggerContainer className="flex flex-col gap-2">
                                        {allRelationships.map((rel) => (
                                            <StaggerItem key={rel.id}>
                                                <div className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/30">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                                                            <Database className="size-4 text-primary" />
                                                        </div>
                                                        <div>
                                                            <Link
                                                                href={`/datasets/${rel.id}`}
                                                                className="text-sm font-medium text-primary hover:underline"
                                                            >
                                                                {rel.name}
                                                            </Link>
                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="text-[10px]"
                                                                >
                                                                    {rel.type}
                                                                </Badge>
                                                                <span>
                                                                    {
                                                                        rel.row_count
                                                                    }{' '}
                                                                    rows
                                                                    &middot;{' '}
                                                                    {
                                                                        rel.column_count
                                                                    }{' '}
                                                                    cols
                                                                </span>
                                                                {rel.description && (
                                                                    <span>
                                                                        &middot;{' '}
                                                                        {
                                                                            rel.description
                                                                        }
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            handleRemoveRelationship(
                                                                rel.id,
                                                            )
                                                        }
                                                        className="text-muted-foreground hover:text-destructive"
                                                    >
                                                        <X className="size-3.5" />
                                                    </Button>
                                                </div>
                                            </StaggerItem>
                                        ))}
                                    </StaggerContainer>
                                ) : (
                                    <p className="py-6 text-center text-sm text-muted-foreground">
                                        No linked datasets yet. Upload multiple
                                        files together or link them manually.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </FadeIn>
                )}

                {/* Existing Datasets (authenticated users only) */}
                {datasets && datasetsList.length > 0 ? (
                    <FadeIn delay={dataset ? 0.15 : 0.3}>
                        <Card>
                            <CardHeader className="px-4 sm:px-6">
                                <CardTitle>Your Datasets</CardTitle>
                                <CardDescription>
                                    Select a dataset to view, clean, or analyze.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="px-4 sm:px-6">
                                {/* Mobile card layout */}
                                <StaggerContainer className="flex flex-col gap-3 sm:hidden">
                                    {datasetsList.map((ds) => (
                                        <StaggerItem key={ds.id}>
                                            <motion.div
                                                whileHover={{
                                                    scale: 1.02,
                                                    boxShadow:
                                                        '0 4px 20px rgba(0,0,0,0.08)',
                                                }}
                                                transition={{ duration: 0.2 }}
                                                className="flex items-start justify-between rounded-lg border p-3"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <Link
                                                        href={`/datasets/${ds.id}`}
                                                        className="font-medium text-primary hover:underline"
                                                    >
                                                        {ds.name}
                                                    </Link>
                                                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                                        {ds.original_filename}
                                                    </p>
                                                    <div className="mt-1.5 flex items-center gap-2">
                                                        <Badge
                                                            variant="secondary"
                                                            className="bg-gradient-to-r from-blue-50 to-purple-50 text-xs dark:from-blue-950/40 dark:to-purple-950/40"
                                                        >
                                                            {ds.file_type.toUpperCase()}
                                                        </Badge>
                                                        <span className="text-xs text-muted-foreground">
                                                            {ds.row_count} rows
                                                            &middot;{' '}
                                                            {ds.column_count}{' '}
                                                            cols
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="ml-2 flex shrink-0 items-center gap-1">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        asChild
                                                    >
                                                        <Link
                                                            href={`/datasets/${ds.id}/profile`}
                                                        >
                                                            View
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() =>
                                                            setDeleteTarget(ds.id)
                                                        }
                                                        disabled={
                                                            deleteForm.processing
                                                        }
                                                    >
                                                        <Trash2 className="size-3" />
                                                    </Button>
                                                </div>
                                            </motion.div>
                                        </StaggerItem>
                                    ))}
                                </StaggerContainer>

                                {/* Desktop table layout */}
                                <div className="hidden overflow-x-auto sm:block">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="px-3 py-2 text-left font-medium">
                                                    Name
                                                </th>
                                                <th className="px-3 py-2 text-left font-medium">
                                                    File
                                                </th>
                                                <th className="px-3 py-2 text-left font-medium">
                                                    Type
                                                </th>
                                                <th className="px-3 py-2 text-left font-medium">
                                                    Rows
                                                </th>
                                                <th className="px-3 py-2 text-left font-medium">
                                                    Columns
                                                </th>
                                                <th className="px-3 py-2 text-left font-medium">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <motion.tbody
                                            initial="hidden"
                                            animate="visible"
                                            variants={{
                                                hidden: { opacity: 0 },
                                                visible: {
                                                    opacity: 1,
                                                    transition: {
                                                        staggerChildren: 0.06,
                                                        delayChildren: 0.1,
                                                    },
                                                },
                                            }}
                                        >
                                            {datasetsList.map((ds) => (
                                                <motion.tr
                                                    key={ds.id}
                                                    variants={{
                                                        hidden: {
                                                            opacity: 0,
                                                            y: 10,
                                                        },
                                                        visible: {
                                                            opacity: 1,
                                                            y: 0,
                                                        },
                                                    }}
                                                    whileHover={{
                                                        scale: 1.01,
                                                        boxShadow:
                                                            '0 2px 12px rgba(0,0,0,0.06)',
                                                    }}
                                                    transition={{
                                                        duration: 0.2,
                                                    }}
                                                    className="border-b last:border-0"
                                                >
                                                    <td className="px-3 py-2">
                                                        <Link
                                                            href={`/datasets/${ds.id}`}
                                                            className="font-medium text-primary hover:underline"
                                                        >
                                                            {ds.name}
                                                        </Link>
                                                    </td>
                                                    <td className="max-w-[200px] truncate px-3 py-2 text-muted-foreground">
                                                        {ds.original_filename}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <Badge
                                                            variant="secondary"
                                                            className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/40 dark:to-purple-950/40"
                                                        >
                                                            {ds.file_type.toUpperCase()}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <span className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:from-emerald-950/40 dark:to-teal-950/40 dark:text-emerald-400">
                                                            {ds.row_count}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <span className="inline-flex items-center rounded-full bg-gradient-to-r from-amber-50 to-orange-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:from-amber-950/40 dark:to-orange-950/40 dark:text-amber-400">
                                                            {ds.column_count}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                asChild
                                                            >
                                                                <Link
                                                                    href={`/datasets/${ds.id}/profile`}
                                                                >
                                                                    View
                                                                </Link>
                                                            </Button>
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() =>
                                                                    setDeleteTarget(
                                                                        ds.id,
                                                                    )
                                                                }
                                                                disabled={
                                                                    deleteForm.processing
                                                                }
                                                            >
                                                                <Trash2 className="size-3" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </motion.tbody>
                                    </table>
                                </div>

                                {/* Datasets list pagination */}
                                {datasets && datasets.last_page > 1 && (
                                    <div className="mt-4 flex items-center justify-between border-t pt-4">
                                        <p className="text-sm text-muted-foreground">
                                            Showing {datasetsFrom} to{' '}
                                            {datasetsTo} of {datasets.total}{' '}
                                            datasets
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={
                                                    datasets.current_page <= 1
                                                }
                                                asChild={
                                                    datasets.current_page > 1
                                                }
                                            >
                                                {datasets.current_page > 1 ? (
                                                    <Link
                                                        href={
                                                            datasets.links.find(
                                                                (l) =>
                                                                    l.label.includes(
                                                                        'Previous',
                                                                    ),
                                                            )?.url ?? '#'
                                                        }
                                                        preserveState
                                                    >
                                                        <ChevronLeft className="size-4" />
                                                        Previous
                                                    </Link>
                                                ) : (
                                                    <>
                                                        <ChevronLeft className="size-4" />
                                                        Previous
                                                    </>
                                                )}
                                            </Button>
                                            <span className="text-sm text-muted-foreground">
                                                Page {datasets.current_page} of{' '}
                                                {datasets.last_page}
                                            </span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={
                                                    datasets.current_page >=
                                                    datasets.last_page
                                                }
                                                asChild={
                                                    datasets.current_page <
                                                    datasets.last_page
                                                }
                                            >
                                                {datasets.current_page <
                                                datasets.last_page ? (
                                                    <Link
                                                        href={
                                                            datasets.links.find(
                                                                (l) =>
                                                                    l.label.includes(
                                                                        'Next',
                                                                    ),
                                                            )?.url ?? '#'
                                                        }
                                                        preserveState
                                                    >
                                                        Next
                                                        <ChevronRight className="size-4" />
                                                    </Link>
                                                ) : (
                                                    <>
                                                        Next
                                                        <ChevronRight className="size-4" />
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </FadeIn>
                ) : datasets && datasetsList.length === 0 ? (
                    /* Empty state when no datasets exist (authenticated only) */
                    <FadeInScale delay={0.35}>
                        <Card className="border-dashed border-border/40">
                            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                                <motion.div
                                    initial={{ scale: 0, rotate: -10 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{
                                        type: 'spring',
                                        stiffness: 200,
                                        damping: 15,
                                        delay: 0.3,
                                    }}
                                    className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/20"
                                >
                                    <Database className="size-8" />
                                </motion.div>
                                <motion.h3
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.45, duration: 0.4 }}
                                    className="text-lg font-semibold"
                                >
                                    No datasets yet
                                </motion.h3>
                                <motion.p
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.55, duration: 0.4 }}
                                    className="mt-1 max-w-sm text-sm text-muted-foreground"
                                >
                                    Upload your first CSV or Excel file above to
                                    get started with data analysis.
                                </motion.p>
                            </CardContent>
                        </Card>
                    </FadeInScale>
                ) : null}

                {/* Data Preview */}
                {dataset && displayData.length > 0 && (
                    <AnimatedCard delay={0.25}>
                        <Card>
                            <CardHeader className="px-4 sm:px-6">
                                <CardTitle>
                                    Data Preview: {dataset.name}
                                </CardTitle>
                                <CardDescription>
                                    {dataPagination ? (
                                        <>
                                            Showing rows {dataFrom} to {dataTo}{' '}
                                            of {dataPagination.total},{' '}
                                            {dataset.column_count} columns
                                        </>
                                    ) : (
                                        <>
                                            Showing{' '}
                                            {Math.min(displayData.length, 100)}{' '}
                                            of {dataset.row_count} rows,{' '}
                                            {dataset.column_count} columns
                                        </>
                                    )}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="px-4 sm:px-6">
                                <FadeIn delay={0.35}>
                                    <div className="overflow-x-auto rounded-md border">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted/50">
                                                <tr>
                                                    <th className="sticky left-0 bg-muted/50 px-3 py-2 text-left text-xs font-medium">
                                                        #
                                                    </th>
                                                    {displayHeaders.map((h) => (
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
                                                {displayData
                                                    .slice(0, 100)
                                                    .map((row, i) => (
                                                        <tr
                                                            key={i}
                                                            className="border-t transition-colors hover:bg-muted/30"
                                                        >
                                                            <td className="sticky left-0 bg-background px-3 py-1.5 text-xs text-muted-foreground">
                                                                {dataPagination
                                                                    ? dataFrom +
                                                                      i
                                                                    : i + 1}
                                                            </td>
                                                            {displayHeaders.map(
                                                                (h) => (
                                                                    <td
                                                                        key={h}
                                                                        className="max-w-[200px] truncate px-3 py-1.5 whitespace-nowrap"
                                                                    >
                                                                        {row[
                                                                            h
                                                                        ] !=
                                                                        null
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

                                    {/* Data preview pagination */}
                                    {dataPagination &&
                                        dataPagination.last_page > 1 && (
                                            <div className="mt-4 flex items-center justify-between border-t pt-4">
                                                <p className="text-sm text-muted-foreground">
                                                    Showing {dataFrom} to{' '}
                                                    {dataTo} of{' '}
                                                    {dataPagination.total} rows
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={
                                                            dataPagination.current_page <=
                                                            1
                                                        }
                                                        onClick={() =>
                                                            handleDataPageChange(
                                                                dataPagination.current_page -
                                                                    1,
                                                            )
                                                        }
                                                    >
                                                        <ChevronLeft className="size-4" />
                                                        Previous
                                                    </Button>
                                                    <span className="text-sm text-muted-foreground">
                                                        Page{' '}
                                                        {
                                                            dataPagination.current_page
                                                        }{' '}
                                                        of{' '}
                                                        {
                                                            dataPagination.last_page
                                                        }
                                                    </span>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={
                                                            dataPagination.current_page >=
                                                            dataPagination.last_page
                                                        }
                                                        onClick={() =>
                                                            handleDataPageChange(
                                                                dataPagination.current_page +
                                                                    1,
                                                            )
                                                        }
                                                    >
                                                        Next
                                                        <ChevronRight className="size-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                </FadeIn>
                            </CardContent>
                        </Card>
                    </AnimatedCard>
                )}
            </div>

            <ConfirmDialog
                open={deleteTarget !== null}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                title="Delete Dataset?"
                description="This action cannot be undone. The dataset and all its data will be permanently removed."
                confirmLabel="Delete"
                destructive
                processing={deleteForm.processing}
                onConfirm={() => {
                    if (deleteTarget !== null) {
                        deleteForm.delete(`/datasets/${deleteTarget}`);
                    }
                }}
            />

            <ConfirmDialog
                open={unlinkTarget !== null}
                onOpenChange={(open) => !open && setUnlinkTarget(null)}
                title="Remove Relationship?"
                description="This will unlink the datasets. The datasets themselves will not be deleted."
                confirmLabel="Remove"
                destructive
                onConfirm={() => {
                    if (dataset && unlinkTarget !== null) {
                        router.delete(
                            `/datasets/${dataset.id}/relationships/${unlinkTarget}`,
                        );
                    }
                }}
            />
        </DatasetLayout>
    );
}
