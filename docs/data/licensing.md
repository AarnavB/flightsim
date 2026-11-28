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


## Stage 3 additions

Stage 3 uses original TypeScript simulation code and existing project dependencies only. It adds no aircraft mesh, cockpit model, texture, sound recording, JSBSim source, JSBSim binary, XML aircraft configuration, external navigation dataset or external service. The procedural aircraft visual remains an original low-detail approximation, not a licensed C172P model.

No new package dependency was added. The existing React, React DOM, React Three Fiber, Three.js, TypeScript, Vite, Vitest, Playwright and Node type packages remain the only direct dependencies. The dependency manifest is unchanged.

### JSBSim licensing gate

JSBSim upstream is licensed under LGPL-2.1. That licence applies to JSBSim code; individual aircraft data/configuration files and non-code media still require their own source/header and redistribution review. No JSBSim code or aircraft files are copied into this repository. A future integration must retain required notices, provide the corresponding source/licence materials, and document the licence of each aircraft configuration actually shipped.

Official references: [JSBSim source repository and licence](https://github.com/JSBSim-Team/jsbsim), [upstream COPYING file](https://github.com/JSBSim-Team/jsbsim/blob/master/COPYING), and [JSBSim licensing notes](https://jsbsim-team.github.io/jsbsim-reference-manual/licensing/).


No Stage 3 asset or package has been added. Environmental and propulsion code is original project source. The JSBSim discussion in the Stage 3 architecture document is an investigation only: upstream JSBSim is LGPL-2.1, and no upstream code, WASM binary, wrapper or aircraft configuration is currently included. A future JSBSim integration must separately record the selected version, its licence text/notices, and the licence/provenance of every aircraft data file. Do not assume the project licence automatically covers external aircraft data.
