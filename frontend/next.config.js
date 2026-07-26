/** @type {import('next').NextConfig} */
const nextConfig = {
  // "standalone" bundles the Node.js server for Docker deployments.
  // The GitHub Pages workflow overrides this to "export" automatically via
  // the actions/configure-pages step, so static-site builds still work.
  output: "standalone",
};

module.exports = nextConfig;
