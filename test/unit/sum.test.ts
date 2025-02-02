import { expect } from 'chai';
import { sum } from '../../src/sum.js';

describe("unit tests", () => {
	it('Sum', () => {
		expect(sum(1, 2)).to.equal(3)
	});
});
