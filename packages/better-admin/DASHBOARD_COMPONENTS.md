# Dashboard Components

Ready-to-use dashboard components for building beautiful admin interfaces that extend shadcn/ui components.

![Dashboard Components Preview](./dashboard-components-preview.png)

## Overview

The Better Admin dashboard components provide a complete set of pre-built components for creating professional admin dashboards. All components extend shadcn/ui components and integrate seamlessly with better-query for reactive data fetching.

## Available Components

### 1. StatCard

Display key metrics with optional icons, descriptions, and trend indicators.

**Installation:**
```bash
npx better-admin add stat-card
```

**Usage:**
```tsx
import { StatCard } from "@/components/admin/stat-card";
import { Users } from "lucide-react";

<StatCard
  title="Total Users"
  value={totalUsers || 0}
  icon={<Users className="h-4 w-4" />}
  trend={{
    value: 12.5,
    direction: "up",
    label: "from last month"
  }}
  loading={isLoading}
/>
```

**Props:**
- `title` (string): Card title
- `value` (string | number): Metric value to display
- `icon` (ReactNode): Optional icon
- `description` (string): Optional description text
- `trend` (object): Optional trend indicator
  - `value` (number): Percentage change
  - `direction` ("up" | "down"): Trend direction
  - `label` (string): Optional comparison label
- `loading` (boolean): Show loading state
- `className` (string): Additional CSS classes

**Better Query Integration:**
```tsx
const { count } = useQuery("user", query);
const { data: totalUsers, isLoading } = count.useQuery();

<StatCard
  title="Total Users"
  value={totalUsers || 0}
  loading={isLoading}
/>
```

### 2. DashboardGrid

Responsive grid layout for organizing dashboard components.

**Installation:**
```bash
npx better-admin add dashboard-grid
```

**Usage:**
```tsx
import { DashboardGrid } from "@/components/admin/dashboard-grid";

<DashboardGrid 
  columns={{ default: 1, sm: 2, lg: 4 }} 
  gap="md"
>
  <StatCard {...} />
  <StatCard {...} />
  <StatCard {...} />
  <StatCard {...} />
</DashboardGrid>
```

**Props:**
- `columns` (object): Responsive column configuration
  - `default` (number): Base columns
  - `sm` (number): Small screens (640px+)
  - `md` (number): Medium screens (768px+)
  - `lg` (number): Large screens (1024px+)
  - `xl` (number): Extra large screens (1280px+)
- `gap` ("sm" | "md" | "lg" | "xl"): Gap between items
- `className` (string): Additional CSS classes

### 3. MetricTrend

Display metrics with automatic trend calculations and comparison to previous period.

**Installation:**
```bash
npx better-admin add metric-trend
```

**Usage:**
```tsx
import { MetricTrend } from "@/components/admin/metric-trend";

<MetricTrend
  title="User Growth"
  currentValue={totalUsers || 0}
  previousValue={lastMonthUsers || 0}
  icon={<Users className="h-4 w-4" />}
  comparisonLabel="vs last month"
  showPercentage={true}
/>
```

**Props:**
- `title` (string): Metric title
- `currentValue` (number): Current period value
- `previousValue` (number): Previous period value for comparison
- `icon` (ReactNode): Optional icon
- `formatValue` (function): Custom value formatter
- `comparisonLabel` (string): Comparison description
- `showPercentage` (boolean): Show percentage change
- `loading` (boolean): Show loading state
- `className` (string): Additional CSS classes

**Better Query Integration:**
```tsx
const { count } = useQuery("order", query);

// Current month
const { data: currentOrders } = count.useQuery({
  where: { createdAt: { gte: startOfMonth } }
});

// Last month
const { data: lastMonthOrders } = count.useQuery({
  where: { 
    createdAt: { 
      gte: startOfLastMonth,
      lt: startOfMonth 
    }
  }
});

<MetricTrend
  title="Orders This Month"
  currentValue={currentOrders || 0}
  previousValue={lastMonthOrders || 0}
  comparisonLabel="vs last month"
/>
```

