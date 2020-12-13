module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2017
  },
  env: {
    'es6': true
  },
  extends: [
    'plugin:turbopatent/node'
  ],
  overrides: [
    {
      files: [
        'test/**/*.js'
      ],
      env: {
        mocha: true
      },
      rules: {
        'node/no-unpublished-require': 'off'
      }
    }
  ]
};
