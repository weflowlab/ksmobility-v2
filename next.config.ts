import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // <Image quality={90}> 허용 (기본은 75만)
    qualities: [75, 90],
  },
};

export default nextConfig;
