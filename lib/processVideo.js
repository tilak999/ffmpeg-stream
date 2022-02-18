const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const { resolve } = require("path");

ffmpeg.setFfmpegPath(path.join(__dirname, "bin", "ffmpeg"));
ffmpeg.setFfprobePath(path.join(__dirname, "bin", "ffprobe"));

const workingDir = path.join(__dirname, "../working_dir");
const SEG_LENGTH = 8;

async function prepareMedia(uploadItem) {
  const fileName = uploadItem.name.replaceAll(" ", "_").replaceAll(/[^A-Za-z0-9]/g,"");
  const folderpath = path.join(workingDir, path.parse(fileName).name);
  const filepath = path.join(folderpath, fileName);

  /* Create directory and move file */
  if (fs.existsSync(folderpath)) {
    fs.rmdirSync(folderpath, { recursive: true, forced: true });
  }
  fs.mkdirSync(folderpath);
  uploadItem.mv(filepath);
  await createPlaylist(filepath)
  return {
    mediaId: path.parse(folderpath).name,
  };
}

async function createPlaylist(mediaPath) {
  const metadata = await getMediaInformation(mediaPath);
  const duration = metadata.duration;
  const finalSegDuration = (duration % SEG_LENGTH).toFixed(2);
  const segCount = (duration / SEG_LENGTH).toFixed(0);
  const transcode = metadata.streams[0].codec_name == "h264" ? false : true;

  const lines = [
    `#EXTM3U`,
    `#EXT-X-VERSION:3`,
    `#EXT-X-MEDIA-SEQUENCE:0`,
    `#EXT-X-ALLOW-CACHE:YES`,
    `#EXT-X-TARGETDURATION: ${SEG_LENGTH + 1}`,
  ];

  for (let i = 0; i < segCount; i++) {
    lines.push(`#EXTINF:${SEG_LENGTH},`);
    lines.push(
      `/api/getSegment?media=${
        path.parse(mediaPath).base
      }&id=${i}&len=${SEG_LENGTH}&transcode=${transcode}&res=`
    );
  }

  if (finalSegDuration > 0) {
    lines.push(`#EXTINF:${finalSegDuration},`);
    lines.push(
      `/api/getSegment?media=${
        path.parse(mediaPath).base
      }&id=${segCount}&len=${finalSegDuration}&final=true&transcode=${transcode}&res=`
    );
  }

  lines.push(`#EXT-X-ENDLIST`);
  const playlistFile = path.join(path.dirname(mediaPath), `playlist.m3u8`)
  fs.writeFileSync(playlistFile, lines.join(`\n`))
  return playlistFile;
}

function getSegment(media, id, len, transcode, res, final) {
  const baseFolder = path.parse(media).name;
  const input = path.join(workingDir, baseFolder, media);
  const outputfile = path.join(workingDir, baseFolder, `seg_${id}.ts`);
  
  return new Promise((resolve, reject) => {
    if(fs.existsSync(outputfile)) {
      return resolve(outputfile);
    }
    ffmpeg(input)
      .seekInput(id * SEG_LENGTH)
      .duration(id * SEG_LENGTH + SEG_LENGTH)
      .videoCodec(transcode ? "libx264" : "copy")
      .outputOptions([
        `-preset:v ultrafast`,
        `-crf 17`,
        `-copyts`,
        `-muxdelay 0`,
        `-muxpreload 0`,
      ])
      .on("error", reject)
      .on("end", () => {
        resolve(outputfile);
      })
      .output(outputfile)
      .run();
  });
}

function getMediaInformation(mediaPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(mediaPath).ffprobe(function (err, data) {
      if (err) reject(err);
      resolve({
        streams: data.streams,
        bit_rate: data.format.bit_rate,
        size: data.format.size,
        duration: data.format.duration,
        format_name: data.format.format_name,
        nb_streams: data.format.nb_streams,
      });
    });
  });
}

module.exports = {
  prepareMedia,
  getMediaInformation,
  createPlaylist,
  getSegment,
};
