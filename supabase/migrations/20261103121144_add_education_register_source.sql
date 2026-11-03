update public.scoring_versions
set params = jsonb_set(
  params,
  '{education,register}',
  '{
    "school_year": "2025-2026",
    "url": "https://data.gov.ro/dataset/69392a50-5750-4a54-90c1-d461de44da6d/resource/280d52b6-4c5e-489d-9b48-3dd8961f56e0/download/101_claudia.teodorescu_2025-10-08-14_26_03.055.xlsx",
    "cities": {
      "timisoara": [155252],
      "bucuresti": [179141, 179150, 179169, 179178, 179187, 179196],
      "cluj-napoca": [54984],
      "iasi": [95079],
      "constanta": [60428],
      "craiova": [69919],
      "sibiu": [143469],
      "oradea": [26573],
      "targu-mures": [114328]
    }
  }'::jsonb
)
where kind = 'online' and label = 'v1';
