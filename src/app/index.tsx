import type { LucideIcon } from 'lucide-react'
import {
	ArrowRight,
	ArrowUpRight,
	BookOpen,
	Calendar,
	CircleCheck,
	CreditCard,
	FileText,
	GitBranch,
	Github,
	Landmark,
	LayoutDashboard,
	LineChart,
	Linkedin,
	Package,
	Scan,
	ShoppingCart,
	TrendingUp,
	Truck,
	Twitter,
	Users,
	Wallet,
	Zap,
} from 'lucide-react'
import { Link } from '@/components/ui/link'

/* ─── Data ─────────────────────────────────────────── */

const heroModules: { icon: LucideIcon; name: string }[] = [
	{ icon: ShoppingCart, name: 'market' },
	{ icon: TrendingUp, name: 'insight' },
	{ icon: Package, name: 'replenishment' },
	{ icon: FileText, name: 'ledger' },
	{ icon: CreditCard, name: 'pos' },
	{ icon: Truck, name: 'trace' },
	{ icon: LayoutDashboard, name: 'hub' },
	{ icon: Landmark, name: 'flow' },
	{ icon: Wallet, name: 'payroll' },
] as const

interface ServiceModule {
	icon: LucideIcon
	color: string
	label: string
	tag: string
	desc: string
}

const serviceRows: ServiceModule[][] = [
	[
		{
			icon: ShoppingCart,
			color: 'text-[#32D583]',
			label: 'uplink/market',
			tag: 'E-commerce',
			desc: 'Product catalogs, carts, orders, and customer management',
		},
		{
			icon: LineChart,
			color: 'text-[#6366F1]',
			label: 'uplink/insight',
			tag: 'Analytics',
			desc: 'Real-time inventory tracking and sales analytics',
		},
	],
	[
		{
			icon: Package,
			color: 'text-[#FFB547]',
			label: 'uplink/replenishment',
			tag: 'Supply Chain',
			desc: 'Automated stock replenishment and supplier management',
		},
		{
			icon: BookOpen,
			color: 'text-[#6366F1]',
			label: 'uplink/ledger',
			tag: 'Accounting',
			desc: 'Double-entry accounting with real-time reporting',
		},
		{
			icon: CreditCard,
			color: 'text-[#32D583]',
			label: 'uplink/pos',
			tag: 'Retail',
			desc: 'Point of sale with integrated payments',
		},
	],
	[
		{
			icon: Scan,
			color: 'text-[#E85A4F]',
			label: 'uplink/trace',
			tag: 'Traceability',
			desc: 'Track products from source to sale with complete audit trails',
		},
		{
			icon: LayoutDashboard,
			color: 'text-white',
			label: 'uplink/hub',
			tag: 'Dashboard',
			desc: 'Central command center for all your business operations',
		},
		{
			icon: GitBranch,
			color: 'text-[#6366F1]',
			label: 'uplink/flow',
			tag: 'Automation',
			desc: 'Visual workflow builder for business process automation',
		},
	],
]

const payrollModule = {
	icon: Users,
	color: 'text-[#FFB547]',
	label: 'uplink/payroll',
	tag: 'HR & Payroll',
	desc: 'Employee management, time tracking, and automated payroll processing',
}

const stats: { value: string; label: string; accent: boolean }[] = [
	{
		value: '500+',
		label: 'Enterprise customers across industries',
		accent: true,
	},
	{ value: '99.9%', label: 'Uptime SLA guaranteed', accent: true },
	{ value: '50M+', label: 'Daily transactions', accent: false },
	{ value: '24/7', label: 'Global support', accent: false },
]

const footerLinks: Record<string, string[]> = {
	Product: ['Features', 'Pricing', 'Integrations', 'Changelog'],
	Resources: ['Documentation', 'API Reference', 'Guides', 'Blog'],
	Company: ['About', 'Careers', 'Contact', 'Partners'],
	Legal: ['Privacy', 'Terms', 'Security'],
}


