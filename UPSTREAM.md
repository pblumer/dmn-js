# Upstream maintenance

This repository is a maintained fork of [`bpmn-io/dmn-js`](https://github.com/bpmn-io/dmn-js).

Its purpose is to add generic DMN 1.5 authoring capabilities while preserving the mature dmn-js editing experience and staying as close as practical to upstream. The fork is shared infrastructure for projects such as Atlas and Temis; it must not become an Atlas- or Temis-specific editor.

## Upstream

- Repository: `https://github.com/bpmn-io/dmn-js.git`
- Upstream default branch: `develop`
- Fork repository: `https://github.com/pblumer/dmn-js.git`
- Fork default branch: `develop`

For a local checkout, configure the remotes as follows:

```bash
git remote -v
git remote add upstream https://github.com/bpmn-io/dmn-js.git
git fetch upstream
```

If an `upstream` remote already exists, do not add it again.

## Fork scope

Changes maintained in this fork should remain generic DMN modeler functionality, primarily:

- DMN 1.5 authoring support;
- support for DMN 1.5 boxed expressions;
- DRD/DRG modeling required by DMN 1.5;
- BKM and Decision Service authoring;
- integration with the maintained `pblumer/dmn-moddle` DMN 1.5 metamodel where upstream does not yet provide equivalent support;
- generic extension points for validation or editor integrations;
- tests and fixtures proving correct authoring and XML round-tripping.

This repository must **not** contain:

- Atlas project, deployment, storage, process, or BusinessRuleTask behavior;
- Temis server, runtime, or evaluation behavior;
- hard-coded calls to Atlas or Temis HTTP APIs;
- a second FEEL parser or evaluator;
- product-specific UI flows that cannot reasonably be useful to other dmn-js consumers.

The primary integration contract with consuming applications remains the public dmn-js API and standard DMN XML.

## DMN 1.5 model dependency

DMN 1.5 authoring depends on a DMN 1.5-capable moddle layer.

Until upstream `bpmn-io/dmn-moddle` provides the required support, this fork may use `pblumer/dmn-moddle`. Such dependency changes must be explicit and pinned to a tested version, tag, or commit.

Do not duplicate moddle descriptors or XML parsing logic inside dmn-js merely to avoid the dependency boundary.

## Source of truth

The OMG DMN specification defines normative DMN authoring and serialization behavior.

Temis may be used as a compatibility oracle and as a source of representative DMN 1.5 models because it implements the corresponding DMN semantics. Its editor implementation may inform UX and test coverage, but Temis-specific behavior must not leak into this fork.

## Keeping the fork current

Before starting a feature, fetch upstream and integrate the latest upstream default branch:

```bash
git fetch upstream
git checkout develop
git merge upstream/develop
```

Resolve conflicts in favor of preserving upstream behavior unless the conflicting code is intentionally required for DMN 1.5 support.

Keep upstream synchronization separate from feature work whenever practical. Avoid combining a large upstream merge with unrelated refactoring.

After synchronization, run the upstream verification suite before adding fork-specific changes:

```bash
npm ci
npm run ci
```

## Development policy

Prefer small, independently reviewable DMN 1.5 slices.

For each authoring feature:

1. identify or add a failing DMN 1.5 fixture/editor test;
2. confirm whether upstream already contains reusable infrastructure;
3. implement the smallest generic change required;
4. verify XML import/save/re-import behavior;
5. verify existing supported DMN models still work;
6. keep the change suitable for a later upstream pull request where possible.

Do not reimplement capabilities already provided by existing dmn-js packages unless the current implementation is incompatible with DMN 1.5 and the reason is documented.

## FEEL integration

This fork must not introduce a competing FEEL implementation.

If richer FEEL validation is required, expose or use a generic extension/service boundary. A consumer may back that boundary with `pblumer/feel`, Temis, WASM, or another compatible implementation without making dmn-js depend directly on a specific runtime product.

## Branding and licensing

The bpmn.io licensing and branding requirements are accepted for this fork.

Do not remove or obscure required bpmn.io attribution or the powered-by watermark. Preserve upstream license notices and third-party notices when modifying or redistributing the fork.

## Upstream contribution policy

Generic improvements should be structured so they can be proposed back to `bpmn-io/dmn-js` as focused pull requests.

When possible:

- keep upstreamable commits free of `pblumer`, Atlas, or Temis-specific naming;
- avoid broad formatting or dependency churn unrelated to the feature;
- follow existing dmn-js architecture and package boundaries;
- retain upstream coding style and test conventions;
- reference the relevant OMG DMN specification behavior for non-trivial changes.

The long-term goal is to shrink or eliminate the fork delta if upstream adopts the required DMN 1.5 capabilities.

## Releases and consumers

Atlas and Temis must consume an explicit released version, tag, or commit of this fork. They must not depend on a floating development branch for reproducible builds.

A release intended for Atlas or Temis should record:

- the upstream dmn-js baseline;
- the `pblumer/dmn-moddle` revision used;
- the DMN 1.5 authoring features covered by tests;
- known gaps versus the target DMN 1.5 feature matrix.
