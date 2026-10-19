import Link from "next/link";

type MastheadBannerProps = {
  siteName: string;
  tagline: string;
};

export default function MastheadBanner({ siteName, tagline }: MastheadBannerProps) {
  return (
    <div className="masthead-visual-container">
      <Link href="/" className="masthead-banner-link" aria-label={`${siteName} - ${tagline}`}>
        <img
          src="/somoyer-potha-banner.png"
          alt={`${siteName} - ${tagline}`}
          className="masthead-svg"
          width={1640}
          height={624}
        />
      </Link>
    </div>
  );
}
