import {
    AlertTriangle,
    Calendar,
    CheckCircle,
    Columns3,
    Database,
    Hash,
    Rows3,
    Type,
} from 'lucide-react';
import {
    AnimatedProgressBar,
    CountUp,
    FadeIn,
    StaggerContainer,
    StaggerItem,
    motion,
} from '@/components/ui/animations';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import DatasetLayout from '@/layouts/dataset-layout';

type ColumnProfile = {
    name: string;
    type: string;
    total: number;
    missing: number;
    unique: number;
    min?: number;
    max?: number;
    avg?: number;
    sum?: number;
};

type Profile = {
    row_count: number;
    column_count: number;
    columns: Record<string, ColumnProfile>;
};

type Dataset = {
    id: number;
    name: string;
    headers: string[];
    row_count: number;
    column_count: number;
    profile: Profile;
};

type Props = {
    dataset: Dataset;
};

const statCards = [
    {
        label: 'Total Rows',
        icon: Rows3,
        gradient: 'from-blue-500/10 to-blue-600/5',
        iconColor: 'text-blue-500',
        getValue: (profile: Profile) => profile.row_count,
    },
    {
        label: 'Total Columns',
        icon: Columns3,
        gradient: 'from-emerald-500/10 to-emerald-600/5',
        iconColor: 'text-emerald-500',
        getValue: (profile: Profile) => profile.column_count,
    },
    {
        label: 'Numeric Columns',
        icon: Hash,
        gradient: 'from-violet-500/10 to-violet-600/5',
        iconColor: 'text-violet-500',
        getValue: (profile: Profile) =>
            Object.values(profile.columns).filter((c) => c.type === 'number')
                .length,
    },
    {
        label: 'Missing Values',
        icon: AlertTriangle,
        gradient: 'from-amber-500/10 to-amber-600/5',
        iconColor: 'text-amber-500',
        getValue: (profile: Profile) =>
            Object.values(profile.columns).reduce(
                (sum, c) => sum + c.missing,
                0,
            ),
    },
] as const;

function TypeBadge({ type }: { type: string }) {
    const config: Record<
        string,
        {
            variant: 'default' | 'secondary' | 'outline';
            icon: typeof Hash;
            className: string;
        }
    > = {
        number: {
            variant: 'default',
            icon: Hash,
            className:
                'bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
        },
        date: {
            variant: 'secondary',
            icon: Calendar,
            className:
                'bg-purple-100 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400',
        },
        boolean: {
            variant: 'secondary',
            icon: CheckCircle,
            className:
                'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
        },
        string: {
            variant: 'outline',
            icon: Type,
            className:
                'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400',
        },
    };

    const cfg = config[type] ?? config.string;
    const Icon = cfg.icon;

    return (
        <Badge variant={cfg.variant} className={cfg.className}>
            <Icon className="mr-1 size-3" />
            {type}
        </Badge>
    );
}

