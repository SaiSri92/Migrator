export async function resolveDependencies(slpJson, assets) {
  walk(slpJson, assets);
  return assets;
}

function walk(node, assets) {
  if (!node) return;

  if (typeof node === "object") {
    for (const key in node) {
      const value = node[key];

      if (key === "account_ref" && value?.value?.ref_path) {
        assets.add(value.value.ref_path);
      }

      if (key === "pipeline_ref" && value?.value?.ref_path) {
        assets.add(value.value.ref_path);
      }

      walk(value, assets);
    }
  }
}
