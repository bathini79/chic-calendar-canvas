SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- Dumped from database version 15.8
-- Dumped by pg_dump version 15.8

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: commission_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: coupons; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: employment_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."employment_types" ("id", "name", "description", "is_configurable", "permissions", "created_at", "updated_at") VALUES
	('f0f7a4ae-7f9a-4589-8c4f-d8a49d75f19b', 'Stylist', 'Provides services to customers', true, '["book_appointments", "view_own_schedule", "perform_services", "appointments", "services", "staff", "inventory", "reports", "settings", "locations", "packages", "sales"]', '2025-06-05 21:44:22.047645+00', '2025-06-05 21:44:56.695089+00'),
	('ac91e884-7724-4c85-9a8a-b1419997456d', 'Operations', 'Manages daily operations', true, '["book_appointments", "view_all_schedules", "manage_inventory", "view_reports", "perform_services", "appointments", "services", "staff", "inventory", "reports", "settings", "locations", "packages", "sales"]', '2025-06-05 21:44:22.047645+00', '2025-06-05 21:44:57.509034+00'),
	('5d8e0d1d-bdc1-4a25-b9f5-c987d698fd70', 'Admin', 'Has full access to the system', false, '[]', '2025-06-05 21:44:22.047645+00', '2025-06-05 21:44:58.315095+00');


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."profiles" ("id", "user_id", "phone_number", "phone_verified", "full_name", "lead_source", "role", "wallet_balance", "last_used", "communication_consent", "communication_channel", "visit_count", "referrer_id", "referral_wallet", "birth_date", "gender") VALUES
	('70f9d47e-66b5-45ef-b2a5-921bfc0f874e', '70f9d47e-66b5-45ef-b2a5-921bfc0f874e', '918999999997', true, 'DemoCustomer', NULL, 'employee', 0, '2025-06-05 23:54:00.51+00', true, 'whatsapp', 0, NULL, 0, NULL, NULL),
	('1dafd103-59d0-46f7-8fb4-1a2b9e574737', '1dafd103-59d0-46f7-8fb4-1a2b9e574737', '919869777777', true, 'NDemo', 'social_media', 'customer', 0, '2025-06-06 08:00:29.366+00', true, 'whatsapp', 0, NULL, 0, NULL, NULL),
	('c604308e-56ae-4658-994f-0c722d991c22', 'c604308e-56ae-4658-994f-0c722d991c22', '919115487749', true, 'NBathini', 'facebook', 'admin', 0, '2025-06-07 08:51:54.217+00', true, 'whatsapp', 5, '1dafd103-59d0-46f7-8fb4-1a2b9e574737', 500, NULL, NULL),
	('c79bb671-8e5a-4856-ab90-a4af1a50733e', 'c79bb671-8e5a-4856-ab90-a4af1a50733e', '918919100708', true, 'Chandana', 'google', 'customer', 0, '2025-06-07 17:29:10.867+00', true, 'whatsapp', 0, NULL, 0, NULL, NULL);


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."employees" ("id", "name", "email", "phone", "photo_url", "status", "created_at", "updated_at", "employment_type", "auth_id", "employment_type_id", "service_commission_enabled", "commission_type", "commission_template_id") VALUES
	('d50231d0-5c9d-4280-a81e-3b75bc833f98', 'DemoCustomer', 'DemoCustomer@gmail.com', '918999999997', '', 'active', '2025-06-05 23:53:37.467076+00', '2025-06-06 06:55:52.116197+00', 'stylist', '70f9d47e-66b5-45ef-b2a5-921bfc0f874e', 'f0f7a4ae-7f9a-4589-8c4f-d8a49d75f19b', false, NULL, NULL);


