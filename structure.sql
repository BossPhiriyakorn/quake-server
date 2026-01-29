--
-- PostgreSQL database dump
--

\restrict 6ACNqYoERAW6wcZz6PlINd4yUrgTeZY2pjys1k2bJtjWkWv45jWsvxCtdyXatXJ

-- Dumped from database version 16.10 (Ubuntu 16.10-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.10 (Ubuntu 16.10-0ubuntu0.24.04.1)

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: sensor_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sensor_logs (
    log_id integer NOT NULL,
    received_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    device_id integer,
    device_name text,
    user_id integer,
    username text,
    mac_address text,
    rssi integer,
    lat text,
    lng text,
    log_time timestamp with time zone,
    acceleration_magnitude double precision,
    deviation double precision,
    pga double precision,
    x double precision,
    y double precision,
    z double precision,
    level text,
    thresholdwarning double precision,
    thresholdcritical double precision
);


--
-- Name: sensor_logs_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sensor_logs_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sensor_logs_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sensor_logs_log_id_seq OWNED BY public.sensor_logs.log_id;


--
-- Name: sensor_logs log_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sensor_logs ALTER COLUMN log_id SET DEFAULT nextval('public.sensor_logs_log_id_seq'::regclass);


--
-- Name: sensor_logs sensor_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sensor_logs
    ADD CONSTRAINT sensor_logs_pkey PRIMARY KEY (log_id);


--
-- Name: idx_log_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_log_time ON public.sensor_logs USING btree (log_time);


--
-- PostgreSQL database dump complete
--

\unrestrict 6ACNqYoERAW6wcZz6PlINd4yUrgTeZY2pjys1k2bJtjWkWv45jWsvxCtdyXatXJ

