import withSolid from "rollup-preset-solid";
import typescript from "rollup-plugin-typescript2";

export default withSolid([
  {
    plugins: [typescript()],
    input: "src/index.ts",
    targets: ["esm", "cjs"],
  },
]);