--
-- Data for Name: tax_rates; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: appointments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: packages; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: services; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."services" ("id", "name", "original_price", "selling_price", "duration", "description", "status", "created_at", "updated_at", "image_urls", "gender", "category_id") VALUES
	('71694fd8-66cd-4ab2-9d72-51cc9c363b0e', 'Demo Hair Style', 200.00, 300.00, 15, '', 'active', '2025-06-05 21:49:56.281398+00', '2025-06-05 21:49:56.281398+00', '{}', 'male', NULL),
	('86032c4c-c186-441d-a6eb-25187b926ff8', 'Advance Hair Cut (Short 0-12")', 750.00, 750.00, 60, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('426b3bce-a12c-4ae6-9987-9021d29e9b48', 'Advance Hair Cut (Medium 13-18")', 750.00, 750.00, 60, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('6fb9c2dc-c139-43b9-9304-a51a42e55b18', 'Advance Hair Cut (Long 19-24")', 750.00, 750.00, 60, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('c8fb43cb-144e-43b2-8a52-eeb98d80e74a', 'Change of Hair Style (Short 0-12")', 1000.00, 1000.00, 60, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('7ee29537-970c-4e27-b44b-3d8a3cbcc99e', 'Change of Hair Style (Medium 13-18")', 1000.00, 1000.00, 60, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('70e37722-46d0-4b00-976d-74e8f7011191', 'Change of Hair Style (Long 19-24")', 1000.00, 1000.00, 60, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('e4408b60-7204-4bc3-8f4a-9d31a2f6331b', 'Hair Wash - Shampoo & Conditioning (Short 0-12")', 500.00, 500.00, 30, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('0e887c03-9e33-4e45-ba0a-7f3d45212da4', 'Hair Wash - Shampoo & Conditioning (Medium 13-18")', 700.00, 700.00, 30, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('6a10a3b8-8e96-4570-9802-2be85e0fdd11', 'Hair Wash - Shampoo & Conditioning (Long 19-24")', 750.00, 750.00, 30, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('40cde9f0-6d58-409a-920b-2b40dded15ce', 'Root Touch Up - Regular (All Lengths)', 1200.00, 1200.00, 90, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('7197905d-b16b-4fab-81ed-eabc7441277d', 'Root Touch Up - Ammonia Free (All Lengths)', 1500.00, 1500.00, 90, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('7078345c-b1ae-42de-ac06-27346788e6b5', 'Global Hair Color - Regular (Short 0-12")', 3000.00, 3000.00, 120, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('f356454f-a516-46b5-ac31-a048f26804b6', 'Global Hair Color - Regular (Medium 13-18")', 3500.00, 3500.00, 150, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('99b2fd43-c2b0-444d-8e4e-7bbc66c2e0ff', 'Global Hair Color - Regular (Long 19-24")', 4000.00, 4000.00, 180, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('b89f0b79-066b-434b-9829-d9cf6c38cd14', 'Global Hair Color - Ammonia Free (Short 0-12")', 4000.00, 4000.00, 120, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('77c31ea4-6ead-4a71-b869-732c668f54ab', 'Global Hair Color - Ammonia Free (Medium 13-18")', 5000.00, 5000.00, 150, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('718d78a5-65c6-48a5-bd9b-251356541a82', 'Global Hair Color - Ammonia Free (Long 19-24")', 6000.00, 6000.00, 180, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('59f34dac-e857-4f4e-ba5c-79c00fbe2fb1', 'Global Highlights - Regular (Short 0-12")', 4000.00, 4000.00, 120, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('409b396a-a7a1-40b3-9230-ebe38ca4ca81', 'Global Highlights - Regular (Medium 13-18")', 5000.00, 5000.00, 150, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('c625b99f-6f56-48a7-84fa-fe164f28c587', 'Global Highlights - Regular (Long 19-24")', 6000.00, 6000.00, 180, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('ed7b5c56-6267-4691-8982-9fa0bdefa223', 'Global Highlights - Ammonia Free (Short 0-12")', 5000.00, 5000.00, 120, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('670b0ea0-b05b-4b52-828a-46c546fe8c78', 'Global Highlights - Ammonia Free (Medium 13-18")', 6000.00, 6000.00, 150, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('cf0e1f88-52b7-4220-bf3d-0138b6b19f71', 'Global Highlights - Ammonia Free (Long 19-24")', 7000.00, 7000.00, 180, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('06a4237c-32fc-424c-9b0a-4ab280480a4b', 'Balayage/Ombre Hair Color - Regular (Short 0-12")', 4500.00, 4500.00, 150, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('51c2ae51-38af-49d6-9032-1e1aee3f39bc', 'Balayage/Ombre Hair Color - Regular (Medium 13-18")', 6000.00, 6000.00, 180, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('a7cfc192-9f7d-402d-9afa-ebf51c13032c', 'Balayage/Ombre Hair Color - Regular (Long 19-24")', 5000.00, 5000.00, 210, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('df7da949-5425-4093-b205-2a5d2ef2a439', 'Moisturizing Hair Spa (Short 0-12")', 1000.00, 1000.00, 45, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('2d116026-219f-4504-a219-e12ba6f782d0', 'Moisturizing Hair Spa (Medium 13-18")', 1500.00, 1500.00, 60, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('4b13875d-88de-446f-bcd6-b64757969b43', 'Moisturizing Hair Spa (Long 19-24")', 2000.00, 2000.00, 75, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('1db399ec-d067-4b77-b3ca-2877276ced44', 'Hydrating Hair Spa (Short 0-12")', 1500.00, 1500.00, 45, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('76660c1f-4c60-429e-9ce5-856ff72752ec', 'Hydrating Hair Spa (Medium 13-18")', 2000.00, 2000.00, 60, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('7cf39b10-b9dc-40d7-bf6c-7c6da7470b9a', 'Hydrating Hair Spa (Long 19-24")', 2500.00, 2500.00, 75, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('424f7ad0-07b3-4d8c-87a2-7c867ee0b0c2', 'Keratin Hair Spa (Short 0-12")', 1500.00, 1500.00, 45, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('28544102-2017-4559-9754-70332e8af0a0', 'Keratin Hair Spa (Medium 13-18")', 2000.00, 2000.00, 60, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('ebc0f0f1-172b-4cd3-8770-6def750ac2b2', 'Keratin Hair Spa (Long 19-24")', 2500.00, 2500.00, 75, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('5bf58d9d-2b9a-42d4-8625-e21a68e56a6a', 'Detox Hair Spa (Short 0-12")', 2500.00, 2500.00, 60, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('8a49e355-4de2-41ca-8f08-f04a2d28031c', 'Detox Hair Spa (Medium 13-18")', 3000.00, 3000.00, 75, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('69847110-8d4e-4ada-9ffe-34bf6a291492', 'Detox Hair Spa (Long 19-24")', 3500.00, 3500.00, 90, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('e253f6af-94a0-44aa-b635-79fd21b3aec0', 'Blow Dry (Short 0-12")', 600.00, 600.00, 30, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('4f1d06e6-415e-4a73-826a-3396d17917e5', 'Blow Dry (Medium 13-18")', 700.00, 700.00, 45, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('487c2b72-f421-4b56-bbc4-00b75fdec790', 'Blow Dry (Long 19-24")', 750.00, 750.00, 60, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('b6b35ccf-6044-4cc5-b4db-e030ee815984', 'Curls with Blow Dry (Short 0-12")', 600.00, 600.00, 45, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('607b4f34-f6b2-4769-8830-03380e6962de', 'Curls with Blow Dry (Medium 13-18")', 700.00, 700.00, 60, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('33d1f2d8-9c0f-4ee6-9136-88bea0017bd4', 'Curls with Blow Dry (Long 19-24")', 800.00, 800.00, 75, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('7c85b063-2b2e-42f2-8c16-e00a04505bed', 'Soft Spiral Curls (Short 0-12")', 600.00, 600.00, 45, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('712da8af-da53-4bbb-b8da-9814cbdc982f', 'Soft Spiral Curls (Medium 13-18")', 700.00, 700.00, 60, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('c1fbfcf0-4c90-4e3a-a86d-fd783b3e45b5', 'Soft Spiral Curls (Long 19-24")', 800.00, 800.00, 75, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('e864a4df-9473-41c1-a435-2beb4f6e0789', 'Flat Shine Straight (Short 0-12")', 600.00, 600.00, 45, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('16523619-c12d-4590-a377-ab603ea97eca', 'Flat Shine Straight (Medium 13-18")', 750.00, 750.00, 60, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('a00dc790-3129-41ec-8ab2-287e2b61a2d6', 'Flat Shine Straight (Long 19-24")', 900.00, 900.00, 75, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('6ced78e7-3cd2-49e2-8424-51eac3fd62be', 'Hair Smoothening (Short 0-12")', 6500.00, 6500.00, 180, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('becff8cb-6b1e-4df7-b33c-e818f28e9142', 'Hair Smoothening (Medium 13-18")', 7500.00, 7500.00, 210, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('3b2d5e22-4c41-43f8-b9a1-1b48285b3bb8', 'Full Body - Choco', 3500.00, 3500.00, 120, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('2f3541b0-b241-4902-a964-2312e0eeccaf', 'Hair Smoothening (Long 19-24")', 9000.00, 9000.00, 240, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('eae3a49c-f81f-4203-bda3-7dc7988c466a', 'Keratin Treatment (Short 0-12")', 6500.00, 6500.00, 180, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('76d6b904-832f-4286-925b-ae559c379408', 'Keratin Treatment (Medium 13-18")', 7500.00, 7500.00, 210, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('d5b7192c-32ee-48ab-8351-6bb5442b29e0', 'Keratin Treatment (Long 19-24")', 9000.00, 9000.00, 240, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('d8055268-f81e-45f7-b11f-8a63046608bf', 'Botox Treatment (Short 0-12")', 7000.00, 7000.00, 180, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('2e2da127-6a64-4e0c-866c-1647c3d09c15', 'Botox Treatment (Medium 13-18")', 8500.00, 8500.00, 210, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('8facd218-0f98-4996-83e1-dac494dbf31c', 'Botox Treatment (Long 19-24")', 10000.00, 10000.00, 240, NULL, 'active', '2025-06-06 07:11:57.784427+00', '2025-06-06 07:11:57.784427+00', '{}', 'female', NULL),
	('e7909af8-9a53-45eb-84f7-45e0a3d84ca9', 'Cystein Treatment (Short 0-12")', 7000.00, 7000.00, 150, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'female', NULL),
	('bcae03ab-f3f0-4758-8b19-4e6e98a5c4a7', 'Cystein Treatment (Medium 13-18")', 8500.00, 8500.00, 180, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'female', NULL),
	('14225304-8169-4c44-a019-7581853cf63e', 'Cystein Treatment (Long 19-24")', 10000.00, 10000.00, 210, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'female', NULL),
	('eb7eabc8-fe60-42f0-8ac9-c91a1fd5cf8c', 'Nano Plastia Treatment (Short 0-12")', 7000.00, 7000.00, 150, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'female', NULL),
	('5bca6da5-94f3-4216-ad80-bb6c707d0221', 'Nano Plastia Treatment (Medium 13-18")', 8500.00, 8500.00, 180, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'female', NULL),
	('d3f4271d-5631-4df3-bcd5-cc4440d6753c', 'Nano Plastia Treatment (Long 19-24")', 10000.00, 10000.00, 210, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'female', NULL),
	('aca97acd-5eb5-4d24-97f1-1d575b67e385', 'Collagen Treatment (Short 0-12")', 7000.00, 7000.00, 150, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'female', NULL),
	('17aedf15-30cd-40ab-8f5b-d8b5c5c64312', 'Collagen Treatment (Medium 13-18")', 8500.00, 8500.00, 180, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'female', NULL),
	('dd2e7b18-673a-4075-9ac2-acf178a1ea2b', 'Collagen Treatment (Long 19-24")', 10000.00, 10000.00, 210, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'female', NULL),
	('3a79667f-d645-4568-99f6-7f5315c998db', 'Kera-Smooth Treatment (Short 0-12")', 7500.00, 7500.00, 150, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'female', NULL),
	('065ead22-3573-4dfb-a5ab-bfee81b209e1', 'Kera-Smooth Treatment (Medium 13-18")', 9000.00, 9000.00, 180, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'female', NULL),
	('b4c65866-0730-4b88-85f7-dee6945da230', 'Kera-Smooth Treatment (Long 19-24")', 12000.00, 12000.00, 210, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'female', NULL),
	('06ec6d22-e0d7-4249-b0fe-1a25e56e986f', 'Hair Extensions (Short 0-12")', 20000.00, 20000.00, 180, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'female', NULL),
	('1edcef61-0e61-4d9a-b509-45106b605c29', 'Hair Extensions (Medium 13-18")', 30000.00, 30000.00, 240, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'female', NULL),
	('54eb1496-46b4-4ae3-83ad-f3123c23e2a6', 'Hair Extensions (Long 19-24")', 40000.00, 40000.00, 300, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'female', NULL),
	('f90878fd-e810-4fff-84ff-d7bed3b32450', 'Full Arms - Honey', 200.00, 200.00, 30, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('2cb420ca-5e2a-4603-ab7f-89cbc9e05647', 'Full Arms - Choco', 300.00, 300.00, 30, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('32ad0f64-ea32-41a7-8fe9-cd66c8ddc5dc', 'Full Arms - Rica', 350.00, 350.00, 30, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('197ea9f6-04ac-4e02-ac27-442a0da011a1', 'Full Arms - Rollon', 450.00, 450.00, 30, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('50ded60f-2bce-4ab0-beea-b19d2d2652d3', 'Full Legs - Honey', 400.00, 400.00, 45, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('27d2405e-1c43-44a1-b42d-bd8cec0327af', 'Full Legs - Choco', 600.00, 600.00, 45, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('af819811-b7ee-4b46-b36b-4adb67dbccb6', 'Full Legs - Rica', 700.00, 700.00, 45, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('3549c8b2-075c-4aeb-b58a-80ab0b7943bc', 'Full Legs - Rollon', 800.00, 800.00, 45, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('6aa8200e-72ea-4f1c-97e3-3281230174fe', 'Half Legs - Honey', 300.00, 300.00, 30, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('1080234d-29d0-4159-b608-2b1370ca2cd3', 'Half Legs - Choco', 400.00, 400.00, 30, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('cd42edb0-84cc-488d-9b1f-1d029a0e2e9e', 'Half Legs - Rica', 450.00, 450.00, 30, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('6a18c765-c90d-4f3b-960f-9e76965c9042', 'Half Legs - Rollon', 550.00, 550.00, 30, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('dd004f1b-6fd2-442e-a554-f2fab8fb6c09', 'Under Arms - Honey', 150.00, 150.00, 15, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('594a0a82-515c-480c-82dd-7415d01eb314', 'Under Arms - Choco', 150.00, 150.00, 15, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('f993f4ea-5ac4-4f5a-85f0-856e2ce3ee44', 'Under Arms - Rica', 200.00, 200.00, 15, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('95758cc0-0eaf-4515-99a3-8cbb20a3e27a', 'Under Arms - Rollon', 250.00, 250.00, 15, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('21ab8e52-6270-4d70-946b-d87d1c4d4c0e', 'Full Back - Honey', 500.00, 500.00, 30, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('27523319-a4cd-48c4-8ba3-b461e9807691', 'Full Back - Choco', 800.00, 800.00, 30, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('7babe14e-a996-4890-8ca3-2bedb2343ad1', 'Full Back - Rica', 900.00, 900.00, 30, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('e72a86b5-5ddf-4106-9db7-8ba550a72e59', 'Full Back - Rollon', 1000.00, 1000.00, 30, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('c681661f-85b0-4c96-91e3-544a4c1d2da4', 'Half Back - Honey', 300.00, 300.00, 20, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('348ff6dc-7f19-40d5-adb9-cbce04052829', 'Half Back - Choco', 450.00, 450.00, 20, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('9116bd9b-289c-456a-b385-6c2c447d893b', 'Half Back - Rica', 500.00, 500.00, 20, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('0609021f-4ccc-4235-a61d-083855f4980b', 'Half Back - Rollon', 600.00, 600.00, 20, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('a0faa3df-a744-4db0-86f2-d7df08bb11e1', 'Full Front - Honey', 500.00, 500.00, 30, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('284e7362-52a3-45aa-ae83-d60b321f5321', 'Full Front - Choco', 800.00, 800.00, 30, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('7d8bbcca-f28d-4a03-b7f9-76e742e5e2b5', 'Full Front - Rica', 900.00, 900.00, 30, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('a8554403-44a2-4f6c-8a99-86110f43b8b6', 'Full Front - Rollon', 1000.00, 1000.00, 30, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('d66500e1-5a6b-4712-b62a-d5e742cbac75', 'Half Front - Honey', 300.00, 300.00, 20, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('a027b634-6f11-430f-9d2b-f20809993f56', 'Half Front - Choco', 450.00, 450.00, 20, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('96613e83-7803-4c49-af51-5275afbee718', 'Half Front - Rica', 500.00, 500.00, 20, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('6002b93c-1d1c-47cb-bc76-4af95e1f2021', 'Half Front - Rollon', 600.00, 600.00, 20, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('0c308027-7464-49d3-aa3b-b6b304983fb8', 'Full Body - Honey', 2500.00, 2500.00, 120, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('cdad8a21-228d-484b-8976-54d05ba92451', 'Full Body - Rica', 4000.00, 4000.00, 120, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('ee5810eb-10d1-4fc1-ad61-6ac8208c830f', 'Full Body - Rollon', 4500.00, 4500.00, 120, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('b434c333-2ac3-4104-8b02-ad78ab8bcea1', 'Brazilian Wax (Bikini) - Choco', 1300.00, 1300.00, 45, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('560ddc50-c2ec-47d4-a802-54e5eadf6f1d', 'Brazilian Wax (Bikini) - Rica', 1500.00, 1500.00, 45, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('48ce16c4-4734-4d0e-b420-895ed03c0a67', 'Brazilian Wax (Bikini) - Rollon', 1800.00, 1800.00, 45, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('53c57f10-6857-4e2e-8e29-f0ffd8ca35d3', 'Fruit Facial', 1000.00, 1000.00, 60, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('a7ddcc98-1a13-45d6-8568-5c4b2a239ffc', 'Anti Tan Facial', 1500.00, 1500.00, 60, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('686800a9-519a-4dba-96a8-993a762265ae', 'Insta-Glow Facial', 1500.00, 1500.00, 60, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('77b2a052-76dc-45dd-b867-8e09864fb697', 'Pearl Facial', 1500.00, 1500.00, 60, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('a618f1cf-714c-49fc-a671-f2cc00cc65fc', 'Gold Facial', 1800.00, 1800.00, 75, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('0db622aa-5ebb-4e43-916f-33a7f5c3cacb', 'Diamond Facial', 2000.00, 2000.00, 75, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('6c4e0875-2118-49f5-a241-a020acfc52d6', 'Red Wine Facial', 2000.00, 2000.00, 75, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('3e56e79f-8b19-43dc-a9b7-b688516211bd', 'Skin Lightening Facial', 3000.00, 3000.00, 90, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('869eb068-297f-4b5b-8d48-7b4a3c99122d', 'O3+ Whitening/Brightening Facial', 3500.00, 3500.00, 90, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('6c5181e1-a758-4819-a10a-437e87725124', 'O3+ Vitamin C Facial', 4000.00, 4000.00, 90, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('ca6e5656-5748-4575-a09b-aa349b5a59b5', 'Hydra Facial', 4000.00, 4000.00, 90, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('47802ae6-6647-4d54-b2b4-36472fe4af71', 'Eyebrows Threading', 50.00, 50.00, 15, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('dae06704-cf6a-4a25-aba0-ceddb09869ab', 'Forehead Threading', 50.00, 50.00, 10, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('f46f6ac1-642f-44be-95ac-c24a5cbd3659', 'Upper Lip Threading', 40.00, 40.00, 10, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('0ef421cf-cfc7-4bd6-b948-19fb77ef29b8', 'Lower Lip/Chin Threading', 40.00, 40.00, 10, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('5af423dc-e585-4f2f-8316-44186b7de06d', 'Cheeks Threading', 60.00, 60.00, 15, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('5234035c-23e8-4673-976f-64c40c5b098f', 'Full Face Threading', 220.00, 220.00, 30, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('d86e385a-6b62-45c7-8e6e-6a921234e441', 'Eyebrows Waxing', 70.00, 70.00, 15, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('4abea4f3-0018-4477-93b3-3721fb7ada56', 'Forehead Waxing', 70.00, 70.00, 10, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('3cae9379-3d28-4181-9f82-91f0f500afaa', 'Upper Lip Waxing', 70.00, 70.00, 10, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('6dd9e757-4800-45dd-8496-91f688a6a5c8', 'Lower Lip/Chin Waxing', 100.00, 100.00, 15, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('662d6d3b-d1e3-4661-a3ca-e191cc0d7531', 'Full Face Waxing', 300.00, 300.00, 30, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('29b0891f-18c7-4948-b071-0414e83fb2db', 'Classic Pedicure', 600.00, 600.00, 45, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('12c6d99a-15b5-4761-9a32-97f48b77d4d0', 'Aroma Pedicure', 700.00, 700.00, 45, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('d10bc47d-d304-403c-9cbd-6b6c5d5f373d', 'Spa Pedicure', 700.00, 700.00, 45, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('316fd8c1-5579-4488-b1b6-40a25aa9eea6', 'Rose Pedicure', 1200.00, 1200.00, 60, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('89f7939a-3ee1-41e5-a113-199f8c199f55', 'Bubble Gum Pedicure', 2000.00, 2000.00, 75, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('47d52cae-97b4-49c2-885f-6f2ff2322039', 'Crystal Pedicure', 1500.00, 1500.00, 60, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('517df2a0-a9ee-453b-8856-4cd38f5b434f', 'Heel Peel Pedicure', 2000.00, 2000.00, 75, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('cd13aac1-4cc9-4dd8-bd43-69e360a36bc2', 'Classic Manicure', 500.00, 500.00, 30, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('6add22c4-98fb-433d-b0d8-39bd964da8d5', 'Aroma Manicure', 600.00, 600.00, 30, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('d5341fc6-948d-4e6e-a70e-c9126d258ff5', 'Spa Manicure', 600.00, 600.00, 30, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('1a89a871-2106-41d2-bcba-f3c7feb51bb1', 'Rose Manicure', 1000.00, 1000.00, 45, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('424bdaf4-878d-4468-a97f-ad52d30dab6b', 'Bubble Gum Manicure', 1500.00, 1500.00, 45, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('efb9728c-fea5-4fb3-b302-76711b0eff40', 'Crystal Manicure', 1200.00, 1200.00, 45, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('bdcd4b5e-291c-4b70-a5c2-a9200f27934f', 'Hands Nail Cut & File', 300.00, 300.00, 20, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('a533c622-1d61-4f1a-9c1c-1365ca3ffb76', 'Foot Nail Cut & File', 350.00, 350.00, 20, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('893dce01-ccd8-4616-be1b-95c2abc91d33', 'Face & Neck De-tan/Bleach/Scrub', 400.00, 400.00, 30, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('ec95c914-b6de-4fc1-a6ce-a3604b22744f', 'Full Hand De-tan/Bleach/Scrub', 700.00, 700.00, 45, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('63992d1e-b289-48ee-8d52-47463c549fa9', 'Full Legs De-tan/Bleach/Scrub', 800.00, 800.00, 60, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('9802ce80-f12b-4500-baef-dbc309d5dc59', 'Half Legs De-tan/Bleach/Scrub', 600.00, 600.00, 45, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('71a2a1e9-927c-41f5-85e6-aa3da29c5e67', 'Back De-tan/Bleach/Scrub', 600.00, 600.00, 45, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('ea490c13-a597-4036-905f-e88c2d86fc4d', 'Front De-tan/Bleach/Scrub', 600.00, 600.00, 45, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('e85e5d62-e715-4b8e-b282-8f1228f881be', 'Full Body De-tan/Bleach/Scrub', 2500.00, 2500.00, 120, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('fbc4c6cd-33cc-41d3-ac90-1bf73b3cc183', 'Face & Neck Polishing', 800.00, 800.00, 45, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('0a1e76a2-0089-4aeb-99df-fa1fcf8b1f66', 'Full Hand Polishing', 1500.00, 1500.00, 60, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('44737c7b-9fd5-4074-9f55-0240f60e60d9', 'Full Legs Polishing', 1800.00, 1800.00, 75, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('8e58bce7-22f1-4744-8749-3e8061254301', 'Half Legs Polishing', 1500.00, 1500.00, 60, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('f2e8d7f8-68ea-48f0-8670-71f19ba69d78', 'Back Polishing', 1500.00, 1500.00, 60, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('060ac314-c01f-4797-b3ac-8f23f3c42867', 'Front Polishing', 1500.00, 1500.00, 60, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('24e345bc-989d-47b1-a746-d025bce61710', 'Full Body Polishing', 6000.00, 6000.00, 180, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('924218bb-f7c8-4035-ad02-c75545fefdc1', 'Classic Massage (45 minutes)', 2000.00, 2000.00, 45, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('063c4e8a-5bd9-4853-a239-9a5baba54f44', 'Aroma Massage (45 minutes)', 2200.00, 2200.00, 45, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('a2218efc-1b36-484a-ad7c-2b0467af9ce3', 'Ayurvedic Massage (45 minutes)', 3000.00, 3000.00, 45, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('4975b7cb-d360-47d0-baaf-f049a60730fb', 'Swedish Massage (45 minutes)', 3000.00, 3000.00, 45, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('76968866-768c-4820-aa24-7926fe956029', 'Balinese Massage (45 minutes)', 3000.00, 3000.00, 45, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('84e0dc19-13c1-432a-aac5-7988fab4d8bc', 'Head Massage (30 minutes)', 700.00, 700.00, 30, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('36cbc456-faaf-4459-a3ec-8cae2fcce492', 'Neck Massage (30 minutes)', 500.00, 500.00, 30, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('b71652f0-a2cc-40ef-af0b-d80fc89f3b1d', 'Hand Massage (30 minutes)', 700.00, 700.00, 30, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('accd8033-2d40-42e9-bfec-81ba152c979b', 'Foot Massage (30 minutes)', 800.00, 800.00, 30, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('71686aea-2ff7-4f28-bcb6-c92b453f46fd', 'Back Massage (30 minutes)', 1000.00, 1000.00, 30, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('2a0e9efd-08b6-4950-bb88-726877cd4972', 'Scalp Treatment (Female)', 3000.00, 3000.00, 75, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('73532c2f-a326-430c-9a66-5fc25fd86b78', 'Scalp Treatment (Male)', 2500.00, 2500.00, 60, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'all', NULL),
	('e62a1f4b-b7a5-435b-99fb-9df8614a2f79', 'Hair Cut (Any Style)', 300.00, 300.00, 30, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'male', NULL),
	('52c7781f-cb21-4a62-a924-fae3ee549d85', 'Hair Wash', 200.00, 200.00, 20, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'male', NULL),
	('77839b5b-172e-4b89-a4c1-ee14e2afeaeb', 'Beard Style', 200.00, 200.00, 20, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'male', NULL),
	('91d6fabd-492b-415d-b47c-a490a6e157a8', 'Shave/Trimm', 200.00, 200.00, 20, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'male', NULL),
	('1d601ded-0b3a-4156-a843-e9da01338d6c', 'Hair Color (Regular)', 1000.00, 1000.00, 45, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'male', NULL),
	('93b9fe82-d350-422b-ac48-327a66c6bd03', 'Hair Color (Ammonia Free)', 1500.00, 1500.00, 45, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'male', NULL),
	('f06f83b4-2a1c-4400-b0d4-0eead9369dda', 'Beard Color (Regular)', 800.00, 800.00, 30, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'male', NULL),
	('c2bda3b0-f706-49a1-8509-19dff517f672', 'Beard Color (Ammonia Free)', 1000.00, 1000.00, 30, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'male', NULL),
	('ad3898d0-b44a-4ff4-95e0-9a7247691ce8', 'Global Highlights', 3000.00, 3000.00, 90, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'male', NULL),
	('fdb1c5bb-0e10-47f6-8777-882b9e96e177', 'Crown Highlights', 2500.00, 2500.00, 75, NULL, 'active', '2025-06-06 07:58:29.438685+00', '2025-06-06 07:58:29.438685+00', '{}', 'male', NULL),
