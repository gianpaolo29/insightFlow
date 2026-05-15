import { Head, Link, usePage } from '@inertiajs/react';
import { motion, useInView } from 'framer-motion';
import {
    ArrowRight,
    BarChart3,
    CheckCircle,
    Database,
    FileUp,
    Lightbulb,
    Shield,
    Sparkles,
    Wrench,
    Zap,
} from 'lucide-react';
import { useRef } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import { Button } from '@/components/ui/button';
import { login, register } from '@/routes';

const features = [
    {
        icon: FileUp,
        title: 'Smart Data Import',
        description:
            'Drag and drop CSV or Excel files. Auto-detection of data types, headers, and structure — your data is ready in seconds.',
        gradient: 'from-blue-500 to-indigo-600',
    },
    {
        icon: Wrench,
        title: 'Intelligent Auto-Clean',
        description:
            'AI-powered 9-step cleaning engine handles missing values, duplicates, outliers, and type conversions automatically.',
        gradient: 'from-violet-500 to-purple-600',
    },
    {
        icon: Lightbulb,
        title: 'Deep Analysis',
        description:
            'Statistical summaries, trend detection, correlation matrices, and anomaly detection with human-readable interpretations.',
        gradient: 'from-amber-500 to-orange-600',
    },
    {
        icon: BarChart3,
        title: 'Interactive Dashboards',
        description:
            'Beautiful charts — bar, line, pie, scatter — with real-time filters, drill-downs, and a unified dashboard view.',
        gradient: 'from-emerald-500 to-teal-600',
    },
];

const workflowSteps = [
    {
        icon: FileUp,
        title: 'Upload',
        description: 'Import your raw datasets',
        color: 'from-blue-500 to-blue-600',
    },
    {
        icon: Database,
        title: 'Profile',
        description: 'Understand your data',
        color: 'from-emerald-500 to-emerald-600',
    },
    {
        icon: Wrench,
        title: 'Clean',
        description: 'Fix issues automatically',
        color: 'from-violet-500 to-violet-600',
    },
    {
        icon: Lightbulb,
        title: 'Analyze',
        description: 'Discover patterns & trends',
        color: 'from-amber-500 to-amber-600',
    },
    {
        icon: BarChart3,
        title: 'Visualize',
        description: 'Create interactive charts',
        color: 'from-cyan-500 to-cyan-600',
    },
];

const stats = [
    { value: '9-Step', label: 'Auto-Clean Engine' },
    { value: '6+', label: 'Chart Types' },
    { value: '100%', label: 'Data Quality Score' },
    { value: 'Real-time', label: 'Processing' },
];

function AnimatedSection({
    children,
    className = '',
}: {
    children: React.ReactNode;
    className?: string;
}) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-80px' });

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