function LandingPage() {
	return (
		<div className='min-h-screen bg-black font-sans antialiased'>
			<Header />
			<Hero />
			<Services />
			<Stats />
			<Testimonial />
			<CallToAction />
			<Footer />
		</div>
	)
}

/* ─── Header ───────────────────────────────────────── */

function Header() {
	return (
		<header className='flex items-center justify-between px-6 py-6 md:px-16 lg:px-[120px]'>
			<div className='flex items-center gap-3'>
				<div className='flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-white to-zinc-400'>
					<div className='flex size-7 items-center justify-center rounded-lg bg-black'>
						<ArrowUpRight className='size-5 text-white' />
					</div>
				</div>
				<span className='font-extrabold text-[28px] text-white'>Uplink</span>
			</div>

			<nav className='hidden items-center gap-10 md:flex'>
				{['Services', 'Pricing', 'Docs', 'About'].map((item) => (
					<a
						key={item}
						href={`#${item.toLowerCase()}`}
						className='font-medium text-[15px] text-zinc-400 transition-colors hover:text-white'
					>
						{item}
					</a>
				))}
			</nav>

			<div className='flex items-center gap-6'>
				<a
					href='/#'
					className='hidden font-medium text-[15px] text-white sm:block'
				>
					Sign in
				</a>
				<a
					href='/#'
					className='rounded-lg bg-[#32D583] px-6 py-3 font-semibold text-[15px] text-black transition-colors hover:bg-[#2ab873]'
				>
					Get Started
				</a>
			</div>
		</header>
	)
}

/* ─── Hero ─────────────────────────────────────────── */

