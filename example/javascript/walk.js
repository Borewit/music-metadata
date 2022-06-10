const Walk = require("@root/walk");
const path = require("path");
const util = require("util");
const mm = require("../../lib"); // music-metadata

async function walkFunc(err, pathname, dirent) {
  // err is failure to lstat a file or directory
  // pathname is relative path, including the file or folder name
  // dirent = { name, isDirectory(), isFile(), isSymbolicLink(), ... }

  if (dirent.isFile()) {
    console.log(`File: ${pathname}`);
    switch (path.extname(pathname)) {
      case ".mp3":
      case ".m4a":
      case ".wav":
      case ".ogg":
      case ".flac":
        // Queue (asynchronous call) parsing of metadata
        const metadata = await mm.parseFile(pathname);
        console.log(util.inspect(metadata, { showHidden: false, depth: null }));
        break;
    }
  }
}

(async () => {
  try {
    await Walk.walk("M:\\_Classic", walkFunc);
    console.log("Done.");
  } catch (error) {
    // Oops, something went wrong
    console.error(error.message);
  }
})();
