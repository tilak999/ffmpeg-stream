const express = require("express");
const fileUpload = require("express-fileupload");
const path = require("path");
const processVideo = require("./lib/processVideo");

const app = express();
const port = 8081;

app.use(express.static("public"));
const workingDir = path.join(__dirname, "working_dir");

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: path.join(__dirname, "/tmp/"),
  })
);

app.post("/api/upload", (req, res) => {
  processVideo.prepareMedia(req.files.video).then((data) => {
    res.status(200).send({ playlist: `/api/playlist/${data.mediaId}/playlist.m3u8`});
  });
});

app.get("/api/playlist/:mediaId/:file", (req, res) => {
  const {mediaId, file} = req.params;
  console.log(req.params)
  const filepath = path.join(workingDir, mediaId, file);
  res.sendFile(filepath);
});

app.get("/api/getSegment", (req, resp) => {
  const  { media, id, len, transcode, res, final } = req.query;
  console.log(req.query)
  processVideo.getSegment(media, id, len, transcode, res, final).then((outPath) => {
    console.log("chunk..", id);
    res.sendFile(outPath);
  }).catch(console.error)
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
