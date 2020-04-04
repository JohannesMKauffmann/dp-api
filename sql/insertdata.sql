USE `dataprocessing-johannes`

load data local infile 'C:\\Users\\Johannes\\Documents\\Github\\dp-api\\data\\emissies.csv' into table emissies
fields terminated by ';'
enclosed by '"'
lines terminated by '\n'
ignore 1 lines;

load data local infile 'C:\\Users\\Johannes\\Documents\\Github\\dp-api\\data\\brandstofafzet-wegverkeer.csv' into table brandstofafzet
fields terminated by ';'
enclosed by '"'
lines terminated by '\n'
ignore 1 lines;

load data local infile 'C:\\Users\\Johannes\\Documents\\Github\\dp-api\\data\\pompprijzen.csv' into table pompprijzen
fields terminated by ';'
enclosed by '"'
lines terminated by '\n'
ignore 1 lines;