### 4. QuickActions

Display quick action buttons for common admin tasks.

**Installation:**
```bash
npx better-admin add quick-actions
```

**Usage:**
```tsx
import { QuickActions } from "@/components/admin/quick-actions";
import { Users, ShoppingCart, Settings } from "lucide-react";

const actions = [
  {
    label: "Add User",
    icon: <Users className="h-4 w-4" />,
    onClick: () => router.push("/admin/users/create"),
  },
  {
    label: "New Order",
    icon: <ShoppingCart className="h-4 w-4" />,
    onClick: () => router.push("/admin/orders/create"),
    variant: "default"
  },
  {
    label: "Settings",
    icon: <Settings className="h-4 w-4" />,
    onClick: () => router.push("/admin/settings"),
    disabled: !hasPermission
  }
];

<QuickActions 
  actions={actions} 
  columns={2}
  title="Quick Actions"
/>
```

**Props:**
- `title` (string): Card title
- `actions` (array): Array of action objects
  - `label` (string): Button label
  - `icon` (ReactNode): Optional icon
  - `onClick` (function): Click handler
  - `variant` (string): Button variant
  - `disabled` (boolean): Disable button
- `columns` (number): Number of columns (1-4)
- `showTitle` (boolean): Show card title
- `className` (string): Additional CSS classes

### 5. RecentActivity

Display recent activity feed with timestamps and icons.

**Installation:**
```bash
npx better-admin add recent-activity
```

**Usage:**
```tsx
import { RecentActivity } from "@/components/admin/recent-activity";

const { list } = useQuery("activity", query);
const { data: activities } = list.useQuery({
  orderBy: { createdAt: "desc" },
  take: 5
});

const formattedActivities = (activities || []).map(activity => ({
  id: activity.id,
  title: activity.title,
  description: activity.description,
  timestamp: activity.createdAt,
  icon: <Users className="h-4 w-4" />
}));

<RecentActivity
  activities={formattedActivities}
  maxItems={5}
  onActivityClick={(activity) => console.log(activity)}
/>
```

**Props:**
- `title` (string): Card title
- `activities` (array): Array of activity objects
  - `id` (string | number): Unique identifier
  - `title` (string): Activity title
  - `description` (string): Optional description
  - `timestamp` (Date | string): Activity timestamp
  - `icon` (ReactNode): Optional icon
  - `link` (string): Optional link URL
- `emptyMessage` (string): Message when no activities
- `formatTimestamp` (function): Custom timestamp formatter
- `onActivityClick` (function): Click handler for activities
- `loading` (boolean): Show loading state
- `maxItems` (number): Limit number of displayed items
- `showIcons` (boolean): Show activity icons
- `className` (string): Additional CSS classes

**Better Query Integration:**
```tsx
const { list } = useQuery("user", query);
const { data: recentUsers, isLoading } = list.useQuery({
  orderBy: { createdAt: "desc" },
  take: 5
});

const activities = (recentUsers || []).map(user => ({
  id: user.id,
  title: `New user: ${user.name}`,
  description: user.email,
  timestamp: user.createdAt,
  icon: <Users className="h-4 w-4" />
}));

<RecentActivity 
  activities={activities} 
  loading={isLoading}
/>
```

## Complete Dashboard Example

Here's a complete example using all dashboard components together:

