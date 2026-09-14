/** Project Pages needs a subpath; native builds and local development do not. */
module.exports = ({ config }) => {
  const baseUrl = process.env.BENCHKEEP_WEB_BASE_URL;
  if (!baseUrl) return config;
  if (baseUrl !== '/benchkeep') {
    throw new Error('BENCHKEEP_WEB_BASE_URL must be /benchkeep for the EazyHood/benchkeep preview.');
  }
  return {
    ...config,
    experiments: { ...config.experiments, baseUrl },
  };
};
