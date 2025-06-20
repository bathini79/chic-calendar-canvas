# Salon Business Intelligence & Marketing Reports

## Professional Salon Management System (18 Reports)
*Inspired by Industry Leaders: Modern Design Patterns*
*Enhanced for Loyalty Points, Coupons & Discount Tracking*

**Categories → Reports → Columns → Filters**

### **SALES & REVENUE** (5 Reports)

**Sales Performance Dashboard** *(Consolidated: Summary + Time Period + Transactions)*
Columns: date, time_period, total_sales, service_revenue, product_revenue, gift_card_sales, package_sales, transaction_count, avg_transaction_value, growth_rate, location_name, peak_hours, seasonal_trends, transaction_details, total_discounts_given, total_loyalty_redemptions, coupon_redemptions
Filters: date_range, time_period_type, location_id, sale_type, revenue_threshold, growth_rate_min, view_mode (summary/detailed/time-based), discount_range, loyalty_redemption_range

**Sales List & Transactions**
Columns: transaction_id, customer_name, date_time, services, products, original_total, discount_amount, discount_type, coupon_code, loyalty_points_used, loyalty_points_earned, final_total, payment_method, employee_name, status
Filters: date_range, customer_id, employee_id, payment_method, amount_range, status, discount_type, coupon_code, loyalty_points_range

**Discount & Coupon Performance Analysis**
Columns: discount_type, coupon_code, usage_count, total_discount_amount, revenue_impact, avg_discount_value, customer_count, repeat_usage_rate, roi_percentage, most_popular_services, avg_customer_spend_with_discount, conversion_rate
Filters: date_range, discount_type, coupon_code, usage_count_min, discount_amount_range, roi_threshold, customer_count_min, repeat_usage_rate_min

**Gift Card Performance**
Columns: gift_card_id, issued_date, amount, redeemed_amount, remaining_balance, purchaser_name, recipient_name, redemption_rate, expiry_status
Filters: date_range, amount_range, redemption_status, expiry_status, location_id

**Membership Sales Analysis**
Columns: membership_name, active_count, new_signups, renewals, cancellations, total_revenue, avg_member_spend, retention_rate, upgrade_rate
Filters: date_range, membership_type, status, revenue_range, retention_rate_min

### **FINANCE & PAYMENTS** (4 Reports)

**Finance Summary**
Columns: total_revenue, total_payments, outstanding_balance, refunds, cash_flow, profit_margin, tax_collected, payment_processing_fees
Filters: date_range, location_id, payment_status, amount_range

**Payment Methods Analysis**
Columns: payment_method, transaction_count, total_amount, avg_transaction, percentage_share, processing_fees, failed_transactions, chargeback_rate
Filters: date_range, payment_method, amount_range, transaction_status, location_id

**Cash Flow Management**
Columns: date, cash_inflow, cash_outflow, net_cash_flow, opening_balance, closing_balance, payment_method_breakdown, refund_amount
Filters: date_range, cash_flow_type, location_id, amount_threshold

**Tax & Compliance Report**
Columns: tax_rate_name, tax_collected, taxable_amount, tax_exempt_amount, compliance_rate, location_name, service_tax, product_tax
Filters: date_range, tax_rate_id, location_id, compliance_status, amount_range

### **APPOINTMENTS & BOOKINGS** (3 Reports)

**Appointments Summary**
Columns: total_appointments, completed_appointments, cancelled_appointments, no_shows, cancellation_rate, booking_trends, peak_times, avg_duration
Filters: date_range, appointment_status, employee_id, service_category, location_id

**Appointment Analytics**
Columns: appointment_id, customer_name, service_name, employee_name, date_time, status, duration, price, booking_source, lead_time
Filters: date_range, status, employee_id, service_id, booking_source, lead_time_range

**Cancellation & No-Show Analysis**
Columns: cancellation_reason, no_show_reason, frequency, revenue_impact, customer_segments, time_patterns, advance_notice, recovery_rate
Filters: date_range, reason_category, customer_segment, employee_id, advance_notice_range

### **TEAM & STAFF** (3 Reports)

