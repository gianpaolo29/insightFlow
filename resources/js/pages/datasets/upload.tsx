import { Link, router, useForm } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Database, FileUp, Trash2, Upload } from 'lucide-react';
import { type FormEvent, useRef } from 'react';
import Swal from 'sweetalert2';
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
    AnimatedCard,
    FadeIn,
    FadeInScale,
    motion,
    StaggerContainer,
    StaggerItem,
} from '@/components/ui/animations';
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

type DatasetDetail = {
    id: number;
    name: string;
    original_filename: string;
    headers: string[];
    original_data: Record<string, unknown>[];
    row_count: number;
    column_count: number;
    data_pagination?: DataPagination;
};

type Props = {
    datasets: PaginatedData;
    dataset?: DatasetDetail;
};

export default function UploadPage({ datasets, dataset }: Props) {
    const fileRef = useRef<HTMLInputElement>(null);
    const { data, setData, post, processing, errors, reset } = useForm<{
        name: string;
        file: File | null;
    }>({
        name: '',
        file: null,
    });

    const deleteForm = useForm({});

    function confirmDelete(datasetId: number) {
        Swal.fire({
            title: 'Delete Dataset?',
            text: 'This action cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, delete it',
        }).then((result) => {
            if (result.isConfirmed) {
                deleteForm.delete(`/datasets/${datasetId}`);
            }
        });
    }

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        post('/datasets/upload', {
            forceFormData: true,
            onSuccess: () => {
                reset();
                if (fileRef.current) {
                    fileRef.current.value = '';
                }
            },
        });
    }

    function handleDataPageChange(page: number) {
        const url = new URL(window.location.href);
        url.searchParams.set('data_page', String(page));
        router.visit(url.toString(), {
            preserveState: true,
            preserveScroll: true,
        });
    }

    const datasetsList = datasets.data;
    const displayData = dataset?.original_data ?? [];
    const displayHeaders = dataset?.headers ?? [];

    const datasetsFrom =
        datasets.total > 0
            ? (datasets.current_page - 1) * datasets.per_page + 1
            : 0;
    const datasetsTo = Math.min(
        datasets.current_page * datasets.per_page,
        datasets.total,
    );

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

    return (
        <DatasetLayout breadcrumbs={[{ title: 'Upload', href: '/' }]}>
            <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-6">
                {/* Upload Form */}
                <FadeIn delay={0.05}>
                    <Card className="overflow-hidden">
                        <div className="h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
                        <CardHeader className="px-4 pb-4 sm:px-6">
                            <CardTitle className="flex items-center gap-2">
                                <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                    <FileUp className="size-4" />
                                </div>
                                Upload Dataset
                            </CardTitle>
                            <CardDescription>
                                Upload a CSV or Excel file to begin your data
                                analysis workflow.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="px-4 sm:px-6">
                            <form
                                onSubmit={handleSubmit}
                                className="flex flex-col gap-4 sm:flex-row sm:items-end"
                            >
                                <div className="min-w-0 flex-1">
                                    <Label htmlFor="name">Dataset Name</Label>
                                    <Input
                                        id="name"
                                        value={data.name}
                                        onChange={(e) =>
                                            setData('name', e.target.value)
                                        }
                                        placeholder="My Dataset"
                                        className="mt-1"
                                    />
                                    {errors.name && (
                                        <p className="mt-1 text-sm text-destructive">
                                            {errors.name}
                                        </p>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <Label htmlFor="file">File (CSV, XLSX)</Label>
                                    <Input
                                        ref={fileRef}
                                        id="file"
                                        type="file"
                                        accept=".csv,.xlsx,.xls"
                                        onChange={(e) =>
                                            setData(
                                                'file',
                                                e.target.files?.[0] ?? null,
                                            )
                                        }
                                        className="mt-1"
                                    />
                                    {errors.file && (
                                        <p className="mt-1 text-sm text-destructive">
                                            {errors.file}
                                        </p>
                                    )}
                                </div>
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md transition-shadow hover:from-blue-600 hover:to-purple-700 hover:shadow-lg sm:w-auto"
                                >
                                    <Upload className="size-4" />
                                    {processing ? 'Uploading...' : 'Upload'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </FadeIn>

                {/* Existing Datasets */}
                {datasetsList.length > 0 ? (
                    <FadeIn delay={0.15}>
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
                                                whileHover={{ scale: 1.02, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                                                transition={{ duration: 0.2 }}
                                                className="flex items-start justify-between rounded-lg border p-3"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <Link
                                                        href={`/datasets/${ds.id}`}
                                                        className="text-primary font-medium hover:underline"
                                                    >
                                                        {ds.name}
                                                    </Link>
                                                    <p className="text-muted-foreground mt-0.5 truncate text-xs">
                                                        {ds.original_filename}
                                                    </p>
                                                    <div className="mt-1.5 flex items-center gap-2">
                                                        <Badge
                                                            variant="secondary"
                                                            className="bg-gradient-to-r from-blue-50 to-purple-50 text-xs dark:from-blue-950/40 dark:to-purple-950/40"
                                                        >
                                                            {ds.file_type.toUpperCase()}
                                                        </Badge>
                                                        <span className="text-muted-foreground text-xs">
                                                            {ds.row_count} rows &middot;{' '}
                                                            {ds.column_count} cols
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
                                                            confirmDelete(ds.id)
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
                                                    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
                                                },
                                            }}
                                        >
                                                {datasetsList.map((ds) => (
                                                    <motion.tr
                                                        key={ds.id}
                                                        variants={{
                                                            hidden: { opacity: 0, y: 10 },
                                                            visible: { opacity: 1, y: 0 },
                                                        }}
                                                        whileHover={{
                                                            scale: 1.01,
                                                            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                                                        }}
                                                        transition={{ duration: 0.2 }}
                                                        className="border-b last:border-0"
                                                    >
                                                            <td className="px-3 py-2">
                                                                <Link
                                                                    href={`/datasets/${ds.id}`}
                                                                    className="text-primary font-medium hover:underline"
                                                                >
                                                                    {ds.name}
                                                                </Link>
                                                            </td>
                                                            <td className="text-muted-foreground max-w-[200px] truncate px-3 py-2">
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
                                                                            confirmDelete(ds.id)
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
                                {datasets.last_page > 1 && (
                                    <div className="mt-4 flex items-center justify-between border-t pt-4">
                                        <p className="text-muted-foreground text-sm">
                                            Showing {datasetsFrom} to {datasetsTo} of{' '}
                                            {datasets.total} datasets
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={datasets.current_page <= 1}
                                                asChild={datasets.current_page > 1}
                                            >
                                                {datasets.current_page > 1 ? (
                                                    <Link
                                                        href={
                                                            datasets.links.find(
                                                                (l) => l.label.includes('Previous'),
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
                                            <span className="text-muted-foreground text-sm">
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
                                                                (l) => l.label.includes('Next'),
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
                ) : (
                    /* Empty state when no datasets exist */
                    <FadeInScale delay={0.2}>
                        <Card className="border-dashed">
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
                                    className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30"
                                >
                                    <Database className="size-8 text-blue-600 dark:text-blue-400" />
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
                                    className="text-muted-foreground mt-1 max-w-sm text-sm"
                                >
                                    Upload your first CSV or Excel file above to get started with data analysis.
                                </motion.p>
                            </CardContent>
                        </Card>
                    </FadeInScale>
                )}

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
                                            Showing rows {dataFrom} to {dataTo} of{' '}
                                            {dataPagination.total},{' '}
                                            {dataset.column_count} columns
                                        </>
                                    ) : (
                                        <>
                                            Showing {Math.min(displayData.length, 100)} of{' '}
                                            {dataset.row_count} rows,{' '}
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
                                                            className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium"
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
                                                            <td className="text-muted-foreground sticky left-0 bg-background px-3 py-1.5 text-xs">
                                                                {dataPagination
                                                                    ? dataFrom + i
                                                                    : i + 1}
                                                            </td>
                                                            {displayHeaders.map(
                                                                (h) => (
                                                                    <td
                                                                        key={h}
                                                                        className="max-w-[200px] truncate whitespace-nowrap px-3 py-1.5"
                                                                    >
                                                                        {row[h] !=
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
                                    {dataPagination && dataPagination.last_page > 1 && (
                                        <div className="mt-4 flex items-center justify-between border-t pt-4">
                                            <p className="text-muted-foreground text-sm">
                                                Showing {dataFrom} to {dataTo} of{' '}
                                                {dataPagination.total} rows
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={
                                                        dataPagination.current_page <= 1
                                                    }
                                                    onClick={() =>
                                                        handleDataPageChange(
                                                            dataPagination.current_page - 1,
                                                        )
                                                    }
                                                >
                                                    <ChevronLeft className="size-4" />
                                                    Previous
                                                </Button>
                                                <span className="text-muted-foreground text-sm">
                                                    Page {dataPagination.current_page} of{' '}
                                                    {dataPagination.last_page}
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
                                                            dataPagination.current_page + 1,
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
        </DatasetLayout>
    );
}
