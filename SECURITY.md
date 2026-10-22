# Security Policy

## Supported Versions

Security fixes are generally released only for the latest published npm package
version. Please reproduce the issue with that version before reporting it.

## Purpose and Scope

music-metadata is a library for parsing audio metadata. Its primary goal is to
support files that conform to their format specifications, while tolerating
common deviations found in real-world files.

Robustness against malformed input is best-effort. Reports limited to recoverable
parsing errors or excessive processing time caused by malformed input are outside
this project's security reporting scope and are handled as robustness issues.

Memory consumption that scales reasonably with the actual input size is also
treated as a robustness or application capacity concern. Inputs that trick the
parser into allocating or retaining memory greatly disproportionate to their
actual size are within security reporting scope, whether the files are malformed
or valid.

Memory findings must reproduce with reasonable buffer limits in place. Reports
that rely on missing, disabled, or unreasonably high limits are outside scope.

The library runs within a consuming application; it does not provide or operate
a network service. Accordingly, this policy accepts reports about local parsing
only. Network attack scenarios introduced by consuming applications are outside
this package's security reporting scope.

## Assessing Security Impact

In-scope security reports include:

- Disproportionate memory consumption induced by attacker-controlled input, as
  described above.
- Parser loops triggered by crafted input that cause a fatal crash of the Node.js
  process.

Reports within scope are assessed using the attacker's capabilities, the
conditions required to trigger the behavior, user interaction, and the
consequences for the consuming application.

CVE assessment requires evidence of exploitability and security impact. This
policy describes the project's report handling and maintenance commitments; it
does not determine other parties' vulnerability classifications or CVE assignment
decisions.

## Processing Untrusted Files

When processing untrusted files on a server, enforce a reasonable file size limit
and use a worker thread that the application terminates when a timeout expires.
[Worker threads](https://nodejs.org/api/worker_threads.html) help contain excessive
processing time but do not fully isolate memory exhaustion. Where stronger
isolation is required, use a separate process with memory and CPU limits enforced
by the operating system.

Set `maxMemoryAllocation` to a reasonable value for your deployment. The parsing
APIs use it to configure `maxBufferSize` when creating their tokenizers. When using
`parseFromTokenizer()`, you must also set the caller-side `maxBufferSize` limit on
the supplied tokenizer when creating it. These limits cover specified buffered
payloads and tokenizer lookahead, not total process memory.

## Reporting a Vulnerability

Please report suspected vulnerabilities through the project's
[GitHub Security page](https://github.com/Borewit/music-metadata/security).
Include:

- The affected version, runtime, platform, parsing API, and options used.
- A minimal local reproduction script and the input needed to reproduce the issue.
- The expected behavior and the observed result, with supporting measurements
  where relevant.
- For disproportionate memory consumption, the actual input size, peak memory
  increase over a baseline, how these were measured, and the parser behavior that
  causes the amplification. Where feasible, compare several input sizes to show
  how memory use grows.
- An explanation of what the attacker controls, how the input reaches the parser,
  any required user interaction or application configuration, and the resulting
  security impact.
- Any relevant constraints, existing safeguards, or workarounds, including whether
  the behavior occurs with default parsing options.

### Completeness and Related Findings

Make a reasonable effort to investigate the scope of the underlying problem
before submitting a report, including related parser implementations and shared
helpers. Describe which parsers and formats you checked, any confirmed affected
paths, and the limits of your investigation. An exhaustive audit of every parser
is not required.

Consolidate closely related instances of the same underlying problem into one
report, including instances in different parsers or file formats. A different
parser, format, or crafted input does not by itself establish a separate
vulnerability or justify a separate CVE. Avoid opening parallel reports for these
variants. If you discover additional affected paths after submitting, add them to
your existing report so the scope and remediation can be assessed together.
Reference any related reports you know of and explain what, if anything, makes
your finding distinct. Similar symptoms alone do not establish a shared root
cause; independently caused issues may warrant separate reports.

Duplicate reports may be rejected even when the existing finding is unpublished.
A report may be superseded by a better-documented report of the same underlying
issue.

### AI-Assisted and Automated Reports

AI-assisted discovery can generate potential findings much faster than maintainers
can investigate them. Submitting preliminary findings transfers verification and
impact assessment to maintainers with limited resources.

Before submitting an AI-assisted or automated finding, independently reproduce
the behavior, investigate the relevant parser logic, and provide evidence of
practical exploitability and security impact. Unverified AI output, speculative
attack scenarios, and tool warnings alone are insufficient grounds for a security
report.

Reports lacking verification or a substantiated security impact may be returned
for further investigation before security triage.

## Prioritization and Sustainable Maintenance

music-metadata is maintained with limited resources. Findings are prioritized by
demonstrated impact, realistic exploitation conditions, and the expected benefit
of a fix. A robustness improvement may be worthwhile without requiring an urgent
security release or a CVE.

Proposed mitigations must also account for compatibility with legitimate files,
performance, and regression risk. Arbitrary parsing limits or stricter validation
can have costs and require careful evaluation. Reports and contributions that
identify shared root causes and improve whole classes of parser behavior are
particularly helpful in making security maintenance sustainable.
