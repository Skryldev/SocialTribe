const metadataFiles: Record<string, any> = (import.meta as any).glob("./content/**/metadata.json", {
  eager: true,
  import: "default",
});

const stepsFiles: Record<string, any> = (import.meta as any).glob("./content/**/steps.json", {
  eager: true,
  import: "default",
});

const tradeoffsFiles: Record<string, any> = (import.meta as any).glob("./content/**/tradeoffs.json", {
  eager: true,
  import: "default",
});

const theoryFiles: Record<string, any> = (import.meta as any).glob("./content/**/theory.md", {
  eager: true,
  query: "?raw",
  import: "default",
});

export const algorithmData: Record<string, any> = {};

for (const metadataPath in metadataFiles) {
  const parts = metadataPath.split("/");
  const algorithm = parts[parts.length - 2];

  const stepsPath = metadataPath.replace("metadata.json", "steps.json");
  const tradeoffsPath = metadataPath.replace("metadata.json", "tradeoffs.json");
  const theoryPath = metadataPath.replace("metadata.json", "theory.md");

  if (!stepsFiles[stepsPath]) {
    throw new Error(`Missing steps.json for "${algorithm}"`);
  }

  if (!tradeoffsFiles[tradeoffsPath]) {
    throw new Error(`Missing tradeoffs.json for "${algorithm}"`);
  }

  if (!theoryFiles[theoryPath]) {
    throw new Error(`Missing theory.md for "${algorithm}"`);
  }

  algorithmData[algorithm] = {
    ...metadataFiles[metadataPath],
    steps: stepsFiles[stepsPath],
    tradeoffs: tradeoffsFiles[tradeoffsPath],
    theory: theoryFiles[theoryPath],
  };
}