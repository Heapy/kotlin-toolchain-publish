# kotlin-toolchain-publish

Run checks and publish **JetBrains Kotlin Toolchain** libraries, or prepare a
Maven Central bundle for inspection. Works on Linux, macOS, and Windows with
Node.js 22+, Bash, and an installed Kotlin Toolchain (>= 0.12.1 for Maven Central).

The default `bundle` mode creates a local Maven Central ZIP. Uploading to a Maven
repository requires the explicit `mode: publish` input.

```yaml
name: Publish library
on:
  workflow_dispatch:
permissions:
  contents: read
jobs:
  publish:
    runs-on: ubuntu-24.04
    environment: release
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v7
      - uses: Heapy/setup-kotlin-toolchain@v1
      - uses: Heapy/kotlin-toolchain-publish@v1
        with:
          mode: publish
          repository: mavenCentral
          central-username: ${{ secrets.CENTRAL_USERNAME }}
          central-password: ${{ secrets.CENTRAL_PASSWORD }}
          signing-key: ${{ secrets.SIGNING_KEY }}
          signing-passphrase: ${{ secrets.SIGNING_PASSPHRASE }}
```

Use release commit SHAs for immutable references. Configure the `release`
environment and its approvals according to your repository's publishing policy.
The action respects `settings.publishing.mavenCentral.publishingMode` in your
module: `manual` stages for portal review; `auto` releases. It does not change
versions, POM metadata, signing settings, repositories, or that release policy.

| Input | Default | Purpose |
|---|---|---|
| `working-directory` | `.` | Project folder relative to workspace |
| `mode` | `bundle` | `bundle` or `publish` |
| `repository` | `mavenCentral` | Repository ID; bundle mode requires mavenCentral |
| `modules` | empty | Comma/whitespace-separated modules; empty selects all eligible modules |
| `transitive` | `false` | Publish local dependencies of selected modules too |
| `check` | `true` | Run registered checks before the operation |
| `central-username` | empty | Central Portal token username |
| `central-password` | empty | Central Portal token password |
| `signing-key` | empty | ASCII-armored PGP private key |
| `signing-passphrase` | empty | Optional key passphrase |
| `upload-artifacts` | `true` | Upload generated JAR/ZIP files after success |
| `artifact-name` | OS/architecture/job based | Unique artifact name |

Outputs: `mode`, `repository`, `published`. `published: true` means the CLI publish
command succeeded, not that a staged Central deployment has been released.

Configure `settings.publishing` in `module.yaml` before use. Central needs POM
metadata, sources, and signing configuration; bundle mode also needs signing
credentials when signing is enabled. An alternative repository must be declared
with `publish: true`. For local integration testing use `mode: publish` and
`repository: mavenLocal`.

Credentials can also be supplied through Kotlin Toolchain's documented environment
variables. Inputs override their matching variables only in the publication process;
Central/signing credentials are withheld from the preliminary check subprocess.
Custom-repository credentials remain under your project's normal configuration.
Keys are never written to disk or cache by this action. Artifact uploads include
JAR and ZIP files under `build/`, retained for seven days; disable uploads if your
build produces unrelated private archives there.

Development: `npm test` and `npm run check`. CI performs actual publication to
Maven Local and verifies its POM/JAR on all three operating systems. It never
publishes test artifacts to Maven Central.

## Related actions

- [setup-kotlin-toolchain](https://github.com/Heapy/setup-kotlin-toolchain)
- [update-kotlin-toolchain](https://github.com/Heapy/update-kotlin-toolchain)
- [kotlin-toolchain-check](https://github.com/Heapy/kotlin-toolchain-check)
