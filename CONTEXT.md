# Mermaid Canvas

A visual editor for diagrams constrained to a supported flowchart subset. A diagram is edited visually and represented as Mermaid source.

## Language

**Diagram**:
The primary editable artifact: a supported flowchart structure represented by nodes, edges, subgraphs, direction, and node positions.
_Avoid_: Mermaid document, generic diagram when referring to the editable artifact.

**Flowchart**:
The kind of diagram this product edits. It describes the artifact's supported graph form, not a business-process meaning.

**Node**:
A visual flowchart element with a stable diagram-local identifier, visible label, shape, and position. A node has no assumed business meaning.

**Edge**:
A directed relationship from one node to another, with an optional visible label.
_Avoid_: Connection, transition.

**Subgraph**:
A named structural grouping of nodes within a diagram. It is expressed in Mermaid source and participates in diagram layout.
_Avoid_: Group, cluster.

**Direction**:
The diagram's explicit reading and layout direction, such as left-to-right or top-to-bottom.

**Mermaid source**:
A textual representation of a diagram, not a separate domain artifact. It does not preserve node positions.

**Position**:
A node's intentional placement within the diagram. Positions belong to the editor's saved document metadata; selection and viewport do not.

**Diagram-local identifier**:
A stable identifier used to distinguish a node within one diagram and to reference it from edges and subgraphs.

**Subgraph membership**:
Subgraphs are flat and exclusive: a node belongs to zero or one subgraph, and subgraphs cannot contain other subgraphs.

**Graph constraint**:
A diagram is a simple directed graph. It permits at most one edge for each ordered pair of distinct nodes.

**Supported syntax**:
Only the supported flowchart subset belongs to the diagram domain. Unsupported Mermaid constructs are invalid rather than silently retained or discarded.

**Empty diagram**:
A diagram may contain no nodes and remains a valid artifact that can be edited incrementally.

**Empty subgraph**:
A subgraph may contain no nodes and remains a valid named container.

**Node removal**:
Removing a node also removes its incident edges and subgraph membership.

**Invalid source**:
Source that fails supported-syntax parsing or domain validation is rejected as a whole; it must not produce a partial diagram.

**Subgraph bounds**:
Bounds of a populated subgraph are derived from member-node positions. An empty subgraph retains its explicit initial bounds until it gains members.

**Document**:
The persisted form of one unnamed diagram together with its node positions. Transient selection and viewport state are not part of the document.

**Workspace**:
Not a domain concept; the product currently edits one unnamed document directly.

**Validated-source transaction**:
Mermaid source becomes authoritative only after it parses and validates as a supported diagram. A valid source edit replaces diagram structure and recomputes positions; invalid source leaves the previous document unchanged.
