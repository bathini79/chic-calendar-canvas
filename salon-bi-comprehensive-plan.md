# 🚀 Salon Business Intelligence - Comprehensive Phase-wise Implementation Plan

## 📊 Executive Summary

This detailed implementation plan creates a salon business intelligence reporting system with **modern UI design** based on contemporary design patterns. The plan implements proven design patterns: clean navigation sidebar, tabbed report categories, minimalist card layouts, and responsive mobile-first approach while maintaining our current color scheme and branding.

### 🎨 Modern UI Design Analysis

**Desktop Layout Elements:**
- **Sidebar Navigation**: Clean left sidebar with category icons, folder organization, and report counts
- **Main Content Area**: Spacious layout with search bar, category tabs, and card-based report grid
- **Report Cards**: Minimalist design with icon, title, description, and subtle hover effects
- **Header Actions**: Options dropdown, Add button, and filter controls in top-right
- **Data Tables**: Clean headers with sorting indicators, proper spacing, and "No results found" states

**Mobile Layout Elements:**  
- **Compact Header**: Back button, title, and action buttons optimized for touch
- **Simplified Navigation**: Bottom sheet or collapsible menu approach
- **Touch-Friendly Tables**: Responsive column layout with proper touch targets
- **Filtering**: Compact filter chips and dropdown selectors

**Key Design Principles Identified:**
- **Typography**: Clean sans-serif, consistent hierarchy, muted secondary text
- **Spacing**: Generous white space, consistent padding (16px, 24px, 32px)
- **Colors**: Neutral grays, subtle borders, branded accent colors for actions
- **Icons**: Simple line icons, consistent style throughout
- **Responsiveness**: Mobile-first approach with thoughtful breakpoints

## 📋 Initial Analysis & Report Count

### 🔍 Current State Analysis
- **Existing Reports**: 8 functional reports in codebase
- **Missing Database Fields**: `birth_date`, `gender` in profiles table  
- **UI Framework**: React + TypeScript + Tailwind CSS + Shadcn/ui
- **Database**: PostgreSQL with Supabase
- **Design Target**: Modern responsive layout (Desktop + Mobile responsive)

### 📊 Planned Report Distribution (Original 18 Reports from salon-marketing-reports-structure.md)
- **Phase 1**: 1 Foundation Report + UI Skeleton + Advanced DB Changes
- **Phase 2**: 5 Sales & Revenue Reports (Reports 1-5) + Modern UI Integration
- **Phase 3**: 7 Finance & Appointments Reports (Reports 6-12) + Mobile Responsiveness
- **Phase 4**: 6 Team & Customer Reports (Reports 13-18) + Advanced Features
- **Total**: 18 Comprehensive Reports (Preserving Original Structure)

### 🎯 Build Validation Strategy (NPM Build Gates)
**Every file creation/modification must pass:**
```bash
npm run build && npm run type-check && npm run lint
```
**Validation Points:**
- After each component creation → Build validation
- After each report implementation → Build validation
- After each database migration → Build validation
- Before phase completion → Full validation suite

### 🏗️ Component Architecture
- **Preserve**: All existing 8 reports in `/components/admin/reports/`
- **New Folder**: Create `/components/admin/bi-reports/` for 18 new BI reports
- **Shared**: Utilize existing UI components and create new ones as needed

### 🛠️ Technical Approaches Count
- **Database Changes**: 6 major schema updates
- **UI Components**: 18 new BI report components + shared components
- **Cache Tables**: 4 optimization tables
- **API Endpoints**: 18 data fetching hooks (one per report)
- **Triggers**: 3 automatic cache update functions
- **Report Categories**: 5 categories (Sales, Finance, Appointments, Team, Customers)

## 🎯 PHASE 1: Foundation - UI Skeleton + Advanced DB Changes + Core Report (Weeks 1-4)

### 🎯 Phase 1 Objectives
- Create modern UI skeleton with navigation patterns from contemporary designs
- Implement responsive sidebar with category organization and report counts
- Build tabbed category system (All reports, Sales, Finance, Appointments, Team, Clients)
- Deploy card-based report grid layout with proper spacing and typography
- Implement mobile-responsive navigation and touch-friendly interfaces
- Create shared UI components following modern design language
- Establish advanced database changes with caching optimization

### 🎨 Modern UI Components to Create

#### 1.1 Navigation Sidebar Component (`ReportsSidebar.tsx`)
**Desktop Layout (from Screenshot 1):**
```typescript
interface ReportsSidebarProps {
  categories: {
    label: string;
    count: number;
    icon: React.ComponentType;
    isActive?: boolean;
  }[];
  folders: FolderItem[];
}
```
**Key Features:**
- Clean vertical navigation with icons and counts
- "All reports (53)", "Favourites (0)", "Dashboards (2)" pattern
- Folder organization with edit functionality
- Consistent spacing and typography

#### 1.2 Report Grid Layout (`ReportsGrid.tsx`)
**Optimized Layout for Mobile & Desktop:**
```typescript
interface ReportsGridProps {
  reports: ReportItem[];
  categories: string[];
  searchQuery: string;
  selectedCategory: string;
}
```
**Key Features:**
- Category tabs: "All reports", "Sales", "Finance", "Appointments", "Team", "Clients"
- Search bar with proper placeholder and icon
- **Rectangle report cards** with horizontal layout (icon left, content right)
- **Mobile**: Full-width stacked cards for maximum content visibility
- **Desktop**: Single column list layout or 2-column grid (not square cards)

#### 1.3 Mobile Navigation (`MobileReportsNav.tsx`)
**Mobile Layout (from Screenshots 3 & 4):**
```typescript
interface MobileReportsNavProps {
  title: string;
  showBack?: boolean;
  actions?: React.ReactNode;
}
```
**Key Features:**
- Compact header with back button and title
- Touch-friendly action buttons
- Responsive category tabs that work on mobile
- Bottom sheet or drawer navigation for categories

#### 1.4 Data Table Component (`ReportsDataTable.tsx`)
**From Sales Summary Screenshot:**
```typescript
interface ReportsDataTableProps {
  columns: ColumnDef[];
  data: any[];
  filters: FilterConfig[];
  emptyState?: React.ReactNode;
}
```
**Key Features:**
- Clean table headers with sorting indicators
- Proper column spacing and alignment
- "No results found" empty state with search icon
- Filter chips and dropdown controls
- Mobile-responsive column handling

### 🎨 Modern Design System Implementation

#### 1.5 Design Tokens & Theme Extensions
**Based on Modern UI Design Analysis:**
```typescript
// Design tokens to add to existing theme
const modernDesignTokens = {
  spacing: {
    'ui-xs': '8px',      // Internal card padding
    'ui-sm': '12px',     // Small gaps
    'ui-md': '16px',     // Standard padding
    'ui-lg': '24px',     // Section spacing
    'ui-xl': '32px',     // Large sections
    'ui-2xl': '48px',    // Page-level spacing
  },
  typography: {
    'ui-title': {
      fontSize: '24px',
      fontWeight: '600',
      lineHeight: '1.2',
    },
    'ui-subtitle': {
      fontSize: '14px',
      fontWeight: '500',
      color: 'gray.600',
    },
    'ui-body': {
      fontSize: '14px',
      lineHeight: '1.4',
    },
    'ui-caption': {
      fontSize: '12px',
      color: 'gray.500',
    },
  },
  borders: {
    'ui-card': '1px solid rgb(229, 231, 235)', // Light gray borders
    'ui-divider': '1px solid rgb(243, 244, 246)',
  },
  shadows: {
    'ui-card': '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    'ui-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  borderRadius: {
    'ui-card': '8px',
    'ui-button': '6px',
  },
};
```

#### 1.6 Layout Structure Following Modern Design Pattern
**Main Reports Page Layout:**
```typescript
<ReportsLayout>
  <ReportsSidebar 
    categories={reportCategories}
    folders={userFolders}
    className="w-80 bg-gray-50 border-r border-ui-divider"
  />
  <MainContent className="flex-1">
    <ReportsHeader
      title="Reporting and analytics"
      count={totalReports}
      actions={<HeaderActions />}
    />
    <ReportsGrid
      categories={["All reports", "Sales", "Finance", "Appointments", "Team", "Clients"]}
      reports={filteredReports}
      searchQuery={searchQuery}
      selectedCategory={activeCategory}
    />
  </MainContent>
</ReportsLayout>
```

#### 1.7 Mobile-First Responsive Breakpoints
**Space-Efficient Card Layout:**
```css
/* Mobile-first approach with rectangle cards */
.reports-layout {
  @apply flex flex-col lg:flex-row;
}

.reports-sidebar {
  @apply hidden lg:block lg:w-80;
}

.mobile-reports-nav {
  @apply block lg:hidden;
}

.reports-grid {
  /* Mobile: Single column, full-width rectangle cards */
  @apply flex flex-col gap-3;
}

/* Desktop: Single column list or 2-column max */
@media (min-width: 1024px) {
  .reports-grid {
    @apply grid grid-cols-1 xl:grid-cols-2 gap-4;
  }
}

/* Rectangle card layout - horizontal orientation */
.report-card {
  @apply flex items-start p-4 bg-white border border-gray-200 rounded-lg;
  @apply min-h-[80px]; /* Fixed height for consistency */
}

.report-card-icon {
  @apply w-10 h-10 mr-4 flex-shrink-0;
}

.report-card-content {
  @apply flex-1 min-w-0; /* Allows text truncation */
}

.reports-table {
  @apply overflow-x-auto;
}

@media (max-width: 768px) {
  .reports-table thead {
    @apply text-xs;
  }
  
  .reports-table td {
    @apply px-2 py-3;
  }
}
```

### 🗄️ Database Schema Updates

#### 1.8 Missing Profile Fields Addition
```sql
-- ✅ Add missing fields to profiles table (verified against current schema)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_profiles_birth_date ON profiles(birth_date);
CREATE INDEX IF NOT EXISTS idx_profiles_gender ON profiles(gender);
CREATE INDEX IF NOT EXISTS idx_profiles_last_used ON profiles(last_used);
CREATE INDEX IF NOT EXISTS idx_profiles_visit_count ON profiles(visit_count DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_referrer_id ON profiles(referrer_id);
```

#### 1.9 Advanced Database Caching System
```sql
-- Cache table for customer analytics
CREATE TABLE cache_customer_analytics (
    id SERIAL PRIMARY KEY,
    customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    total_appointments INTEGER DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0.00,
    avg_appointment_value DECIMAL(10,2) DEFAULT 0.00,
    last_appointment_date TIMESTAMP WITH TIME ZONE,
    favorite_service_id UUID,
    favorite_employee_id UUID,
    customer_lifetime_value DECIMAL(12,2) DEFAULT 0.00,
    segment TEXT DEFAULT 'new', -- new, occasional, regular, vip
    churn_risk_score DECIMAL(3,2) DEFAULT 0.00,
    preferred_time_slot TEXT,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(customer_id)
);

-- Daily metrics cache for dashboard performance
CREATE TABLE cache_daily_metrics (
    metric_date DATE PRIMARY KEY,
    location_id UUID REFERENCES locations(id),
    total_appointments INTEGER DEFAULT 0,
    completed_appointments INTEGER DEFAULT 0,
    cancelled_appointments INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0.00,
    cash_revenue DECIMAL(12,2) DEFAULT 0.00,
    card_revenue DECIMAL(12,2) DEFAULT 0.00,
    online_revenue DECIMAL(12,2) DEFAULT 0.00,
    new_customers INTEGER DEFAULT 0,
    returning_customers INTEGER DEFAULT 0,
    avg_appointment_value DECIMAL(10,2) DEFAULT 0.00,
    total_discounts DECIMAL(10,2) DEFAULT 0.00,
    total_tips DECIMAL(10,2) DEFAULT 0.00,
    cancellation_rate DECIMAL(5,2) DEFAULT 0.00,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(metric_date, location_id)
);

-- Service performance cache
CREATE TABLE cache_service_performance (
    id SERIAL PRIMARY KEY,
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    month_year TEXT NOT NULL, -- Format: YYYY-MM
    location_id UUID REFERENCES locations(id),
    booking_count INTEGER DEFAULT 0,
    completion_count INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0.00,
    avg_rating DECIMAL(3,2) DEFAULT 0.00,
    avg_duration_minutes INTEGER DEFAULT 0,
    cancellation_count INTEGER DEFAULT 0,
    no_show_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(service_id, month_year, location_id)
);

-- Employee performance cache
CREATE TABLE cache_employee_performance (
    id SERIAL PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    month_year TEXT NOT NULL, -- Format: YYYY-MM
    location_id UUID REFERENCES locations(id),
    appointments_completed INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0.00,
    commission_earned DECIMAL(10,2) DEFAULT 0.00,
    avg_customer_rating DECIMAL(3,2) DEFAULT 0.00,
    customer_retention_rate DECIMAL(5,2) DEFAULT 0.00,
    punctuality_score DECIMAL(3,2) DEFAULT 0.00,
    upsell_rate DECIMAL(5,2) DEFAULT 0.00,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, month_year, location_id)
);

-- Performance indexes for cache tables
CREATE INDEX idx_cache_customer_analytics_customer_id ON cache_customer_analytics(customer_id);
CREATE INDEX idx_cache_customer_analytics_segment ON cache_customer_analytics(segment);
CREATE INDEX idx_cache_customer_analytics_last_updated ON cache_customer_analytics(last_updated DESC);
CREATE INDEX idx_cache_daily_metrics_date ON cache_daily_metrics(metric_date DESC);
CREATE INDEX idx_cache_daily_metrics_location ON cache_daily_metrics(location_id);
CREATE INDEX idx_cache_service_performance_service_month ON cache_service_performance(service_id, month_year);
CREATE INDEX idx_cache_employee_performance_employee_month ON cache_employee_performance(employee_id, month_year);
```

#### 1.3 Cache Update Triggers
```sql
-- Function to update customer analytics cache
CREATE OR REPLACE FUNCTION update_customer_analytics_cache()
RETURNS TRIGGER AS $$
DECLARE
    customer_data RECORD;
    segment_type TEXT;
BEGIN
    -- Calculate customer metrics
    SELECT 
        COUNT(*) as appointment_count,
        COALESCE(SUM(total_amount), 0) as total_spent,
        COALESCE(AVG(total_amount), 0) as avg_value,
        MAX(appointment_date) as last_visit
    INTO customer_data
    FROM appointments 
    WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id)
      AND status = 'completed';
    
    -- Determine customer segment
    IF customer_data.appointment_count = 0 THEN
        segment_type := 'new';
    ELSIF customer_data.appointment_count <= 2 THEN
        segment_type := 'occasional';
    ELSIF customer_data.appointment_count <= 10 THEN
        segment_type := 'regular';
    ELSE
        segment_type := 'vip';
    END IF;
    
    -- Insert or update cache
    INSERT INTO cache_customer_analytics (
        customer_id, total_appointments, total_spent, avg_appointment_value, 
        last_appointment_date, segment, last_updated
    )
    VALUES (
        COALESCE(NEW.customer_id, OLD.customer_id),
        customer_data.appointment_count,
        customer_data.total_spent,
        customer_data.avg_value,
        customer_data.last_visit,
        segment_type,
        NOW()
    )
    ON CONFLICT (customer_id) 
    DO UPDATE SET
        total_appointments = EXCLUDED.total_appointments,
        total_spent = EXCLUDED.total_spent,
        avg_appointment_value = EXCLUDED.avg_appointment_value,
        last_appointment_date = EXCLUDED.last_appointment_date,
        segment = EXCLUDED.segment,
        last_updated = NOW();
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to update daily metrics cache
CREATE OR REPLACE FUNCTION update_daily_metrics_cache()
RETURNS TRIGGER AS $$
DECLARE
    target_date DATE;
    target_location UUID;
BEGIN
    target_date := DATE(COALESCE(NEW.appointment_date, OLD.appointment_date));
    target_location := COALESCE(NEW.location::UUID, OLD.location::UUID);
    
    -- Recalculate daily metrics for the affected date
    INSERT INTO cache_daily_metrics (
        metric_date, location_id, total_appointments, completed_appointments, 
        cancelled_appointments, total_revenue, new_customers, returning_customers
    )
    SELECT 
        target_date,
        target_location,
        COUNT(*) as total_appointments,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_appointments,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_appointments,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed'), 0) as total_revenue,
        COUNT(DISTINCT customer_id) FILTER (WHERE 
            customer_id IN (
                SELECT id FROM profiles 
                WHERE DATE(created_at) = target_date
            )
        ) as new_customers,
        COUNT(DISTINCT customer_id) FILTER (WHERE 
            customer_id NOT IN (
                SELECT id FROM profiles 
                WHERE DATE(created_at) = target_date
            )
        ) as returning_customers
    FROM appointments 
    WHERE DATE(appointment_date) = target_date
      AND location::UUID = target_location
    ON CONFLICT (metric_date, location_id)
    DO UPDATE SET
        total_appointments = EXCLUDED.total_appointments,
        completed_appointments = EXCLUDED.completed_appointments,
        cancelled_appointments = EXCLUDED.cancelled_appointments,
        total_revenue = EXCLUDED.total_revenue,
        new_customers = EXCLUDED.new_customers,
        returning_customers = EXCLUDED.returning_customers,
        last_updated = NOW();
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_update_customer_cache
    AFTER INSERT OR UPDATE OR DELETE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_customer_analytics_cache();

CREATE TRIGGER trigger_update_daily_cache
    AFTER INSERT OR UPDATE OR DELETE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_daily_metrics_cache();
```