export default function Welcome({
    canRegister = true,
}: {
    canRegister?: boolean;
}) {
    const { auth } = usePage().props;

    return (
        <>
            <Head title="InsightFlow — Data Analytics Platform" />
            <div className="relative flex min-h-screen flex-col bg-background">
                {/* Animated background */}
                <div className="pointer-events-none fixed inset-0 overflow-hidden">
                    <motion.div
                        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
                        transition={{
                            duration: 20,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                        className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-primary/6 blur-3xl"
                    />
                    <motion.div
                        animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
                        transition={{
                            duration: 25,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                        className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-violet-500/5 blur-3xl"
                    />
                    <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{
                            duration: 15,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                        className="absolute top-1/3 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-indigo-500/4 blur-3xl"
                    />
                </div>

                {/* Sticky Navigation */}
                <header className="sticky top-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-xl">
                    <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
                        <Link
                            href="/welcome"
                            className="flex items-center gap-2.5"
                        >
                            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white shadow-sm">
                                <Sparkles className="size-4" />
                            </div>
                            <span className="text-lg font-semibold tracking-tight">
                                InsightFlow
                            </span>
                        </Link>
                        <div className="flex items-center gap-2 sm:gap-3">
                            {auth.user ? (
                                <Button asChild>
                                    <Link href="/">
                                        Dashboard
                                        <ArrowRight className="ml-1.5 size-4" />
                                    </Link>
                                </Button>
                            ) : (
                                <>
                                    <Button variant="ghost" asChild>
                                        <Link href={login()}>Log in</Link>
                                    </Button>
                                    {canRegister && (
                                        <Button asChild>
                                            <Link href={register()}>
                                                <span className="hidden sm:inline">
                                                    Get Started
                                                </span>
                                                <span className="sm:hidden">
                                                    Sign up
                                                </span>
                                                <ArrowRight className="ml-1 size-4" />
                                            </Link>
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                    </nav>
                </header>

                {/* Hero Section */}
                <section className="relative z-10 flex flex-col items-center px-6 pt-16 pb-20 sm:pt-24 lg:pt-32">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary"
                    >
                        <Sparkles className="size-3.5" />
                        Data Cleaning & Analytics Platform
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="mx-auto max-w-4xl text-center text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
                    >
                        Turn raw data into{' '}
                        <span className="bg-gradient-to-r from-primary via-violet-500 to-pink-500 bg-clip-text text-transparent">
                            actionable insights
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="mx-auto mt-6 max-w-2xl text-center text-lg text-muted-foreground sm:text-xl"
                    >
                        Upload, clean, analyze, and visualize your datasets with
                        an intelligent workflow. Powered by smart algorithms —
                        no coding required.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="mt-10 flex flex-col items-center gap-3 sm:flex-row"
                    >
                        {auth.user ? (
                            <Button size="lg" asChild className="text-base">
                                <Link href="/">
                                    Go to Dashboard
                                    <ArrowRight className="ml-2 size-4" />
                                </Link>
                            </Button>
                        ) : (
                            <>
                                {canRegister && (
                                    <Button
                                        size="lg"
                                        asChild
                                        className="text-base shadow-lg shadow-primary/25"
                                    >
                                        <Link href={register()}>
                                            Start Free
                                            <ArrowRight className="ml-2 size-4" />
                                        </Link>
                                    </Button>
                                )}
                                <Button
                                    size="lg"
                                    variant="outline"
                                    asChild
                                    className="text-base"
                                >
                                    <Link href={login()}>Sign In</Link>
                                </Button>
                            </>
                        )}
                    </motion.div>
                </section>

                {/* Workflow Pipeline */}
                <section className="relative z-10 px-6 py-20">
                    <AnimatedSection className="mx-auto max-w-6xl">
                        <div className="mb-12 text-center">
                            <h2 className="text-2xl font-bold sm:text-3xl">
                                From raw data to insights in{' '}
                                <span className="text-primary">5 steps</span>
                            </h2>
                            <p className="mt-3 text-muted-foreground">
                                A streamlined workflow designed for
                                data-driven decisions
                            </p>
                        </div>

                        <div className="relative flex flex-col items-center gap-4 md:flex-row md:justify-between">
                            {/* Connecting line (desktop) */}
                            <div className="absolute top-10 right-12 left-12 hidden h-0.5 bg-gradient-to-r from-blue-500/20 via-violet-500/20 to-cyan-500/20 md:block" />

                            {workflowSteps.map((step, i) => {
                                const Icon = step.icon;
                                return (
                                    <motion.div
                                        key={step.title}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{
                                            delay: i * 0.1,
                                            duration: 0.4,
                                        }}
                                        className="relative flex w-full flex-row items-center gap-4 md:w-auto md:flex-col md:items-center md:gap-3"
                                    >
                                        <div
                                            className={`relative z-10 flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${step.color} text-white shadow-lg md:size-20`}
                                        >
                                            <Icon className="size-6 md:size-8" />
                                        </div>
                                        <div className="text-left md:text-center">
                                            <p className="font-semibold">
                                                {step.title}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {step.description}
                                            </p>
                                        </div>
                                        {/* Mobile connector line */}
                                        {i < workflowSteps.length - 1 && (
                                            <div className="absolute -bottom-4 left-7 h-4 w-0.5 bg-border md:hidden" />
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>
                    </AnimatedSection>
                </section>

                {/* Features Grid */}
                <section className="relative z-10 bg-muted/30 px-6 py-20">
                    <AnimatedSection className="mx-auto max-w-6xl">
                        <div className="mb-12 text-center">
                            <h2 className="text-2xl font-bold sm:text-3xl">
                                Everything you need for data analysis
                            </h2>
                            <p className="mt-3 text-muted-foreground">
                                Powerful tools wrapped in a simple interface
                            </p>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                            {features.map((feature, i) => {
                                const Icon = feature.icon;
                                return (
                                    <motion.div
                                        key={feature.title}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{
                                            delay: i * 0.1,
                                            duration: 0.4,
                                        }}
                                        className="group rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:border-primary/20 hover:shadow-md sm:p-8"
                                    >
                                        <div
                                            className={`mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} text-white shadow-sm`}
                                        >
                                            <Icon className="size-6" />
                                        </div>
                                        <h3 className="mb-2 text-lg font-semibold">
                                            {feature.title}
                                        </h3>
                                        <p className="leading-relaxed text-muted-foreground">
                                            {feature.description}
                                        </p>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </AnimatedSection>
                </section>

                {/* Stats Section */}
                <section className="relative z-10 px-6 py-16">
                    <AnimatedSection className="mx-auto max-w-5xl">
                        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
                            {stats.map((stat, i) => (
                                <motion.div
                                    key={stat.label}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{
                                        delay: i * 0.1,
                                        duration: 0.4,
                                    }}
                                    className="text-center"
                                >
                                    <p className="text-3xl font-bold text-primary sm:text-4xl">
                                        {stat.value}
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {stat.label}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    </AnimatedSection>
                </section>

                {/* Why InsightFlow */}
                <section className="relative z-10 bg-muted/30 px-6 py-20">
                    <AnimatedSection className="mx-auto max-w-4xl">
                        <div className="mb-10 text-center">
                            <h2 className="text-2xl font-bold sm:text-3xl">
                                Why InsightFlow?
                            </h2>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-3">
                            {[
                                {
                                    icon: Zap,
                                    title: 'Lightning Fast',
                                    text: 'Process and clean datasets in seconds with our optimized engine.',
                                },
                                {
                                    icon: Shield,
                                    title: 'Data Quality Scoring',
                                    text: 'Get a 0-100% quality score measuring completeness, validity, and consistency.',
                                },
                                {
                                    icon: CheckCircle,
                                    title: 'Export Anywhere',
                                    text: 'Download cleaned data as CSV or Excel, plus printable cleaning reports.',
                                },
                            ].map((item, i) => (
                                <motion.div
                                    key={item.title}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{
                                        delay: i * 0.1,
                                        duration: 0.4,
                                    }}
                                    className="rounded-xl border bg-card p-6 text-center"
                                >
                                    <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                        <item.icon className="size-5" />
                                    </div>
                                    <h3 className="mb-1 font-semibold">
                                        {item.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {item.text}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    </AnimatedSection>
                </section>

                {/* Final CTA */}
                <section className="relative z-10 px-6 py-20">
                    <AnimatedSection>
                        <div className="mx-auto max-w-3xl rounded-3xl bg-gradient-to-br from-primary/10 via-violet-500/10 to-pink-500/10 p-8 text-center sm:p-12">
                            <h2 className="text-2xl font-bold sm:text-3xl">
                                Ready to transform your data?
                            </h2>
                            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                                Join InsightFlow and start turning messy
                                datasets into clean, actionable insights.
                            </p>
                            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                                {auth.user ? (
                                    <Button
                                        size="lg"
                                        asChild
                                        className="text-base"
                                    >
                                        <Link href="/">
                                            Go to Dashboard
                                            <ArrowRight className="ml-2 size-4" />
                                        </Link>
                                    </Button>
                                ) : (
                                    <>
                                        {canRegister && (
                                            <Button
                                                size="lg"
                                                asChild
                                                className="text-base shadow-lg shadow-primary/25"
                                            >
                                                <Link href={register()}>
                                                    Get Started Free
                                                    <ArrowRight className="ml-2 size-4" />
                                                </Link>
                                            </Button>
                                        )}
                                        <Button
                                            size="lg"
                                            variant="outline"
                                            asChild
                                            className="text-base"
                                        >
                                            <Link href={login()}>Sign In</Link>
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </AnimatedSection>
                </section>

                {/* Footer */}
                <footer className="relative z-10 border-t border-border/40">
                    <div className="mx-auto max-w-6xl px-6 py-10">
                        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                            <div className="flex items-center gap-2">
                                <div className="flex size-7 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white">
                                    <Sparkles className="size-3.5" />
                                </div>
                                <span className="text-sm font-semibold">
                                    InsightFlow
                                </span>
                            </div>
                            <p className="text-center text-sm text-muted-foreground">
                                Data Cleaning & Analytics System
                            </p>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
