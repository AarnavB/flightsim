# Geographic coordinate model

## Source coordinates

The source-data contract uses WGS84 geodetic coordinates:

- Latitude in degrees, limited to [-90, 90].
- Longitude in degrees, normalised to [-180, 180).
- Ellipsoidal height in metres.

The geography package implements WGS84 geodetic-to-ECEF and ECEF-to-geodetic conversion using the ellipsoid's semi-major axis, flattening and eccentricity.

## Local render coordinates

A `LocalTangentFrame` is created from an explicit scene origin. The current procedural region uses a datum near San Francisco International Airport (37.6213°, -122.3790°). This is only the procedural test-scene origin, not a navigation fix.

The local axes follow Three.js convention:

- X = east
- Y = up
- Z = south (negative north)

The frame provides forward and inverse transformations. The origin and WGS84 source coordinates remain independent of local render coordinates. A future global scenery implementation will need origin rebasing or multiple local frames to preserve floating-point precision over long distances.

## Tile addressing

Tile IDs use `level/x/y`. Level zero spans the globe. X increases west-to-east and wraps modulo the number of columns at the antimeridian. Y increases south-to-north and is clamped to the valid polar row. Each parent can materialise exactly four children on demand.

The tree is sparse: only metadata traversed by the current selector or prefetch predictor is created. No array of all possible global tiles is allocated.

## Accuracy limits

The local tangent plane is intended for rendering around the current regional prototype. It is not a high-precision global map projection and must not be used as aircraft navigation, collision or flight-planning truth. Geodesic distance, terrain elevation accuracy and coordinate datum transformations for imported datasets need dedicated validation when real data sources are introduced.
