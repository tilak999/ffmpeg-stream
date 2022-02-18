const ffmpeg = require("fluent-ffmpeg")
const path = require("path")
const processVideo = require("./lib/processVideo")

/*
ffmpeg.setFfmpegPath(path.join(__dirname, "lib","bin", "ffmpeg"));
ffmpeg.setFfprobePath(path.join(__dirname, "lib","bin", "ffprobe"));

ffmpeg('/home/trollvia_official/ffmpeg-stream/working_dir/Kalle_Kalle_Lyrical_-_Chandigarh_Kare_Aashiqui_-Ayushmann_K,_Vaani_K_-Sachin-Jigar_Ft__Priya_Saraiya/seg_0_h264.ts').ffprobe(function(err, data) {
    console.dir(data.streams);
    console.dir(data.format);
});

*/
const file = `/home/trollvia_official/ffmpeg-stream/working_dir/media/media.mkv`
processVideo.createPlaylist(file).then(console.log)