```tsx
"use client";

import { useQuery } from "better-admin";
import { query } from "@/lib/query";
import { StatCard } from "@/components/admin/stat-card";
import { DashboardGrid } from "@/components/admin/dashboard-grid";
import { MetricTrend } from "@/components/admin/metric-trend";
import { QuickActions } from "@/components/admin/quick-actions";
import { RecentActivity } from "@/components/admin/recent-activity";
import { Users, ShoppingCart, DollarSign, TrendingUp } from "lucide-react";

export default function DashboardPage() {
  const { count: userCount, list: userList } = useQuery("user", query);
  const { count: orderCount } = useQuery("order", query);

  // Fetch data
  const { data: totalUsers, isLoading: loadingUsers } = userCount.useQuery();
  const { data: totalOrders } = orderCount.useQuery();
  const { data: recentUsers, isLoading: loadingRecent } = userList.useQuery({
    orderBy: { createdAt: "desc" },
    take: 5
  });

  const activities = (recentUsers || []).map(user => ({
    id: user.id,
    title: `New user: ${user.name}`,
    description: user.email,
    timestamp: user.createdAt,
    icon: <Users className="h-4 w-4" />
  }));

  const actions = [
    {
      label: "Add User",
      icon: <Users className="h-4 w-4" />,
      onClick: () => router.push("/admin/users/create")
    },
    {
      label: "New Order",
      icon: <ShoppingCart className="h-4 w-4" />,
      onClick: () => router.push("/admin/orders/create")
    }
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {/* Stats Grid */}
      <DashboardGrid columns={{ default: 1, sm: 2, lg: 4 }} gap="md">
        <StatCard
          title="Total Users"
          value={totalUsers || 0}
          icon={<Users className="h-4 w-4" />}
          trend={{ value: 12.5, direction: "up", label: "from last month" }}
          loading={loadingUsers}
        />
        <StatCard
          title="Total Orders"
          value={totalOrders || 0}
          icon={<ShoppingCart className="h-4 w-4" />}
          trend={{ value: 8.2, direction: "up" }}
        />
        <StatCard
          title="Revenue"
          value="$12,345"
          icon={<DollarSign className="h-4 w-4" />}
          description="+15% from last month"
        />
        <StatCard
          title="Conversion"
          value="3.2%"
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </DashboardGrid>

      {/* Quick Actions & Activity */}
      <DashboardGrid columns={{ default: 1, lg: 2 }} gap="md">
        <QuickActions actions={actions} columns={2} />
        <RecentActivity 
          activities={activities} 
          loading={loadingRecent}
        />
      </DashboardGrid>
    </div>
  );
}
```

## Installation

Install all dashboard components at once:

```bash
npx better-admin add stat-card dashboard-grid metric-trend quick-actions recent-activity
```

Or install individually as needed.

## Design Philosophy

All dashboard components follow these principles:

1. **Extend shadcn/ui**: Built on top of shadcn/ui Card, Button, and other components
2. **Better Query Integration**: Seamless integration with better-query hooks
3. **Loading States**: Built-in loading states for async data
4. **Responsive**: Mobile-first responsive design
5. **Customizable**: Flexible props and className support
6. **Accessible**: Following accessibility best practices
7. **Type-safe**: Full TypeScript support

## Best Practices

### 1. Use Loading States

Always pass loading states to components:

```tsx
const { data, isLoading } = count.useQuery();

<StatCard value={data || 0} loading={isLoading} />
```

### 2. Organize with DashboardGrid

Use DashboardGrid for consistent layouts:

```tsx
<DashboardGrid columns={{ default: 1, md: 2, lg: 4 }}>
  {/* Your components */}
</DashboardGrid>
```

### 3. Format Values Consistently

Use custom formatters for consistent display:

```tsx
<MetricTrend
  currentValue={revenue}
  previousValue={lastRevenue}
  formatValue={(val) => `$${val.toLocaleString()}`}
/>
```

### 4. Handle Empty States

Provide meaningful empty states:

```tsx
<RecentActivity
  activities={activities}
  emptyMessage="No recent activity to display"
/>
```

### 5. Keep Actions Focused

Limit quick actions to the most important tasks:

```tsx
const actions = [
  // 4-6 most important actions
  { label: "Add User", onClick: createUser },
  { label: "Export Data", onClick: exportData }
];
```

## Next Steps

- Check out the [complete example](../examples/dashboard-example.tsx)
- Learn about [Better Query Integration](./BETTER_AUTH_QUERY_INTEGRATION.md)
- Explore other [component categories](./USAGE_GUIDE.md)
