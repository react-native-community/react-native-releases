module.exports = {
  pipeline: {
    build: ["^build"],
    lint: ["build"],
    'lint:fix': [],
    test: ["build"],
    clean: [],
  },
  cacheOptions: {
    outputGlob: [
      "lib/**",
      "lib-commonjs/**",
    ],
  }
};