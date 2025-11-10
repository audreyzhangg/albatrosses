#!/usr/bin/env python3
"""
Builds:
- ../data/species_colonies.json
- ../data/species_calendar.csv (stub: fill with breeding/migration/nonbreeding/absent/unknown)

Input expected at ../raw/seabird-data-export.csv with columns:
common_name, scientific_name, site_country, site_name, colony_name,
lat_colony, lon_colony, ntracks, nbirds, npoints, years, min_year, max_year
"""
import json, re
import pandas as pd
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'raw'
DATA = ROOT / 'data'
DATA.mkdir(exist_ok=True, parents=True)

src = RAW / 'seabird-data-export.csv'
df = pd.read_csv(src)

use_cols = ['common_name','scientific_name','site_name','site_country','colony_name',
            'lat_colony','lon_colony','years','min_year','max_year','ntracks','nbirds','npoints']
df = df[use_cols].dropna(subset=['common_name','lat_colony','lon_colony'])
df['colony_name'] = df['colony_name'].fillna('Unknown colony')
df['site_name'] = df['site_name'].fillna('Unknown site')
df['site_country'] = df['site_country'].fillna('Unknown country')

group_cols = ['common_name','scientific_name','site_country','site_name','colony_name','lat_colony','lon_colony']
agg = (df.groupby(group_cols)
         .agg(ntracks=('ntracks','sum'),
              nbirds=('nbirds','sum'),
              npoints=('npoints','sum'),
              min_year=('min_year','min'),
              max_year=('max_year','max'),
              years=('years', lambda s: sorted({y for x in s.dropna().astype(str).tolist()
                                                for y in re.findall(r'\d{4}', x)})))
         .reset_index())

species_list = []
for (common_name, sci), sdf in agg.groupby(['common_name','scientific_name']):
    colonies = []
    for _,r in sdf.iterrows():
        colonies.append({
            'colony_name': r['colony_name'],
            'site_name': r['site_name'],
            'country': r['site_country'],
            'lat': float(r['lat_colony']),
            'lon': float(r['lon_colony']),
            'ntracks': int(r['ntracks']) if pd.notna(r['ntracks']) else None,
            'nbirds': int(r['nbirds']) if pd.notna(r['nbirds']) else None,
            'npoints': int(r['npoints']) if pd.notna(r['npoints']) else None,
            'min_year': int(r['min_year']) if pd.notna(r['min_year']) else None,
            'max_year': int(r['max_year']) if pd.notna(r['max_year']) else None,
            'years': r['years']
        })
    species_list.append({'common_name': common_name, 'scientific_name': sci, 'colonies': colonies})

(DATA / 'species_colonies.json').write_text(json.dumps(
    {'generated_from': src.name, 'species_count': len(species_list), 'species': species_list},
    indent=2))

months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
cal = pd.DataFrame({'common_name':[s['common_name'] for s in species_list]})
for m in months: cal[m] = 'unknown'
cal.to_csv(DATA / 'species_calendar.csv', index=False)
print("Wrote data/species_colonies.json and data/species_calendar.csv")
