# Native Alignment Proof Utilities

These utilities compare `AlignmentObservation` metadata only.

They can detect neutral signals such as shared dimensions, complementary polarity, possible tension, missing counterpart, contradiction signal, evidence gap, and uncertainty.

They do not:

- score
- rank
- calculate fit
- create recommendations
- inspect module-specific schemas
- interpret protected prompts
- generate artifacts

The utilities do not import Human Discovery or Opportunity Discovery modules. Harness code may pass fixture observations into these generic utilities.