**Staff Performance & Productivity** *(Consolidated: Performance + Team Efficiency)*
Columns: employee_name, services_completed, total_revenue, avg_service_value, customer_rating, punctuality_score, utilization_rate, performance_rank, team_metrics, completion_rate, avg_service_time, customer_satisfaction, cross_selling_rate, efficiency_score
Filters: date_range, employee_id, revenue_min, rating_min, utilization_threshold, performance_level, completion_rate_min, satisfaction_min, efficiency_threshold

**Employee Schedule & Availability**
Columns: employee_name, scheduled_hours, worked_hours, availability_rate, overtime_hours, break_compliance, shift_pattern, location_assignment
Filters: date_range, employee_id, hours_range, availability_min, overtime_flag, location_id

**Skills & Service Specialization**
Columns: employee_name, skill_category, service_name, proficiency_level, certification_status, training_date, specialization_revenue, customer_preference
Filters: employee_id, skill_category, proficiency_level, certification_status, specialization_revenue_min

**Team Productivity & Efficiency**
Columns: team_metrics, total_appointments, completion_rate, avg_service_time, customer_satisfaction, cross_selling_rate, team_revenue, efficiency_score
Filters: date_range, team_id, completion_rate_min, satisfaction_min, efficiency_threshold

### **CUSTOMERS & CLIENTS** (5 Reports)

**Customer Profile & Segmentation** ⭐ *PRIMARY MARKETING BLAST REPORT*
Columns: customer_id, full_name, segment, visit_count, last_visit, wallet_balance, referral_wallet, lead_source, communication_channel, lifetime_value, age_group, gender, preferred_services, seasonal_pattern, price_sensitivity, birth_month, loyalty_points_balance, loyalty_points_earned, loyalty_points_redeemed, total_coupons_used, total_discounts_received, avg_discount_percent
Filters: visit_count_range, wallet_balance_range, days_since_last_visit, lead_source, communication_channel, segment_type, lifetime_value_min, age_group, gender, seasonal_behavior, price_range_preference, birth_month, visit_months (visited_in/not_visited_since), loyalty_points_range, coupon_usage_min, discount_usage_min

**Customer Retention & Loyalty**
Columns: customer_id, full_name, first_visit, last_visit, visit_frequency, retention_rate, loyalty_points_balance, loyalty_points_earned_total, loyalty_points_redeemed_total, loyalty_tier, membership_status, churn_risk, engagement_score, points_expiring_soon, last_points_activity
Filters: date_range, visit_frequency_range, retention_rate_min, loyalty_points_range, membership_status, churn_risk_level, loyalty_tier, points_expiring_days

**Customer Discount & Coupon Usage**
Columns: customer_id, full_name, total_visits, total_spent, total_discounts_received, discount_percentage_of_spend, coupon_codes_used, manual_discounts_applied, loyalty_points_redeemed_value, avg_discount_per_visit, discount_frequency, last_discount_date, preferred_discount_type
Filters: date_range, customer_id, total_discounts_range, discount_percentage_range, coupon_usage_min, manual_discount_min, loyalty_redemption_min, discount_frequency_range, preferred_discount_type

**Acquisition & Referral Tracking**
Columns: customer_id, acquisition_date, lead_source, referrer_name, first_service_value, referral_count, referral_revenue, acquisition_cost, conversion_rate
Filters: acquisition_period, lead_source, referrer_id, first_service_category, referral_count_min, acquisition_cost_range

**Customer Communication & Engagement**
Columns: customer_id, communication_channel, consent_status, message_count, response_rate, engagement_score, preferred_contact_time, notification_preferences
Filters: communication_channel, consent_status, response_rate_min, engagement_score_range, preferred_time_slot

---

## **MARKETING CAMPAIGN CAPABILITIES**

### **🎯 PRIMARY MARKETING REPORT: Customer Profile & Segmentation**
**Perfect for all marketing blasts with these campaign scenarios:**

**1. Win-Back Campaigns:**
- Filter: `days_since_last_visit: >60`, `visit_count_range: 3+`
- Target: Previous regulars who haven't visited recently

