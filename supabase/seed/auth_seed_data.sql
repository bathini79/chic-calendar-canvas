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
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 3, true);


--
-- PostgreSQL database dump complete
--

RESET ALL;
