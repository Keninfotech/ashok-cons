import os
import subprocess
import imageio_ffmpeg

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
os.makedirs("assets/video", exist_ok=True)

v_in = r"assets/img/WhatsApp Unknown 2026-10-14 at 11.16.22 AM/WhatsApp Video 2026-10-14 at 11.09.14 AM.mp4"
v_out_mp4 = r"assets/video/about-hero-drone.mp4"
poster_webp = r"assets/video/about-hero-drone-poster.webp"
poster_jpg = r"assets/video/about-hero-drone-poster.jpg"

print("Processing video with:", ffmpeg)

# 1. First 10 seconds, upscale to 1280x720 (or 1920x1080) with Lanczos scaling, subtle contrast/clarity and unsharp mask, high bitrate CRF 16
# Using eq to gently enrich contrast & saturation and unsharp for crisp edges
vf_filters = [
    "scale=1280:720:flags=lanczos",
    "unsharp=luma_msize_x=5:luma_msize_y=5:luma_amount=0.85:chroma_msize_x=5:chroma_msize_y=5:chroma_amount=0.3",
    "eq=contrast=1.06:brightness=0.01:saturation=1.12"
]
vf_str = ",".join(vf_filters)

cmd_mp4 = [
    ffmpeg, "-y",
    "-ss", "0",
    "-t", "10",
    "-i", v_in,
    "-vf", vf_str,
    "-c:v", "libx264",
    "-preset", "slow",
    "-crf", "17",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    "-an", # No audio for background hero
    v_out_mp4
]

print("Running command for MP4...")
res = subprocess.run(cmd_mp4, capture_output=True, text=True)
if res.returncode != 0:
    print("MP4 Error:", res.stderr)
else:
    print("MP4 Generated successfully:", os.path.getsize(v_out_mp4), "bytes")

# 2. Extract high quality poster frame at 1.5 seconds
cmd_poster = [
    ffmpeg, "-y",
    "-ss", "1.5",
    "-i", v_out_mp4,
    "-vframes", "1",
    "-q:v", "2",
    poster_jpg
]
subprocess.run(cmd_poster, capture_output=True)

cmd_poster_webp = [
    ffmpeg, "-y",
    "-ss", "1.5",
    "-i", v_out_mp4,
    "-vframes", "1",
    "-c:v", "libwebp",
    "-quality", "92",
    poster_webp
]
subprocess.run(cmd_poster_webp, capture_output=True)

print("Posters generated.")