export default function ProfilePage({ dataset }: Props) {
    const { profile } = dataset;
    const columns = Object.values(profile.columns);

    return (
        <DatasetLayout
            breadcrumbs={[
                { title: 'Upload', href: '/' },
                {
                    title: dataset.name,
                    href: `/datasets/${dataset.id}`,
                },
                {
                    title: 'Profile',
                    href: `/datasets/${dataset.id}/profile`,
                },
            ]}
        >
            <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-6">
                {/* Overview Cards */}
                <StaggerContainer className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    {statCards.map((stat) => {
                        const Icon = stat.icon;

                        return (
                            <StaggerItem key={stat.label}>
                                <Card className="relative overflow-hidden">
                                    <div
                                        className={`absolute inset-0 bg-gradient-to-br ${stat.gradient}`}
                                    />
                                    <CardContent className="relative p-4 sm:pt-6">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-muted-foreground sm:text-sm">
                                                {stat.label}
                                            </p>
                                            <div
                                                className={`rounded-lg bg-white/60 p-1.5 dark:bg-white/10 ${stat.iconColor}`}
                                            >
                                                <Icon className="size-4" />
                                            </div>
                                        </div>
                                        <CountUp
                                            value={stat.getValue(profile)}
                                            className="text-xl font-bold sm:text-2xl"
                                        />
                                    </CardContent>
                                </Card>
                            </StaggerItem>
                        );
                    })}
                </StaggerContainer>

                {/* Column Details */}
                <FadeIn delay={0.2}>
                    <Card>
                        <CardHeader className="px-4 sm:px-6">
                            <CardTitle className="flex items-center gap-2">
                                <Database className="size-5" />
                                Column Profiles
                            </CardTitle>
                            <CardDescription>
                                Detailed statistics for each column in the
                                dataset.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="px-4 sm:px-6">
                            {/* Mobile card layout */}
                            <StaggerContainer className="flex flex-col gap-3 sm:hidden">
                                {columns.map((col) => (
                                    <StaggerItem key={col.name}>
                                        <motion.div
                                            className="rounded-lg border p-3"
                                            whileHover={{
                                                scale: 1.01,
                                                transition: { duration: 0.2 },
                                            }}
                                        >
                                            <div className="mb-2 flex items-center justify-between">
                                                <span className="font-medium">
                                                    {col.name}
                                                </span>
                                                <TypeBadge type={col.type} />
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 text-xs">
                                                <div>
                                                    <span className="text-muted-foreground">
                                                        Count
                                                    </span>
                                                    <p className="font-medium">
                                                        {col.total}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">
                                                        Missing
                                                    </span>
                                                    <p
                                                        className={
                                                            col.missing > 0
                                                                ? 'font-medium text-destructive'
                                                                : 'text-muted-foreground'
                                                        }
                                                    >
                                                        {col.missing}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">
                                                        Unique
                                                    </span>
                                                    <p className="font-medium">
                                                        {col.unique}
                                                    </p>
                                                </div>
                                                {col.min != null && (
                                                    <>
                                                        <div>
                                                            <span className="text-muted-foreground">
                                                                Min
                                                            </span>
                                                            <p className="font-medium">
                                                                {col.min}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground">
                                                                Max
                                                            </span>
                                                            <p className="font-medium">
                                                                {col.max}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground">
                                                                Avg
                                                            </span>
                                                            <p className="font-medium">
                                                                {col.avg}
                                                            </p>
                                                        </div>
                                                    </>
                                                )}
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
                                                Column
                                            </th>
                                            <th className="px-3 py-2 text-left font-medium">
                                                Type
                                            </th>
                                            <th className="px-3 py-2 text-left font-medium">
                                                Count
                                            </th>
                                            <th className="px-3 py-2 text-left font-medium">
                                                Missing
                                            </th>
                                            <th className="px-3 py-2 text-left font-medium">
                                                Unique
                                            </th>
                                            <th className="px-3 py-2 text-left font-medium">
                                                Min
                                            </th>
                                            <th className="px-3 py-2 text-left font-medium">
                                                Max
                                            </th>
                                            <th className="px-3 py-2 text-left font-medium">
                                                Average
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {columns.map((col, index) => (
                                            <motion.tr
                                                key={col.name}
                                                className="border-t"
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
                                                    delay: 0.4 + index * 0.05,
                                                    ease: 'easeOut',
                                                }}
                                            >
                                                <td className="px-3 py-2 font-medium">
                                                    {col.name}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <TypeBadge
                                                        type={col.type}
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    {col.total}
                                                </td>
                                                <td className="px-3 py-2">
                                                    {col.missing > 0 ? (
                                                        <span className="font-medium text-destructive">
                                                            {col.missing}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground">
                                                            0
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2">
                                                    {col.unique}
                                                </td>
                                                <td className="px-3 py-2">
                                                    {col.min != null
                                                        ? col.min
                                                        : '-'}
                                                </td>
                                                <td className="px-3 py-2">
                                                    {col.max != null
                                                        ? col.max
                                                        : '-'}
                                                </td>
                                                <td className="px-3 py-2">
                                                    {col.avg != null
                                                        ? col.avg
                                                        : '-'}
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </FadeIn>

                {/* Missing Values Visualization */}
                <FadeIn delay={0.4}>
                    <Card>
                        <CardHeader className="px-4 sm:px-6">
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="size-5 text-amber-500" />
                                Missing Values Overview
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 sm:px-6">
                            <div className="space-y-3">
                                {columns.map((col) => {
                                    const pct =
                                        col.total > 0
                                            ? (col.missing / col.total) * 100
                                            : 0;
                                    const fillPct = 100 - pct;
                                    const colorClass =
                                        pct > 50
                                            ? 'bg-destructive'
                                            : pct > 20
                                              ? 'bg-chart-4'
                                              : 'bg-primary';

                                    return (
                                        <div
                                            key={col.name}
                                            className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4"
                                        >
                                            <span className="w-32 truncate text-sm font-medium">
                                                {col.name}
                                            </span>
                                            <div className="flex flex-1 items-center gap-2 sm:gap-4">
                                                <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                                                    <AnimatedProgressBar
                                                        percentage={fillPct}
                                                        colorClass={colorClass}
                                                    />
                                                </div>
                                                <span className="w-24 shrink-0 text-right text-xs text-muted-foreground sm:w-28">
                                                    {col.missing}/{col.total} (
                                                    {pct.toFixed(1)}%)
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </FadeIn>
            </div>
        </DatasetLayout>
    );
}
