# Logic circuits example (Vue)

A logic-circuit editor built on `@nodeflow-lib/vue`, at feature parity with the Solid `BlueprintApp`.

- Drag parts (switches, push buttons, clocks, gates, lamps, a hex display) from the **Parts** drawer onto the board.
- Wire an output pad (right edge) to an input pad (left edge). Outputs fan out; each input takes one wire. Unwired inputs read low.
- Wires and gates light up as signals change. Feedback loops work (the demo has an SR latch made of two NOR gates); a loop that never settles is flagged as oscillating.
- Time runs in frames. Clocks flip every half period (2–16 frames); the **Frame** slider sets how long a frame lasts, and **Pause** / **Step** stop time or advance it one frame.
- Select parts to group them or **Make chip** (a composite node). Chips can be broken apart, saved as reusable chip types (kept in `localStorage`), edited in a nested chip editor, renamed, exported and imported.

Run it with `bun run dev:circuit` from the repo root (port 3008), after `bunx turbo build`.

The simulation lives in `src/simulation.ts`: it flattens chips into a netlist of primitives, then settles every gate by repeated passes until nothing changes.