### 🎨 UI Skeleton - Modern Design (Exact Layout Match)

#### 1.10 Phase 1 Implementation Strategy with NPM Build Validation

**Step-by-Step Implementation Process:**
1. **Create Base UI Components** → Run `npm run build` → Validate
2. **Implement Navigation System** → Run `npm run build` → Validate  
3. **Build Report Card Grid** → Run `npm run build` → Validate
4. **Add Mobile Responsiveness** → Run `npm run build` → Validate
5. **Deploy Core Report** → Run `npm run build` → Validate

Each step must pass build validation before proceeding to the next.

#### 1.11 Desktop Layout Structure (Based on Screenshots)
**Modern Layout Replication:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ HEADER: Salon Logo | Reporting and analytics 53 | [Options▼] [Add] │
├─────────────────────────────────────────────────────────────────────┤
│ SIDEBAR (280px)      │ MAIN CONTENT AREA (flex-1)                  │
│ Reports              │ ┌─────────────────────────────────────────┐ │
│ 📋 All reports    53 │ │ Search: "Search by report name..."     │ │
│ ⭐ Favourites      0 │ │ Created by ▼ | Category ⚙️             │ │
│ 📊 Dashboards      2 │ ├─────────────────────────────────────────┤ │
│ 📄 Standard       44 │ │ [All reports][Sales][Finance]          │ │
│ 💎 Premium         8 │ │ [Appointments][Team][Clients][Inventory]│ │
│ 🔧 Custom          1 │ ├─────────────────────────────────────────┤ │
│ 🎯 Targets           │ │ Cards Grid (Auto-responsive):          │ │
│ ──────────────────── │ │ ┌──────────────┐ ┌──────────────┐     │ │
│ Folders           ✏️ │ │ │📊 Performance│ │📈 Online     │     │ │
│ ➕ Add folder        │ │ │dashboard     │ │presence      │     │ │
│                      │ │ │Dashboard of  │ │dashboard     │     │ │
│                      │ │ │your business │ │Online sales  │     │ │
│                      │ │ │performance   │ │and online    │     │ │
│                      │ │ │            ⭐│ │client perf ⭐│     │ │
│                      │ │ └──────────────┘ └──────────────┘     │ │
│                      │ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

#### 1.12 Mobile Layout Structure (Based on Screenshots)  
**Space-Efficient Mobile Pattern:**
```
┌─────────────────────────────────┐
│ ← Reporting and analytics   +   │ ← Header (56px height)
├─────────────────────────────────┤
│ 🔍 Search by report name... ⚙️  │ ← Search + Filters
├─────────────────────────────────┤
│ [All reports][Sales][Finance]   │ ← Horizontal scrolling tabs
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │📊 Performance dashboard    │ │ ← Rectangle cards
│ │Dashboard of your business  │ │   (horizontal layout)
│ │performance and analytics  ⭐│ │   Icon left, text right
│ └─────────────────────────────┘ │   80px height
│ ┌─────────────────────────────┐ │
│ │📈 Online presence dashboard│ │ ← More content visible
│ │Online sales and online     │ │   per screen
│ │client performance metrics ⭐│ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │📈 Performance summary      │ │ ← Efficient use of
│ │Overview of business perf   │ │   mobile screen space
│ │by team and location   Prem⭐│ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │📊 Revenue analytics        │ │ ← List continues...
│ │Detailed revenue breakdown  │ │
│ │and forecasting analytics   │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

#### 1.13 Data Table Layout (From Sales Summary Screenshot)
**Modern Table Pattern:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ ← Sales summary                                           ⭐ ⋮      │
│ Sales quantities and value, excluding gift card sales.              │
│ Data from 25 mins ago                                               │
├─────────────────────────────────────────────────────────────────────┤
│ ⚙️  [Type ▼] [Month to date] [Filters ⫿]         Customise 📊      │
├─────────────────────────────────────────────────────────────────────┤
│ Type ⌃ │Sales qty ⌃│Items sold ⌃│Gross sales ⌃│Total discounts ⌃   │
├─────────────────────────────────────────────────────────────────────┤
│                            🔍                                       │
│                     No results found                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```
┌─────────────────────────────────┐
│ ← Back | Report Title           │
├─────────────────────────────────┤
│ Filters & Options               │
│ Type ▼ | Month to date | 📊     │
├─────────────────────────────────┤
│ Data Table Headers:             │
│ Type | Sales qty | Items sold  │
│ Gross sales | Total discounts  │
├─────────────────────────────────┤
│ 🔍 No results found             │
│                                 │
│ (Empty state with search icon) │
└─────────────────────────────────┘
```

#### 1.6 Core UI Component Architecture
```typescript
// 1. Main Reports Layout Component
interface ReportsLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  tabs?: ReportTab[];
  showBackButton?: boolean;
  onBack?: () => void;
  rightActions?: React.ReactNode;
}

// 2. Report Card Component (Modern Style)
interface ReportCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  category?: string;
  isPremium?: boolean;
  isFavorited?: boolean;
  onClick?: () => void;
  onFavorite?: () => void;
}

// 3. Metric Card Component (4-across grid)
interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  loading?: boolean;
}

// 4. Filter Bar Component
interface FilterBarProps {
  dateRange?: {
    label: string;
    value: string;
  };
  customFilters?: FilterConfig[];
  showCustomizeButton?: boolean;
  lastUpdated?: string;
  onFiltersChange?: (filters: any) => void;
}

// 5. Data Table Component (with sorting & pagination)
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  loading?: boolean;
  emptyStateMessage?: string;
  emptyStateIcon?: React.ReactNode;
  pagination?: boolean;
  sorting?: boolean;
  filtering?: boolean;
}

// 6. Sidebar Navigation Component
interface SidebarNavProps {
  sections: {
    title: string;
    count?: number;
    items?: {
      label: string;
      count?: number;
      isActive?: boolean;
      onClick?: () => void;
    }[];
  }[];
  folders?: {
    title: string;
    onAddFolder?: () => void;
  };
}
```

#### 1.7 Responsive Design Specifications
```css
/* Desktop Layout (1024px+) */
.reports-container {
  @apply grid grid-cols-[280px_1fr] min-h-screen;
}

.reports-sidebar {
  @apply bg-gray-50 border-r border-gray-200 p-4;
}

.reports-main {
  @apply bg-white p-6;
}

.report-cards-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6;
}

/* Tablet Layout (768px - 1023px) */
@screen md {
  .reports-container {
    @apply grid-cols-[240px_1fr];
  }
  
  .report-cards-grid {
    @apply grid-cols-2;
  }
}

/* Mobile Layout (< 768px) */
@screen max-md {
  .reports-container {
    @apply grid-cols-1;
  }
  
  .reports-sidebar {
    @apply hidden;
  }
  
  .report-cards-grid {
    @apply grid-cols-1 gap-4;
  }
  
  .mobile-header {
    @apply flex items-center justify-between p-4 border-b;
  }
}
```

### 🚀 Phase 1 Implementation Roadmap with Build Validation

#### 1.14 Step-by-Step Implementation with NPM Build Gates

**CRITICAL**: Each step must pass `npm run build` before proceeding to the next step.

**Week 1: Foundation Components**
```bash
# Step 1: Create Modern Base Components
npm run build  # ✅ Ensure clean build
# Create: ReportsSidebar.tsx, ReportsHeader.tsx, ReportsCard.tsx
npm run build  # ✅ Validate components compile

# Step 2: Implement Navigation System  
npm run build  # ✅ Ensure previous step stable
# Create: Navigation routing, category tabs, search functionality
npm run build  # ✅ Validate navigation works

# Step 3: Build Report Grid Layout
npm run build  # ✅ Ensure navigation stable
# Create: Responsive grid, card layout, mobile optimization
npm run build  # ✅ Validate layout responsive
```

**Week 2: Database & Caching**
```bash
# Step 4: Database Schema Updates
npm run build  # ✅ Ensure UI components stable
# Run: Profile field additions, cache table creation
npm run build  # ✅ Validate database integration

# Step 5: Core Data Hooks
npm run build  # ✅ Ensure database changes stable
# Create: Custom hooks for customer analytics, caching functions
npm run build  # ✅ Validate data fetching works
```

**Week 3-4: Core Report Implementation**
```bash
# Step 6: Customer Profile Report
npm run build  # ✅ Ensure foundation stable
# Create: CustomerProfileSegmentation.tsx with modern styling
npm run build  # ✅ Validate report renders

# Step 7: Final Integration & Testing
npm run build  # ✅ Ensure all components work
# Test: All features, mobile responsiveness, data accuracy
npm run build  # ✅ Final validation before Phase 2
```

#### 1.15 Modern Component Specifications

**ReportsSidebar.tsx Implementation:**
```typescript
interface ReportsSidebarProps {
  className?: string;
}

const ReportsSidebar = ({ className }: ReportsSidebarProps) => {
  const reportCounts = {
    all: 53,      // Total reports (our 8 existing + 18 new + others)
    favourites: 0,
    dashboards: 2,
    standard: 44,
    premium: 8,
    custom: 1,
  };

  return (
    <div className={cn("w-80 bg-gray-50 border-r border-gray-200 h-full", className)}>
      {/* Reports Section */}
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Reports</h2>
        <nav className="space-y-2">
          <SidebarItem icon={List} label="All reports" count={reportCounts.all} isActive />
          <SidebarItem icon={Star} label="Favourites" count={reportCounts.favourites} />
          <SidebarItem icon={BarChart3} label="Dashboards" count={reportCounts.dashboards} />
          <SidebarItem icon={FileText} label="Standard" count={reportCounts.standard} />
          <SidebarItem icon={Crown} label="Premium" count={reportCounts.premium} />
          <SidebarItem icon={Settings} label="Custom" count={reportCounts.custom} />
          <SidebarItem icon={Target} label="Targets" />
        </nav>
      </div>
      
      {/* Folders Section */}
      <div className="px-6 py-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">Folders</h3>
          <button className="text-gray-400 hover:text-gray-600">
            <Edit className="w-4 h-4" />
          </button>
        </div>
        <button className="flex items-center text-sm text-blue-600 hover:text-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add folder
        </button>
      </div>
    </div>
  );
};
```

**ReportCard.tsx Implementation:**
```typescript
interface ReportCardProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  isPremium?: boolean;
  isStarred?: boolean;
  onClick?: () => void;
}

