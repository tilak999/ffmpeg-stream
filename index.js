const express = require("express");
const fileUpload = require("express-fileupload");
const path = require("path");
const processVideo = require("./lib/processVideo");

const app = express();
const port = 3000;

app.use(express.static("public"));

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: path.join(__dirname, "/tmp/"),
  })
);

app.post("/api/upload", (req, res) => {
  processVideo.generatePlaylist(req.files.video).then(({ mediaId }) => {
    res.send({
      playlist_url: `/playlist/${mediaId}.m3u8`,
    });
  });
});

app.get("/playlist/:mediaId", (req, res) => {
  const filepath = path.join(
    __dirname,
    "working_dir",
    req.params.mediaId.replace(".m3u8", ""),
    "playlist.m3u8"
  );
  res.sendFile(filepath);
});

app.get("/api/getSegment", (req, res) => {
  const segId = req.query["seg_id"];
  const media = req.query["media"];
  const file = path.join(__dirname, "working_dir", media, segId);
  processVideo.transcode(file).then((outPath) => {
    console.log("chunk..", segId);
    res.sendFile(outPath);
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
