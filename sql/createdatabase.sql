CREATE DATABASE `dataprocessing-johannes`;

USE `dataprocessing-johannes`;

CREATE TABLE pompprijzen (
	jaar INT(4) NOT NULL,
	euro95 decimal(4,3) NOT NULL,
	diesel decimal(4,3) NOT NULL,
	lpg decimal(4,3) NOT NULL,
	CONSTRAINT u UNIQUE (jaar)
);

CREATE TABLE emissies (
	bron VARCHAR(17) NOT NULL,
	jaar INT(4) NOT NULL,
	nox decimal(5,2) NOT NULL,
	co2 INT(5) NOT NULL,
	CONSTRAINT u UNIQUE (bron,jaar)
);

CREATE TABLE brandstofafzet (
	jaar INT(4) NOT NULL,
	lpg int(3) NOT NULL,
	euro95 int(4) NOT NULL,
	diesel int(4) NOT NULL,
	CONSTRAINT u UNIQUE (jaar)
);