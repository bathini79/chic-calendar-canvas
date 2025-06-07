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
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."audit_log_entries" ("instance_id", "id", "payload", "created_at", "ip_address") VALUES
	('00000000-0000-0000-0000-000000000000', '15bb134f-0f49-4da5-b1b8-411a1c92c2ff', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"phone_919115487749_6f8de93490ce5313@example.com","user_id":"c604308e-56ae-4658-994f-0c722d991c22","user_phone":""}}', '2025-06-05 21:43:20.119043+00', ''),
	('00000000-0000-0000-0000-000000000000', '2eb59684-17ff-48e5-8880-4fd2852d0c20', '{"action":"login","actor_id":"c604308e-56ae-4658-994f-0c722d991c22","actor_username":"phone_919115487749_6f8de93490ce5313@example.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-06-05 21:43:24.188018+00', ''),
	('00000000-0000-0000-0000-000000000000', '39a67620-43fc-40c4-8dca-a504fae79487', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"staff_919865899999_1749160269401@staff.internal","user_id":"822df3f1-becc-4748-bdaf-4be87bdd8815","user_phone":"919865899999"}}', '2025-06-05 21:51:09.679062+00', ''),
	('00000000-0000-0000-0000-000000000000', '56cb71c0-5775-4978-bf24-ea72088fca58', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"staff_919886666666_1749161185250@staff.internal","user_id":"c8c1667a-1588-4e0c-b320-51a8fe60d315","user_phone":"919886666666"}}', '2025-06-05 22:06:26.010953+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e8bc8b55-45f9-43b5-9d97-046d3b1f8cdc', '{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"staff_919865899999_1749160269401@staff.internal","user_id":"822df3f1-becc-4748-bdaf-4be87bdd8815","user_phone":"919865899999"}}', '2025-06-05 22:47:21.501167+00', ''),
	('00000000-0000-0000-0000-000000000000', '010b137c-1af3-4083-985a-0392f25caef1', '{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"staff_919886666666_1749161185250@staff.internal","user_id":"c8c1667a-1588-4e0c-b320-51a8fe60d315","user_phone":"919886666666"}}', '2025-06-05 22:47:21.512024+00', ''),
	('00000000-0000-0000-0000-000000000000', '931b6398-3ce0-4202-bdbf-455610597ff8', '{"action":"token_refreshed","actor_id":"c604308e-56ae-4658-994f-0c722d991c22","actor_username":"phone_919115487749_6f8de93490ce5313@example.com","actor_via_sso":false,"log_type":"token"}', '2025-06-05 23:13:03.394078+00', ''),
	('00000000-0000-0000-0000-000000000000', '04c6b08b-d975-493b-bdfe-d66306ed64ea', '{"action":"token_revoked","actor_id":"c604308e-56ae-4658-994f-0c722d991c22","actor_username":"phone_919115487749_6f8de93490ce5313@example.com","actor_via_sso":false,"log_type":"token"}', '2025-06-05 23:13:03.395848+00', ''),
	('00000000-0000-0000-0000-000000000000', '140b0158-2014-40d8-a872-2ed3618366fc', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"8df80f19-d5a8-49db-9da5-81a216b2fbff@placeholder.com","user_id":"d3a44dae-b4c5-429e-844b-1a0f18c236c4","user_phone":"919845879999"}}', '2025-06-05 23:22:53.493126+00', ''),
	('00000000-0000-0000-0000-000000000000', '34c060a8-3791-40f0-b495-06f019ed25b4', '{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"8df80f19-d5a8-49db-9da5-81a216b2fbff@placeholder.com","user_id":"d3a44dae-b4c5-429e-844b-1a0f18c236c4","user_phone":"919845879999"}}', '2025-06-05 23:23:56.112741+00', ''),
	('00000000-0000-0000-0000-000000000000', '828ce5ab-e32a-4165-858f-d0205229381c', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"staff_919869885777_1749167143113@staff.internal","user_id":"7bb63bd5-5196-4a87-88ee-dfba912e1980","user_phone":"919869885777"}}', '2025-06-05 23:45:43.865026+00', ''),
	('00000000-0000-0000-0000-000000000000', '7c274aa2-5fe6-4746-b261-664fbba2b5b4', '{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"staff_919869885777_1749167143113@staff.internal","user_id":"7bb63bd5-5196-4a87-88ee-dfba912e1980","user_phone":"919869885777"}}', '2025-06-05 23:46:54.152358+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f41b3f70-1b20-4fa2-ae0d-2539350e1e18', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"staff_919875555555_1749167385372@staff.internal","user_id":"1ea8b881-12f7-4f69-8cc6-e50bfeef3df1","user_phone":"919875555555"}}', '2025-06-05 23:49:45.583871+00', ''),
	('00000000-0000-0000-0000-000000000000', '9001b6ea-6cf3-43b4-a5a8-2501eb2de60e', '{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"staff_919875555555_1749167385372@staff.internal","user_id":"1ea8b881-12f7-4f69-8cc6-e50bfeef3df1","user_phone":"919875555555"}}', '2025-06-05 23:51:53.416739+00', ''),
	('00000000-0000-0000-0000-000000000000', '6c3aacbf-7388-4ec2-a5cd-1fa6ac07ce84', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"staff_918999999997_1749167638880@staff.internal","user_id":"70f9d47e-66b5-45ef-b2a5-921bfc0f874e","user_phone":"918999999997"}}', '2025-06-05 23:53:59.083482+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e10a97ce-e170-4ce9-9a83-af38aa01a1fa', '{"action":"token_refreshed","actor_id":"c604308e-56ae-4658-994f-0c722d991c22","actor_username":"phone_919115487749_6f8de93490ce5313@example.com","actor_via_sso":false,"log_type":"token"}', '2025-06-06 06:25:58.193567+00', ''),
	('00000000-0000-0000-0000-000000000000', '5572b93a-0235-4e34-bac8-1d526930ce05', '{"action":"token_revoked","actor_id":"c604308e-56ae-4658-994f-0c722d991c22","actor_username":"phone_919115487749_6f8de93490ce5313@example.com","actor_via_sso":false,"log_type":"token"}', '2025-06-06 06:25:58.19804+00', '');


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('c604308e-56ae-4658-994f-0c722d991c22', 'c604308e-56ae-4658-994f-0c722d991c22', '{"sub": "c604308e-56ae-4658-994f-0c722d991c22", "email": "phone_919115487749_6f8de93490ce5313@example.com", "email_verified": false, "phone_verified": false}', 'email', '2025-06-05 21:43:20.103103+00', '2025-06-05 21:43:20.103174+00', '2025-06-05 21:43:20.103174+00', '631d6059-023b-408a-88cf-fcc43c56d597'),
	('822df3f1-becc-4748-bdaf-4be87bdd8815', '822df3f1-becc-4748-bdaf-4be87bdd8815', '{"sub": "822df3f1-becc-4748-bdaf-4be87bdd8815", "email": "staff_919865899999_1749160269401@staff.internal", "email_verified": false, "phone_verified": false}', 'email', '2025-06-05 21:51:09.676115+00', '2025-06-05 21:51:09.676173+00', '2025-06-05 21:51:09.676173+00', '59eab084-2769-4a5a-81fb-38409212c897'),
	('822df3f1-becc-4748-bdaf-4be87bdd8815', '822df3f1-becc-4748-bdaf-4be87bdd8815', '{"sub": "822df3f1-becc-4748-bdaf-4be87bdd8815", "phone": "919865899999", "email_verified": false, "phone_verified": false}', 'phone', '2025-06-05 21:51:09.677472+00', '2025-06-05 21:51:09.67752+00', '2025-06-05 21:51:09.67752+00', '55d69747-f2b5-4edd-9540-a31043802bde'),
	('c8c1667a-1588-4e0c-b320-51a8fe60d315', 'c8c1667a-1588-4e0c-b320-51a8fe60d315', '{"sub": "c8c1667a-1588-4e0c-b320-51a8fe60d315", "email": "staff_919886666666_1749161185250@staff.internal", "email_verified": false, "phone_verified": false}', 'email', '2025-06-05 22:06:26.007621+00', '2025-06-05 22:06:26.007712+00', '2025-06-05 22:06:26.007712+00', '5c175e82-be03-4687-87d6-17ad56d5786c'),
	('c8c1667a-1588-4e0c-b320-51a8fe60d315', 'c8c1667a-1588-4e0c-b320-51a8fe60d315', '{"sub": "c8c1667a-1588-4e0c-b320-51a8fe60d315", "phone": "919886666666", "email_verified": false, "phone_verified": false}', 'phone', '2025-06-05 22:06:26.010152+00', '2025-06-05 22:06:26.010214+00', '2025-06-05 22:06:26.010214+00', '218ad323-3a8d-4a27-a6d1-febfc39160a8'),
	('d3a44dae-b4c5-429e-844b-1a0f18c236c4', 'd3a44dae-b4c5-429e-844b-1a0f18c236c4', '{"sub": "d3a44dae-b4c5-429e-844b-1a0f18c236c4", "email": "8df80f19-d5a8-49db-9da5-81a216b2fbff@placeholder.com", "email_verified": false, "phone_verified": false}', 'email', '2025-06-05 23:22:53.490141+00', '2025-06-05 23:22:53.490197+00', '2025-06-05 23:22:53.490197+00', '13e2f615-f56f-4f12-ac04-962e40bb5e84'),
	('d3a44dae-b4c5-429e-844b-1a0f18c236c4', 'd3a44dae-b4c5-429e-844b-1a0f18c236c4', '{"sub": "d3a44dae-b4c5-429e-844b-1a0f18c236c4", "phone": "919845879999", "email_verified": false, "phone_verified": false}', 'phone', '2025-06-05 23:22:53.492053+00', '2025-06-05 23:22:53.492104+00', '2025-06-05 23:22:53.492104+00', '508036a1-9e6a-4505-aa9f-7a4dc9029826'),
	('7bb63bd5-5196-4a87-88ee-dfba912e1980', '7bb63bd5-5196-4a87-88ee-dfba912e1980', '{"sub": "7bb63bd5-5196-4a87-88ee-dfba912e1980", "email": "staff_919869885777_1749167143113@staff.internal", "email_verified": false, "phone_verified": false}', 'email', '2025-06-05 23:45:43.862102+00', '2025-06-05 23:45:43.86216+00', '2025-06-05 23:45:43.86216+00', 'f10e0fed-6cf6-404c-be01-bbe4610f7202'),
	('7bb63bd5-5196-4a87-88ee-dfba912e1980', '7bb63bd5-5196-4a87-88ee-dfba912e1980', '{"sub": "7bb63bd5-5196-4a87-88ee-dfba912e1980", "phone": "919869885777", "email_verified": false, "phone_verified": false}', 'phone', '2025-06-05 23:45:43.864346+00', '2025-06-05 23:45:43.86441+00', '2025-06-05 23:45:43.86441+00', 'f9cfe4c4-24e7-43b3-b65b-d7d388638997'),
	('1ea8b881-12f7-4f69-8cc6-e50bfeef3df1', '1ea8b881-12f7-4f69-8cc6-e50bfeef3df1', '{"sub": "1ea8b881-12f7-4f69-8cc6-e50bfeef3df1", "email": "staff_919875555555_1749167385372@staff.internal", "email_verified": false, "phone_verified": false}', 'email', '2025-06-05 23:49:45.582481+00', '2025-06-05 23:49:45.582538+00', '2025-06-05 23:49:45.582538+00', '19b97e7e-03e6-4eb6-bf6b-19f1df894fe1'),
	('1ea8b881-12f7-4f69-8cc6-e50bfeef3df1', '1ea8b881-12f7-4f69-8cc6-e50bfeef3df1', '{"sub": "1ea8b881-12f7-4f69-8cc6-e50bfeef3df1", "phone": "919875555555", "email_verified": false, "phone_verified": false}', 'phone', '2025-06-05 23:49:45.583238+00', '2025-06-05 23:49:45.58329+00', '2025-06-05 23:49:45.58329+00', 'f78dfa2e-2cf9-4871-a913-ae59c6c5ed95'),
	('70f9d47e-66b5-45ef-b2a5-921bfc0f874e', '70f9d47e-66b5-45ef-b2a5-921bfc0f874e', '{"sub": "70f9d47e-66b5-45ef-b2a5-921bfc0f874e", "email": "staff_918999999997_1749167638880@staff.internal", "email_verified": false, "phone_verified": false}', 'email', '2025-06-05 23:53:59.081431+00', '2025-06-05 23:53:59.081482+00', '2025-06-05 23:53:59.081482+00', '2dedfd0b-5cba-4e34-9593-7e1e08df481b'),
	('70f9d47e-66b5-45ef-b2a5-921bfc0f874e', '70f9d47e-66b5-45ef-b2a5-921bfc0f874e', '{"sub": "70f9d47e-66b5-45ef-b2a5-921bfc0f874e", "phone": "918999999997", "email_verified": false, "phone_verified": false}', 'phone', '2025-06-05 23:53:59.082884+00', '2025-06-05 23:53:59.082931+00', '2025-06-05 23:53:59.082931+00', '9801eea8-1fb1-4d31-9ee2-6b29708ae08b');


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag") VALUES
	('aebda2f9-2331-457f-8d08-d97d658abfcd', 'c604308e-56ae-4658-994f-0c722d991c22', '2025-06-05 21:43:24.189857+00', '2025-06-06 06:25:58.216445+00', NULL, 'aal1', NULL, '2025-06-06 06:25:58.216348', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36', '103.120.51.231', NULL);


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") VALUES
	('aebda2f9-2331-457f-8d08-d97d658abfcd', '2025-06-05 21:43:24.219313+00', '2025-06-05 21:43:24.219313+00', 'password', '1b9ae7bb-e15c-4dd0-8800-a075aa410091');


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") VALUES
	('00000000-0000-0000-0000-000000000000', 1, 'tjuxw7z5bk65', 'c604308e-56ae-4658-994f-0c722d991c22', true, '2025-06-05 21:43:24.200928+00', '2025-06-05 23:13:03.39638+00', NULL, 'aebda2f9-2331-457f-8d08-d97d658abfcd'),
	('00000000-0000-0000-0000-000000000000', 2, 'qumsgbxuqpk7', 'c604308e-56ae-4658-994f-0c722d991c22', true, '2025-06-05 23:13:03.40269+00', '2025-06-06 06:25:58.198592+00', 'tjuxw7z5bk65', 'aebda2f9-2331-457f-8d08-d97d658abfcd'),
	('00000000-0000-0000-0000-000000000000', 3, 'rzihcow4tpls', 'c604308e-56ae-4658-994f-0c722d991c22', false, '2025-06-06 06:25:58.207858+00', '2025-06-06 06:25:58.207858+00', 'qumsgbxuqpk7', 'aebda2f9-2331-457f-8d08-d97d658abfcd');


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("password", "id", "instance_id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous", "user_metadata") OVERRIDING SYSTEM VALUE VALUES
	(NULL, '70f9d47e-66b5-45ef-b2a5-921bfc0f874e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'staff_918999999997_1749167638880@staff.internal', '$2a$10$6uu8sn0kCEyeNEm8AF65/ucGscqUWUUgrnofHHELpeJM.mM6k2vE.', '2025-06-05 23:53:59.084841+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email", "phone"]}', '{"role": "employee", "full_name": "DemoCustomer", "employee_id": "d50231d0-5c9d-4280-a81e-3b75bc833f98", "email_verified": true}', NULL, '2025-06-05 23:53:59.080028+00', '2025-06-05 23:53:59.085634+00', '918999999997', NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false, NULL),
	(NULL, 'c604308e-56ae-4658-994f-0c722d991c22', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'phone_919115487749_6f8de93490ce5313@example.com', '$2a$10$bk/HqnSNfcaP0xNgMZ19PuepnDCEhEuXoAfOfar3Dh39kXTMmJGam', '2025-06-05 21:43:20.131701+00', NULL, '', NULL, '', NULL, '', '', NULL, '2025-06-05 21:43:24.188836+00', '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2025-06-05 21:43:20.086979+00', '2025-06-06 06:25:58.21052+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false, NULL);


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

INSERT INTO "public"."profiles" ("id", "user_id", "phone_number", "phone_verified", "full_name", "lead_source", "role", "wallet_balance", "last_used", "communication_consent", "communication_channel", "visit_count", "referrer_id", "referral_wallet") VALUES
	('c604308e-56ae-4658-994f-0c722d991c22', 'c604308e-56ae-4658-994f-0c722d991c22', '919115487749', true, 'NBathini', 'facebook', 'admin', 0, '2025-06-05 21:43:22.051+00', true, 'whatsapp', 0, NULL, 0),
	('70f9d47e-66b5-45ef-b2a5-921bfc0f874e', '70f9d47e-66b5-45ef-b2a5-921bfc0f874e', '918999999997', true, 'DemoCustomer', NULL, 'employee', 0, '2025-06-05 23:54:00.51+00', true, 'whatsapp', 0, NULL, 0);


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
	('71694fd8-66cd-4ab2-9d72-51cc9c363b0e', 'Demo Hair Style', 200.00, 300.00, 15, '', 'active', '2025-06-05 21:49:56.281398+00', '2025-06-05 21:49:56.281398+00', '{}', 'male', NULL);


--
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: business_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."business_details" ("id", "name", "phone", "country", "currency", "logo_url", "facebook_url", "twitter_url", "instagram_url", "website_url", "created_at", "updated_at") VALUES
	('a35d913e-c520-4926-aff0-ce9fb8dc1546', 'Alpha Salon', '+91 98765 43210', 'India', 'INR', NULL, '', '', '', '', '2025-06-05 23:28:15.608188+00', '2025-06-05 23:28:15.608188+00');


--
-- Data for Name: cache; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: cart_items; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."categories" ("id", "name", "created_at", "updated_at") VALUES
	('0d4517b7-a8c4-49c5-bbc4-93cc8bb8d5e4', 'Demo Hair Style', '2025-06-05 21:49:29.253816+00', '2025-06-05 21:49:29.253816+00');


--
-- Data for Name: closed_periods; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: locations; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."locations" ("id", "name", "address", "phone", "email", "status", "created_at", "updated_at", "city", "state", "zip_code", "country", "is_active") VALUES
	('73ebc8a5-306d-450e-958c-db05c2fb72ea', 'DemoLocation', 'DemoLocation', '', '', 'active', '2025-06-05 21:48:41.249199+00', '2025-06-06 06:57:14.717104+00', '', '', '', 'India', true);


--
-- Data for Name: closed_periods_locations; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: coupon_services; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: memberships; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: customer_memberships; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: dashboard_configs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: dashboard_widgets; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: discount_reward_usage_config; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: employee_availability; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: employee_commission_flat_rules; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: employee_commission_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: employee_compensation; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: employee_compensation_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: employee_locations; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."employee_locations" ("employee_id", "location_id", "created_at", "updated_at") VALUES
	('d50231d0-5c9d-4280-a81e-3b75bc833f98', '73ebc8a5-306d-450e-958c-db05c2fb72ea', '2025-06-06 06:55:53.647832+00', '2025-06-06 06:55:53.647832+00');


--
-- Data for Name: employee_skills; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."employee_skills" ("employee_id", "service_id", "created_at") VALUES
	('d50231d0-5c9d-4280-a81e-3b75bc833f98', '71694fd8-66cd-4ab2-9d72-51cc9c363b0e', '2025-06-06 06:55:53.310142+00');


--
-- Data for Name: employee_verification_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."employee_verification_codes" ("id", "employee_id", "code", "created_at", "expires_at") VALUES
	('e58e7037-92e4-4e89-814b-4ac72b85d70f', 'd50231d0-5c9d-4280-a81e-3b75bc833f98', '557896', '2025-06-05 23:54:01.133902+00', '2025-06-06 23:54:01.024+00');


--
-- Data for Name: employee_verification_links; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: financial_reports; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: flat_commission_rules; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: inventory_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: inventory_items; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: inventory_items_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: inventory_location_items; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: inventory_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: inventory_units; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: location_hours; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."location_hours" ("id", "location_id", "day_of_week", "start_time", "end_time", "is_closed", "created_at", "updated_at") VALUES
	('41a1dfbb-ce14-416f-afa3-d363636c3216', '73ebc8a5-306d-450e-958c-db05c2fb72ea', 0, '10:00:00', '16:00:00', true, '2025-06-05 21:48:42.471585+00', '2025-06-05 21:48:42.471585+00'),
	('a6efcc04-01a5-4e14-ad20-b1e4505953aa', '73ebc8a5-306d-450e-958c-db05c2fb72ea', 1, '09:00:00', '18:00:00', false, '2025-06-05 21:48:42.471585+00', '2025-06-05 21:48:42.471585+00'),
	('7953b8ba-f369-4902-a467-f73ec29083da', '73ebc8a5-306d-450e-958c-db05c2fb72ea', 2, '09:00:00', '18:00:00', false, '2025-06-05 21:48:42.471585+00', '2025-06-05 21:48:42.471585+00'),
	('64e2fec1-d10f-4b6d-9d6a-18b58af491f0', '73ebc8a5-306d-450e-958c-db05c2fb72ea', 3, '09:00:00', '18:00:00', false, '2025-06-05 21:48:42.471585+00', '2025-06-05 21:48:42.471585+00'),
	('50228980-645a-460c-8127-2120366312ff', '73ebc8a5-306d-450e-958c-db05c2fb72ea', 4, '09:00:00', '18:00:00', false, '2025-06-05 21:48:42.471585+00', '2025-06-05 21:48:42.471585+00'),
	('2b764216-3f26-4df1-bf85-b0363dbc3704', '73ebc8a5-306d-450e-958c-db05c2fb72ea', 5, '09:00:00', '18:00:00', false, '2025-06-05 21:48:42.471585+00', '2025-06-05 21:48:42.471585+00'),
	('bbdb458d-d964-45e1-98af-a5b06edc0c27', '73ebc8a5-306d-450e-958c-db05c2fb72ea', 6, '09:00:00', '18:00:00', false, '2025-06-05 21:48:42.471585+00', '2025-06-05 21:48:42.471585+00');


--
-- Data for Name: location_tax_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: loyalty_program_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: membership_sales; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: messaging_providers; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."messaging_providers" ("id", "provider_name", "is_active", "configuration", "created_at", "updated_at", "is_default", "is_otp_provider") VALUES
	('c7eb1503-a80b-4bb9-9185-e4032bb0ca38', 'twofactor', true, '{"api_key": "55bb48aa-2727-11f0-8b17-0200cd936042", "sender_id": "ALPHAS", "template_name": "OTP"}', '2025-06-05 21:40:53.481738+00', '2025-06-05 21:40:53.481738+00', true, true);


--
-- Data for Name: notification_queue; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: package_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: package_services; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: pay_period_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: pay_periods; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: pay_runs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: pay_run_items; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: payment_methods; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: phone_auth_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."phone_auth_codes" ("id", "phone_number", "code", "created_at", "expires_at", "full_name", "lead_source") VALUES
	('5553357b-6e58-4991-9752-b07657575417', '919869885777', '634464', '2025-06-05 23:45:10.462323+00', '2025-06-06 23:45:09.586+00', 'DemoEmployee', 'employee_onboarding'),
	('6b30d93e-53ea-4913-b33a-787856cbfe5b', '919875555555', '846658', '2025-06-05 23:48:58.098997+00', '2025-06-06 23:48:56.725+00', 'DemoEmployee', 'employee_onboarding'),
	('b3823713-fc3c-45c5-81de-51c374e32667', '918999999997', '161219', '2025-06-05 23:53:39.539189+00', '2025-06-06 23:53:38.657+00', 'DemoCustomer', 'employee_onboarding'),
	('6404cfcd-70bd-4d62-bd0e-88f6c7ad65c7', '918999999997', '557896', '2025-06-05 23:54:01.393078+00', '2025-06-06 23:54:01.024+00', 'DemoCustomer', 'employee_onboarding');


--
-- Data for Name: purchase_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: purchase_order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: receipt_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: recurring_shifts; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."recurring_shifts" ("id", "employee_id", "day_of_week", "effective_from", "effective_until", "created_at", "updated_at", "start_time", "end_time", "location_id") VALUES
	('2e59154e-ded7-4281-9215-3672c0c8e481', 'd50231d0-5c9d-4280-a81e-3b75bc833f98', 0, '2025-06-06', NULL, '2025-06-06 06:56:43.165736+00', '2025-06-06 06:56:43.165736+00', '09:00:00', '17:00:00', '73ebc8a5-306d-450e-958c-db05c2fb72ea'),
	('b6c31d18-dbbe-4d2d-972b-3e31fe8df0eb', 'd50231d0-5c9d-4280-a81e-3b75bc833f98', 1, '2025-06-06', NULL, '2025-06-06 06:56:43.165736+00', '2025-06-06 06:56:43.165736+00', '09:00:00', '17:00:00', '73ebc8a5-306d-450e-958c-db05c2fb72ea'),
	('9c5e174a-eada-4b6c-b924-dba5f0cb0993', 'd50231d0-5c9d-4280-a81e-3b75bc833f98', 2, '2025-06-06', NULL, '2025-06-06 06:56:43.165736+00', '2025-06-06 06:56:43.165736+00', '09:00:00', '17:00:00', '73ebc8a5-306d-450e-958c-db05c2fb72ea'),
	('89a3f84d-7793-4b40-8df1-f4b755dbd28f', 'd50231d0-5c9d-4280-a81e-3b75bc833f98', 3, '2025-06-06', NULL, '2025-06-06 06:56:43.165736+00', '2025-06-06 06:56:43.165736+00', '09:00:00', '17:00:00', '73ebc8a5-306d-450e-958c-db05c2fb72ea'),
	('57874748-8ede-4e6a-95aa-d210b0f19906', 'd50231d0-5c9d-4280-a81e-3b75bc833f98', 4, '2025-06-06', NULL, '2025-06-06 06:56:43.165736+00', '2025-06-06 06:56:43.165736+00', '09:00:00', '17:00:00', '73ebc8a5-306d-450e-958c-db05c2fb72ea'),
	('d2c306fd-c3d5-4bcd-a405-a9b03a344a99', 'd50231d0-5c9d-4280-a81e-3b75bc833f98', 5, '2025-06-06', NULL, '2025-06-06 06:56:43.165736+00', '2025-06-06 06:56:43.165736+00', '09:00:00', '17:00:00', '73ebc8a5-306d-450e-958c-db05c2fb72ea'),
	('d3f7aa5b-596a-4c80-be86-6bfaffa98a77', 'd50231d0-5c9d-4280-a81e-3b75bc833f98', 6, '2025-06-06', NULL, '2025-06-06 06:56:43.165736+00', '2025-06-06 06:56:43.165736+00', '09:00:00', '17:00:00', '73ebc8a5-306d-450e-958c-db05c2fb72ea');


--
-- Data for Name: referral_program; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: service_inventory_requirements; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: service_locations; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."service_locations" ("service_id", "location_id", "created_at") VALUES
	('71694fd8-66cd-4ab2-9d72-51cc9c363b0e', '73ebc8a5-306d-450e-958c-db05c2fb72ea', '2025-06-05 21:49:57.416003+00');


--
-- Data for Name: services_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."services_categories" ("service_id", "category_id", "created_at") VALUES
	('71694fd8-66cd-4ab2-9d72-51cc9c363b0e', '0d4517b7-a8c4-49c5-bbc4-93cc8bb8d5e4', '2025-06-05 21:49:56.607384+00');


--
-- Data for Name: shifts; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: supplier_items; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: tiered_commission_slabs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: time_off_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

INSERT INTO "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id") VALUES
	('services', 'services', NULL, '2025-01-15 16:47:54.827704+00', '2025-01-15 16:47:54.827704+00', true, false, NULL, NULL, NULL);


--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

INSERT INTO "storage"."objects" ("id", "bucket_id", "name", "owner", "created_at", "updated_at", "last_accessed_at", "metadata", "version", "owner_id", "user_metadata") VALUES
	('0b568e4c-941e-4fa7-a4eb-b6756d295e83', 'services', '7005db91-6f58-4659-8b3c-857dd4663909.png', 'bc80482e-2008-4f25-919a-fe4b5f251bae', '2025-01-15 16:49:22.057739+00', '2025-01-15 16:49:22.057739+00', '2025-01-15 16:49:22.057739+00', '{"eTag": "\"40ec2aa1513a490d43b0a83f0d411e3e\"", "size": 46323, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2025-01-15T16:49:22.000Z", "contentLength": 46323, "httpStatusCode": 200}', 'c38ba4c6-fe08-40d3-88b3-1486ac27a416', 'bc80482e-2008-4f25-919a-fe4b5f251bae', '{}'),
	('6d7461ea-0962-4ef4-af3a-0b25445dbfed', 'services', 'Screenshot 2025-05-06 052142.png', NULL, '2025-05-06 00:29:37.370359+00', '2025-05-06 00:29:37.370359+00', '2025-05-06 00:29:37.370359+00', '{"eTag": "\"5d9a4329b5c604613ed8e5cf29da3dba-1\"", "size": 22280, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2025-05-06T00:29:37.000Z", "contentLength": 22280, "httpStatusCode": 200}', '2e5e20de-2c52-4ec3-863f-0987dc17b8f7', NULL, NULL),
	('c784318c-26d1-453b-a80e-e2611023bcb5', 'services', 'c11a6b86-d798-4282-9fda-d4325d7f63ed.png', '1ae7dcd5-ec21-4979-b14d-3c0e5fd49e4a', '2025-05-08 16:36:42.524254+00', '2025-05-08 16:36:42.524254+00', '2025-05-08 16:36:42.524254+00', '{"eTag": "\"d3919cde8381f1e57d2fe003c2e859e8\"", "size": 110613, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2025-05-08T16:36:43.000Z", "contentLength": 110613, "httpStatusCode": 200}', 'a90c4277-3717-49c6-8ec1-20092318902f', '1ae7dcd5-ec21-4979-b14d-3c0e5fd49e4a', '{}'),
	('15e90555-d087-4296-8920-77f1e727b0ef', 'services', 'profiles/46cb6cae-e574-4862-a434-b7201e8a743a.png', '5271e0a3-cb6c-49b1-909a-97a53e7bb5a9', '2025-05-16 21:00:52.73539+00', '2025-05-16 21:00:52.73539+00', '2025-05-16 21:00:52.73539+00', '{"eTag": "\"624eca3bc9d9093c1182ffb096cc009f\"", "size": 186229, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2025-05-16T21:00:53.000Z", "contentLength": 186229, "httpStatusCode": 200}', 'f07855fc-da86-4663-a86b-28e67eea8afb', '5271e0a3-cb6c-49b1-909a-97a53e7bb5a9', '{}');


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: hooks; Type: TABLE DATA; Schema: supabase_functions; Owner: supabase_functions_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 3, true);


--
-- Name: packages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."packages_id_seq"', 1, false);


--
-- Name: system_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."system_settings_id_seq"', 1, false);


--
-- Name: hooks_id_seq; Type: SEQUENCE SET; Schema: supabase_functions; Owner: supabase_functions_admin
--

SELECT pg_catalog.setval('"supabase_functions"."hooks_id_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

RESET ALL;
