export default function HomeVideo() {
  return (
    <video
      aria-label="Friendly Party Rental NYC: how to plan and book your Riverdale event"
      controls
      playsInline
      preload="metadata"
      poster="/videos/riverdale-website-guide-v1.jpg"
      width={1920}
      height={1080}
      className="block h-full w-full object-contain"
    >
      <source src="/videos/riverdale-website-guide-v1.mp4" type="video/mp4" />
      <track kind="captions" src="/videos/riverdale-website-guide-v1.vtt" srcLang="en" label="English" />
      <a href="/videos/riverdale-website-guide-v1.mp4">Watch the Riverdale event guide</a>
    </video>
  )
}
