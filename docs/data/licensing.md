# Geographical asset provenance and licensing policy

Phase 1 uses only a locally generated mathematical terrain fixture. It contains no downloaded or redistributed terrain raster, satellite image, building model, airport scenery, road data or map tiles.

Future importers must record for each source:
- Dataset title, publisher and official source URL.
- Version / retrieval date and geographic coverage.
- Licence name and version, attribution wording and redistribution rights.
- Whether the asset is raw source data, transformed data or a render-ready derivative.
- Transformations, coordinate reference system, vertical datum and processing tools.

Potential future inputs include Copernicus DEM and appropriately licensed OpenStreetMap-derived datasets. Their current licences, source-specific terms and attribution conditions must be checked before integration. The public OpenStreetMap tile service must not be treated as an unrestricted automated scenery-download API. No third-party dataset may enter the production asset pipeline without a documented licence review.

## Stage 2 additions

Stage 2 adds only original procedural Three.js geometry for a stylised, game-only high-wing aircraft, synthetic game runway/ground markings, and UI code. It adds no third-party aircraft mesh, texture, sound recording, terrain/elevation dataset, airport database, map tile source or external API. No npm dependency was added for Stage 2. Existing direct dependencies remain as recorded in package.json / pinned versions in package.json; the code continues to use the existing open-source React / Three.js / Vite / TypeScript stack. Any later third-party model, dataset, audio or simulator package still requires its own licence review and attribution before being included.
