# Robotics operations map

This page hosts an encrypted, self-contained research viewer. The map's private
Notion evidence is not stored in plaintext in this public repository.

The shared URL carries a 256-bit key in its fragment. Browser JavaScript decrypts
`map.encrypted` using AES-GCM and opens the result in an isolated frame. The key is
neither sent to the server nor saved in browser storage. Anyone with the complete
link can open the map. Do not commit access links or keys here.

Payload format: `ROMAP001` (8 bytes), random IV (12 bytes), ciphertext and a 16-byte
authentication tag. Additional authenticated data: `robotics-operations-map/v1`.

The map shows one global operation-distance view with work-sector colours. Find
an operation or company, inspect its three closest alternatives and explained
scores, then move between operations and go Back. Company claims, source evidence
and substeps remain inspectable. Fit restores the overview. Deployment uses the
repository's existing GitHub Pages workflow.
