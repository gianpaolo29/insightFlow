import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    BarChart3,
    Database,
    FileUp,
    Lightbulb,
    Sparkles,
    TrendingUp,
    Upload,
} from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    FadeIn,
    StaggerContainer,
    StaggerItem,
    CountUp,
} from '@/components/ui/animations';

type DatasetSummary = {
    id: number;
    name: string;
    row_count: number;
    column_count: number;
    file_type: string;
    created_at: string;
};

type Props = {
    datasets?: DatasetSummary[];
    totalDatasets?: number;
    totalRows?: number;
};

const quickActions = [
    {
        title: 'Upload Dataset',
        description: 'Import CSV or Excel files',
        href: '/',
        icon: Upload,
        gradient: 'from-blue-500 to-indigo-600',
    },
    {
        title: 'View Datasets',
        description: 'Browse your data library',
        href: '/',
        icon: Database,
        gradient: 'from-violet-500 to-purple-600',
    },
    {
        title: 'Analyze Data',
        description: 'Get insights and trends',
        href: '/',
        icon: Lightbulb,
        gradient: 'from-amber-500 to-orange-600',
    },
    {
        title: 'Visualize',
        description: 'Create interactive charts',
        href: '/',
        icon: BarChart3,
        gradient: 'from-emerald-500 to-teal-600',
    },
];

export default function Dashboard({
    datasets = [],
    totalDatasets = 0,
    totalRows = 0,
}: Props) {
    return (
        <>
            <Head title="Dashboard" />
            <div className="flex flex-col gap-6 p-6">
                {/* Welcome Header */}
                <FadeIn>
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-violet-600 p-8 text-primary-foreground shadow-lg shadow-primary/20">
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
                        <div className="relative">
                            <div className="mb-2 flex items-center gap-2">
                                <Sparkles className="size-5" />
                                <span className="text-sm font-medium opacity-90">
                                    Welcome back
                                </span>
                            </div>
                            <h1 className="mb-2 text-2xl font-bold sm:text-3xl">
                                Your Analytics Dashboard
                            </h1>
                            <p className="max-w-lg text-sm opacity-80">
                                Upload datasets, clean your data, discover
                                patterns, and create stunning visualizations —
                                all in one place.
                            </p>
                        </div>
                    </div>
                </FadeIn>

                {/* Stats Row */}
                <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <StaggerItem>
                        <Card className="relative overflow-hidden">
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
                            <CardContent className="relative p-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">
                                            Total Datasets
                                        </p>
                                        <CountUp
                                            value={totalDatasets}
                                            className="mt-1 text-3xl font-bold"
                                        />
                                    </div>
                                    <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
                                        <Database className="size-6 text-primary" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </StaggerItem>
                    <StaggerItem>
                        <Card className="relative overflow-hidden">
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
                            <CardContent className="relative p-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">
                                            Total Rows
                                        </p>
                                        <CountUp
                                            value={totalRows}
                                            className="mt-1 text-3xl font-bold"
                                        />
                                    </div>
                                    <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-500/10">
                                        <TrendingUp className="size-6 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </StaggerItem>
                    <StaggerItem>
                        <Card className="relative overflow-hidden">
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent" />
                            <CardContent className="relative p-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">
                                            Avg Columns
                                        </p>
                                        <CountUp
                                            value={
                                                datasets.length > 0
                                                    ? Math.round(
                                                          datasets.reduce(
                                                              (s, d) =>
                                                                  s +
                                                                  d.column_count,
                                                              0,
                                                          ) / datasets.length,
                                                      )
                                                    : 0
                                            }
                                            className="mt-1 text-3xl font-bold"
                                        />
                                    </div>
                                    <div className="flex size-12 items-center justify-center rounded-xl bg-violet-500/10">
                                        <BarChart3 className="size-6 text-violet-600 dark:text-violet-400" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </StaggerItem>
                </StaggerContainer>

                {/* Quick Actions */}
                <FadeIn delay={0.2}>
                    <h2 className="mb-3 text-lg font-semibold">
                        Quick Actions
                    </h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {quickActions.map((action) => {
                            const Icon = action.icon;
                            return (
                                <Link key={action.title} href={action.href}>
                                    <Card className="group cursor-pointer border-border/60 transition-all hover:border-primary/30 hover:shadow-md">
                                        <CardContent className="p-5">
                                            <div
                                                className={`mb-3 inline-flex size-10 items-center justify-center rounded-lg bg-gradient-to-br ${action.gradient} text-white shadow-sm`}
                                            >
                                                <Icon className="size-5" />
                                            </div>
                                            <h3 className="font-semibold">
                                                {action.title}
                                            </h3>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                {action.description}
                                            </p>
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })}
                    </div>
                </FadeIn>

                {/* Recent Datasets */}
                <FadeIn delay={0.3}>
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">
                            Recent Datasets
                        </h2>
                        <Button variant="ghost" size="sm" asChild>
                            <Link
                                href="/"
                                className="gap-1 text-muted-foreground"
                            >
                                View all
                                <ArrowRight className="size-4" />
                            </Link>
                        </Button>
                    </div>
                    {datasets.length > 0 ? (
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {datasets.slice(0, 6).map((ds) => (
                                <Link
                                    key={ds.id}
                                    href={`/datasets/${ds.id}/profile`}
                                >
                                    <Card className="group cursor-pointer transition-all hover:border-primary/30 hover:shadow-md">
                                        <CardContent className="p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                                    <FileUp className="size-4 text-primary" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate font-medium group-hover:text-primary">
                                                        {ds.name}
                                                    </p>
                                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                                        {ds.row_count} rows
                                                        &middot;{' '}
                                                        {ds.column_count}{' '}
                                                        columns &middot;{' '}
                                                        {ds.file_type.toUpperCase()}
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <Card className="mt-3 border-dashed">
                            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                                    <Database className="size-7 text-primary" />
                                </div>
                                <h3 className="font-semibold">
                                    No datasets yet
                                </h3>
                                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                                    Upload your first CSV or Excel file to get
                                    started with data analysis.
                                </p>
                                <Button className="mt-4" asChild>
                                    <Link href="/">
                                        <Upload className="size-4" />
                                        Upload Dataset
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </FadeIn>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: '/dashboard',
        },
    ],
};