const ReportCard = ({ 
  title, 
  description, 
  icon: Icon, 
  isPremium, 
  isStarred, 
  onClick 
}: ReportCardProps) => {
  return (
    <div 
      className={cn(
        "bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer",
        "group relative"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <Icon className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors" />
        <button className="opacity-0 group-hover:opacity-100 transition-opacity">
          <Star className={cn(
            "w-4 h-4",
            isStarred ? "text-yellow-500 fill-current" : "text-gray-400 hover:text-yellow-500"
          )} />
        </button>
      </div>
      
      <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
        {title}
      </h3>
      
      <p className="text-sm text-gray-600 leading-relaxed mb-3">
        {description}
      </p>
      
      {isPremium && (
        <span className="inline-flex items-center text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
          Premium
        </span>
      )}
    </div>
  );
};
```

### 📊 Core Report: Customer Profile & Segmentation Dashboard

#### 1.8 Report Overview
**Primary Report for Phase 1**: Customer Profile & Segmentation Dashboard
- **Purpose**: Comprehensive customer analytics with demographic and behavioral insights
- **Data Sources**: profiles, appointments, cache_customer_analytics tables
- **Target Users**: Business owners, managers, marketing teams

#### 1.9 Report Features & Metrics

##### Customer Overview Metrics (Top 4 Cards)
1. **Total Customers**
   - Count of all active customers
   - Month-over-month growth percentage
   - New vs returning customer breakdown

2. **New Customers This Month**
   - Count of customers acquired this month
   - Acquisition rate trend
   - Lead source breakdown

3. **Customer Retention Rate**
   - Percentage of customers who returned
   - Comparison with previous periods
   - Retention by customer segment

4. **Average Customer Lifetime Value (CLV)**
   - Average revenue per customer
   - CLV by segment
   - Growth trends

##### Customer Segmentation Analysis
1. **Age Group Distribution** (using birth_date field)
   - 18-25: Young Adults
   - 26-35: Millennials  
   - 36-45: Gen X Early
   - 46-55: Gen X Late
   - 55+: Baby Boomers
   - Unknown: No birth date

2. **Gender Distribution** (using gender field)
   - Male customers percentage
   - Female customers percentage
   - Other/Prefer not to say
   - Unknown/Not specified

3. **Visit Frequency Segments**
   - **New**: 0-1 visits
   - **Occasional**: 2-5 visits
   - **Regular**: 6-15 visits
   - **VIP**: 16+ visits

4. **Spending Tier Analysis**
   - **Low**: $0-$500 total spent
   - **Medium**: $501-$1,500 total spent  
   - **High**: $1,501-$5,000 total spent
   - **Premium**: $5,000+ total spent

##### Customer Insights Dashboard
1. **Top 10 Customers by Revenue**
   - Customer name and total spent
   - Last visit date
   - Favorite services
   - Contact preferences

2. **Customer Acquisition Sources**
   - Lead source distribution
   - Referral tracking
   - Marketing channel effectiveness
   - Source ROI analysis

3. **Geographic Distribution**
   - Customer location mapping
   - Service area analysis
   - Travel distance insights

4. **Communication Preferences**
   - WhatsApp vs SMS vs Email
   - Response rate by channel
   - Engagement metrics

#### 1.10 Technical Implementation

##### Database Queries & Hooks
```typescript
// Customer Analytics Hook
export const useCustomerAnalytics = (dateRange: DateRange, locationId?: string) => {
  return useQuery({
    queryKey: ['customer-analytics', dateRange, locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cache_customer_analytics')
        .select(`
          *,
          profiles!inner(
            id, full_name, birth_date, gender, lead_source, 
            communication_channel, created_at, visit_count
          )
        `)
        .gte('last_updated', dateRange.from)
        .lte('last_updated', dateRange.to);
      
      if (error) throw error;
      return processCustomerAnalytics(data);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Customer Segmentation Hook
export const useCustomerSegmentation = (filters: SegmentationFilters) => {
  return useQuery({
    queryKey: ['customer-segmentation', filters],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select(`
          id, full_name, birth_date, gender, visit_count, created_at,
          cache_customer_analytics(total_spent, segment, last_appointment_date)
        `);
      
      if (filters.ageGroup) {
        const ageRange = getAgeRange(filters.ageGroup);
        query = query.gte('birth_date', ageRange.from).lte('birth_date', ageRange.to);
      }
      
      if (filters.gender) {
        query = query.eq('gender', filters.gender);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return {
        ageGroups: processAgeGroupData(data),
        genderDistribution: processGenderData(data),
        spendingTiers: processSpendingTiers(data),
        visitFrequency: processVisitFrequency(data)
      };
    }
  });
};
```

##### Data Processing Functions
```typescript
// Age group calculation
const calculateAgeGroup = (birthDate: string): string => {
  if (!birthDate) return 'Unknown';
  
  const age = new Date().getFullYear() - new Date(birthDate).getFullYear();
  
  if (age >= 18 && age <= 25) return '18-25';
  if (age >= 26 && age <= 35) return '26-35';
  if (age >= 36 && age <= 45) return '36-45';
  if (age >= 46 && age <= 55) return '46-55';
  if (age > 55) return '55+';
  return 'Unknown';
};

// Spending tier calculation
const calculateSpendingTier = (totalSpent: number): string => {
  if (totalSpent === 0) return 'New';
  if (totalSpent <= 500) return 'Low';
  if (totalSpent <= 1500) return 'Medium';
  if (totalSpent <= 5000) return 'High';
  return 'Premium';
};

// Customer segment determination
const determineCustomerSegment = (visitCount: number, totalSpent: number): string => {
  if (visitCount === 0) return 'new';
  if (visitCount <= 2) return 'occasional';
  if (visitCount <= 10 && totalSpent >= 1000) return 'regular';
  if (visitCount > 10 && totalSpent >= 2000) return 'vip';
  return 'occasional';
};
```

#### 1.11 UI Components Structure

##### Main Dashboard Component
```typescript
// Customer Profile Dashboard
export const CustomerProfileDashboard = () => {
  const [dateRange, setDateRange] = useState(defaultDateRange);
  const [filters, setFilters] = useState<SegmentationFilters>({});
  
  const { data: analytics, isLoading: analyticsLoading } = useCustomerAnalytics(dateRange);
  const { data: segmentation, isLoading: segmentationLoading } = useCustomerSegmentation(filters);
  
  return (
    <ReportsLayout
      title="Customer Profile & Segmentation"
      subtitle="Comprehensive customer analytics and demographic insights"
      filters={<CustomerAnalyticsFilters onChange={setFilters} />}
      showBackButton
      onBack={() => router.back()}
    >
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Customers"
          value={analytics?.totalCustomers || 0}
          trend={analytics?.customerGrowth}
          icon={<Users className="h-5 w-5" />}
          loading={analyticsLoading}
        />
        <MetricCard
          title="New This Month"
          value={analytics?.newCustomersThisMonth || 0}
          trend={analytics?.newCustomerTrend}
          icon={<UserPlus className="h-5 w-5" />}
          loading={analyticsLoading}
        />
        <MetricCard
          title="Retention Rate"
          value={`${analytics?.retentionRate || 0}%`}
          trend={analytics?.retentionTrend}
          icon={<Repeat className="h-5 w-5" />}
          loading={analyticsLoading}
        />
        <MetricCard
          title="Avg. Customer LTV"
          value={formatCurrency(analytics?.avgCLV || 0)}
          trend={analytics?.clvTrend}
          icon={<TrendingUp className="h-5 w-5" />}
          loading={analyticsLoading}
        />
      </div>

      {/* Segmentation Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <AgeGroupChart data={segmentation?.ageGroups} loading={segmentationLoading} />
        <GenderDistributionChart data={segmentation?.genderDistribution} loading={segmentationLoading} />
        <SpendingTierChart data={segmentation?.spendingTiers} loading={segmentationLoading} />
        <VisitFrequencyChart data={segmentation?.visitFrequency} loading={segmentationLoading} />
      </div>

      {/* Customer Insights Tables */}
      <div className="space-y-8">
        <TopCustomersTable customers={analytics?.topCustomers} loading={analyticsLoading} />
        <AcquisitionSourcesTable sources={analytics?.acquisitionSources} loading={analyticsLoading} />
      </div>
    </ReportsLayout>
  );
};
```

### 1.4 Phase 1 Deliverables
- ✅ Updated database schema with missing fields
- ✅ Advanced caching system with triggers
- ✅ Responsive UI skeleton (Desktop + Mobile)
- ✅ Customer Profile & Segmentation report
- ✅ Performance optimization with cache tables
- ✅ Modern design system components

---

## 💰 PHASE 2: Sales & Revenue Analytics (Weeks 5-8)

### 🎯 Phase 2 Objectives
- Implement all 5 Sales & Revenue reports from original structure
- Create comprehensive revenue tracking system
- Build discount and coupon performance analytics
- Establish gift card and membership analytics
- Optimize sales performance monitoring

### 📊 Phase 2 Reports (5 Reports - Sales & Revenue Category)

#### Report 1: Sales Performance Dashboard *(Consolidated)*
**Components**: `SalesPerformanceDashboard.tsx`
**Purpose**: Comprehensive sales overview with time periods, transactions, and trends
**Key Features**:
- Total sales, service revenue, product revenue breakdown
- Transaction count, average transaction value
- Growth rates and peak hours analysis
- Seasonal trends and location comparisons
- Discount and loyalty redemption tracking

#### Report 2: Sales List & Transactions
**Components**: `SalesTransactionsList.tsx`
**Purpose**: Detailed transaction-level sales data
**Key Features**:
- Transaction details with customer information
- Service and product breakdowns
- Discount applications and coupon usage
- Loyalty points earned/redeemed per transaction
- Payment method and employee tracking

#### Report 3: Discount & Coupon Performance Analysis
**Components**: `DiscountCouponAnalytics.tsx`
**Purpose**: Comprehensive discount and coupon effectiveness analysis
**Key Features**:
- Coupon code performance metrics
- Discount type analysis and ROI
- Customer behavior with discounts
- Repeat usage rates and conversion analysis
- Revenue impact calculations

#### Report 4: Gift Card Performance
**Components**: `GiftCardAnalytics.tsx`
**Purpose**: Gift card sales, redemption, and performance tracking
**Key Features**:
- Gift card issuance and redemption rates
- Balance tracking and expiry analysis
- Purchaser vs recipient analytics
- Revenue impact and customer acquisition

#### Report 5: Membership Sales Analysis
**Components**: `MembershipAnalytics.tsx`
**Purpose**: Membership program performance and retention
**Key Features**:
- Active membership counts and trends
- New signups, renewals, and cancellations
- Member spending patterns and retention rates
- Upgrade/downgrade analysis

### 🗄️ Database Enhancements

#### 2.1 Enhanced Revenue Tracking Tables
```sql
-- Enhanced revenue analytics table
CREATE TABLE revenue_analytics (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    appointment_id UUID REFERENCES appointments(id),
    service_id UUID REFERENCES services(id),
    employee_id UUID REFERENCES employees(id),
    customer_id UUID REFERENCES profiles(id),
    revenue_amount DECIMAL(12,2) NOT NULL,
    service_cost DECIMAL(10,2) DEFAULT 0.00,
    gross_profit DECIMAL(12,2) GENERATED ALWAYS AS (revenue_amount - service_cost) STORED,
    payment_method TEXT NOT NULL,
    discount_applied DECIMAL(10,2) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    commission_amount DECIMAL(10,2) DEFAULT 0.00,
    tips_amount DECIMAL(10,2) DEFAULT 0.00,
    refund_amount DECIMAL(10,2) DEFAULT 0.00,
    location_id UUID REFERENCES locations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Financial cache table for revenue analytics
CREATE TABLE cache_financial_metrics (
    id SERIAL PRIMARY KEY,
    metric_date DATE NOT NULL,
    location_id UUID REFERENCES locations(id),
    total_revenue DECIMAL(12,2) DEFAULT 0.00,
    total_cost DECIMAL(12,2) DEFAULT 0.00,
    gross_profit DECIMAL(12,2) DEFAULT 0.00,
    net_profit DECIMAL(12,2) DEFAULT 0.00,
    total_discounts DECIMAL(10,2) DEFAULT 0.00,
    total_taxes DECIMAL(10,2) DEFAULT 0.00,
    total_commissions DECIMAL(10,2) DEFAULT 0.00,
    total_tips DECIMAL(10,2) DEFAULT 0.00,
    total_refunds DECIMAL(10,2) DEFAULT 0.00,
    payment_method_breakdown JSONB DEFAULT '{}',
    revenue_by_category JSONB DEFAULT '{}',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(metric_date, location_id)
);

-- Revenue forecasting table
CREATE TABLE revenue_forecasts (
    id SERIAL PRIMARY KEY,
    forecast_date DATE NOT NULL,
    location_id UUID REFERENCES locations(id),
    forecast_type TEXT NOT NULL, -- daily, weekly, monthly
    predicted_revenue DECIMAL(12,2) NOT NULL,
    confidence_interval DECIMAL(5,2) DEFAULT 0.95,
    model_version TEXT DEFAULT 'v1.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_revenue_analytics_date ON revenue_analytics(date DESC);
CREATE INDEX idx_revenue_analytics_service ON revenue_analytics(service_id);
CREATE INDEX idx_revenue_analytics_employee ON revenue_analytics(employee_id);
CREATE INDEX idx_revenue_analytics_location_date ON revenue_analytics(location_id, date);
CREATE INDEX idx_cache_financial_date ON cache_financial_metrics(metric_date DESC);
CREATE INDEX idx_revenue_forecasts_date ON revenue_forecasts(forecast_date DESC);
```

#### 2.2 Financial Cache Update Functions
```sql
-- Function to update financial metrics cache
CREATE OR REPLACE FUNCTION update_financial_metrics_cache()
RETURNS TRIGGER AS $$
DECLARE
    target_date DATE;
    target_location UUID;
BEGIN
    target_date := DATE(COALESCE(NEW.date, OLD.date));
    target_location := COALESCE(NEW.location_id, OLD.location_id);
    
    -- Recalculate financial metrics for the affected date
    INSERT INTO cache_financial_metrics (
        metric_date, location_id, total_revenue, total_cost, gross_profit,
        total_discounts, total_taxes, total_commissions, total_tips, total_refunds,
        payment_method_breakdown, revenue_by_category
    )
    SELECT 
        target_date,
        target_location,
        COALESCE(SUM(revenue_amount), 0) as total_revenue,
        COALESCE(SUM(service_cost), 0) as total_cost,
        COALESCE(SUM(gross_profit), 0) as gross_profit,
        COALESCE(SUM(discount_applied), 0) as total_discounts,
        COALESCE(SUM(tax_amount), 0) as total_taxes,
        COALESCE(SUM(commission_amount), 0) as total_commissions,
        COALESCE(SUM(tips_amount), 0) as total_tips,
        COALESCE(SUM(refund_amount), 0) as total_refunds,
        jsonb_object_agg(payment_method, method_total) as payment_breakdown,
        jsonb_object_agg(category_name, category_total) as category_breakdown
    FROM (
        SELECT 
            ra.*,
            SUM(ra.revenue_amount) OVER (PARTITION BY ra.payment_method) as method_total,
            COALESCE(c.name, 'Uncategorized') as category_name,
            SUM(ra.revenue_amount) OVER (PARTITION BY c.name) as category_total
        FROM revenue_analytics ra
        LEFT JOIN services s ON ra.service_id = s.id
        LEFT JOIN categories c ON s.category_id = c.id
        WHERE DATE(ra.date) = target_date 
          AND ra.location_id = target_location
    ) sub
    GROUP BY target_date, target_location
    ON CONFLICT (metric_date, location_id)
    DO UPDATE SET
        total_revenue = EXCLUDED.total_revenue,
        total_cost = EXCLUDED.total_cost,
        gross_profit = EXCLUDED.gross_profit,
        total_discounts = EXCLUDED.total_discounts,
        total_taxes = EXCLUDED.total_taxes,
        total_commissions = EXCLUDED.total_commissions,
        total_tips = EXCLUDED.total_tips,
        total_refunds = EXCLUDED.total_refunds,
        payment_method_breakdown = EXCLUDED.payment_method_breakdown,
        revenue_by_category = EXCLUDED.revenue_by_category,
        last_updated = NOW();
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for financial cache updates
CREATE TRIGGER trigger_update_financial_cache
    AFTER INSERT OR UPDATE OR DELETE ON revenue_analytics
    FOR EACH ROW EXECUTE FUNCTION update_financial_metrics_cache();
```

### 📊 Reports Implementation (3 Reports)

#### 2.3 Report 1: Revenue Dashboard

##### Revenue Dashboard Features & Metrics
1. **Top Financial KPI Cards**
   - Total Revenue (today/week/month)
   - Revenue Growth Rate (vs previous period)
   - Average Transaction Value
   - Profit Margin Percentage

2. **Revenue Trends & Analysis**
   - Daily/Weekly/Monthly revenue charts
   - Revenue by service category
   - Payment method distribution
   - Peak revenue hours analysis

3. **Comparative Analytics**
   - Year-over-year comparisons
   - Month-over-month growth
   - Location-wise revenue breakdown
   - Service profitability ranking

##### Technical Implementation
```typescript
// Revenue Dashboard Hook
export const useRevenueDashboard = (dateRange: DateRange, locationId?: string) => {
  return useQuery({
    queryKey: ['revenue-dashboard', dateRange, locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cache_financial_metrics')
        .select('*')
        .gte('metric_date', dateRange.from)
        .lte('metric_date', dateRange.to)
        .eq('location_id', locationId || null)
        .order('metric_date', { ascending: false });
      
      if (error) throw error;
      return processRevenueDashboardData(data);
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Revenue Analytics Component
export const RevenueDashboard = () => {
  const [dateRange, setDateRange] = useState(defaultDateRange);
  const [selectedLocation, setSelectedLocation] = useState<string>();
  
  const { data: revenueData, isLoading } = useRevenueDashboard(dateRange, selectedLocation);
  
  return (
    <ReportsLayout
      title="Revenue Dashboard"
      subtitle="Comprehensive revenue analytics and financial insights"
      filters={<RevenueFilters onDateChange={setDateRange} onLocationChange={setSelectedLocation} />}
      showBackButton
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(revenueData?.totalRevenue || 0)}
          trend={revenueData?.revenueGrowth}
          icon={<DollarSign className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Growth Rate"
          value={`${revenueData?.growthRate || 0}%`}
          trend={revenueData?.growthTrend}
          icon={<TrendingUp className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Avg Transaction"
          value={formatCurrency(revenueData?.avgTransactionValue || 0)}
          trend={revenueData?.avgValueTrend}
          icon={<CreditCard className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Profit Margin"
          value={`${revenueData?.profitMargin || 0}%`}
          trend={revenueData?.marginTrend}
          icon={<Percent className="h-5 w-5" />}
          loading={isLoading}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <RevenueTimelineChart data={revenueData?.timeline} loading={isLoading} />
        <PaymentMethodChart data={revenueData?.paymentMethods} loading={isLoading} />
        <ServiceCategoryChart data={revenueData?.categories} loading={isLoading} />
        <RevenueHoursChart data={revenueData?.hourlyBreakdown} loading={isLoading} />
      </div>

      {/* Revenue Tables */}
      <div className="space-y-8">
        <TopServicesRevenueTable services={revenueData?.topServices} loading={isLoading} />
        <LocationRevenueTable locations={revenueData?.locationBreakdown} loading={isLoading} />
      </div>
    </ReportsLayout>
  );
};
```

#### 2.4 Report 2: Financial Performance Report

##### Financial Performance Features
1. **Profit & Loss Analysis**
   - Gross profit margins
   - Operating expenses tracking
   - Net profit calculations
   - Cost breakdown analysis

2. **Commission & Payroll Tracking**
   - Employee commission totals
   - Payroll expense analysis
   - Commission rate optimization
   - Performance-based rewards

3. **Financial Health Metrics**
   - Cash flow analysis
   - Revenue vs. expenses ratio
   - Financial efficiency ratios
   - Budget vs. actual comparisons

##### Technical Implementation
```typescript
// Financial Performance Hook
export const useFinancialPerformance = (dateRange: DateRange, reportType: 'monthly' | 'quarterly') => {
  return useQuery({
    queryKey: ['financial-performance', dateRange, reportType],
    queryFn: async () => {
      // Complex financial calculations
      const [revenueData, expenseData, commissionData] = await Promise.all([
        getRevenueData(dateRange),
        getExpenseData(dateRange),
        getCommissionData(dateRange)
      ]);
      
      return calculateFinancialPerformance(revenueData, expenseData, commissionData);
    }
  });
};

// Financial Performance Component with P&L Structure
export const FinancialPerformanceReport = () => {
  return (
    <ReportsLayout title="Financial Performance" subtitle="Profit & Loss Analysis">
      <div className="space-y-8">
        {/* P&L Statement */}
        <ProfitLossStatement data={financialData?.pnl} />
        
        {/* Commission Analysis */}
        <CommissionAnalysisChart data={financialData?.commissions} />
        
        {/* Cash Flow Chart */}
        <CashFlowChart data={financialData?.cashFlow} />
        
        {/* Financial Ratios */}
        <FinancialRatiosTable ratios={financialData?.ratios} />
      </div>
    </ReportsLayout>
  );
};
```

#### 2.5 Report 3: Payment Analytics Dashboard

##### Payment Analytics Features
1. **Payment Method Analysis**
   - Cash vs. card vs. digital payments
   - Payment success rates
   - Transaction fees analysis
   - Payment processing times

2. **Customer Payment Behavior**
   - Payment preferences by demographics
   - Tip patterns analysis
   - Payment timing patterns
   - Loyalty program usage

3. **Payment Optimization Insights**
   - Failed payment analysis
   - Refund patterns and reasons
   - Payment fraud detection
   - Processing cost optimization

##### Technical Implementation
```typescript
// Payment Analytics Hook
export const usePaymentAnalytics = (dateRange: DateRange) => {
  return useQuery({
    queryKey: ['payment-analytics', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_payment_analytics', {
        start_date: dateRange.from,
        end_date: dateRange.to
      });
      
      if (error) throw error;
      return data;
    }
  });
};

// Payment Analytics Component
export const PaymentAnalyticsDashboard = () => {
  const { data: paymentData, isLoading } = usePaymentAnalytics(dateRange);
  
  return (
    <ReportsLayout title="Payment Analytics" subtitle="Payment method insights and optimization">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <PaymentMethodDistributionChart data={paymentData?.methodDistribution} />
        <PaymentSuccessRateChart data={paymentData?.successRates} />
        <TipAnalysisChart data={paymentData?.tipAnalysis} />
        <RefundPatternsChart data={paymentData?.refundPatterns} />
      </div>
      
      <PaymentOptimizationTable insights={paymentData?.optimizationInsights} />
    </ReportsLayout>
  );
};
```

### 2.6 Phase 2 Deliverables
- ✅ Enhanced revenue tracking system with cache optimization
- ✅ 3 Comprehensive Financial Reports (Revenue Dashboard, Financial Performance, Payment Analytics)
- ✅ Revenue forecasting algorithms with ML integration
- ✅ Advanced payment analytics with optimization insights
- ✅ Real-time financial metrics with automatic cache updates
- ✅ Profit & Loss statement automation
- ✅ Commission tracking and payroll integration

---

## 🎯 PHASE 3: Finance & Appointments Analytics (Weeks 9-12)

### 🎯 Phase 3 Objectives
- Implement 7 Finance & Appointments reports (Reports 6-12) 
- Create comprehensive payment method analysis with modern mobile interface
- Establish appointment performance tracking with responsive design patterns
- Optimize financial compliance and cash flow monitoring
- **NEW**: Mobile Responsiveness Integration - implement modern mobile patterns across all reports
- **NEW**: Build Validation Strategy - npm run build validation after every component creation

### 🎨 Modern Mobile Design Integration for Phase 3

#### Mobile-First Financial Interface Patterns
**Based on Modern Design Analysis:**

1. **Mobile Navigation Patterns**   ```typescript
   // MobileFinanceNav.tsx - 56px height mobile header
   const MobileFinanceNav = () => (
     <div className="h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between sticky top-0 z-50">
       <div className="flex items-center space-x-3">
         <button className="p-2 -ml-2">
           <ArrowLeft className="w-5 h-5 text-gray-700" />
         </button>
         <h1 className="text-lg font-semibold text-gray-900">Finance</h1>
       </div>
       <button className="text-blue-600 font-medium text-sm">Export</button>
     </div>
   );
   ```

2. **Horizontal Scrolling Tabs (Modern Pattern)**
   ```typescript
   // FinanceTabs.tsx - Horizontal scrolling finance categories
   const FinanceTabs = ({ activeTab, onTabChange }) => (
     <div className="flex overflow-x-auto scrollbar-hide px-4 bg-white border-b border-gray-100">
       {['Summary', 'Payments', 'Cash Flow', 'Tax'].map((tab) => (
         <button
           key={tab}
           className={cn(
             "flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
             activeTab === tab 
               ? "text-blue-600 border-blue-600" 
               : "text-gray-500 border-transparent hover:text-gray-700"
           )}
           onClick={() => onTabChange(tab)}
         >
           {tab}
         </button>
       ))}
     </div>
   );
   ```

3. **Mobile Financial Cards (Touch-Friendly)**   ```typescript
   // FinancialCard.tsx - Mobile-optimized financial metric cards
   const FinancialCard = ({ title, value, change, icon: Icon }) => (
     <div className="bg-white rounded-lg border border-gray-200 p-4 min-h-[100px] touch-manipulation">
       <div className="flex items-start justify-between mb-2">
         <Icon className="w-5 h-5 text-gray-600" />
         {change && (
           <span className={cn(
             "text-xs font-medium px-2 py-1 rounded-full",
             change > 0 ? "text-green-700 bg-green-100" : "text-red-700 bg-red-100"
           )}>
             {change > 0 ? '+' : ''}{change}%
           </span>
         )}
       </div>
       <p className="text-sm text-gray-600 mb-1">{title}</p>
       <p className="text-lg font-semibold text-gray-900">{value}</p>
     </div>
   );
   ```

### ⚡ Build Validation Strategy Integration

#### 3.1 Phase 3 Build Validation Gates
```bash
# Validation Command Suite for Phase 3
npm run build && npm run type-check && npm run lint

# Validation Points:
# ✅ After each modern component creation → Build validation
# ✅ After each finance report implementation → Build validation  
# ✅ After each appointment report implementation → Build validation
# ✅ After mobile responsiveness updates → Build validation
# ✅ Before phase completion → Full validation suite + E2E tests
```

#### 3.2 Component Creation Workflow with Validation
```typescript
// Example validation workflow for each report:
// 1. Create component file
// 2. Run: npm run build (must pass)
// 3. Add to router/index
// 4. Run: npm run build (must pass)  
// 5. Add mobile responsive breakpoints
// 6. Run: npm run build (must pass)
// 7. Integration test
// 8. Final validation before git commit
```

### 📊 Phase 3 Reports (7 Reports - Finance & Appointments Categories)

#### **FINANCE & PAYMENTS (4 Reports)**

#### Report 6: Finance Summary *(Modern Mobile-First)*
**Components**: `FinanceSummaryDashboard.tsx`, `FinancialCard.tsx`, `MobileFinanceNav.tsx`
**Purpose**: Comprehensive financial overview with modern mobile design patterns
**Key Features**:
- Total revenue, payments, and outstanding balances with mobile-optimized cards
- Refunds, cash flow, and profit margin analysis using horizontal scroll tabs
- Tax collection and payment processing fees with touch-friendly interfaces
- Financial health indicators with modern metrics display
- **Build Validation**: npm run build after component creation

**Modern Design Implementation**:
```typescript
const FinanceSummaryDashboard = () => {
  const [activeTab, setActiveTab] = useState('Summary');
  
  return (
    <>      <MobileFinanceNav />
      <FinanceTabs activeTab={activeTab} onTabChange={setActiveTab} />
      
      {/* Mobile-optimized grid */}
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">          <FinancialCard
            title="Total Revenue"
            value={formatCurrency(data?.totalRevenue)}
            change={data?.revenueChange}
            icon={DollarSign}
          />
          <FinancialCard
            title="Profit Margin"
            value={`${data?.profitMargin}%`}
            change={data?.marginChange}
            icon={TrendingUp}
          />
        </div>
        
        {/* Responsive chart container */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <ResponsiveRevenueChart data={data?.chartData} />
        </div>
      </div>
    </>
  );
};
```

#### Report 7: Payment Methods Analysis *(Touch-Optimized Interface)*
**Components**: `PaymentMethodsAnalytics.tsx`, `PaymentCard.tsx`, `SwipeablePaymentTabs.tsx`
**Purpose**: Payment method performance with modern swipe-friendly interface
**Key Features**:
- Payment method transaction counts with swipeable category tabs
- Processing fees analysis with mobile-friendly data tables
- Chargeback rates with touch-accessible drill-down views
- Customer payment preferences with horizontal scroll charts
- **Build Validation**: npm run build after mobile interface implementation

**Mobile Interface Pattern**:
```typescript
const PaymentMethodsAnalytics = () => (
  <div className="min-h-screen bg-gray-50">
    <MobileHeader title="Payment Methods" />
    
    {/* Swipeable payment categories */}
    <SwipeablePaymentTabs>
      <PaymentMethodGrid data={data?.methods} />
      <ProcessingFeesChart data={data?.fees} />
      <ChargebackAnalysis data={data?.chargebacks} />
    </SwipeablePaymentTabs>
  </div>
);
```

#### Report 8: Cash Flow Management *(Real-time Mobile Dashboard)*
**Components**: `CashFlowManagement.tsx`, `CashFlowCard.tsx`, `MobileCashFlowChart.tsx`
**Purpose**: Real-time cash flow tracking with mobile-first design
**Key Features**:
- Cash inflow/outflow with real-time mobile updates
- Opening and closing balance tracking with swipe gestures
- Payment method breakdown with touch-friendly pie charts
- Refund impact analysis with mobile-optimized time series
- **Build Validation**: npm run build after real-time features integration

#### Report 9: Tax & Compliance Report *(Compliance Mobile Interface)*
**Components**: `TaxComplianceReport.tsx`, `TaxCard.tsx`, `ComplianceStatusIndicator.tsx`
**Purpose**: Tax collection monitoring with mobile compliance interface
**Key Features**:
- Tax rates and collection with mobile-friendly compliance indicators
- Taxable vs tax-exempt revenue with swipe-to-filter functionality
- Compliance rate tracking with touch-accessible drill-down
- Service vs product tax analysis with responsive data visualization
- **Build Validation**: npm run build after compliance features implementation

#### **APPOINTMENTS & BOOKINGS (3 Reports)**

#### Report 10: Appointments Summary *(Modern Calendar Integration)*
**Components**: `AppointmentsSummaryDashboard.tsx`, `AppointmentCard.tsx`, `MobileCalendarView.tsx`
**Purpose**: Appointment performance with modern calendar design patterns
**Key Features**:
- Total appointments with calendar-style mobile navigation
- Completion rates using modern progress indicators
- Peak times analysis with touch-friendly time slot selection
- Employee performance with swipeable staff cards
- **Build Validation**: npm run build after calendar integration

**Calendar Interface Pattern**:
```typescript
const AppointmentsSummaryDashboard = () => (
  <div className="flex flex-col h-screen">    <MobileHeader title="Appointments" />
    
    {/* Mobile calendar view */}
    <MobileCalendarView
      appointments={data?.appointments}
      onDateSelect={handleDateSelect}
      className="flex-1"
    />
    
    {/* Bottom stats panel - Modern style */}
    <div className="bg-white border-t border-gray-200 p-4">
      <div className="grid grid-cols-3 gap-4">
        <AppointmentCard
          label="Today"
          value={data?.todayCount}
          icon={Calendar}
        />
        <AppointmentCard
          label="Completed"
          value={`${data?.completionRate}%`}
          icon={CheckCircle}
        />
        <AppointmentCard
          label="Revenue"
          value={formatCurrency(data?.todayRevenue)}
          icon={DollarSign}
        />
      </div>
    </div>
  </div>
);
```

#### Report 11: Appointment Analytics *(Detailed Mobile Drill-Down)*  
**Components**: `AppointmentAnalyticsDetail.tsx`, `AppointmentDetailCard.tsx`, `SwipeableServiceTabs.tsx`
**Purpose**: Detailed appointment analytics with mobile drill-down interface
**Key Features**:
- Individual appointment tracking with swipe-to-view details
- Booking source analysis with mobile-friendly funnel visualization  
- Service duration with touch-optimized timeline views
- Customer correlation analysis with responsive relationship mapping
- **Build Validation**: npm run build after drill-down interface implementation

#### Report 12: Cancellation & No-Show Analysis *(Prevention Mobile Interface)*
**Components**: `CancellationNoShowAnalytics.tsx`, `CancellationCard.tsx`, `PreventionActionPanel.tsx`
**Purpose**: Cancellation pattern analysis with mobile prevention tools
**Key Features**:
- Cancellation reasons with mobile-friendly category selection
- Revenue impact with touch-accessible recovery actions
- Time pattern identification with swipeable time-based filters
- Prevention strategies with mobile action panels for staff
- **Build Validation**: npm run build after prevention interface implementation

### 📱 Mobile Responsiveness Specifications (Modern-Inspired)

#### Responsive Breakpoints Strategy
```css
/* Modern responsive design system */
.modern-mobile {
  /* Mobile First: 320px - 768px */
  @apply min-h-screen bg-gray-50;
}

.modern-tablet {
  /* Tablet: 768px - 1024px */
  @media (min-width: 768px) {
    @apply bg-white;
  }
}

.modern-desktop {
  /* Desktop: 1024px+ */
  @media (min-width: 1024px) {
    @apply grid grid-cols-[280px_1fr];
  }
}
```

#### Touch Interface Standards
- **Minimum touch target**: 44px × 44px (Apple guidelines)
- **Card padding**: 16px mobile, 24px tablet, 32px desktop
- **Typography scale**: 14px mobile base, 16px desktop base
- **Navigation height**: 56px mobile header (modern standard)
- **Tab bar height**: 48px bottom navigation
- **Swipe gestures**: Horizontal scroll for tabs, vertical for content

### 🗄️ Performance Tracking System Enhancement

#### 3.1 Advanced Performance Tables
```sql
-- Enhanced service performance metrics table
CREATE TABLE service_performance_metrics (
    id SERIAL PRIMARY KEY,
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id),
    month_year TEXT NOT NULL, -- Format: YYYY-MM
    location_id UUID REFERENCES locations(id),
    bookings_count INTEGER DEFAULT 0,
    completed_count INTEGER DEFAULT 0,
    cancelled_count INTEGER DEFAULT 0,
    no_show_count INTEGER DEFAULT 0,
    completion_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN bookings_count > 0 
             THEN (completed_count::DECIMAL / bookings_count * 100) 
             ELSE 0 END
    ) STORED,
    avg_rating DECIMAL(3,2) DEFAULT 0.00,
    total_rating_count INTEGER DEFAULT 0,
    revenue_generated DECIMAL(12,2) DEFAULT 0.00,
    avg_revenue_per_service DECIMAL(10,2) GENERATED ALWAYS AS (
        CASE WHEN completed_count > 0 
             THEN (revenue_generated / completed_count) 
             ELSE 0 END
    ) STORED,
    total_duration_minutes INTEGER DEFAULT 0,
    avg_duration_minutes INTEGER GENERATED ALWAYS AS (
        CASE WHEN completed_count > 0 
             THEN (total_duration_minutes / completed_count) 
             ELSE 0 END
    ) STORED,
    efficiency_score DECIMAL(5,2) DEFAULT 0.00,
    upsell_count INTEGER DEFAULT 0,
    upsell_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN completed_count > 0 
             THEN (upsell_count::DECIMAL / completed_count * 100) 
             ELSE 0 END
    ) STORED,
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(service_id, employee_id, month_year, location_id)
);

-- Enhanced employee performance metrics table
CREATE TABLE employee_performance_metrics (
    id SERIAL PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    month_year TEXT NOT NULL, -- Format: YYYY-MM
    location_id UUID REFERENCES locations(id),
    total_appointments INTEGER DEFAULT 0,
    appointments_completed INTEGER DEFAULT 0,
    appointments_cancelled INTEGER DEFAULT 0,
    appointments_no_show INTEGER DEFAULT 0,
    completion_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN total_appointments > 0 
             THEN (appointments_completed::DECIMAL / total_appointments * 100) 
             ELSE 0 END
    ) STORED,
    total_revenue DECIMAL(12,2) DEFAULT 0.00,
    avg_revenue_per_appointment DECIMAL(10,2) GENERATED ALWAYS AS (
        CASE WHEN appointments_completed > 0 
             THEN (total_revenue / appointments_completed) 
             ELSE 0 END
    ) STORED,
    commission_earned DECIMAL(10,2) DEFAULT 0.00,
    avg_customer_rating DECIMAL(3,2) DEFAULT 0.00,
    total_ratings_count INTEGER DEFAULT 0,
    customer_retention_rate DECIMAL(5,2) DEFAULT 0.00,
    new_customers_acquired INTEGER DEFAULT 0,
    repeat_customers_served INTEGER DEFAULT 0,
    punctuality_score DECIMAL(3,2) DEFAULT 0.00,
    tardiness_incidents INTEGER DEFAULT 0,
    early_completions INTEGER DEFAULT 0,
    on_time_completions INTEGER DEFAULT 0,
    upsell_success_count INTEGER DEFAULT 0,
    upsell_attempt_count INTEGER DEFAULT 0,
    upsell_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN upsell_attempt_count > 0 
             THEN (upsell_success_count::DECIMAL / upsell_attempt_count * 100) 
             ELSE 0 END
    ) STORED,
    working_hours DECIMAL(5,2) DEFAULT 0.00,
    productivity_score DECIMAL(5,2) DEFAULT 0.00,
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, month_year, location_id)
);

-- Operational efficiency metrics table
CREATE TABLE operational_efficiency_metrics (
    id SERIAL PRIMARY KEY,
    location_id UUID REFERENCES locations(id),
    date DATE NOT NULL,
    total_capacity_minutes INTEGER DEFAULT 0,
    booked_capacity_minutes INTEGER DEFAULT 0,
    utilization_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN total_capacity_minutes > 0 
             THEN (booked_capacity_minutes::DECIMAL / total_capacity_minutes * 100) 
             ELSE 0 END
    ) STORED,
    peak_hour_utilization DECIMAL(5,2) DEFAULT 0.00,
    off_peak_utilization DECIMAL(5,2) DEFAULT 0.00,
    avg_wait_time_minutes DECIMAL(5,2) DEFAULT 0.00,
    appointment_gaps_count INTEGER DEFAULT 0,
    last_minute_bookings INTEGER DEFAULT 0,
    advance_bookings INTEGER DEFAULT 0,
    resource_efficiency_score DECIMAL(5,2) DEFAULT 0.00,
    staff_efficiency_score DECIMAL(5,2) DEFAULT 0.00,
    equipment_utilization DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(location_id, date)
);

-- Quality assurance metrics table
CREATE TABLE quality_assurance_metrics (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    location_id UUID REFERENCES locations(id),
    service_id UUID REFERENCES services(id),
    employee_id UUID REFERENCES employees(id),
    customer_satisfaction_score DECIMAL(3,2) DEFAULT 0.00,
    service_quality_score DECIMAL(3,2) DEFAULT 0.00,
    complaint_count INTEGER DEFAULT 0,
    compliment_count INTEGER DEFAULT 0,
    repeat_service_rate DECIMAL(5,2) DEFAULT 0.00,
    service_consistency_score DECIMAL(3,2) DEFAULT 0.00,
    hygiene_compliance_score DECIMAL(3,2) DEFAULT 0.00,
    safety_compliance_score DECIMAL(3,2) DEFAULT 0.00,
    training_completion_rate DECIMAL(5,2) DEFAULT 0.00,
    quality_improvement_actions INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date, location_id, service_id, employee_id)
);

-- Performance indexes for optimization
CREATE INDEX idx_service_performance_service_month ON service_performance_metrics(service_id, month_year);
CREATE INDEX idx_service_performance_employee_month ON service_performance_metrics(employee_id, month_year);
CREATE INDEX idx_service_performance_location ON service_performance_metrics(location_id);
CREATE INDEX idx_employee_performance_employee_month ON employee_performance_metrics(employee_id, month_year);
CREATE INDEX idx_employee_performance_location ON employee_performance_metrics(location_id);
CREATE INDEX idx_operational_efficiency_location_date ON operational_efficiency_metrics(location_id, date DESC);
CREATE INDEX idx_quality_assurance_date_location ON quality_assurance_metrics(date DESC, location_id);
```

#### 3.2 Performance Cache Update Functions
```sql
-- Function to update service performance cache
CREATE OR REPLACE FUNCTION update_service_performance_cache()
RETURNS TRIGGER AS $$
DECLARE
    target_month TEXT;
    service_data RECORD;
BEGIN
    target_month := TO_CHAR(COALESCE(NEW.appointment_date, OLD.appointment_date), 'YYYY-MM');
    
    -- Calculate service performance metrics
    FOR service_data IN 
        SELECT DISTINCT service_id, employee_id, location::UUID as location_id
        FROM bookings b
        JOIN appointments a ON b.appointment_id = a.id
        WHERE TO_CHAR(a.appointment_date, 'YYYY-MM') = target_month
    LOOP
        INSERT INTO service_performance_metrics (
            service_id, employee_id, month_year, location_id,
            bookings_count, completed_count, cancelled_count, no_show_count,
            avg_rating, revenue_generated, total_duration_minutes
        )
        SELECT 
            service_data.service_id,
            service_data.employee_id,
            target_month,
            service_data.location_id,
            COUNT(*) as bookings_count,
            COUNT(*) FILTER (WHERE b.status = 'completed') as completed_count,
            COUNT(*) FILTER (WHERE b.status = 'cancelled') as cancelled_count,
            COUNT(*) FILTER (WHERE a.status = 'noshow') as no_show_count,
            AVG(COALESCE(r.rating, 0)) as avg_rating,
            SUM(CASE WHEN b.status = 'completed' THEN COALESCE(b.price, 0) ELSE 0 END) as revenue_generated,
            SUM(CASE WHEN b.status = 'completed' THEN COALESCE(s.duration, 0) ELSE 0 END) as total_duration_minutes
        FROM bookings b
        JOIN appointments a ON b.appointment_id = a.id
        JOIN services s ON b.service_id = s.id
        LEFT JOIN reviews r ON r.appointment_id = a.id AND r.service_id = s.id
        WHERE b.service_id = service_data.service_id
          AND b.employee_id = service_data.employee_id
          AND a.location::UUID = service_data.location_id
          AND TO_CHAR(a.appointment_date, 'YYYY-MM') = target_month
        GROUP BY service_data.service_id, service_data.employee_id, service_data.location_id
        ON CONFLICT (service_id, employee_id, month_year, location_id)
        DO UPDATE SET
            bookings_count = EXCLUDED.bookings_count,
            completed_count = EXCLUDED.completed_count,
            cancelled_count = EXCLUDED.cancelled_count,
            no_show_count = EXCLUDED.no_show_count,
            avg_rating = EXCLUDED.avg_rating,
            revenue_generated = EXCLUDED.revenue_generated,
            total_duration_minutes = EXCLUDED.total_duration_minutes,
            last_calculated = NOW();
    END LOOP;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to update employee performance cache
CREATE OR REPLACE FUNCTION update_employee_performance_cache()
RETURNS TRIGGER AS $$
DECLARE
    target_month TEXT;
    employee_data RECORD;
BEGIN
    target_month := TO_CHAR(COALESCE(NEW.appointment_date, OLD.appointment_date), 'YYYY-MM');
    
    -- Calculate employee performance metrics
    FOR employee_data IN 
        SELECT DISTINCT employee_id, location::UUID as location_id
        FROM bookings b
        JOIN appointments a ON b.appointment_id = a.id
        WHERE TO_CHAR(a.appointment_date, 'YYYY-MM') = target_month
          AND b.employee_id IS NOT NULL
    LOOP
        INSERT INTO employee_performance_metrics (
            employee_id, month_year, location_id,
            total_appointments, appointments_completed, appointments_cancelled,
            total_revenue, commission_earned, avg_customer_rating,
            new_customers_acquired, repeat_customers_served
        )
        SELECT 
            employee_data.employee_id,
            target_month,
            employee_data.location_id,
            COUNT(DISTINCT a.id) as total_appointments,
            COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'completed') as appointments_completed,
            COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'cancelled') as appointments_cancelled,
            SUM(CASE WHEN a.status = 'completed' THEN COALESCE(a.total_amount, 0) ELSE 0 END) as total_revenue,
            SUM(CASE WHEN a.status = 'completed' THEN COALESCE(ec.commission_amount, 0) ELSE 0 END) as commission_earned,
            AVG(COALESCE(r.rating, 0)) as avg_customer_rating,
            COUNT(DISTINCT a.customer_id) FILTER (WHERE p.created_at >= date_trunc('month', a.appointment_date)) as new_customers_acquired,
            COUNT(DISTINCT a.customer_id) FILTER (WHERE p.created_at < date_trunc('month', a.appointment_date)) as repeat_customers_served
        FROM bookings b
        JOIN appointments a ON b.appointment_id = a.id
        JOIN profiles p ON a.customer_id = p.id
        LEFT JOIN reviews r ON r.appointment_id = a.id
        LEFT JOIN employee_commissions ec ON ec.appointment_id = a.id AND ec.employee_id = b.employee_id
        WHERE b.employee_id = employee_data.employee_id
          AND a.location::UUID = employee_data.location_id
          AND TO_CHAR(a.appointment_date, 'YYYY-MM') = target_month
        GROUP BY employee_data.employee_id, employee_data.location_id
        ON CONFLICT (employee_id, month_year, location_id)
        DO UPDATE SET
            total_appointments = EXCLUDED.total_appointments,
            appointments_completed = EXCLUDED.appointments_completed,
            appointments_cancelled = EXCLUDED.appointments_cancelled,
            total_revenue = EXCLUDED.total_revenue,
            commission_earned = EXCLUDED.commission_earned,
            avg_customer_rating = EXCLUDED.avg_customer_rating,
            new_customers_acquired = EXCLUDED.new_customers_acquired,
            repeat_customers_served = EXCLUDED.repeat_customers_served,
            last_calculated = NOW();
    END LOOP;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create performance triggers
CREATE TRIGGER trigger_update_service_performance
    AFTER INSERT OR UPDATE OR DELETE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_service_performance_cache();

CREATE TRIGGER trigger_update_employee_performance
    AFTER INSERT OR UPDATE OR DELETE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_employee_performance_cache();
```

### 📊 Reports Implementation (4 Reports)

#### 3.3 Report 1: Service Performance Dashboard

##### Service Performance Features & Metrics
1. **Service KPI Cards**
   - Most Popular Services (by bookings)
   - Highest Revenue Services
   - Best Rated Services (by customer feedback)
   - Most Efficient Services (completion rate)

2. **Service Analytics**
   - Service demand trends over time
   - Seasonal popularity patterns
   - Service profitability analysis
   - Duration efficiency metrics

3. **Service Optimization Insights**
   - Underperforming services identification
   - Pricing optimization recommendations
   - Service bundling opportunities
   - Capacity planning insights

##### Technical Implementation
```typescript
// Service Performance Hook
export const useServicePerformance = (dateRange: DateRange, locationId?: string) => {
  return useQuery({
    queryKey: ['service-performance', dateRange, locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_performance_metrics')
        .select(`
          *,
          services!inner(
            id, name, selling_price, duration, category_id,
            categories(name)
          )
        `)
        .gte('month_year', formatDateToMonth(dateRange.from))
        .lte('month_year', formatDateToMonth(dateRange.to))
        .eq('location_id', locationId || null)
        .order('revenue_generated', { ascending: false });
      
      if (error) throw error;
      return processServicePerformanceData(data);
    }
  });
};

// Service Performance Dashboard Component
export const ServicePerformanceDashboard = () => {
  const [dateRange, setDateRange] = useState(defaultDateRange);
  const [selectedLocation, setSelectedLocation] = useState<string>();
  
  const { data: serviceData, isLoading } = useServicePerformance(dateRange, selectedLocation);
  
  return (
    <ReportsLayout
      title="Service Performance Dashboard"
      subtitle="Comprehensive service analytics and optimization insights"
      filters={<ServiceFilters onDateChange={setDateRange} onLocationChange={setSelectedLocation} />}
    >
      {/* Service KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Services"
          value={serviceData?.totalServices || 0}
          trend={serviceData?.serviceGrowth}
          icon={<Scissors className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Most Popular"
          value={serviceData?.mostPopular?.name || 'N/A'}
          subtitle={`${serviceData?.mostPopular?.bookings || 0} bookings`}
          icon={<Star className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Highest Revenue"
          value={serviceData?.highestRevenue?.name || 'N/A'}
          subtitle={formatCurrency(serviceData?.highestRevenue?.revenue || 0)}
          icon={<DollarSign className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Best Rated"
          value={serviceData?.bestRated?.name || 'N/A'}
          subtitle={`${serviceData?.bestRated?.rating || 0}/5 stars`}
          icon={<Award className="h-5 w-5" />}
          loading={isLoading}
        />
      </div>

      {/* Service Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <ServiceDemandChart data={serviceData?.demandTrends} loading={isLoading} />
        <ServiceProfitabilityChart data={serviceData?.profitability} loading={isLoading} />
        <ServiceCompletionRateChart data={serviceData?.completionRates} loading={isLoading} />
        <ServiceDurationEfficiencyChart data={serviceData?.durationEfficiency} loading={isLoading} />
      </div>

      {/* Service Performance Tables */}
      <div className="space-y-8">
        <TopPerformingServicesTable services={serviceData?.topServices} loading={isLoading} />
        <ServiceOptimizationTable insights={serviceData?.optimizationInsights} loading={isLoading} />
      </div>
    </ReportsLayout>
  );
};
```

#### 3.4 Report 2: Employee Performance Dashboard

##### Employee Performance Features
1. **Employee KPI Cards**
   - Top Performer (by revenue)
   - Highest Customer Satisfaction
   - Most Productive Employee
   - Best Retention Rate

2. **Performance Analytics**
   - Individual employee performance trends
   - Productivity comparisons
   - Customer satisfaction tracking
   - Commission earnings analysis

3. **Employee Development Insights**
   - Training needs identification
   - Performance improvement areas
   - Goal setting and tracking
   - Recognition opportunities

##### Technical Implementation
```typescript
// Employee Performance Hook
export const useEmployeePerformance = (dateRange: DateRange, employeeId?: string) => {
  return useQuery({
    queryKey: ['employee-performance', dateRange, employeeId],
    queryFn: async () => {
      let query = supabase
        .from('employee_performance_metrics')
        .select(`
          *,
          employees!inner(
            id, name, email, photo_url,
            employment_types(name)
          )
        `)
        .gte('month_year', formatDateToMonth(dateRange.from))
        .lte('month_year', formatDateToMonth(dateRange.to));
      
      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }
      
      const { data, error } = await query.order('total_revenue', { ascending: false });
      
      if (error) throw error;
      return processEmployeePerformanceData(data);
    }
  });
};

// Employee Performance Component
export const EmployeePerformanceDashboard = () => {
  const [dateRange, setDateRange] = useState(defaultDateRange);
  const [selectedEmployee, setSelectedEmployee] = useState<string>();
  
  const { data: employeeData, isLoading } = useEmployeePerformance(dateRange, selectedEmployee);
  
  return (
    <ReportsLayout
      title="Employee Performance Dashboard"
      subtitle="Individual and team performance analytics"
      filters={<EmployeeFilters onDateChange={setDateRange} onEmployeeChange={setSelectedEmployee} />}
    >
      {/* Employee KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Top Performer"
          value={employeeData?.topPerformer?.name || 'N/A'}
          subtitle={formatCurrency(employeeData?.topPerformer?.revenue || 0)}
          icon={<Trophy className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Best Satisfaction"
          value={employeeData?.bestSatisfaction?.name || 'N/A'}
          subtitle={`${employeeData?.bestSatisfaction?.rating || 0}/5 stars`}
          icon={<Heart className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Most Productive"
          value={employeeData?.mostProductive?.name || 'N/A'}
          subtitle={`${employeeData?.mostProductive?.appointments || 0} appointments`}
          icon={<Zap className="h-5 w-5" />}
          loading={isLoading}
        />
        <MetricCard
          title="Best Retention"
          value={employeeData?.bestRetention?.name || 'N/A'}
          subtitle={`${employeeData?.bestRetention?.rate || 0}% retention`}
          icon={<Users className="h-5 w-5" />}
          loading={isLoading}
        />
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <EmployeeProductivityChart data={employeeData?.productivity} loading={isLoading} />
        <EmployeeSatisfactionChart data={employeeData?.satisfaction} loading={isLoading} />
        <EmployeeRevenueChart data={employeeData?.revenue} loading={isLoading} />
        <EmployeeEfficiencyChart data={employeeData?.efficiency} loading={isLoading} />
      </div>

      {/* Performance Rankings */}
      <div className="space-y-8">
        <EmployeeRankingsTable employees={employeeData?.rankings} loading={isLoading} />
        <PerformanceGoalsTable goals={employeeData?.goals} loading={isLoading} />
      </div>
    </ReportsLayout>
  );
};
```

#### 3.5 Report 3: Operational Efficiency Report

##### Operational Efficiency Features
1. **Efficiency KPI Cards**
   - Resource Utilization Rate
   - Peak Hours Efficiency
   - Average Wait Time
   - Schedule Optimization Score

2. **Capacity Analytics**
   - Capacity planning insights
   - Peak vs off-peak analysis
   - Resource allocation optimization
   - Scheduling efficiency metrics

3. **Operational Optimization**
   - Bottleneck identification
   - Process improvement suggestions
   - Equipment utilization analysis
   - Workflow optimization recommendations

##### Technical Implementation
```typescript
// Operational Efficiency Component
export const OperationalEfficiencyReport = () => {
  const { data: efficiencyData, isLoading } = useOperationalEfficiency(dateRange);
  
  return (
    <ReportsLayout title="Operational Efficiency" subtitle="Resource utilization and workflow optimization">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <CapacityUtilizationChart data={efficiencyData?.capacity} />
        <PeakHoursAnalysisChart data={efficiencyData?.peakHours} />
        <ResourceAllocationChart data={efficiencyData?.resources} />
        <ScheduleOptimizationChart data={efficiencyData?.scheduling} />
      </div>
      
      <EfficiencyInsightsTable insights={efficiencyData?.insights} />
    </ReportsLayout>
  );
};
```

#### 3.6 Report 4: Quality Assurance Dashboard

##### Quality Assurance Features
1. **Quality KPI Cards**
   - Overall Satisfaction Score
   - Service Quality Rating
   - Complaint Resolution Rate
   - Compliance Score

2. **Quality Tracking**
   - Customer satisfaction trends
   - Service quality monitoring
   - Complaint analysis and resolution
   - Training compliance tracking

3. **Quality Improvement**
   - Quality improvement action tracking
   - Training needs assessment
   - Best practices identification
   - Continuous improvement metrics

##### Technical Implementation
```typescript
// Quality Assurance Component
export const QualityAssuranceDashboard = () => {
  const { data: qualityData, isLoading } = useQualityAssurance(dateRange);
  
  return (
    <ReportsLayout title="Quality Assurance" subtitle="Service quality monitoring and improvement">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <CustomerSatisfactionChart data={qualityData?.satisfaction} />
        <ServiceQualityTrendChart data={qualityData?.quality} />
        <ComplaintAnalysisChart data={qualityData?.complaints} />
        <ComplianceScoreChart data={qualityData?.compliance} />
      </div>
      
      <QualityImprovementTable actions={qualityData?.improvements} />
    </ReportsLayout>
  );
};
```

### 3.7 Phase 3 Deliverables
- ✅ Enhanced performance tracking system with comprehensive metrics
- ✅ 4 Performance Analytics Reports (Service Performance, Employee Performance, Operational Efficiency, Quality Assurance)
- ✅ Advanced employee performance monitoring with KPIs
- ✅ Service optimization analytics with recommendations
- ✅ Operational efficiency metrics with capacity planning
- ✅ Quality assurance dashboard with continuous improvement tracking
- ✅ Performance benchmarking and goal setting system

---

## 🔮 PHASE 4: Team & Customer Analytics (Weeks 13-16)

### 🎯 Phase 4 Objectives
- Implement 6 Team & Customer reports (Reports 13-18) with advanced modern design patterns
- Create comprehensive staff productivity tracking with mobile-first interfaces
- Deploy advanced customer segmentation with modern marketing tools
- Develop customer retention analytics with interactive mobile dashboards
- **NEW**: Advanced Features Integration - implement modern UI patterns
- **NEW**: Build Validation Strategy - comprehensive validation suite for production readiness

### 🚀 Modern Advanced Features Integration for Phase 4

#### Advanced Mobile Interface Patterns
**Based on Modern Premium Feature Analysis:**

1. **Advanced Staff Performance Interface**
   ```typescript
   // StaffPerformanceGrid.tsx - Advanced staff analytics
   const StaffPerformanceGrid = () => (
     <div className="p-4 space-y-6">
       {/* Performance ranking cards */}
       <div className="space-y-3">
         {staff.map((employee, index) => (
           <StaffRankingCard
             key={employee.id}
             rank={index + 1}
             employee={employee}
             metrics={employee.metrics}
             onDetailView={() => openStaffDetail(employee.id)}
           />
         ))}
       </div>
       
       {/* Team comparison chart */}
       <div className="bg-white rounded-lg border border-gray-200 p-4">
         <h3 className="text-lg font-semibold mb-4">Team Performance</h3>
         <ResponsiveTeamChart data={teamData} />
       </div>
     </div>
   );
   ```

2. **Customer Segmentation Marketing Interface**
   ```typescript
   // CustomerSegmentationTool.tsx - Marketing campaign builder
   const CustomerSegmentationTool = () => (
     <div className="flex flex-col h-screen bg-gray-50">
       <MobileHeader title="Customer Segments" />
       
       {/* Segment builder */}
       <div className="flex-1 p-4 space-y-4">
         {/* Quick segment filters */}
         <div className="bg-white rounded-lg border border-gray-200 p-4">
           <h3 className="font-semibold mb-3">Quick Segments</h3>
           <div className="grid grid-cols-2 gap-3">
             <SegmentCard
               title="High Value"
               count={125}
               description="Customers with $500+ LTV"
               color="green"
               onClick={() => selectSegment('high-value')}
             />
             <SegmentCard
               title="At Risk"
               count={67}
               description="No visit in 60+ days"
               color="red"
               onClick={() => selectSegment('at-risk')}
             />
           </div>
         </div>
         
         {/* Marketing campaign actions */}
         <MarketingActionPanel
           selectedSegment={selectedSegment}
           onCampaignCreate={handleCampaignCreate}
         />
       </div>
     </div>
   );
   ```

3. **Advanced Analytics Dashboard**
   ```typescript
   // AdvancedAnalytics.tsx - Premium analytics interface
   const AdvancedAnalytics = () => (
     <div className="min-h-screen bg-gray-50">
       {/* Advanced metrics header */}
       <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
         <h1 className="text-2xl font-bold">Advanced Analytics</h1>
         <p className="text-blue-100 mt-1">AI-powered business insights</p>
       </div>
       
       {/* Prediction cards */}
       <div className="p-4 space-y-4">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <PredictionCard
             title="Revenue Forecast"
             prediction={`$${nextMonthRevenue}`}
             confidence={94}
             trend="up"
           />
           <PredictionCard
             title="Customer Churn Risk"
             prediction={`${churnRisk}%`}
             confidence={87}
             trend="down"
           />
         </div>
         
         {/* AI insights panel */}
         <AIInsightsPanel insights={aiInsights} />
       </div>
     </div>
   );
   ```

### ⚡ Advanced Build Validation Strategy

#### 4.1 Production-Ready Validation Suite
```bash
# Comprehensive validation for Phase 4 production readiness
npm run build && npm run type-check && npm run lint && npm run test && npm run e2e

# Advanced validation gates:
# ✅ Component creation → Build validation
# ✅ Advanced feature integration → Full test suite
# ✅ AI/ML feature integration → Performance validation
# ✅ Marketing tool integration → Security validation
# ✅ Mobile responsiveness → Cross-device testing
# ✅ Production deployment → Full validation + security audit
```

#### 4.2 Performance & Security Validation
```typescript
// Advanced validation checks for Phase 4
const validationChecks = {
  performance: [
    'Bundle size analysis (< 500KB gzipped)',
    'Lighthouse performance score > 90',
    'Core Web Vitals compliance',
    'Mobile performance optimization'
  ],
  security: [
    'Customer data encryption validation',
    'API security testing',
    'Authentication flow testing',
    'Data privacy compliance (GDPR/CCPA)'
  ],
  accessibility: [
    'WCAG 2.1 AA compliance',
    'Screen reader compatibility',
    'Keyboard navigation testing',
    'Color contrast validation'
  ]
};
```

### 📊 Phase 4 Reports (6 Reports - Team & Customer Categories)

#### **TEAM & STAFF (3 Reports)**

#### Report 13: Staff Performance & Productivity *(Advanced AI-Powered Analytics)*
**Components**: `StaffPerformanceProductivity.tsx`, `StaffPerformanceGrid.tsx`, `AIPerformanceInsights.tsx`
**Purpose**: AI-enhanced staff performance with modern advanced interface patterns
**Key Features**:
- Individual staff performance with AI-powered ranking algorithms
- Service completion rates with predictive performance modeling
- Punctuality scores with automated improvement suggestions
- Team productivity with cross-performance benchmarking and gamification
- Advanced mobile interface with swipe-to-compare staff metrics
- **Build Validation**: npm run build + performance testing after AI integration

**AI-Enhanced Interface Pattern**:
```typescript
const StaffPerformanceProductivity = () => {
  const { data: staffData, aiInsights } = useAIStaffAnalytics();
  
  return (
    <div className="min-h-screen bg-gray-50">      <MobileHeader title="Staff Performance" />
      
      {/* AI insights banner */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 m-4 rounded-lg">
        <h3 className="font-semibold">AI Insights</h3>
        <p className="text-sm text-purple-100 mt-1">{aiInsights?.topInsight}</p>
      </div>
      
      {/* Performance leaderboard */}
      <StaffPerformanceGrid
        staff={staffData?.rankings}
        onStaffSelect={handleStaffDetail}
      />
      
      {/* Team performance predictions */}
      <AIPerformanceInsights predictions={aiInsights?.predictions} />
    </div>
  );
};
```

#### Report 14: Employee Schedule & Availability *(Smart Scheduling Interface)*
**Components**: `EmployeeScheduleAvailability.tsx`, `SmartScheduler.tsx`, `AvailabilityOptimizer.tsx`
**Purpose**: Smart scheduling with modern drag-and-drop mobile interface
**Key Features**:
- Scheduled vs worked hours with intelligent shift optimization
- Availability rate tracking with predictive scheduling suggestions
- Break compliance with automated compliance monitoring
- Location assignment with efficiency-based recommendations
- Mobile drag-and-drop scheduling interface
- **Build Validation**: npm run build + UX testing after smart scheduling integration

**Smart Scheduling Pattern**:
```typescript
const EmployeeScheduleAvailability = () => (
  <div className="flex flex-col h-screen">
    <MobileHeader title="Smart Scheduler" />
    
    {/* Week view with drag-and-drop */}
    <SmartScheduler
      employees={employees}
      schedule={currentSchedule}
      onScheduleChange={handleScheduleUpdate}
      optimizationSuggestions={aiSuggestions}
    />
    
    {/* Optimization panel */}
    <AvailabilityOptimizer
      currentUtilization={utilizationData}
      suggestions={optimizationSuggestions}
    />
  </div>
);
```

#### Report 15: Skills & Service Specialization *(Skill Matrix Dashboard)*
**Components**: `SkillsServiceSpecialization.tsx`, `SkillMatrix.tsx`, `SpecializationRecommendations.tsx`
**Purpose**: Advanced skills tracking with certification management interface
**Key Features**:
- Service specialization with visual skill matrix display
- Certification status with mobile training progress tracking
- Skill-based revenue with ROI analysis for training investments
- Customer preference alignment with automated skill-service matching
- Mobile-friendly skill development recommendations
- **Build Validation**: npm run build + skills validation system testing

#### **CUSTOMERS & CLIENTS (3 Reports)**

#### Report 16: Customer Profile & Segmentation ⭐ *(PRIMARY MARKETING BLAST REPORT)*
**Components**: `CustomerProfileSegmentation.tsx`, `CustomerSegmentationTool.tsx`, `MarketingCampaignBuilder.tsx`  
**Purpose**: Advanced customer segmentation with integrated marketing campaign builder
**Key Features**:
- AI-powered customer segmentation by demographics, behavior, and predictive value
- Lifetime value calculation with future revenue predictions
- Loyalty points tracking with gamification elements
- **Marketing campaign targeting** with advanced mobile filter system
- Birth month campaigns with automated email/SMS integration
- Win-back strategies with personalized offer recommendations
- **Build Validation**: npm run build + marketing integration testing + security validation

**Marketing Campaign Builder Interface**:
```typescript
const CustomerProfileSegmentation = () => {
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [campaignBuilder, setCampaignBuilder] = useState(false);
  
  return (    <div className="min-h-screen bg-gray-50">
      <MobileHeader title="Customer Segments" />
      
      {/* Segment visualization */}
      <div className="p-4 space-y-4">
        <CustomerSegmentationTool
          segments={customerSegments}
          onSegmentSelect={setSelectedSegment}
        />
        
        {/* Marketing actions */}
        {selectedSegment && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold mb-3">Marketing Actions</h3>
            <div className="space-y-2">
              <button
                className="w-full text-left p-3 bg-blue-50 text-blue-700 rounded-lg"
                onClick={() => setCampaignBuilder(true)}
              >
                📧 Create Email Campaign ({selectedSegment.count} customers)
              </button>
              <button className="w-full text-left p-3 bg-green-50 text-green-700 rounded-lg">
                💳 Send Loyalty Offer
              </button>
              <button className="w-full text-left p-3 bg-purple-50 text-purple-700 rounded-lg">
                🎂 Birthday Campaign Setup
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Campaign builder modal */}
      {campaignBuilder && (
        <MarketingCampaignBuilder
          segment={selectedSegment}
          onClose={() => setCampaignBuilder(false)}
          onCampaignCreate={handleCampaignCreate}
        />
      )}
    </div>
  );
};
```

#### Report 17: Customer Retention & Loyalty *(Gamified Loyalty Interface)*
**Components**: `CustomerRetentionLoyalty.tsx`, `LoyaltyDashboard.tsx`, `RetentionGameification.tsx`
**Purpose**: Gamified customer loyalty with advanced retention predictions
**Key Features**:
- Retention rate analysis with AI-powered churn prediction
- Loyalty points balance with gamified progression system
- Loyalty tier progression with achievement unlocking interface
- Retention challenges with staff engagement tools
- Mobile-friendly loyalty program management
- **Build Validation**: npm run build + gamification testing + loyalty system validation

**Gamified Loyalty Pattern**:
```typescript
const CustomerRetentionLoyalty = () => (
  <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
    <MobileHeader title="Customer Loyalty" />
    
    {/* Loyalty program overview */}
    <div className="p-4 space-y-4">
      <LoyaltyDashboard
        totalMembers={loyaltyData?.totalMembers}
        activeMembers={loyaltyData?.activeMembers}
        pointsIssued={loyaltyData?.pointsIssued}
        redemptionRate={loyaltyData?.redemptionRate}
      />
      
      {/* Gamification elements */}
      <RetentionGameification
        achievements={achievements}
        leaderboard={customerLeaderboard}
        challenges={activeChallenges}
      />
      
      {/* Churn risk alerts */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-semibold">Churn Risk Alerts</h3>
        <div className="mt-2 space-y-2">
          {churnRiskCustomers.map(customer => (            <ChurnRiskCard
              key={customer.id}
              customer={customer}
              riskScore={customer.churnRisk}
              onActionTaken={handleRetentionAction}
            />
          ))}
        </div>
      </div>
    </div>
  </div>
);
```

#### Report 18: Customer Journey & Lifecycle *(Journey Mapping Interface)*
**Components**: `CustomerJourneyLifecycle.tsx`, `JourneyMap.tsx`, `LifecycleStageAnalytics.tsx`
**Purpose**: Visual customer journey mapping with lifecycle stage optimization
**Key Features**:
- Customer journey visualization with interactive timeline interface
- Lifecycle stage progression with automated stage transitions
- Touchpoint analysis with mobile-optimized interaction tracking
- Journey optimization with AI-powered improvement suggestions
- Customer experience scoring with sentiment analysis integration
- **Build Validation**: npm run build + journey tracking validation + UX testing

**Journey Mapping Interface**:
```typescript
const CustomerJourneyLifecycle = () => {
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  return (
    <div className="min-h-screen bg-gray-50">      <MobileHeader title="Customer Journey" />
      
      {/* Customer search and selection */}
      <div className="p-4">
        <CustomerSearch
          onCustomerSelect={setSelectedCustomer}
          placeholder="Search customer to view journey..."
        />
      </div>
      
      {/* Journey visualization */}
      {selectedCustomer && (
        <div className="p-4 space-y-4">
          <JourneyMap
            customer={selectedCustomer}
            journeyStages={journeyData?.stages}
            touchpoints={journeyData?.touchpoints}
            onStageAnalysis={handleStageAnalysis}
          />
          
          <LifecycleStageAnalytics
            currentStage={selectedCustomer.lifecycleStage}
            stageMetrics={lifecycleMetrics}
            optimization={optimizationSuggestions}
          />
        </div>
      )}
    </div>
  );
};
```

### 🚀 Advanced Features Integration

#### AI/ML Powered Features
1. **Predictive Analytics Engine**
   - Customer churn prediction with 90%+ accuracy
   - Revenue forecasting with seasonal adjustments
   - Staff performance optimization suggestions
   - Appointment demand prediction for capacity planning

2. **Automated Marketing Intelligence**
   - Dynamic customer segmentation with behavior analysis
   - Personalized offer recommendations
   - Optimal marketing timing suggestions
   - Campaign performance optimization

3. **Business Intelligence Automation**
   - Automated anomaly detection in KPIs
   - Performance alerts and recommendations
   - Trend analysis with business impact assessment
   - Resource optimization suggestions

#### Production-Ready Mobile Interface
1. **Progressive Web App (PWA) Features**
   - Offline functionality for critical reports
   - Push notifications for important alerts
   - App-like installation on mobile devices
   - Background data synchronization

2. **Advanced UX Patterns**
   - Gesture-based navigation (swipe, pinch, pull-to-refresh)
   - Voice search capabilities for reports
   - Dark mode support with system preference detection
   - Accessibility compliance (WCAG 2.1 AA)

3. **Performance Optimization**
   - Lazy loading for large datasets
   - Virtual scrolling for long lists
   - Image optimization and caching
   - Service worker implementation for caching
- Engagement score calculation and points expiration alerts

#### Report 18: Customer Discount & Coupon Usage
**Components**: `CustomerDiscountCouponUsage.tsx`
**Purpose**: Customer discount behavior and coupon effectiveness analysis
**Key Features**:
- Individual customer discount usage patterns
- Coupon code preference and manual discount tracking
- Discount frequency and percentage of total spend analysis
- Loyalty points redemption value vs discount preferences
- Customer price sensitivity and promotional responsiveness

### 🗄️ Advanced Analytics Database Schema

#### 4.1 Predictive Analytics System
```sql
-- Predictive analytics core table
CREATE TABLE predictive_analytics (
    id SERIAL PRIMARY KEY,
    prediction_type TEXT NOT NULL CHECK (prediction_type IN ('revenue', 'churn', 'demand', 'growth', 'seasonality')),
    location_id UUID REFERENCES locations(id),
    prediction_date DATE NOT NULL,
    predicted_value DECIMAL(12,2),
    confidence_score DECIMAL(5,2) DEFAULT 0.00,
    actual_value DECIMAL(12,2),
    accuracy_rate DECIMAL(5,2),
    model_version TEXT DEFAULT '1.0',
    prediction_horizon INTEGER DEFAULT 30, -- days ahead
    input_features JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer churn prediction system
CREATE TABLE customer_churn_predictions (
    id SERIAL PRIMARY KEY,
    customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    churn_probability DECIMAL(5,2) DEFAULT 0.00,
    risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    risk_factors JSONB DEFAULT '{}',
    recommended_actions TEXT[] DEFAULT '{}',
    intervention_taken BOOLEAN DEFAULT FALSE,
    intervention_type TEXT,
    intervention_date TIMESTAMP WITH TIME ZONE,
    prediction_date DATE DEFAULT CURRENT_DATE,
    last_appointment_date TIMESTAMP WITH TIME ZONE,
    days_since_last_visit INTEGER,
    avg_visit_frequency DECIMAL(5,2),
    lifetime_value DECIMAL(12,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer behavior tracking
CREATE TABLE customer_behavior_analytics (
    id SERIAL PRIMARY KEY,
    customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    behavior_type TEXT NOT NULL CHECK (behavior_type IN ('booking', 'cancellation', 'rescheduling', 'payment', 'loyalty', 'referral')),
    behavior_data JSONB DEFAULT '{}',
    behavior_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_id TEXT,
    channel TEXT CHECK (channel IN ('web', 'mobile', 'phone', 'walk-in')),
    device_type TEXT,
    location_id UUID REFERENCES locations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Market analysis data
CREATE TABLE market_analytics (
    id SERIAL PRIMARY KEY,
    analysis_date DATE DEFAULT CURRENT_DATE,
    location_id UUID REFERENCES locations(id),
    competitor_count INTEGER DEFAULT 0,
    market_share_percentage DECIMAL(5,2) DEFAULT 0.00,
    service_demand_index DECIMAL(8,2) DEFAULT 0.00,
    pricing_competitive_index DECIMAL(5,2) DEFAULT 0.00,
    customer_satisfaction_index DECIMAL(5,2) DEFAULT 0.00,
    market_trends JSONB DEFAULT '{}',
    growth_opportunities JSONB DEFAULT '{}',
    threat_analysis JSONB DEFAULT '{}',
    recommendations TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom report definitions
CREATE TABLE custom_reports (
    id SERIAL PRIMARY KEY,
    report_name TEXT NOT NULL,
    created_by UUID REFERENCES profiles(id),
    report_config JSONB NOT NULL DEFAULT '{}',
    filters JSONB DEFAULT '{}',
    visualization_config JSONB DEFAULT '{}',
    schedule_config JSONB DEFAULT '{}',
    is_scheduled BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    access_level TEXT DEFAULT 'private' CHECK (access_level IN ('private', 'shared', 'public')),
    shared_with UUID[],
    last_run TIMESTAMP WITH TIME ZONE,
    run_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 4.2 Performance Indexes for Advanced Analytics
```sql
-- Predictive analytics indexes
CREATE INDEX idx_predictive_analytics_type_date ON predictive_analytics(prediction_type, prediction_date);
CREATE INDEX idx_predictive_analytics_location ON predictive_analytics(location_id);
CREATE INDEX idx_churn_predictions_customer ON customer_churn_predictions(customer_id);
CREATE INDEX idx_churn_predictions_risk ON customer_churn_predictions(risk_level, churn_probability DESC);

-- Behavior analytics indexes
CREATE INDEX idx_customer_behavior_customer ON customer_behavior_analytics(customer_id);
CREATE INDEX idx_customer_behavior_type ON customer_behavior_analytics(behavior_type);
CREATE INDEX idx_customer_behavior_timestamp ON customer_behavior_analytics(behavior_timestamp DESC);

-- Market analytics indexes
CREATE INDEX idx_market_analytics_date ON market_analytics(analysis_date DESC);
CREATE INDEX idx_market_analytics_location ON market_analytics(location_id);
```

### 🎨 Advanced Analytics UI Components

#### 4.3 Predictive Analytics Dashboard Interface
```typescript
interface PredictiveAnalyticsData {
  revenueForecasting: {
    predicted: number;
    confidence: number;
    trend: 'up' | 'down' | 'stable';
    scenarios: {
      optimistic: number;
      realistic: number;
      pessimistic: number;
    };
  }[];
  churnPredictions: {
    totalAtRisk: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
    interventionSuccess: number;
  };
  demandForecasting: {
    serviceId: string;
    serviceName: string;
    predictedDemand: number;
    actualDemand?: number;
    accuracy?: number;
  }[];
  seasonalityAnalysis: {
    month: string;
    predictedMultiplier: number;
    historicalMultiplier: number;
  }[];
}

interface ChurnPredictionData {
  customerId: string;
  customerName: string;
  churnProbability: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: string[];
  recommendedActions: string[];
  lastVisit: string;
  daysSinceLastVisit: number;
  lifetimeValue: number;
}
```

#### 4.4 Customer Behavior Analytics Interface
```typescript
interface CustomerBehaviorData {
  journeyMapping: {
    stage: string;
    customers: number;
    conversionRate: number;
    dropoffRate: number;
    averageTime: number;
  }[];
  behaviorPatterns: {
    pattern: string;
    frequency: number;
    impact: 'positive' | 'negative' | 'neutral';
    customers: number;
  }[];
  preferenceAnalysis: {
    servicePreferences: {
      serviceId: string;
      serviceName: string;
      preference: number;
      growth: number;
    }[];
    timePreferences: {
      hour: number;
      bookingCount: number;
      satisfaction: number;
    }[];
    channelPreferences: {
      channel: string;
      usage: number;
      satisfaction: number;
    }[];
  };
}
```

### 📊 Phase 4 Reports Implementation

#### Report 9: Predictive Analytics Dashboard
```typescript
const usePredictiveAnalytics = () => {
  const [data, setData] = useState<PredictiveAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');

  const fetchPredictiveData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/analytics/predictive?range=${dateRange}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching predictive analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchPredictiveData();
  }, [fetchPredictiveData]);

  return { data, loading, refetch: fetchPredictiveData };
};

// Component structure
const PredictiveAnalyticsDashboard = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
      <RevenueForecastingCard />
      <ChurnPredictionCard />
      <DemandForecastCard />
      <SeasonalityCard />
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <PredictionAccuracyChart />
      <ScenarioModelingTool />
    </div>
  </div>
);
```

#### Report 10: Customer Behavior Analytics
```typescript
const useCustomerBehavior = () => {
  const [data, setData] = useState<CustomerBehaviorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    dateRange: '30d',
    segment: 'all',
    channel: 'all'
  });

  // Similar implementation pattern as above
};

const CustomerBehaviorAnalytics = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <JourneyMappingCard />
      <BehaviorPatternsCard />
      <PreferenceAnalysisCard />
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <BehaviorHeatmap />
      <PersonalizationInsights />
    </div>
  </div>
);
```

#### Report 11: Market Analysis Report
```typescript
interface MarketAnalysisData {
  marketOverview: {
    totalMarketSize: number;
    ourMarketShare: number;
    competitorCount: number;
    growthRate: number;
  };
  competitiveAnalysis: {
    competitor: string;
    marketShare: number;
    strengths: string[];
    weaknesses: string[];
    pricingStrategy: string;
  }[];
  opportunities: {
    opportunity: string;
    potential: number;
    effort: 'low' | 'medium' | 'high';
    timeline: string;
  }[];
  threats: {
    threat: string;
    impact: 'low' | 'medium' | 'high';
    likelihood: number;
    mitigation: string[];
  }[];
}

const MarketAnalysisReport = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
      <MarketSizeCard />
      <MarketShareCard />
      <CompetitorCountCard />
      <GrowthRateCard />
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <CompetitiveAnalysisTable />
      <OpportunityMatrix />
    </div>
    <ThreatAnalysisSection />
  </div>
);
```

#### Report 12: Business Intelligence Summary
```typescript
interface ExecutiveKPIData {
  financialHealth: {
    revenue: number;
    growth: number;
    profitMargin: number;
    cashFlow: number;
  };
  operationalHealth: {
    efficiency: number;
    utilization: number;
    satisfaction: number;
    retention: number;
  };
  strategicMetrics: {
    marketPosition: number;
    brandStrength: number;
    innovation: number;
    sustainability: number;
  };
  riskAssessment: {
    financial: 'low' | 'medium' | 'high';
    operational: 'low' | 'medium' | 'high';
    strategic: 'low' | 'medium' | 'high';
    overall: 'low' | 'medium' | 'high';
  };
}

const BusinessIntelligenceSummary = () => (
  <div className="space-y-6">
    <ExecutiveOverviewSection />
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      <FinancialHealthCard />
      <OperationalHealthCard />
      <StrategicMetricsCard />
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <PerformanceScorecardTable />
      <RiskAssessmentMatrix />
    </div>
  </div>
);
```

#### Report 13: Custom Report Builder
```typescript
interface CustomReportConfig {
  name: string;
  dataSource: string[];
  metrics: string[];
  dimensions: string[];
  filters: Record<string, any>;
  visualization: {
    type: 'table' | 'chart' | 'card' | 'heatmap';
    config: Record<string, any>;
  };
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
    format: 'pdf' | 'excel' | 'csv';
  };
}

const CustomReportBuilder = () => (
  <div className="flex h-full">
    <div className="w-80 border-r bg-gray-50 p-4">
      <ReportConfigSidebar />
    </div>
    <div className="flex-1 flex flex-col">
      <div className="border-b p-4">
        <ReportHeader />
      </div>
      <div className="flex-1 p-6">
        <ReportCanvas />
      </div>
    </div>
  </div>
);
```

### 🚀 Advanced Features Implementation

#### 4.5 Machine Learning Integration
```typescript
// Predictive model service
class PredictiveAnalyticsService {
  async generateRevenueForecasting(locationId: string, horizon: number) {
    // Implement ML-based revenue forecasting
    const historicalData = await this.getHistoricalRevenue(locationId);
    const seasonalityFactors = await this.getSeasonalityFactors(locationId);
    
    return this.mlEngine.predict({
      model: 'revenue_forecasting',
      data: { historical: historicalData, seasonal: seasonalityFactors },
      horizon
    });
  }

  async calculateChurnProbability(customerId: string) {
    // Implement customer churn prediction
    const customerFeatures = await this.getCustomerFeatures(customerId);
    
    return this.mlEngine.predict({
      model: 'churn_prediction',
      data: customerFeatures
    });
  }
}
```

#### 4.6 Real-time Analytics Engine
```typescript
// Real-time data processing
class RealTimeAnalyticsEngine {
  private eventStream: EventStream;
  
  constructor() {
    this.eventStream = new EventStream();
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.eventStream.on('appointment_booked', this.updateDemandForecasting);
    this.eventStream.on('customer_behavior', this.updateBehaviorAnalytics);
    this.eventStream.on('payment_completed', this.updateRevenueMetrics);
  }

  async updateDemandForecasting(event: AppointmentEvent) {
    // Update demand forecasting in real-time
  }

  async updateBehaviorAnalytics(event: BehaviorEvent) {
    // Update customer behavior analytics
  }
}
```

### ⚡ Performance Optimization

#### 4.7 Advanced Caching Strategy
```sql
-- Create materialized views for complex analytics
CREATE MATERIALIZED VIEW mv_customer_lifetime_analytics AS
SELECT 
  p.id as customer_id,
  p.name,
  COUNT(a.id) as total_appointments,
  SUM(CASE WHEN a.status = 'completed' THEN a.total_amount ELSE 0 END) as lifetime_value,
  AVG(CASE WHEN a.status = 'completed' THEN a.total_amount ELSE NULL END) as avg_appointment_value,
  MAX(a.appointment_date) as last_appointment,
  MIN(a.appointment_date) as first_appointment,
  DATE_PART('day', NOW() - MAX(a.appointment_date)) as days_since_last_visit
FROM profiles p
LEFT JOIN appointments a ON p.id = a.customer_id
GROUP BY p.id, p.name;

-- Refresh strategy
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_customer_lifetime_analytics;
  -- Refresh other materialized views
END;
$$ LANGUAGE plpgsql;
```

### 📱 Mobile-First Advanced Analytics

#### 4.8 Mobile Analytics Components
```typescript
// Mobile-optimized predictive dashboard
const MobilePredictiveDashboard = () => (
  <div className="space-y-4 p-4">
    <div className="grid grid-cols-2 gap-4">
      <CompactKPICard title="Revenue Forecast" />
      <CompactKPICard title="Churn Risk" />
    </div>
    <SwipeableAnalyticsCards />
    <MobileChartContainer />
  </div>
);

// Touch-optimized report builder
const MobileReportBuilder = () => (
  <div className="h-full flex flex-col">
    <MobileToolbar />
    <div className="flex-1 overflow-auto">
      <DragDropProvider>
        <MobileCanvasArea />
      </DragDropProvider>
    </div>
  </div>
);
```

### 🔄 Automated Insights Generation

#### 4.9 AI-Powered Insights Engine
```typescript
class InsightsEngine {
  async generateAutomatedInsights(reportType: string, data: any) {
    const insights = [];
    
    // Revenue insights
    if (reportType === 'revenue') {
      insights.push(...this.analyzeRevenuePatterns(data));
    }
    
    // Customer insights
    if (reportType === 'customer') {
      insights.push(...this.analyzeCustomerBehavior(data));
    }
    
    // Performance insights
    if (reportType === 'performance') {
      insights.push(...this.analyzePerformanceMetrics(data));
    }
    
    return this.prioritizeInsights(insights);
  }

  private analyzeRevenuePatterns(data: any) {
    // AI-powered revenue pattern analysis
    return [
      {
        type: 'trend',
        severity: 'high',
        message: 'Revenue growth accelerating by 15% this month',
        recommendation: 'Consider expanding service offerings'
      }
    ];
  }
}
```

### ✅ Phase 4 Deliverables

#### 📊 Advanced Team & Customer Analytics Reports (6 Reports)
- ✅ **Staff Performance & Productivity** - AI-powered staff analytics with mobile performance interface
- ✅ **Employee Schedule & Availability** - Smart scheduling with drag-and-drop mobile optimization
- ✅ **Skills & Service Specialization** - Skill matrix dashboard with certification tracking
- ✅ **Customer Profile & Segmentation** ⭐ - Advanced marketing campaign builder with AI segmentation
- ✅ **Customer Retention & Loyalty** - Gamified loyalty interface with churn prediction
- ✅ **Customer Journey & Lifecycle** - Interactive journey mapping with lifecycle optimization

#### 🔧 Advanced Technical Infrastructure
- ✅ **AI/ML Integration**: Predictive analytics engine with 90%+ accuracy
- ✅ **Advanced Modern UI Components**: 15+ production-ready mobile components
- ✅ **Progressive Web App**: Offline functionality, push notifications, PWA installation
- ✅ **Marketing Automation**: Integrated campaign builder with customer segmentation
- ✅ **Performance Optimization**: Virtual scrolling, lazy loading, service workers
- ✅ **Accessibility Compliance**: WCAG 2.1 AA standards with screen reader support

#### 🚀 Advanced Features Implementation
- ✅ **Predictive Customer Analytics**: Churn prediction with intervention recommendations
- ✅ **AI-Powered Staff Optimization**: Performance predictions with improvement suggestions
- ✅ **Advanced Marketing Tools**: Dynamic segmentation with automated campaign triggers
- ✅ **Gamified Loyalty System**: Achievement unlocking with customer engagement tracking
- ✅ **Smart Scheduling Algorithm**: AI-optimized staff scheduling with efficiency maximization
- ✅ **Journey Mapping Interface**: Visual customer journey with touchpoint optimization

#### 📱 Production-Ready Mobile Experience
- ✅ **Modern Design System**: Complete component library with mobile-first patterns
- ✅ **Advanced Gesture Support**: Swipe navigation, pinch-to-zoom, pull-to-refresh
- ✅ **Voice Search Integration**: Natural language query support for reports
- ✅ **Dark Mode Support**: System preference detection with smooth transitions
- ✅ **Offline Functionality**: Critical data access without internet connection
- ✅ **Performance Metrics**: Sub-3-second loading, 90+ Lighthouse scores

#### 🔐 Security & Compliance
- ✅ **Data Privacy**: GDPR/CCPA compliance with customer data protection
- ✅ **Security Validation**: API security testing and authentication flow validation
- ✅ **Access Control**: Role-based permissions with granular report access
- ✅ **Audit Trail**: Comprehensive logging for all user actions and data changes

---

## 🔍 Final Verification & Report Count

### 📊 Complete Report Count Verification (EXACTLY 18 REPORTS)

#### **Phase 1: Foundation (1 Report)**
1. ✅ **Customer Profile & Segmentation Dashboard** - Foundation report with demographics, behavior, lifecycle analysis

#### **Phase 2: Sales & Revenue Analytics (5 Reports)**
2. ✅ **Sales Performance Dashboard** - Comprehensive sales overview with revenue trends
3. ✅ **Sales List & Transactions** - Detailed transaction-level sales data  
4. ✅ **Discount & Coupon Performance Analysis** - Coupon effectiveness analysis
5. ✅ **Gift Card Performance** - Gift card sales, redemption, and performance tracking
6. ✅ **Membership Sales Analysis** - Membership program performance and retention

#### **Phase 3: Finance & Appointments Analytics (7 Reports)**
**FINANCE & PAYMENTS (4 Reports)**
7. ✅ **Finance Summary** - Comprehensive financial overview with mobile-first design
8. ✅ **Payment Methods Analysis** - Payment method performance with touch-optimized interface
9. ✅ **Cash Flow Management** - Real-time cash flow tracking with mobile dashboard
10. ✅ **Tax & Compliance Report** - Tax collection monitoring with compliance interface

**APPOINTMENTS & BOOKINGS (3 Reports)**
11. ✅ **Appointments Summary** - Appointment performance with modern calendar integration
12. ✅ **Appointment Analytics** - Detailed appointment-level analytics with mobile drill-down
13. ✅ **Cancellation & No-Show Analysis** - Cancellation pattern analysis with prevention interface

#### **Phase 4: Team & Customer Analytics (6 Reports)**
**TEAM & STAFF (3 Reports)**
14. ✅ **Staff Performance & Productivity** - AI-enhanced staff performance with mobile interface
15. ✅ **Employee Schedule & Availability** - Smart scheduling with drag-and-drop mobile optimization
16. ✅ **Skills & Service Specialization** - Skill matrix dashboard with certification tracking

**CUSTOMERS & CLIENTS (3 Reports)**
17. ✅ **Customer Profile & Segmentation** ⭐ - Advanced marketing campaign builder (PRIMARY MARKETING REPORT)
18. ✅ **Customer Retention & Loyalty** - Gamified loyalty interface with churn prediction
19. ✅ **Customer Journey & Lifecycle** - Interactive journey mapping with lifecycle optimization

### 🚨 REPORT COUNT CORRECTION NEEDED

**ISSUE IDENTIFIED**: We currently have 19 reports instead of 18!

**RESOLUTION**: Merge Report 1 (Customer Profile & Segmentation Dashboard) with Report 17 (Customer Profile & Segmentation) since they serve similar purposes.

**CORRECTED FINAL COUNT (18 REPORTS)**:

#### **Phase 1: Foundation (1 Report)**
1. ✅ **Business Overview Dashboard** - Foundation report with key business metrics

#### **Phase 2: Sales & Revenue Analytics (5 Reports)**
2. ✅ **Sales Performance Dashboard** - Comprehensive sales overview with revenue trends
3. ✅ **Sales List & Transactions** - Detailed transaction-level sales data  
4. ✅ **Discount & Coupon Performance Analysis** - Coupon effectiveness analysis
5. ✅ **Gift Card Performance** - Gift card sales, redemption, and performance tracking
6. ✅ **Membership Sales Analysis** - Membership program performance and retention

#### **Phase 3: Finance & Appointments Analytics (7 Reports)**
**FINANCE & PAYMENTS (4 Reports)**
7. ✅ **Finance Summary** - Comprehensive financial overview
8. ✅ **Payment Methods Analysis** - Payment method performance
9. ✅ **Cash Flow Management** - Real-time cash flow tracking
10. ✅ **Tax & Compliance Report** - Tax collection monitoring

**APPOINTMENTS & BOOKINGS (3 Reports)**
11. ✅ **Appointments Summary** - Appointment performance with calendar integration
12. ✅ **Appointment Analytics** - Detailed appointment-level analytics
13. ✅ **Cancellation & No-Show Analysis** - Cancellation pattern analysis

#### **Phase 4: Team & Customer Analytics (6 Reports)**
**TEAM & STAFF (3 Reports)**
14. ✅ **Staff Performance & Productivity** - AI-enhanced staff performance
15. ✅ **Employee Schedule & Availability** - Smart scheduling optimization
16. ✅ **Skills & Service Specialization** - Skill matrix dashboard

**CUSTOMERS & CLIENTS (3 Reports)**
17. ✅ **Customer Profile & Segmentation** ⭐ - Advanced marketing campaign builder (PRIMARY MARKETING REPORT)
18. ✅ **Customer Retention & Loyalty** - Gamified loyalty interface with churn prediction
**BONUS**: **Customer Journey & Lifecycle** - Available as Phase 5 expansion or advanced feature

### 🎯 FINAL CONFIRMED STRUCTURE: 18 REPORTS TOTAL

**✅ Phase 1**: 1 Foundation Report  
**✅ Phase 2**: 5 Sales & Revenue Reports + Modern UI Integration  
**✅ Phase 3**: 7 Finance & Appointments Reports + Mobile Responsiveness  
**✅ Phase 4**: 6 Team & Customer Reports + Advanced Features  

**🏆 TOTAL: 18 COMPREHENSIVE BUSINESS INTELLIGENCE REPORTS**
2. ✅ **Revenue Dashboard** - Revenue tracking, growth analysis, trends
3. ✅ **Financial Performance Report** - P&L, margins, profitability analysis  
4. ✅ **Payment Analytics Dashboard** - Payment methods, processing, optimization

#### **Phase 3: Performance Analytics (4 Reports)**
5. ✅ **Service Performance Dashboard** - Service metrics, popularity, optimization
6. ✅ **Employee Performance Dashboard** - Staff metrics, productivity, KPIs
7. ✅ **Operational Efficiency Report** - Capacity, utilization, workflow optimization
8. ✅ **Quality Assurance Dashboard** - Service quality, customer satisfaction, improvement

#### **Phase 4: Advanced Intelligence (5 Reports)**
9. ✅ **Predictive Analytics Dashboard** - ML forecasting, churn prediction, demand analysis
10. ✅ **Customer Behavior Analytics** - Journey mapping, behavior patterns, personalization
11. ✅ **Market Analysis Report** - Competitive intelligence, market trends, opportunities
12. ✅ **Business Intelligence Summary** - Executive KPIs, strategic metrics, risk assessment
13. ✅ **Custom Report Builder** - Flexible reporting, scheduled reports, drag-and-drop interface

### 🎯 **FINAL COUNT: 13 COMPREHENSIVE REPORTS** ✅

### 🛠️ Technical Approaches Verification

#### **Database Changes: 6 Major Updates**
1. ✅ Profiles table enhancement (birth_date, gender fields)
2. ✅ Advanced caching system (4 cache tables with automated triggers)
3. ✅ Enhanced revenue tracking (profit calculations, forecasting tables)
4. ✅ Performance tracking system (service, employee, operational metrics)
5. ✅ Predictive analytics schema (ML predictions, churn analysis)
6. ✅ Custom reporting infrastructure (report builder, scheduling system)

#### **UI Components: 12 Reusable Components**
1. ✅ Modern-inspired layout system (desktop + mobile responsive)
2. ✅ Advanced data visualization components (charts, heatmaps, scorecards)
3. ✅ Interactive dashboard cards with real-time updates
4. ✅ Customer segmentation interface with filtering
5. ✅ Revenue analytics components with trend analysis
6. ✅ Financial reporting interface with P&L visualization
7. ✅ Performance monitoring dashboards with KPI tracking
8. ✅ Employee management interface with productivity metrics
9. ✅ Predictive analytics visualization with confidence intervals
10. ✅ Behavior analytics interface with journey mapping
11. ✅ Executive summary components with strategic KPIs
12. ✅ Custom report builder with drag-and-drop functionality

#### **Cache Tables: 4 Optimization Tables**
1. ✅ cache_customer_analytics (customer metrics, segmentation, CLV)
2. ✅ cache_daily_metrics (daily aggregations, performance KPIs)
3. ✅ cache_service_performance (service analytics, popularity trends)
4. ✅ cache_employee_performance (staff metrics, productivity tracking)

#### **API Endpoints: 15 Data Fetching Hooks**
1. ✅ useCustomerAnalytics (profile, segmentation, demographics)
2. ✅ useRevenueAnalytics (revenue tracking, growth analysis)
3. ✅ useFinancialPerformance (P&L, margins, profitability)
4. ✅ usePaymentAnalytics (payment methods, processing optimization)
5. ✅ useServicePerformance (service metrics, popularity analysis)
6. ✅ useEmployeePerformance (staff productivity, KPI tracking)
7. ✅ useOperationalEfficiency (capacity, utilization, workflow)
8. ✅ useQualityAssurance (service quality, satisfaction metrics)
9. ✅ usePredictiveAnalytics (ML forecasting, prediction models)
10. ✅ useCustomerBehavior (journey mapping, behavior patterns)
11. ✅ useMarketAnalysis (competitive intelligence, market trends)
12. ✅ useBusinessIntelligence (executive KPIs, strategic metrics)
13. ✅ useCustomReportBuilder (report creation, scheduling)
14. ✅ useRealTimeAnalytics (live data streaming, updates)
15. ✅ useAdvancedInsights (AI-powered recommendations, automation)

#### **Triggers: 3 Automatic Cache Update Functions**
1. ✅ trigger_update_customer_cache (automatic customer analytics updates)
2. ✅ trigger_update_daily_metrics (real-time daily metrics aggregation)
3. ✅ trigger_update_performance_cache (service & employee performance tracking)

### 🎯 **FINAL TECHNICAL COUNT VERIFICATION** ✅
- **Database Changes**: 6 ✅
- **UI Components**: 12 ✅  
- **Cache Tables**: 4 ✅
- **API Endpoints**: 15 ✅
- **Triggers**: 3 ✅

---

## Technical Architecture Overview

### Frontend Stack
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS + Shadcn/ui components
- **Charts**: Recharts for visualizations
- **State Management**: TanStack Query for server state
- **Routing**: React Router v6
- **Mobile**: Responsive design with mobile-first approach

### Backend & Database
- **Database**: PostgreSQL with Supabase
- **Caching**: Advanced cache tables with automatic triggers
- **APIs**: Supabase client with optimized queries
- **Real-time**: Supabase real-time subscriptions
- **Performance**: Indexed queries and materialized views

### Advanced Features
- **Performance Optimization**: 
  - Cache tables for frequently accessed data
  - Indexed queries for fast retrieval
  - Materialized views for complex calculations
  - Connection pooling and query optimization

- **Security**:
  - Row-level security (RLS) policies
  - Role-based access control
  - Data encryption at rest and in transit
  - Audit logging for sensitive operations

- **Scalability**:
  - Horizontal scaling support
  - Load balancing for high traffic
  - Database partitioning for large datasets
  - CDN integration for static assets

---

## Implementation Timeline

### Phase 1 (Weeks 1-4): Foundation
- Week 1: Database schema updates and caching system
- Week 2: UI skeleton and design system
- Week 3: Customer analytics report development
- Week 4: Testing, optimization, and deployment

### Phase 2 (Weeks 5-8): Financial Analytics
- Week 5: Revenue tracking system
- Week 6: Financial reports development
- Week 7: Payment analytics implementation
- Week 8: Testing and optimization

### Phase 3 (Weeks 9-12): Performance Analytics
- Week 9: Performance tracking system
- Week 10: Service and employee reports
- Week 11: Operational efficiency analytics
- Week 12: Quality assurance dashboard

### Phase 4 (Weeks 13-16): Advanced Intelligence
- Week 13: Predictive analytics engine
- Week 14: Advanced behavior analytics
- Week 15: Custom report builder
- Week 16: Final testing and deployment

---

## Success Metrics

### Performance Metrics
- Page load time < 2 seconds
- Query response time < 500ms
- 99.9% uptime availability
- Mobile performance score > 90

### Business Metrics
- 50% reduction in manual reporting time
- 30% improvement in data-driven decisions
- 25% increase in operational efficiency
- 95% user satisfaction rate

### Technical Metrics
- Code coverage > 80%
- Zero critical security vulnerabilities
- API response time < 200ms
- Database query optimization > 70%

This comprehensive plan provides a structured approach to building a robust salon business intelligence system with advanced features, optimal performance, and a user-friendly interface inspired by modern design principles.
