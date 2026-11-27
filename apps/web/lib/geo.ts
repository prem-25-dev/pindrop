'use client';
import { geoArea, geoContains, geoDistance, geoPath, geoProjection, type GeoProjection } from 'd3-geo';
import polylabel from 'polylabel';
import { feature, merge } from 'topojson-client';
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon } from 'geojson';
import type { Topology, GeometryCollection } from 'topojson-specification';

/**
 * Map geometry for Explore and the map games.
 * Miller cylindrical (straight meridians, nothing slanted), centred 11°E, same as the backdrop.
 * Everything is computed once in a fixed 1000-wide user space; the SVG scales it to the screen.
 */

export const MAP_W = 1000;
const PAD = 8;

const millerRaw = (lambda: number, phi: number): [number, number] => [lambda, 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * phi))];
millerRaw.invert = (x: number, y: number): [number, number] => [x, 2.5 * Math.atan(Math.exp(0.8 * y)) - 0.625 * Math.PI];

export interface CountryShape {
  code: string;
  d: string;
  /** bounds of the largest landmass, used to fit the flag and to fly to the country */
  box: [[number, number], [number, number]];
  /** projected area of the largest landmass (user units²) */
  area: number;
  centroid: [number, number];
  /** visual centre: the point deepest inside the largest landmass (where a flag emblem should sit) */
  center: [number, number];
}

export interface WorldShapes {
  w: number;
  h: number;
  shapes: CountryShape[];
  disputed: string[];
  projection: GeoProjection;
  /** all land as one outline (no borders), for borderless games */
  land: string;
  /** real outlines per country (lon/lat), for "is this pin inside?" and distances */
  geometry: Map<string, Feature<Polygon | MultiPolygon>[]>;
}

type Shape = Feature<Polygon | MultiPolygon, { disputed?: string }>;

/** km from a [lon, lat] point to a country: 0 if inside, else the distance to its nearest outline point */
export function kmToCountry(p: [number, number], feats: Feature<Polygon | MultiPolygon>[] | undefined): number {
  if (!feats?.length) return Infinity;
  if (feats.some((f) => geoContains(f, p))) return 0;
  let best = Infinity;
  for (const f of feats) {
    const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
    for (const poly of polys) for (const v of poly[0]) best = Math.min(best, geoDistance(p, v as [number, number]));
  }
  return best * 6371;
}

let cache: Promise<WorldShapes> | null = null;

export function loadWorldShapes(): Promise<WorldShapes> {
  cache ??= fetch('/data/manifest.json')
    .then((r) => r.json())
    .then((m: { version: string }) => fetch(`/data/${m.version}/world.topo.json`))
    .then((r) => r.json())
    .then((topo: Topology<{ countries: GeometryCollection<{ disputed?: string }> }>) => build(topo));
  cache.catch(() => (cache = null));
  return cache;
}

function build(topo: Topology<{ countries: GeometryCollection<{ disputed?: string }> }>): WorldShapes {
  const fc = feature(topo, topo.objects.countries) as unknown as FeatureCollection<Polygon | MultiPolygon, { disputed?: string }>;
  const projection = geoProjection(millerRaw).rotate([-11, 0]).fitWidth(MAP_W - PAD * 2, fc as FeatureCollection<Geometry>);
  const [tx, ty] = projection.translate();
  projection.translate([tx + PAD, ty + PAD]);
  const path = geoPath(projection);
  const h = Math.ceil(path.bounds(fc as FeatureCollection<Geometry>)[1][1] + PAD);

  // several features can share a code (e.g. Australia + its Indian Ocean territories)
  const byCode = new Map<string, Shape[]>();
  const disputed: string[] = [];
  for (const f of fc.features as Shape[]) {
    if (!f.id) {
      const d = path(f);
      if (d) disputed.push(d);
      continue;
    }
    const code = String(f.id);
    byCode.set(code, [...(byCode.get(code) ?? []), f]);
  }

  const shapes: CountryShape[] = [];
  for (const [code, feats] of byCode) {
    const polys: Polygon[] = feats.flatMap((f) =>
      f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates.map((coordinates) => ({ type: 'Polygon', coordinates }) as Polygon) : [f.geometry as Polygon],
    );
    const largest = polys.reduce((a, b) => (geoArea(b) > geoArea(a) ? b : a));
    const d = feats.map((f) => path(f) ?? '').join('');
    const box = path.bounds(largest) as [[number, number], [number, number]];
    // pole of inaccessibility, computed on the projected outline (what you actually see)
    const rings = largest.coordinates.map((ring) => ring.map((pt): [number, number] => projection(pt as [number, number]) ?? [0, 0]));
    const precision = Math.max(0.05, Math.min(box[1][0] - box[0][0], box[1][1] - box[0][1]) / 200);
    const pole = polylabel(rings, precision);
    shapes.push({
      code,
      d,
      box,
      area: path.area(largest),
      centroid: path.centroid(largest) as [number, number],
      center: Number.isFinite(pole[0]) ? [pole[0], pole[1]] : (path.centroid(largest) as [number, number]),
    });
  }
  // draw big countries first so small ones sit on top
  shapes.sort((a, b) => b.area - a.area);
  const land = path(merge(topo, topo.objects.countries.geometries as never) as never) ?? '';
  return { w: MAP_W, h, shapes, disputed, projection, land, geometry: byCode as Map<string, Feature<Polygon | MultiPolygon>[]> };
}
