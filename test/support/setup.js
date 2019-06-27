const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinonChai = require('sinon-chai');
const chaiHttp = require('chai-http');

chai.use(chaiAsPromised);
chai.use(sinonChai);
chai.use(chaiHttp);

process.env.NO_LOGGING = '1';
