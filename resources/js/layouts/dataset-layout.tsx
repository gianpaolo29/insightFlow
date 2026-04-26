import { Link, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    BarChart3,
    Database,
    FileUp,
    GitCompareArrows,
    Lightbulb,
    Sparkles,
    Wrench,
} from 'lucide-react';
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { BreadcrumbItem } from '@/types';

type Dataset = {
    id: number;
    name?: string;
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.06, delayChildren: 0.15 },
    },
};

const staggerItem = {
    hidden: { opacity: 0, x: -12 },
    visible: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.35, ease: 'easeOut' as const },
    },
};

export default function DatasetLayout({
    children,
    breadcrumbs = [],
}: {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
}) {
    const page = usePage<{ dataset?: Dataset }>();
    const dataset = page.props.dataset;
    const { isCurrentUrl } = useCurrentUrl();

    const navItems = useMemo(() => {
        const items = [
            {
                title: 'Upload',
                href: '/',
                icon: FileUp,
                color: 'from-blue-500 to-blue-600',
            },
        ];

        if (dataset && 'id' in dataset) {
            const id = dataset.id;
            items.push(
                {
                    title: 'Profile',
                    href: `/datasets/${id}/profile`,
                    icon: Database,
                    color: 'from-emerald-500 to-emerald-600',
                },
                {
                    title: 'Clean',
                    href: `/datasets/${id}/clean`,
                    icon: Wrench,
                    color: 'from-violet-500 to-violet-600',
                },
                {
                    title: 'Compare',
                    href: `/datasets/${id}/compare`,
                    icon: GitCompareArrows,
                    color: 'from-amber-500 to-amber-600',
                },
                {
                    title: 'Analyze',
                    href: `/datasets/${id}/analyze`,
                    icon: Lightbulb,
                    color: 'from-rose-500 to-rose-600',
                },
                {
                    title: 'Visualize',
                    href: `/datasets/${id}/visualize`,
                    icon: BarChart3,
                    color: 'from-cyan-500 to-cyan-600',
                },
            );
        }

        return items;
    }, [dataset]);

    return (
        <AppShell variant="sidebar">
            <Sidebar collapsible="icon" variant="inset">
                <SidebarHeader>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton size="lg" asChild>
                                <Link href="/">
                                    <motion.div
                                        initial={{ scale: 0, rotate: -180 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{
                                            type: 'spring',
                                            stiffness: 200,
                                            damping: 15,
                                            delay: 0.1,
                                        }}
                                        className="flex aspect-square size-8 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white shadow-md"
                                    >
                                        <Sparkles className="size-5" />
                                    </motion.div>
                                    <div className="ml-1 grid flex-1 text-left text-sm">
                                        <span className="mb-0.5 truncate leading-tight font-semibold">
                                            InsightFlow
                                        </span>
                                        <span className="truncate text-xs text-muted-foreground">
                                            Data Analytics
                                        </span>
                                    </div>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarHeader>

                <SidebarContent>
                    <SidebarGroup className="px-2 py-0">
                        <SidebarGroupLabel>Workflow</SidebarGroupLabel>
                        <motion.div
                            variants={staggerContainer}
                            initial="hidden"
                            animate="visible"
                        >
                            <SidebarMenu>
                                {navItems.map((item) => {
                                    const active = isCurrentUrl(item.href);

                                    return (
                                        <motion.div
                                            key={item.title}
                                            variants={staggerItem}
                                        >
                                            <SidebarMenuItem>
                                                <SidebarMenuButton
                                                    asChild
                                                    isActive={active}
                                                    tooltip={{
                                                        children: item.title,
                                                    }}
                                                >
                                                    <Link href={item.href}>
                                                        <div
                                                            className={`flex size-5 items-center justify-center rounded ${active ? `bg-gradient-to-br ${item.color} text-white` : ''}`}
                                                        >
                                                            <item.icon
                                                                className={
                                                                    active
                                                                        ? 'size-3'
                                                                        : 'size-4'
                                                                }
                                                            />
                                                        </div>
                                                        <span>
                                                            {item.title}
                                                        </span>
                                                    </Link>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        </motion.div>
                                    );
                                })}
                            </SidebarMenu>
                        </motion.div>
                    </SidebarGroup>

                    {dataset && 'name' in dataset && dataset.name && (
                        <>
                            <SidebarSeparator />
                            <SidebarGroup className="px-2 py-0">
                                <SidebarGroupLabel>
                                    Active Dataset
                                </SidebarGroupLabel>
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4, duration: 0.4 }}
                                >
                                    <SidebarMenu>
                                        <SidebarMenuItem>
                                            <SidebarMenuButton
                                                asChild
                                                tooltip={{
                                                    children: dataset.name,
                                                }}
                                            >
                                                <Link
                                                    href={`/datasets/${dataset.id}`}
                                                >
                                                    <div className="flex size-5 items-center justify-center rounded bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                                                        <Database className="size-3" />
                                                    </div>
                                                    <span className="truncate">
                                                        {dataset.name}
                                                    </span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    </SidebarMenu>
                                </motion.div>
                            </SidebarGroup>
                        </>
                    )}
                </SidebarContent>

                <SidebarFooter>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                size="sm"
                                className="text-xs text-muted-foreground"
                                tooltip={{ children: 'InsightFlow v1.0' }}
                            >
                                <Sparkles className="size-3" />
                                <span>InsightFlow v1.0</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>
            </Sidebar>
            <AppContent variant="sidebar">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="flex-1 overflow-x-hidden"
                >
                    {children}
                </motion.div>
            </AppContent>
        </AppShell>
    );
}
