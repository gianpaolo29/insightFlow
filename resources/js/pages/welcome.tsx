import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BarChart3,
    Database,
    Lightbulb,
    Sparkles,
    Wrench,
} from 'lucide-react';
import { login, register } from '@/routes';
import AppLogoIcon from '@/components/app-logo-icon';

const features = [
    {
        icon: Database,
        title: 'Upload & Organize',
        description:
            'Import CSV and Excel files instantly. Your data is structured and ready for exploration.',
        gradient: 'from-blue-500 to-indigo-600',
    },
    {
        icon: Wrench,
        title: 'Smart Cleaning',
        description:
            'Auto-clean engine handles missing values, duplicates, outliers, and type conversions.',
        gradient: 'from-violet-500 to-purple-600',
    },
    {
        icon: Lightbulb,
        title: 'Deep Analysis',
        description:
            'Automatic statistical summaries, trend detection, and AI-generated interpretations.',
        gradient: 'from-amber-500 to-orange-600',
    },
    {
        icon: BarChart3,
        title: 'Rich Visualizations',
        description:
            'Interactive charts — bar, line, pie — with real-time column selection and aggregation.',
        gradient: 'from-emerald-500 to-teal-600',
    },
];

export default function Welcome({
    canRegister = true,
}: {
    canRegister?: boolean;
}) {
    const { auth, currentTeam } = usePage().props;
    const homeUrl = '/';

    return (
        <>
            <Head title="InsightFlow — Data Analytics Platform">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link
                    href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600"
                    rel="stylesheet"
                />
            </Head>
            <div className="relative flex min-h-screen flex-col bg-background">
                {/* Gradient mesh background */}
                <div className="pointer-events-none fixed inset-0 overflow-hidden">
                    <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-primary/8 blur-3xl" />
                    <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-violet-500/6 blur-3xl" />
                    <div className="absolute top-1/2 left-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/4 blur-3xl" />
                </div>

                {/* Navigation */}
                <header className="relative z-10 w-full">
                    <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 lg:px-8">
                        <div className="flex items-center gap-2.5">
                            <AppLogoIcon className="size-8" />
                            <span className="text-lg font-semibold tracking-tight text-foreground">
                                InsightFlow
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            {auth.user ? (
                                <Link
                                    href={homeUrl}
                                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
                                >
                                    Dashboard
                                    <ArrowRight className="size-4" />
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={login()}
                                        className="rounded-lg px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
                                    >
                                        Log in
                                    </Link>
                                    {canRegister && (
                                        <Link
                                            href={register()}
                                            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
                                        >
                                            Get Started
                                            <ArrowRight className="size-4" />
                                        </Link>
                                    )}
                                </>
                            )}
                        </div>
                    </nav>
                </header>

                {/* Hero Section */}
                <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-16 lg:py-24">
                    <div className="mx-auto max-w-4xl text-center">
                        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
                            <Sparkles className="size-4" />
                            Powerful Data Analytics
                        </div>
                        <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                            Turn raw data into{' '}
                            <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
                                actionable insights
                            </span>
                        </h1>
                        <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl">
                            Upload, clean, analyze, and visualize your datasets
                            with an intuitive workflow. No coding required.
                        </p>
                        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                            {auth.user ? (
                                <Link
                                    href={homeUrl}
                                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30"
                                >
                                    Go to Dashboard
                                    <ArrowRight className="size-5" />
                                </Link>
                            ) : (
                                <>
                                    {canRegister && (
                                        <Link
                                            href={register()}
                                            className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30"
                                        >
                                            Start Free
                                            <ArrowRight className="size-5" />
                                        </Link>
                                    )}
                                    <Link
                                        href={login()}
                                        className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-8 py-3.5 text-base font-semibold text-foreground shadow-sm transition-all hover:bg-accent"
                                    >
                                        Sign In
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Features Grid */}
                    <div className="mx-auto mt-24 grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        {features.map((feature) => {
                            const Icon = feature.icon;
                            return (
                                <div
                                    key={feature.title}
                                    className="group rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur-sm transition-all hover:border-primary/30 hover:shadow-md"
                                >
                                    <div
                                        className={`mb-4 inline-flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} text-white shadow-sm`}
                                    >
                                        <Icon className="size-5" />
                                    </div>
                                    <h3 className="mb-2 font-semibold text-foreground">
                                        {feature.title}
                                    </h3>
                                    <p className="text-sm leading-relaxed text-muted-foreground">
                                        {feature.description}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </main>

                {/* Footer */}
                <footer className="relative z-10 border-t border-border/40 py-6 text-center text-sm text-muted-foreground">
                    InsightFlow &mdash; Data Analytics Platform
                </footer>
            </div>
        </>
    );
}