function Hero() {
	return (
		<section className='relative px-6 pt-[60px] pb-20 md:px-16 lg:px-[120px]'>
			<div className='pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_120%_at_15%_60%,rgba(50,213,131,0.09),transparent)]' />

			<div className='relative flex flex-col items-center gap-20 lg:flex-row'>
				<div className='flex flex-1 flex-col gap-10'>
					<div className='flex items-center gap-3'>
						<span className='size-2 rounded-full bg-green-500' />
						<span className='font-medium text-[13px] text-zinc-400'>
							Now in General Availability
						</span>
					</div>

					<div className='flex flex-col'>
						<span className='font-extrabold text-5xl text-white leading-[1.05] tracking-[-3px] lg:text-[72px]'>
							Unify your
						</span>
						<span className='font-extrabold text-5xl text-[#32D583] leading-[1.05] tracking-[-3px] lg:text-[72px]'>
							business
						</span>
						<span className='font-extrabold text-5xl text-white leading-[1.05] tracking-[-3px] lg:text-[72px]'>
							operations
						</span>
					</div>

					<p className='max-w-[440px] text-lg text-zinc-500 leading-[1.6]'>
						Nine integrated modules for e-commerce, inventory, payroll,
						logistics, and more. Deploy independently. Scale together.
					</p>

					<div className='flex items-center gap-4'>
						<a
							href='/#'
							className='flex items-center gap-2.5 rounded-lg bg-[#32D583] px-7 py-4 font-semibold text-[15px] text-black shadow-[0_4px_20px_rgba(50,213,131,0.25)] transition-colors hover:bg-[#2ab873]'
						>
							Start building
							<ArrowRight className='size-4' />
						</a>
						<a
							href='/#'
							className='font-medium text-[15px] text-zinc-400 transition-colors hover:text-white'
						>
							View documentation
						</a>
					</div>
				</div>

				<div className='flex w-full flex-col gap-4 lg:w-[480px]'>
					<div className='grid grid-cols-3 gap-0.5 rounded-xl bg-zinc-800 p-0.5'>
						{heroModules.map((mod) => (
							<Link
								to='/$'
								params={{ _splat: `${mod.name}/dashboard` }}
								key={mod.name}
								className='flex flex-col gap-2 rounded-[10px] bg-zinc-900 p-5'
							>
								<mod.icon className='size-5 text-zinc-400' />
								<span className='font-medium text-[13px] text-white'>
									{mod.name}
								</span>
							</Link>
						))}
					</div>

					<div className='flex items-center gap-6 pt-4'>
						<span className='font-medium text-xs text-zinc-600'>
							Trusted by
						</span>
						<div className='flex items-center gap-5'>
							{['Acme', 'Globex', 'Initech'].map((name) => (
								<span
									key={name}
									className='font-semibold text-[13px] text-zinc-600'
								>
									{name}
								</span>
							))}
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}

/* ─── Services ─────────────────────────────────────── */

function ServiceCard({ icon: Icon, color, label, tag, desc }: ServiceModule) {
	return (
		<div className='flex flex-1 flex-col justify-between rounded-[3px] bg-[#111111] p-7'>
			<div className='flex items-start justify-between'>
				<Icon className={`size-6 ${color}`} />
				<span className='rounded bg-[#1F1F1F] px-2.5 py-1 font-medium text-[11px] text-zinc-500'>
					{tag}
				</span>
			</div>
			<div className='mt-4 flex flex-col gap-2'>
				<h3 className='font-semibold text-lg text-white'>{label}</h3>
				<p className='max-w-[280px] text-sm text-zinc-500 leading-[1.4]'>
					{desc}
				</p>
			</div>
		</div>
	)
}

function Services() {
	const rowHeights = ['lg:h-[200px]', 'lg:h-[180px]', 'lg:h-[180px]']

	return (
		<section
			id='services'
			className='bg-[#0A0A0A] px-6 py-[100px] md:px-16 lg:px-[120px]'
		>
			<div className='flex flex-col items-end justify-between gap-8 lg:flex-row'>
				<div className='flex flex-col gap-4'>
					<div className='flex items-center gap-3'>
						<div className='h-px w-10 bg-zinc-700' />
						<span className='font-medium text-xs text-zinc-500 tracking-[1px]'>
							Platform Modules
						</span>
					</div>
					<h2 className='font-bold text-3xl text-white leading-[1.1] tracking-[-1px] lg:text-5xl'>
						Nine modules.
						<br />
						One platform.
					</h2>
				</div>
				<p className='max-w-[380px] text-base text-zinc-500 leading-[1.6] lg:text-right'>
					Each module handles a critical business function. Deploy what you need
					today, add more as you grow. Everything stays connected.
				</p>
			</div>

			<div className='mt-20 flex flex-col gap-[3px]'>
				{serviceRows.map((row, i) => (
					<div
						key={row[0].label}
						className={`flex flex-col gap-[3px] lg:flex-row ${rowHeights[i]}`}
					>
						{row.map((mod) => (
							<ServiceCard key={mod.label} {...mod} />
						))}
					</div>
				))}

				<div className='flex h-auto flex-col items-center justify-between gap-6 rounded-[3px] bg-[#111111] px-10 py-7 sm:flex-row lg:h-[140px]'>
					<div className='flex items-center gap-6'>
						<Users className='size-8 text-[#FFB547]' />
						<div className='flex flex-col gap-1.5'>
							<h3 className='font-semibold text-white text-xl'>
								{payrollModule.label}
							</h3>
							<p className='text-sm text-zinc-500'>{payrollModule.desc}</p>
						</div>
					</div>
					<div className='flex items-center gap-4'>
						<span className='rounded bg-[#1F1F1F] px-3.5 py-1.5 font-medium text-xs text-zinc-500'>
							{payrollModule.tag}
						</span>
						<ArrowRight className='size-5 text-zinc-600' />
					</div>
				</div>
			</div>
		</section>
	)
}

/* ─── Stats ────────────────────────────────────────── */

function Stats() {
	return (
		<section className='relative bg-black px-6 py-[100px] md:px-16 lg:px-[120px]'>
			<div className='pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_100%_at_75%_40%,rgba(99,102,241,0.07),transparent)]' />

			<div className='relative flex flex-col gap-16 lg:flex-row'>
				<div className='flex flex-1 flex-col justify-center gap-8'>
					<div className='flex items-center gap-3'>
						<div className='h-px w-10 bg-zinc-700' />
						<span className='font-medium text-xs text-zinc-500 tracking-[1px]'>
							Platform Scale
						</span>
					</div>
					<h2 className='max-w-[380px] font-bold text-[40px] text-white leading-[1.2] tracking-[-1px]'>
						Built for enterprises that demand reliability
					</h2>
					<p className='max-w-[360px] text-base text-zinc-500 leading-[1.6]'>
						Our infrastructure processes millions of transactions daily across
						40+ countries, with enterprise-grade security and compliance.
					</p>
				</div>

				<div className='grid flex-1 grid-cols-2 gap-px overflow-hidden bg-[#1F1F1F]'>
					{stats.map((stat, i) => (
						<div
							key={stat.value}
							className={`flex flex-col justify-end gap-3 bg-black ${i < 2 ? 'p-8' : 'p-10'}`}
						>
							<span
								className={`font-extrabold text-4xl leading-none tracking-[-2px] lg:text-[56px] ${stat.accent ? 'text-[#32D583]' : 'text-white'}`}
							>
								{stat.value}
							</span>
							<span className='max-w-[160px] text-sm text-zinc-500 leading-[1.4]'>
								{stat.label}
							</span>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}

/* ─── Testimonial ──────────────────────────────────── */

function Testimonial() {
	return (
		<section className='bg-zinc-50 px-6 py-[100px] md:px-16 lg:px-[120px]'>
			<div className='flex flex-col gap-20 lg:flex-row'>
				<div className='flex w-full flex-col gap-8 lg:w-[320px]'>
					<div className='flex items-center gap-3'>
						<div className='h-px w-10 bg-zinc-300' />
						<span className='font-medium text-xs text-zinc-500 tracking-[1px]'>
							Customer Stories
						</span>
					</div>
					<h2 className='font-bold text-4xl text-zinc-900 leading-[1.2] tracking-[-1px]'>
						Hear from teams who made the switch
					</h2>
					<div className='flex items-center gap-6'>
						{['Meridian', 'Arcwise', 'Lumina'].map((name) => (
							<span
								key={name}
								className='font-semibold text-base text-zinc-400'
							>
								{name}
							</span>
						))}
					</div>
				</div>

				<div className='flex flex-1 flex-col gap-8 rounded-sm border border-zinc-200 bg-white p-8 lg:p-12'>
					<div className='flex items-start justify-between'>
						<span className='font-light text-[80px] text-zinc-200 leading-[0.6]'>
							&ldquo;
						</span>
						<div className='flex gap-0.5'>
							{Array.from({ length: 5 }).map((_, i) => (
								<span key={i} className='text-sm text-zinc-900'>
									★
								</span>
							))}
						</div>
					</div>

					<p className='text-[22px] text-zinc-900 leading-[1.6]'>
						We switched from three separate systems to Uplink and cut our
						operational overhead by 40%. The integration between modules means
						we are no longer reconciling data across platforms.
					</p>

					<div className='flex flex-col items-start justify-between gap-4 border-zinc-100 border-t pt-6 sm:flex-row sm:items-center'>
						<div className='flex items-center gap-4'>
							<div className='flex size-12 items-center justify-center rounded-full bg-zinc-900 font-semibold text-base text-white'>
								SC
							</div>
							<div className='flex flex-col gap-0.5'>
								<span className='font-semibold text-[15px] text-zinc-900'>
									Sarah Chen
								</span>
								<span className='text-sm text-zinc-500'>
									CTO, Meridian Retail Group
								</span>
							</div>
						</div>
						<span className='rounded bg-zinc-100 px-4 py-2 font-semibold text-[13px] text-zinc-900'>
							40% less overhead
						</span>
					</div>
				</div>
			</div>
		</section>
	)
}

/* ─── CTA ──────────────────────────────────────────── */

function CallToAction() {
	return (
		<section className='bg-zinc-50 px-6 py-[120px] md:px-16 lg:px-[120px]'>
			<div className='flex flex-col items-center gap-12'>
				<div className='relative'>
					<div className='absolute -inset-15 rounded-full bg-[radial-gradient(circle,rgba(0,0,0,0.08),transparent)]' />
					<div className='relative flex size-20 items-center justify-center rounded-[20px] bg-black'>
						<ArrowUpRight className='size-9 text-white' />
					</div>
				</div>

				<div className='flex flex-col items-center gap-5'>
					<h2 className='text-center font-black text-4xl text-black tracking-[-2px] lg:text-[52px]'>
						Ready to Unify Your Operations?
					</h2>
					<p className='max-w-[600px] text-center text-lg text-zinc-500 leading-[1.5]'>
						Start with a free trial. No credit card required. Deploy your first
						module in minutes and see the difference.
					</p>
				</div>

				<div className='flex flex-col items-center gap-4 sm:flex-row'>
					<a
						href='/#'
						className='flex items-center gap-3 rounded-xl bg-[#32D583] px-10 py-5 font-semibold text-[17px] text-black shadow-[0_4px_20px_rgba(50,213,131,0.25)] transition-colors hover:bg-[#2ab873]'
					>
						<Zap className='size-5' />
						Start Free Trial
					</a>
					<a
						href='/#'
						className='flex items-center gap-3 rounded-xl border-2 border-zinc-200 px-10 py-5 font-medium text-[17px] text-black transition-colors hover:bg-zinc-100'
					>
						Schedule Demo
						<Calendar className='size-[18px]' />
					</a>
				</div>

				<div className='flex flex-wrap items-center justify-center gap-6 pt-6'>
					{['No credit card', '14-day free trial', 'Cancel anytime'].map(
						(text) => (
							<div key={text} className='flex items-center gap-2'>
								<CircleCheck className='size-[18px] text-green-500' />
								<span className='font-medium text-sm text-zinc-600'>
									{text}
								</span>
							</div>
						),
					)}
				</div>
			</div>
		</section>
	)
}

/* ─── Footer ───────────────────────────────────────── */

function Footer() {
	return (
		<footer className='bg-black px-6 pt-20 pb-10 md:px-16 lg:px-[120px]'>
			<div className='flex flex-col justify-between gap-16 lg:flex-row'>
				<div className='flex flex-col gap-4'>
					<div className='flex items-center gap-3'>
						<div className='flex size-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-white to-zinc-400'>
							<div className='flex size-[22px] items-center justify-center rounded-md bg-black'>
								<ArrowUpRight className='size-4 text-white' />
							</div>
						</div>
						<span className='font-extrabold text-[22px] text-white'>
							Uplink
						</span>
					</div>
					<p className='max-w-[280px] text-sm text-zinc-500 leading-[1.5]'>
						Unify your business operations with our cloud-native modular
						platform.
					</p>
				</div>

				<div className='flex flex-wrap gap-12 lg:gap-20'>
					{Object.entries(footerLinks).map(([title, links]) => (
						<div key={title} className='flex flex-col gap-4'>
							<h4 className='font-semibold text-[13px] text-white'>{title}</h4>
							<div className='flex flex-col gap-3'>
								{links.map((link) => (
									<a
										key={link}
										href='/#'
										className='text-sm text-zinc-500 transition-colors hover:text-white'
									>
										{link}
									</a>
								))}
							</div>
						</div>
					))}
				</div>
			</div>

			<div className='my-16 h-px bg-zinc-800' />

			<div className='flex items-center justify-between'>
				<span className='text-[13px] text-zinc-600'>
					&copy; 2026 Uplink Inc. All rights reserved.
				</span>
				<div className='flex items-center gap-5'>
					{[Twitter, Github, Linkedin].map((Icon, i) => (
						<a
							key={i}
							href='/#'
							className='text-zinc-600 transition-colors hover:text-white'
						>
							<Icon className='size-5' />
						</a>
					))}
				</div>
			</div>
		</footer>
	)
}
export default LandingPage
