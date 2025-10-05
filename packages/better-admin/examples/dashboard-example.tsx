/**
 * Dashboard Components - Complete Example
 *
 * This example shows how to use all the dashboard components together
 * to create a comprehensive admin dashboard.
 */

"use client";

import { DashboardGrid } from "@/components/admin/dashboard-grid";
import { MetricTrend } from "@/components/admin/metric-trend";
import { QuickActions } from "@/components/admin/quick-actions";
import { RecentActivity } from "@/components/admin/recent-activity";
import { StatCard } from "@/components/admin/stat-card";
import { query } from "@/lib/query";
import { useQuery } from "better-admin";
import { DollarSign, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
	const router = useRouter();
	const { count: userCount, list: userList } = useQuery("user", query);
	const { count: orderCount, list: orderList } = useQuery("order", query);

	// Current period stats
	const { data: totalUsers, isLoading: loadingUsers } = userCount.useQuery();
	const { data: totalOrders, isLoading: loadingOrders } = orderCount.useQuery();

	// Previous period for comparison
	const lastMonth = new Date();
	lastMonth.setMonth(lastMonth.getMonth() - 1);
	const { data: lastMonthUsers } = userCount.useQuery({
		where: { createdAt: { lt: lastMonth } },
	});

	// Recent activity
	const { data: recentUsers, isLoading: loadingRecentUsers } =
		userList.useQuery({
			orderBy: { createdAt: "desc" },
			take: 5,
		});

	const activities = (recentUsers || []).map((user: any) => ({
		id: user.id,
		title: `New user: ${user.name}`,
		description: user.email,
		timestamp: user.createdAt,
		icon: <Users className="h-4 w-4" />,
	}));

	const quickActions = [
		{
			label: "Add User",
			icon: <Users className="h-4 w-4" />,
			onClick: () => router.push("/admin/users/create"),
		},
		{
			label: "New Order",
			icon: <ShoppingCart className="h-4 w-4" />,
			onClick: () => router.push("/admin/orders/create"),
		},
		{
			label: "View Reports",
			icon: <TrendingUp className="h-4 w-4" />,
			onClick: () => router.push("/admin/reports"),
		},
		{
			label: "Settings",
			icon: <DollarSign className="h-4 w-4" />,
			onClick: () => router.push("/admin/settings"),
		},
	];

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold">Dashboard</h1>
				<p className="text-muted-foreground">
					Welcome back! Here's what's happening with your app.
				</p>
			</div>

			{/* Stats Cards */}
			<DashboardGrid columns={{ default: 1, sm: 2, lg: 4 }} gap="md">
				<StatCard
					title="Total Users"
					value={totalUsers || 0}
					icon={<Users className="h-4 w-4" />}
					trend={{
						value: 12.5,
						direction: "up",
						label: "from last month",
					}}
					loading={loadingUsers}
				/>
				<StatCard
					title="Total Orders"
					value={totalOrders || 0}
					icon={<ShoppingCart className="h-4 w-4" />}
					trend={{
						value: 8.2,
						direction: "up",
						label: "from last month",
					}}
					loading={loadingOrders}
				/>
				<StatCard
					title="Revenue"
					value="$12,345"
					icon={<DollarSign className="h-4 w-4" />}
					description="+15% from last month"
				/>
				<StatCard
					title="Conversion Rate"
					value="3.2%"
					icon={<TrendingUp className="h-4 w-4" />}
					trend={{
						value: 2.1,
						direction: "up",
					}}
				/>
			</DashboardGrid>

			{/* Metric Trends */}
			<DashboardGrid columns={{ default: 1, md: 2 }} gap="md">
				<MetricTrend
					title="User Growth"
					currentValue={totalUsers || 0}
					previousValue={lastMonthUsers || 0}
					icon={<Users className="h-4 w-4" />}
					comparisonLabel="vs last month"
				/>
				<QuickActions actions={quickActions} columns={2} />
			</DashboardGrid>

			{/* Recent Activity */}
			<RecentActivity
				activities={activities}
				loading={loadingRecentUsers}
				maxItems={5}
				onActivityClick={(activity) => {
					console.log("Activity clicked:", activity);
				}}
			/>
		</div>
	);
}
