import FS from "fs";
import Path from "path";

import MarkdocSource from "@markdoc/markdoc";
import type {Config} from "@markdoc/markdoc";

const getPartials = (
  partialsDirectory: string | undefined,
): Config["partials"] => {
  if (!partialsDirectory) return undefined;

  if (FS.existsSync(partialsDirectory)) {
    const files = FS.readdirSync(partialsDirectory);

    const partialsRecords = files.reduce(
      (recordObject, file) => {
        if (recordObject) {
          recordObject[file] = MarkdocSource.parse(
            FS.readFileSync(Path.join(partialsDirectory, file), "utf8"),
          );
        }
        return recordObject;
      },
      {} as Config["partials"],
    );

    return partialsRecords;
  } else {
    throw new Error(
      `Can't find the partials directory at '${partialsDirectory}'.`,
    );
  }
};

export default getPartials;