**2. Seasonal Campaigns:**
- Filter: `seasonal_pattern: summer_visitors`, `visit_months: not_visited_since March`
- Target: Customers who visited in specific months but stopped

**3. Birthday Campaigns:**
- Filter: `birth_month: current_month`, `communication_channel: SMS/WhatsApp`
- Target: Birthday customers for special offers

**4. High-Value Campaigns:**
- Filter: `wallet_balance_range: >$500`, `price_sensitivity: premium`
- Target: High-spending customers for luxury services

**5. Demographic Campaigns:**
- Filter: `age_group: 25-35`, `gender: female`, `preferred_services: hair_color`
- Target: Specific demographics for targeted services

**7. Loyalty Points Campaigns:**
- Filter: `loyalty_points_range: 100-500`, `points_expiring_days: <30`
- Target: Customers with expiring points to encourage redemption

**8. Discount-Sensitive Campaigns:**
- Filter: `preferred_discount_type: coupon`, `coupon_usage_min: 2+`
- Target: Customers who respond well to coupon offers

**9. Manual Discount Recipients:**
- Filter: `manual_discount_min: 1+`, `days_since_last_visit: >45`
- Target: VIP customers who received manual discounts but haven't returned

### **📊 MARKETING INSIGHTS FROM OTHER REPORTS:**

**Sales Performance Dashboard:** Track discount impact on overall revenue
**Customer Retention & Loyalty:** Monitor loyalty points activity and tier progression
**Customer Discount & Coupon Usage:** Detailed analysis of discount patterns per customer
**Acquisition & Referral:** Track referral success rates for campaign optimization
**Communication & Engagement:** Monitor response rates by channel for campaign effectiveness

---

## **FEATURE COVERAGE VERIFICATION**

✅ **Payment Methods** - Covered in Finance & Payments (Reports 7-10)
✅ **Memberships** - Covered in Sales & Revenue (Report 5) + Customer Retention (Report 14)
✅ **Loyalty Points** - Enhanced in Customer Profile (Report 13), Customer Retention (Report 14) & Discount Usage (Report 15)
✅ **Referrals** - Covered in Acquisition & Referral Tracking (Report 16)
✅ **Coupons** - Enhanced in Sales Performance (Report 1), Discount Analysis (Report 3) & Customer Discount Usage (Report 15)
✅ **Discounts** - Enhanced in Sales Transactions (Report 2), Discount Analysis (Report 3) & Customer Discount Usage (Report 15)
✅ **Manual Discounts** - NEW: Tracked in Customer Discount Usage (Report 15) with manual_discounts_applied column
✅ **Inventory** - Covered in Team & Staff specialization and efficiency reports
✅ **Tax** - Covered in Tax Collection & Compliance (Report 8)

## **DATABASE SCHEMA INTEGRATION**

All reports utilize existing database fields + **New Marketing Fields Needed:**
- **Customer Data**: `profiles.visit_count`, `profiles.last_used`, `profiles.wallet_balance`, `profiles.communication_channel`
- **NEW**: `profiles.age_group`, `profiles.gender`, `profiles.birth_month` *(Add to profiles table)*
- **Financial Data**: `bookings.price_paid`, `services.selling_price`, `customer_memberships.total_sales_amount`
- **Communication**: `notification_queue.status`, `messaging_providers.success_rate`
- **Staff Performance**: Service specializations, appointment completion rates
- **Inventory**: Stock levels, consumption patterns from inventory tables
- **Tax Compliance**: Tax rates, collection amounts from financial tables

## **REPORT COUNT OPTIMIZATION**

**Enhanced from 17 to 18 reports by adding dedicated discount tracking:**
- ✅ **NEW:** Discount & Coupon Performance Analysis (Report 3)
- ✅ **NEW:** Customer Discount & Coupon Usage (Report 15)
- ✅ Enhanced loyalty points tracking across multiple reports
- ✅ Manual discount tracking for VIP customer management
- ✅ Customer Profile & Segmentation remains **PRIMARY MARKETING TOOL**

*Ready for immediate implementation with existing database structure + enhanced discount/loyalty tracking*