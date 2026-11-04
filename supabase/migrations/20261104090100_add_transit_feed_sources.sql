insert into private.transit_feed_sources (city_id, operator, url, license)
select c.id, feed.operator, feed.url, null
from (
  values
    ('timisoara', 'STPT Timișoara', 'https://smtt.ro/transit/gtfs/maps/smtt-timisoara-ro.zip'),
    ('bucuresti', 'TPBI București–Ilfov (STB, Metrorex)', 'https://gtfs.tpbi.ro/regional/BUCHAREST-REGION.zip'),
    ('cluj-napoca', 'CTP Cluj-Napoca', 'https://external.gtfs.ro/cluj/CLUJ.zip'),
    ('iasi', 'CTP Iași', 'https://external.gtfs.ro/iasi/IASI.zip'),
    ('constanta', 'CT BUS Constanța', 'https://external.gtfs.ro/constanta/CONSTANTA.zip'),
    ('craiova', 'RAT Craiova', 'https://external.gtfs.ro/craiova/CRAIOVA.zip'),
    ('sibiu', 'Tursib Sibiu', 'https://files.mobilitydatabase.org/mdb-2099/latest.zip'),
    ('oradea', 'OTL Oradea', 'https://external.gtfs.ro/oradea/ORADEA.zip')
) as feed (slug, operator, url)
join public.cities c on c.slug = feed.slug
on conflict (city_id, url) do nothing;
