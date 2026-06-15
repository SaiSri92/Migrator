import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { exportAssets } from "./snaplogic-client.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function exportDependencySet(
  assets,
  pipelineName
) {

  const mainAsset = [...assets][0];

  const responseData =
    await exportAssets(mainAsset);

  console.error(
    "TYPE:",
    typeof responseData
  );

  console.error(
    "IS BUFFER:",
    Buffer.isBuffer(responseData)
  );

  if (
    typeof responseData === "object"
  ) {
    console.error(
      JSON.stringify(
        responseData,
        null,
        2
      )
    );
  }

  const target = path.join(
    __dirname,
    "..",
    "downloads",
    `${pipelineName}.json`
  );

  fs.mkdirSync(
    path.dirname(target),
    { recursive: true }
  );

  fs.writeFileSync(
    target,
    JSON.stringify(
      responseData,
      null,
      2
    )
  );

  console.error(
    "Saved:",
    target
  );

  return target;
}