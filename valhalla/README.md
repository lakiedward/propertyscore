# Starea Valhalla pe rulare Smart Check

Serviciu privat pentru rulările viitoare, bazat pe Valhalla 3.9.1. Acest cod nu modifică [workerul din PR 109](https://github.com/lakiedward/propertyscore/pull/109), ADS, baza de date sau infrastructura existentă.

## Contract pentru coordonator și worker

Toate operațiile cer `Authorization: Bearer <token>`. Folosește trei valori distincte, generate aleator din cel puțin 32 de octeți. Nu transmite tokenurile în răspunsuri sau loguri.

| Token                    | Operații permise                                                                                                                                                                                    |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VALHALLA_STATUS_TOKEN`  | `GET /runs/{run_id}` doar citește starea, inclusiv pentru Ernest. Nu înregistrează, nu închide, nu rutează și nu deblochează.                                                                       |
| `VALHALLA_CONTROL_TOKEN` | `PUT /runs/{run_id}` înregistrează un UUID nou; `PUT /runs/{run_id}/fence` închide permanent admiterea și întoarce starea curentă. Ambele apeluri sunt idempotente; niciunul nu redeschide rularea. |
| `VALHALLA_ROUTING_TOKEN` | `GET /runs/{run_id}/status` citește tile-urile; `POST /runs/{run_id}/{route,sources_to_targets,isochrone}` rutează. Toate cer și `X-Valhalla-Ledger: {ledger_id}`.                                  |

Niciun endpoint operațional nu este anonim. Tokenul lipsă sau greșit primește `401`; tokenul valid pentru alt rol primește `403`. Nu există rutare prin rădăcină sau fallback către serverul standard.

| `state`   | Ce înseamnă                                                                                                                                                                                                           |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `idle`    | Admiterea e deschisă și nu există cereri în coadă sau în execuție chiar acum. Nu permite reluarea.                                                                                                                    |
| `busy`    | Există cel puțin o cerere admisă în `queued` sau `running`. `admission` poate fi `open` sau `fenced`.                                                                                                                 |
| `drained` | `admission: "fenced"`, `queued: 0`, `running: 0`. Nu vor fi admise cereri noi pentru rulare.                                                                                                                          |
| `unknown` | Nu se poate confirma. Contorii sunt `null`; lipsa unui ID dă `404` cu `reason: "unknown_run"`, registrul indisponibil dă `503`, iar o rulare întreruptă de o repornire revine cu `200` și motivul `router_restarted`. |

1. Coordonatorul înregistrează un UUID nereutilizabil și salvează `run_id` și `ledger_id` înainte de orice rutare. Workerul folosește numai perechea salvată pentru toate cererile acelei execuții; nu schimbă rularea între faze. Serviciul respinge admiterea după închidere sau cu registrul greșit (`409`), ori la atingerea capacității (`503`).
2. La recuperare, coordonatorul închide rularea veche, fără să o înregistreze din nou, și citește starea. Numai `state: "drained"` pentru exact perechea salvată este dovadă Valhalla. Timeout, lipsă de răspuns, autentificare eșuată, identitate diferită, format neașteptat sau `unknown` nu permit reluarea.
3. O generare nouă cere și dovezile celorlalte servicii. `finished` numără și procesele Valhalla terminate cu eroare; nu confirmă calcularea cu succes a scorurilor, oprirea workerului vechi, a R5/osmium sau a ADS. Nu retroactivează pentru cererile trimise instanței Valhalla standard.

Admiterea și închiderea sunt serializate în SQLite. Cererea este înregistrată înainte de coadă și marcată terminată numai după ieșirea procesului Valhalla, chiar dacă workerul a dispărut. După repornire, rulările cu cereri restante devin permanent `unknown` și închise; serviciul nu reexecută și nu expiră cereri și nu încearcă să reconcilieze procese orfane.

## Fișă pentru operatorul Railway (numai pentru o schimbare aprobată separat)

1. Propune o instanță separată, fără a schimba URL-ul sau configurația instanței folosite de clienții existenți. Construiește din directorul `valhalla/` și folosește punctul de pornire din Dockerfile, fără o comandă alternativă care pornește HTTP-ul standard. Nicio setare Railway nu se aplică prin acest repo.
2. Configurează o singură replică și un volum persistent propriu la `/custom_files`, cu sursele OSM sau tile-urile Valhalla 3.9.1 pentru aria dorită. Instalarea folosește scriptul oficial de pregătire a grafului, fără pornirea API-ului standard; nu include date geografice. Procesul refuză să pornească fără montare. Păstrează `/custom_files/.propertyscore-state/` la restart; nu edita registrul și nu restaura o copie mai veche. Un registru nou nu dovedește nimic despre rulările din cel anterior.
3. Lasă serviciul exclusiv în rețeaua privată Railway, fără domeniu public, port TCP public sau rută printr-un proxy public. Aplicația deschide numai listenerul autentificat, bind IPv6 `::` la `PORT` (implicit `8002`) pentru DNS-ul privat. Nu configura un health check HTTP anonim. Operatorul verifică accesul prin `GET /runs/{run_id}` autentificat.
4. Configurează tokenurile separat: citirea pentru Ernest sau coordonatorul său, rutarea pentru worker și controlul numai pentru coordonatorul care poate închide. Normalizează lipsa accesului la serviciu ca stare necunoscută în coordonator. Dependențele care folosesc HTTP-ul Valhalla standard fără ID și token, inclusiv orice generare de rapoarte, trebuie coordonate înainte de schimbare; acest API nu este o înlocuire transparentă.
5. Înainte de rollout, verifică pe graful și sarcina țintă costul pornirii unui proces Valhalla per cerere. Implicit se execută cel mult două cereri în paralel (`VALHALLA_ROUTING_CONCURRENCY`) și se admit cel mult 16 cereri totale simultane (`VALHALLA_PENDING_LIMIT`). Testul local nu măsoară volumul de producție sau performanța Railway.

API-ul propus transmite răspunsuri JSON native pentru acțiunile listate: rută cu geometrie codificată, matrice și izocrone GeoJSON. Nu este un proxy pentru celelalte acțiuni sau pentru formate binare Valhalla.

## Verificare locală

Pe Linux sunt necesare Docker, compilator C și `osmium` (CLI sau modulul Python). Din rădăcina repo-ului:

```sh
bash valhalla/tests/verify.sh > valhalla-proof.ndjson
docker build --pull=false --network none -t propertyscore-valhalla:local valhalla
```

Proba folosește tile-uri generate dintr-un OSM sintetic, imaginea oficială fixată prin digest, cereri HTTP și semnale reale, fără rețea externă în container. Hook-ul de test oprește cu `SIGSTOP` procesul nativ care deschide un tile; răspunsurile Valhalla și stările registrului nu sunt simulate. Clientul omorât este un proces de probă, nu workerul integral.

Pentru proba imaginii operatorului cu date reale, descarcă separat [extrasul OSM Liechtenstein](https://download.geofabrik.de/europe/liechtenstein-latest.osm.pbf). Cu Docker și OpenSSL instalate, rulează:

```sh
bash valhalla/tests/verify.sh operator /path/to/liechtenstein-latest.osm.pbf 47.1416,9.5215 47.13715,9.52230
```

Comanda construiește numai local, nu deschide porturi pe host și folosește un volum temporar. Verifică geometria rutei, timpii și distanțele matricei, un poligon de izocronă, separarea accesului de citire și persistența stării după repornire. Nu validează graful sau sarcina de producție.

Pentru integrare, exportă local cele trei tokenuri distincte (de exemplu generate cu `openssl rand -hex 32`), apoi pornește `bash valhalla/tests/verify.sh serve`. Serverul ascultă doar pe hostul local, implicit la `http://127.0.0.1:18002`, fără hook; poți adăuga calea unui extract OSM PBF local. Registrul acestei comenzi este temporar. Workerul adaptat folosește baza de date și sursele locale, URL-ul cu prefixul `/runs/{run_id}` și tokenul de rutare, iar coordonatorul independent citește starea cu tokenul de citire.
