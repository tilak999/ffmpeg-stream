const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");

ffmpeg.setFfmpegPath(path.join(__dirname, "bin", "ffmpeg.exe"));
ffmpeg.setFfprobePath(path.join(__dirname, "bin", "ffprobe.exe"));

const workingDir = path.join(__dirname, "../working_dir");

async function generatePlaylist(uploadItem) {
  const fileName = uploadItem.name.replaceAll(" ", "_");
  const folderName = path.parse(fileName).name.replaceAll(".", "_");
  const folderpath = path.join(workingDir, folderName);
  const filepath = path.join(folderpath, fileName);

  /* Create directory and move file */
  if (fs.existsSync(folderpath)) {
    fs.rmdirSync(folderpath, { recursive: true, forced: true });
  }
  fs.mkdirSync(folderpath);
  uploadItem.mv(filepath);
  const { mediaFolder } = await createPlaylist(folderpath, filepath);
  return {
    mediaId: path.parse(mediaFolder).name,
  };
}

function createPlaylist(destFolder, inputVideoFile) {
  return new Promise((resolve, reject) => {
    /* convert video to mpeg-ts segs*/
    ffmpeg(inputVideoFile)
      .videoCodec("copy")
      .outputOptions([
        `-map 0`,
        `-deadline realtime`,
        `-preset:v ultrafast`,
        `-lag-in-frames 0`,
        `-static-thresh 0`,
        `-frame-parallel 1`,
        `-f segment`,
        `-muxdelay 0`,
        `-segment_time 8`,
        `-sc_threshold 0`,
        `-force_key_frames expr:gte(t,n_forced*8)`,
        `-segment_format mpegts`,
        `-segment_list_type m3u8`,
        `-segment_list ${path.join(destFolder, "playlist.m3u8")}`,
      ])
      .on("progress", (progress) => {
        console.log("Processing: " + progress.percent + "% done");
      })
      .on("end", () => {
        const playlistFile = path.join(destFolder, "playlist.m3u8");
        const mediaName = path.parse(destFolder).name;
        const data = fs
          .readFileSync(playlistFile, {
            encoding: "utf8",
            flag: "r",
          })
          .replaceAll("seg_", `/api/getSegment?media=${mediaName}&seg_id=seg_`);
        fs.writeFileSync(playlistFile, data);
        resolve({ playlistFile, mediaFolder: destFolder });
      })
      .on("error", reject)
      .output(path.join(destFolder, "seg_%d.ts"))
      .run();
  });
}

function transcode(segmentPath, resolution) {
  return new Promise((resolve, reject) => {
    const outputfile = segmentPath.replace(".ts", "_h264.ts");
    if (fs.existsSync(outputfile)) {
      return resolve(outputfile);
    }
    ffmpeg(segmentPath)
      .videoCodec("libx264")
      .outputOptions([`-copyts`, `-muxdelay 0`, `-muxpreload 0`])
      .on("error", reject)
      .on("end", () => {
        resolve(outputfile);
      })
      .output(outputfile)
      .run();
  });
}

module.exports = {
  generatePlaylist,
  transcode,
};
