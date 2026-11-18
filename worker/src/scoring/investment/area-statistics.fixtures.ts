const DATASET = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  license: 'https://creativecommons.org/licenses/by/4.0/',
  dateModified: '2026-11-18T05:14:48.578Z',
};

function datasetScript(url: string, values: Record<string, number>): string {
  const variableMeasured = Object.entries(values).map(([name, value]) => ({
    '@type': 'PropertyValue',
    name,
    value,
  }));
  return `<script type="application/ld+json">${JSON.stringify({ ...DATASET, url, variableMeasured })}</script>`;
}

export const SALE_CITY_PAGE = `<!doctype html><html><head>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[]}</script>
${datasetScript('https://apartamente.org/apartamente-de-vanzare/timisoara', {
  anunțuri: 23627,
  'apartamente distincte': 8755,
  'preț median': 109900,
  'preț median pe metru pătrat': 1984.13,
})}
</head><body>
<div class="grid">
<div class="stat"><b>109.900 €</b><span>preț median</span></div>
<div class="stat"><b>85.000–138.000 €</b><span>intervalul obișnuit (p25–p75)</span></div>
<div class="stat"><b>1.984 €/mp</b><span>preț median pe metru pătrat</span></div>
</div>
<a href="/apartamente-de-vanzare/timisoara/sub-pretul-zonei">Sub prețul zonei</a>
<h2 id="zone">Zone în Timișoara</h2>
<div class="links">
<a href="/apartamente-de-vanzare/timisoara/cetate">Cetate <span class="note">· 209</span></a>
<a href="/apartamente-de-vanzare/timisoara/dambovita">Dâmbovița <span class="note">· 158</span></a>
<a href="/apartamente-de-vanzare/timisoara/lipovei-calea-sever-bocu">Lipovei / Calea Sever Bocu <span class="note">· 25</span></a>
<a href="/apartamente-de-vanzare/timisoara/2-camere">2 camere</a>
<a href="/apartamente-de-vanzare/giroc">Giroc</a>
<a href="/anunt/123">Un anunț</a>
</div>
<h2>Preț median după numărul de camere</h2>
<table>
<tr><th>Camere</th><th>Anunțuri</th><th>Preț median</th><th>€/mp p25</th><th>€/mp median</th><th>€/mp p75</th></tr>
<tr><td><a href="/apartamente-de-vanzare/timisoara/1-camere">1 camere</a></td><td>3.448</td><td>62.000 €</td><td>1.793</td><td>2.108</td><td>2.365</td></tr>
<tr><td>4+</td><td>1.644</td><td>169.900 €</td><td>1.600</td><td>1.850</td><td>2.150</td></tr>
</table>
<h2>De pe ce portaluri vin anunțurile</h2>
<table>
<tr><th>Portal</th><th>Anunțuri</th><th>Doar aici</th></tr>
<tr><td>Portal</td><td>217</td><td>146</td></tr>
</table>
</body></html>`;

export const RENT_ZONE_PAGE = `<!doctype html><html><head>
${datasetScript('https://apartamente.org/apartamente-de-inchiriat/timisoara/cetate', {
  anunțuri: 240,
  'apartamente distincte': 191,
  'preț median': 450,
  'preț median pe metru pătrat': 8.18,
})}
</head><body>
<div class="stat"><b>380–550 €</b><span>intervalul obișnuit (p25–p75)</span></div>
<table>
<tr><th>Camere</th><th>Anunțuri</th><th>Preț median</th><th>€/mp p25</th><th>€/mp median</th><th>€/mp p75</th></tr>
<tr><td>2</td><td>120</td><td>430 €</td><td>7,1</td><td>8,2</td><td>9,6</td></tr>
</table>
</body></html>`;

export const SMALL_ZONE_PAGE = `<!doctype html><html><head>
${datasetScript('https://apartamente.org/apartamente-de-vanzare/timisoara/dambovita', {
  anunțuri: 4,
  'apartamente distincte': 3,
  'preț median': 91000,
  'preț median pe metru pătrat': 1759,
})}
</head><body></body></html>`;

export const INDEX_CSV = `\uFEFF# Indicele apartamente.org, octombrie 2026
# Metodologie: versiunea din 2026-10-14, https://apartamente.org/metodologie; anunțuri active la 2026-10-31
# Prețuri cerute în anunțuri, nu de tranzacție, "cu ghilimele, și virgule
tabel,tranzactie,oras,zona,apartamente,pret_median_eur,eur_mp_median,evolutie_eur_mp_pct,evolutie_zile,evolutie_comparabila
orase,vanzare,București,,39480,130000,2224.49,,,
orase,vanzare,Timișoara,,9427,108000,1969.7,,,
orase,vanzare,Brașov,,6079,123000,2226.9,,,
orase,inchiriere,Timișoara,,6761,420,8.22,,,
orase,inchiriere,Târgu Mureș,,1584,425,7.5,,,
zone-scumpe,vanzare,Timișoara,Aradului West,129,,2480,,,
`;

export const IMOSPOT_CSV = `\uFEFFperioada,categorie,oras,judet,cartier,valoare_mediana,unitate,p25_eur_mp,p75_eur_mp,pret_median_eur,suprafata_mediana_mp,oferte,agentii,variatie_lunara_pct,sursa
2026-11,"Apartamente de vânzare",București,Bucuresti,,2054,EUR/mp,1643,2708,120000,60,1674,35,-1.1,"Indicele Imospot, imospot.ro/indicele-imospot"
2026-11,"Apartamente de vânzare",Timişoara,Timis,,1984,EUR/mp,1748,2318,107000,53,952,10,,"Indicele Imospot, imospot.ro/indicele-imospot"
2026-11,"Apartamente de vânzare",București,Bucuresti,"Titan - Balta Albă",1900,EUR/mp,1700,2100,110000,58,120,9,,"Indicele Imospot, imospot.ro/indicele-imospot"
2026-11,"Apartamente de vânzare",Braşov,Brasov,,2200,EUR/mp,1900,2500,125000,57,300,8,,"Indicele Imospot, imospot.ro/indicele-imospot"
2026-11,"Case și vile de vânzare",Timişoara,Timis,,1500,EUR/mp,1200,1800,250000,160,90,6,,"Indicele Imospot, imospot.ro/indicele-imospot"
2026-11,"Apartamente de închiriat",București,Bucuresti,,580,EUR/luna,,,580,56,991,25,-1.7,"Indicele Imospot, imospot.ro/indicele-imospot"
2026-11,"Apartamente de vânzare",Giroc,Timis,,1917,EUR/mp,1754,2128,103000,53,171,8,-0.2,"Indicele Imospot, imospot.ro/indicele-imospot"
2026-11,"Apartamente de vânzare",Dumbrăviţa,Timis,,2310,EUR/mp,2059,2458,132400,60,43,4,,"Indicele Imospot, imospot.ro/indicele-imospot"
2026-11,"Apartamente de vânzare",Cristian,Brasov,,1700,EUR/mp,1500,1900,95000,56,30,3,,"Indicele Imospot, imospot.ro/indicele-imospot"
2026-10,"Apartamente de vânzare","Târgu Mureş",Mures,,1912,EUR/mp,1703,2164,109000,57,208,5,,"Indicele Imospot, imospot.ro/indicele-imospot"
`;
